import { describe, expect, it } from "vitest";
import { impactOf } from "../packages/core/src/impact";
import { planLayout, squarify } from "../packages/core/src/plan";
import { createDemoSnapshot } from "../packages/core/src/demo";
import type { RepoSnapshot } from "../packages/core/src/index";

const node = (id: string, kind: "file" | "function" | "package", parent?: string, group = "src") => ({
  id,
  name: id.split("/").pop()!,
  path: id.split("#")[0],
  kind,
  group,
  language: "TypeScript",
  bytes: 100,
  loc: 10,
  hash: id,
  parent,
});
const snap = (edges: [string, string, "import" | "call"][]): RepoSnapshot => ({
  repository: "o/r",
  sha: "s",
  demo: false,
  dependencies: [],
  pipeline: { jobs: [], edges: [], warnings: [] },
  coverage: { total: 4, analyzed: 4, skipped: 0, supported: 4, unresolvedImports: 2, partial: false },
  nodes: [
    node("pkg:src", "package"),
    node("src/a.ts", "file"),
    node("src/a.ts#fa", "function", "src/a.ts"),
    node("src/b.ts", "file"),
    node("src/b.ts#fb", "function", "src/b.ts"),
    node("src/c.ts", "file"),
    node("src/d.ts", "file"),
  ],
  edges: edges.map(([source, target, kind], i) => ({ id: `e${i}`, source, target, kind })),
});

describe("impact", () => {
  it("walks dependents hop by hop and lifts calling functions to their files", () => {
    const s = snap([
      ["src/b.ts", "src/a.ts", "import"],
      ["src/c.ts#x", "src/b.ts#fb", "call"],
      ["src/c.ts", "src/b.ts", "import"],
      ["src/d.ts", "src/c.ts", "import"],
    ]);
    const impact = impactOf(s, "src/a.ts", 3);
    expect(impact.distance.get("src/a.ts")).toBe(0);
    expect(impact.distance.get("src/a.ts#fa")).toBe(0);
    expect(impact.byHop).toEqual([["src/b.ts"], ["src/c.ts"], ["src/d.ts"]]);
    expect(impact.unresolved).toBe(2);
  });
  it("reports truncation at the depth bound and never climbs containment", () => {
    const s = snap([
      ["src/b.ts", "src/a.ts", "import"],
      ["src/c.ts", "src/b.ts", "import"],
    ]);
    const shallow = impactOf(s, "src/a.ts", 1);
    expect(shallow.byHop).toEqual([["src/b.ts"]]);
    expect(shallow.truncated).toBe(true);
    const fn = impactOf(s, "src/b.ts#fb", 3);
    expect(fn.byHop).toEqual([]);
  });
});

describe("floor plan", () => {
  it("squarify fills the rectangle without overlap", () => {
    const rooms = squarify(
      [6, 6, 4, 3, 2, 2, 1].map((weight) => ({ weight })),
      { x: 0, y: 0, w: 6, h: 4 },
    );
    const area = rooms.reduce((a, r) => a + r.rect.w * r.rect.h, 0);
    expect(area).toBeCloseTo(24, 6);
    for (const a of rooms)
      for (const b of rooms)
        if (a !== b)
          expect(
            a.rect.x + a.rect.w <= b.rect.x + 1e-9 ||
              b.rect.x + b.rect.w <= a.rect.x + 1e-9 ||
              a.rect.y + a.rect.h <= b.rect.y + 1e-9 ||
              b.rect.y + b.rect.h <= a.rect.y + 1e-9,
          ).toBe(true);
  });
  it("places every demo file inside its group's room", () => {
    const demo = createDemoSnapshot(49),
      { positions, frames, width, height } = planLayout(demo.nodes);
    const files = demo.nodes.filter((n) => n.kind === "file");
    expect(files.every((f) => positions.has(f.id))).toBe(true);
    for (const f of files.slice(0, 50)) {
      const room = frames.find((r) => r.id === `pkg:${f.group}`)!,
        [x, y] = positions.get(f.id)!;
      expect(x + width / 2).toBeGreaterThanOrEqual(room.x);
      expect(x + width / 2).toBeLessThanOrEqual(room.x + room.w);
      expect(height / 2 - y).toBeGreaterThanOrEqual(room.y);
      expect(height / 2 - y).toBeLessThanOrEqual(room.y + room.h);
    }
  });
});
