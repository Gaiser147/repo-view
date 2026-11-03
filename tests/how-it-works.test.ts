import { describe, expect, it } from "vitest";
import { entryPoints, flowFrom } from "../packages/core/src/flow";
import { architecture, folderOf } from "../packages/core/src/architecture";
import { invokedScripts, scriptPipeline } from "../packages/core/src/scripts";
import { sampledHistory } from "../packages/core/src/insights";
import { diffFromCompare } from "../packages/core/src/compare";
import { createDemoSnapshot } from "../packages/core/src/demo";
import type { RepoSnapshot } from "../packages/core/src/index";

const n = (
  id: string,
  kind: "file" | "function",
  parent?: string,
  group = "app",
) => ({
  id,
  name: id.split(/[/#]/).pop()!,
  path: id.split("#")[0],
  kind,
  group,
  language: "TypeScript",
  bytes: 10,
  loc: 10,
  hash: id,
  parent,
});
const snapshot = (
  edges: [string, string, "call" | "import"][],
  extra: Partial<RepoSnapshot> = {},
): RepoSnapshot => ({
  repository: "o/r",
  sha: "s",
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
  nodes: [
    n("app/main.ts", "file"),
    n("app/main.ts#start", "function", "app/main.ts"),
    n("app/lib/a.ts", "file"),
    n("app/lib/a.ts#load", "function", "app/lib/a.ts"),
    n("app/lib/a.ts#parse", "function", "app/lib/a.ts"),
    n("core/db.ts", "file", undefined, "core"),
    n("core/db.ts#query", "function", "core/db.ts", "core"),
  ],
  edges: edges.map(([source, target, kind], i) => ({
    id: `e${i}`,
    source,
    target,
    kind,
  })),
  ...extra,
});

describe("flow", () => {
  const s = snapshot([
    ["app/main.ts#start", "app/lib/a.ts#load", "call"],
    ["app/lib/a.ts#load", "app/lib/a.ts#parse", "call"],
    ["app/lib/a.ts#load", "core/db.ts#query", "call"],
    ["app/main.ts", "app/lib/a.ts", "import"],
    ["app/lib/a.ts", "core/db.ts", "import"],
  ]);
  it("follows calls step by step from a function", () => {
    const f = flowFrom(s, "app/main.ts#start", 4)!;
    expect(f.kind).toBe("calls");
    expect(f.steps.map((x) => [x.id, x.depth])).toEqual([
      ["app/main.ts#start", 0],
      ["app/lib/a.ts#load", 1],
      ["app/lib/a.ts#parse", 2],
      ["core/db.ts#query", 2],
    ]);
    expect(f.truncated).toBe(false);
    expect(flowFrom(s, "app/main.ts#start", 1)!.truncated).toBe(true);
  });
  it("follows imports from a file and finds entry points by reach", () => {
    expect(flowFrom(s, "app/main.ts", 3)!.steps.map((x) => x.id)).toEqual([
      "app/main.ts",
      "app/lib/a.ts",
      "core/db.ts",
    ]);
    const entries = entryPoints(s);
    expect(entries[0]).toMatchObject({ kind: "calls", reach: 3 });
    expect(entries.map((e) => e.node.id)).toContain("app/main.ts");
  });
});

describe("architecture", () => {
  it("groups files into top folders and weighs crossing imports", () => {
    expect(folderOf("app/lib/a.ts", "app")).toBe("app/lib");
    expect(folderOf("app/main.ts", "app")).toBe("app");
    const model = architecture(
      snapshot([
        ["app/main.ts", "app/lib/a.ts", "import"],
        ["app/lib/a.ts", "core/db.ts", "import"],
      ]),
    );
    expect(model.links).toEqual(
      expect.arrayContaining([
        { source: "app", target: "app/lib", weight: 1 },
        { source: "app/lib", target: "core", weight: 1 },
      ]),
    );
    const rank = Object.fromEntries(model.groups.map((g) => [g.group, g.rank]));
    expect(rank.core).toBeGreaterThan(rank.app);
  });
});

describe("scripts", () => {
  it("reads which scripts a command runs and links CI jobs", () => {
    expect(invokedScripts("npm run lint && npm test && pnpm build")).toEqual([
      "lint",
      "test",
      "build",
    ]);
    expect(invokedScripts("npm ci && npm install")).toEqual([]);
    const demo = createDemoSnapshot(49),
      steps = scriptPipeline(demo);
    expect(steps.find((s) => s.name === "verify")!.runs).toEqual([
      "lint",
      "test",
      "build",
    ]);
    expect(steps.find((s) => s.name === "build")!.runs).toContain("prebuild");
    expect(steps.find((s) => s.name === "test")!.ci).toContain("Test");
  });
});

describe("sampled history and compare", () => {
  it("counts each sampled period once per file and follows renames", () => {
    const h = sampledHistory(
      [
        {
          head: "p1",
          files: [
            { path: "a.ts", status: "modified" },
            { path: "old.ts", status: "added" },
          ],
          authors: ["Al", "Al", "Bo"],
        },
        {
          head: "p2",
          files: [
            { path: "a.ts", status: "modified" },
            { path: "new.ts", status: "renamed", previous: "old.ts" },
          ],
          authors: ["Bo"],
        },
      ],
      120,
    );
    expect(h.files.get("a.ts")).toMatchObject({ changes: 2, lastAuthor: "Bo" });
    expect(h.files.get("new.ts")?.changes).toBe(2);
    expect(h.files.has("old.ts")).toBe(false);
    expect(h.coverage).toEqual({ compared: 2, total: 2, sampledCommits: 120 });
  });
  it("turns a GitHub comparison into a diff limited to analyzed files", () => {
    const s = snapshot([]),
      diff = diffFromCompare(
        {
          files: [
            { path: "app/main.ts", status: "modified", changes: 3 },
            { path: "app/lib/a.ts", status: "added", changes: 9 },
            {
              path: "core/db.ts",
              status: "renamed",
              previous: "core/old.ts",
              changes: 0,
            },
            { path: "gone.ts", status: "removed", changes: 4 },
            { path: "dist/app.min.js", status: "removed", changes: 1 },
            { path: "node_modules/x/index.js", status: "modified", changes: 1 },
          ],
          commits: [],
          totalCommits: 1,
          truncated: false,
        },
        s,
      );
    expect(diff).toEqual({
      added: ["app/lib/a.ts"],
      changed: ["app/main.ts"],
      removed: ["gone.ts"],
      renamed: [{ from: "core/old.ts", to: "core/db.ts" }],
    });
  });
});
