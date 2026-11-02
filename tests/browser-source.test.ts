import { expect, it, vi } from "vitest";
import {
  analyzePublicRepository,
  readPublicHistory,
} from "../packages/core/src/browser-source";
const sha = "a".repeat(40);
function fixture() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://api.github.com/repos/example/project")
      return Response.json({ private: false, default_branch: "master" });
    if (url.includes("/commits?"))
      return Response.json([
        {
          sha,
          commit: {
            message: "Initial\nbody",
            author: { name: "Sam", date: "2026-01-01" },
          },
        },
      ]);
    if (url.includes("/commits/")) return Response.json({ sha });
    if (url.includes("/git/trees/"))
      return Response.json({
        truncated: false,
        tree: [
          {
            path: "src/index.ts",
            type: "blob",
            mode: "100644",
            sha: "file-oid",
            size: 55,
          },
          {
            path: "large.ts",
            type: "blob",
            mode: "100644",
            sha: "big",
            size: 600000,
          },
        ],
      });
    if (
      url.startsWith(
        "https://raw.githubusercontent.com/example/project/" + sha + "/",
      )
    )
      return new Response("export function hello() { return 1; }");
    if (url.includes("/actions/runs?"))
      return Response.json({ workflow_runs: [] });
    throw new Error("Unexpected request " + url);
  });
}
it("analyzes a public snapshot entirely through browser-safe GitHub requests", async () => {
  const fetcher = fixture();
  const snapshot = await analyzePublicRepository(
    "example/project",
    undefined,
    () => {},
    fetcher as typeof fetch,
  );
  expect(snapshot.sha).toBe(sha);
  expect(snapshot.nodes.some((n) => n.name === "hello")).toBe(true);
  expect(snapshot.coverage.skipped).toBe(1);
  expect(snapshot.demo).toBe(false);
  expect(
    fetcher.mock.calls.every(
      ([url]) =>
        String(url).startsWith("https://api.github.com/") ||
        String(url).startsWith("https://raw.githubusercontent.com/"),
    ),
  ).toBe(true);
  expect(
    fetcher.mock.calls.some(([url]) => String(url).endsWith("/large.ts")),
  ).toBe(false);
});
it("resolves the actual default branch and respects older history pages", async () => {
  const fetcher = fixture();
  const result = await readPublicHistory(
    "example/project",
    undefined,
    2,
    fetcher as typeof fetch,
  );
  expect(result.branch).toBe("master");
  expect(result.commits[0].message).toBe("Initial");
  expect(fetcher.mock.calls.some(([u]) => String(u).includes("page=2"))).toBe(
    true,
  );
});
it("rejects private repositories and explains public API limits", async () => {
  await expect(
    analyzePublicRepository(
      "example/project",
      undefined,
      () => {},
      async () => Response.json({ private: true }) as any,
    ),
  ).rejects.toThrow(/public/i);
  await expect(
    readPublicHistory(
      "example/project",
      undefined,
      1,
      async () =>
        Response.json(
          { message: "API rate limit exceeded" },
          { status: 403 },
        ) as any,
    ),
  ).rejects.toThrow(/limit/i);
});
