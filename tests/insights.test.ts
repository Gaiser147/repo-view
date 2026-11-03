import { describe, expect, it } from "vitest";
import {
  authorship,
  fileHistory,
  hotspots,
} from "../packages/core/src/insights";
import type { Commit, RepoSnapshot } from "../packages/core/src/index";

const file = (path: string, hash: string, loc = 10) => ({
  id: path,
  name: path,
  path,
  kind: "file" as const,
  group: "src",
  language: "TypeScript",
  bytes: loc * 10,
  loc,
  hash,
});
const fn = (parent: string, complexity: number) => ({
  ...file(`${parent}#f${complexity}`, "x"),
  kind: "function" as const,
  parent,
  complexity,
});
const snap = (sha: string, nodes: RepoSnapshot["nodes"]): RepoSnapshot => ({
  repository: "o/r",
  sha,
  nodes,
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
const commit = (sha: string, day: number, author: string): Commit => ({
  sha,
  message: sha,
  author,
  date: new Date(Date.UTC(2026, 0, day)).toISOString(),
});

describe("history insights", () => {
  const commits = [
    commit("c3", 3, "Cy"),
    commit("c2", 2, "Bo"),
    commit("c1", 1, "Al"),
  ];
  const snapshots = new Map([
    ["c1", snap("c1", [file("a.ts", "1"), file("b.ts", "1")])],
    ["c2", snap("c2", [file("a.ts", "2"), file("b.ts", "1")])],
    [
      "c3",
      snap("c3", [
        file("a.ts", "3"),
        file("b.ts", "2"),
        fn("a.ts", 4),
        fn("b.ts", 9),
      ]),
    ],
  ]);
  it("counts changes and last authors only across known consecutive snapshots", () => {
    const h = fileHistory(commits, (sha) => snapshots.get(sha));
    expect(h.coverage).toEqual({ compared: 2, total: 2 });
    expect(h.files.get("a.ts")).toMatchObject({ changes: 2, lastAuthor: "Cy" });
    expect(h.files.get("b.ts")).toMatchObject({ changes: 1, lastAuthor: "Cy" });
    expect(h.changedPerCommit.get("c2")).toBe(1);
  });
  it("does not guess across a missing snapshot", () => {
    const h = fileHistory(commits, (sha) =>
      sha === "c2" ? undefined : snapshots.get(sha),
    );
    expect(h.coverage.compared).toBe(0);
    expect(h.files.size).toBe(0);
  });
  it("ranks hotspots by changes × complexity and falls back to complexity alone", () => {
    const current = snapshots.get("c3")!,
      h = fileHistory(commits, (sha) => snapshots.get(sha)),
      ranked = hotspots(current, h);
    expect(ranked.mode).toBe("churn-complexity");
    expect(ranked.items.map((i) => i.node.path)).toEqual(["b.ts", "a.ts"]);
    expect(ranked.items[0].score).toBe(100);
    const none = hotspots(
      current,
      fileHistory([commits[0]], (sha) => snapshots.get(sha)),
    );
    expect(none.mode).toBe("complexity-only");
    expect(none.items[0].node.path).toBe("b.ts");
  });
  it("reports authorship with unknown files", () => {
    const h = fileHistory(commits.slice(0, 2), (sha) => snapshots.get(sha));
    const a = authorship(snapshots.get("c3")!, h);
    expect(a.ranked).toEqual([{ author: "Cy", files: 2 }]);
    expect(a.unknown).toBe(0);
  });
});
