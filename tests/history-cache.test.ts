import { afterEach, expect, it, vi } from "vitest";
import {
  SnapshotMemory,
  IdleCommitWarmer,
  neighborCommits,
} from "../apps/web/src/history-cache";
import type { RepoSnapshot } from "../packages/core/src/index";
const snapshot = (sha: string): RepoSnapshot => ({
  repository: "a/b",
  sha,
  nodes: [],
  edges: [],
  demo: false,
  dependencies: [],
  coverage: {
    total: 0,
    analyzed: 0,
    skipped: 0,
    supported: 0,
    unresolvedImports: 0,
    partial: false,
  },
  pipeline: { jobs: [], edges: [], warnings: [] },
});
afterEach(() => vi.useRealTimers());
it("reuses immutable commit snapshots and evicts least recently used entries", () => {
  const cache = new SnapshotMemory(2);
  const first = snapshot("a");
  cache.put(first);
  cache.put(snapshot("b"));
  expect(cache.get("a/b", "a")).toBe(first);
  cache.put(snapshot("c"));
  expect(cache.get("a/b", "b")).toBeUndefined();
  expect(cache.count("a/b")).toBe(2);
});
it("prioritizes neighboring history snapshots without reloading the current commit", () => {
  const commits = ["new", "current", "old", "older"].map((sha) => ({
    sha,
    message: "",
    date: "",
    author: "",
  }));
  expect(neighborCommits(commits, "current")).toEqual(["old", "new", "older"]);
});
it("warms slowly, cancels obsolete work and caps automatic network analyses", async () => {
  vi.useFakeTimers();
  const warmer = new IdleCommitWarmer({
      delayMs: 1000,
      gapMs: 2000,
      maxPerHour: 2,
    }),
    load = vi.fn(async () => {}),
    status = vi.fn();
  warmer.schedule("a/b", ["a", "b", "c"], load, status);
  expect(load).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1000);
  expect(load).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1999);
  expect(load).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(load).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(2000);
  expect(load).toHaveBeenCalledTimes(2);
  warmer.schedule("a/b", ["d"], load, status);
  warmer.cancel();
  await vi.advanceTimersByTimeAsync(5000);
  expect(load).toHaveBeenCalledTimes(2);
});
