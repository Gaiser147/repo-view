import { afterEach, expect, it, vi } from "vitest";
import {
  loadRepository,
  loadOlderCommits,
  useRepo,
  openDemo,
} from "../apps/web/src/state";
import { createDemoSnapshot } from "../packages/core/src/demo";
afterEach(() => {
  vi.unstubAllGlobals();
  openDemo();
});
it("loads branch history on initial open and atomically discards an older response", async () => {
  let resolveOld!: (value: Response) => void;
  const snap = (repo: string) => ({
    ...createDemoSnapshot(3),
    repository: repo,
    demo: false,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/analyses") {
        const repo = JSON.parse(init!.body as string).repository;
        return Response.json({ id: repo });
      }
      if (url.includes("/commits"))
        return Response.json({
          commits: [
            {
              sha: "branch-sha",
              message: "branch",
              date: "2026-01-01",
              author: "test",
            },
          ],
        });
      if (url.endsWith("first/repo"))
        return new Promise<Response>((r) => {
          resolveOld = r;
        });
      return Response.json({
        status: "complete",
        snapshot: snap("second/repo"),
      });
    }),
  );
  const first = loadRepository("first/repo", "develop", "develop");
  await vi.waitFor(() => expect(resolveOld).toBeTypeOf("function"));
  await loadRepository("second/repo", "develop", "develop");
  resolveOld(
    Response.json({ status: "complete", snapshot: snap("first/repo") }),
  );
  await first;
  expect(useRepo.getState().snapshot.repository).toBe("second/repo");
  expect(useRepo.getState().commits[0].message).toBe("branch");
  expect(useRepo.getState().branch).toBe("develop");
});

it("keeps the selection when an identical file is renamed", () => {
  const base = createDemoSnapshot(1),
    file = base.nodes.find((n) => n.kind === "file")!;
  useRepo.getState().replace(base);
  useRepo.getState().select(file.id);
  const next = {
    ...base,
    sha: "renamed",
    nodes: base.nodes.map((n) =>
      n.id === file.id
        ? { ...n, id: "renamed.ts", path: "renamed.ts", name: "renamed.ts" }
        : n,
    ),
  };
  useRepo.getState().replace(next);
  expect(useRepo.getState().selectedId).toBe("renamed.ts");
});

it("ignores older-history results after switching workspaces", async () => {
  const snapshot = {
    ...createDemoSnapshot(1),
    demo: false,
    repository: "old/repo",
  };
  useRepo.getState().replace(snapshot);
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    () =>
      new Promise<Response>((r) => {
        finish = r;
      }),
  );
  const request = loadOlderCommits();
  openDemo();
  const expected = useRepo.getState().commits;
  finish(
    Response.json({
      commits: [
        { sha: "obsolete", message: "old", date: "2020-01-01", author: "old" },
      ],
    }),
  );
  await request;
  expect(useRepo.getState().commits).toEqual(expected);
  expect(useRepo.getState().error).toBeNull();
});

it("returns to a visited real commit from memory without another analysis request", async () => {
  const { loadCommit } = await import("../apps/web/src/state");
  const a = {
      ...createDemoSnapshot(2),
      repository: "memory/real",
      demo: false,
    },
    b = { ...createDemoSnapshot(3), repository: "memory/real", demo: false };
  const fetcher = vi.fn(async (url: string) =>
    url === "/api/analyses"
      ? Response.json({ id: "memory" })
      : Response.json({ status: "complete", snapshot: a }),
  );
  vi.stubGlobal("fetch", fetcher);
  await loadRepository(a.repository, a.sha, "main", true);
  const calls = fetcher.mock.calls.length;
  useRepo.getState().replace(b);
  await loadCommit(a.sha);
  expect(fetcher.mock.calls.length).toBe(calls);
  expect(useRepo.getState().snapshot.sha).toBe(a.sha);
  expect(useRepo.getState().snapshotSource).toBe("cache");
  expect(useRepo.getState().pending).toBe(false);
});

it("reselecting the displayed commit cancels a different pending transition", async () => {
  const { loadCommit } = await import("../apps/web/src/state"),
    a = { ...createDemoSnapshot(4), repository: "race/current", demo: false },
    b = { ...createDemoSnapshot(5), repository: "race/current", demo: false };
  useRepo.getState().replace(a);
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url === "/api/analyses"
        ? Response.json({ id: "pending" })
        : new Promise<Response>((r) => {
            finish = r;
          }),
    ),
  );
  const pending = loadCommit(b.sha);
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  await loadCommit(a.sha);
  finish(Response.json({ status: "complete", snapshot: b }));
  await pending;
  expect(useRepo.getState().snapshot.sha).toBe(a.sha);
  expect(useRepo.getState().pending).toBe(false);
});
