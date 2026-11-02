import { expect, it } from "vitest";
import { createDemoSnapshot } from "../packages/core/src/demo";
import { layoutGraph } from "../packages/core/src/layout";
import { spatialGraph, zoomLevel } from "../packages/core/src/spatial";
import { pipelineDepths } from "../packages/core/src/pipeline";
it("assigns every default group its own layer", () => {
  const s = createDemoSnapshot(),
    layout = layoutGraph(s.nodes),
    packages = s.nodes.filter((n) => n.kind === "package");
  expect(new Set(packages.map((n) => layout[n.id].layers[1])).size).toBe(
    packages.length,
  );
});
it("aggregates files and connections into packages at a distance", () => {
  const s = createDemoSnapshot(),
    graph = spatialGraph(s, "packages", null, null, "Explore");
  expect(graph.nodes.some((n) => n.kind === "package")).toBe(true);
  expect(
    graph.edges.every(
      (e) => e.source.startsWith("pkg:") && e.target.startsWith("pkg:"),
    ),
  ).toBe(true);
  expect(graph.edges.length).toBeLessThan(s.edges.length);
  expect(zoomLevel(8)).toBe("functions");
  expect(zoomLevel(50)).toBe("packages");
});
it("computes dense shared-ancestor pipeline depths in linear work and flags cycles", () => {
  const jobs = Array.from({ length: 45 }, (_, i) => ({
    id: `j${i}`,
    name: `j${i}`,
    workflow: "CI",
    needs: Array.from({ length: i }, (_, j) => `j${j}`),
    steps: [],
    status: "unavailable",
  }));
  const result = pipelineDepths(jobs);
  expect(result.depths.get("j44")).toBe(44);
  expect(result.cycles).toEqual([]);
  const cycle = pipelineDepths([
    { ...jobs[0], needs: ["j1"] },
    { ...jobs[1], needs: ["j0"] },
  ]);
  expect(cycle.cycles).toHaveLength(2);
});

it("reveals function details when zooming into a selected package", () => {
  const s = createDemoSnapshot(),
    graph = spatialGraph(s, "functions", null, "pkg:apps", "Explore");
  expect(
    graph.nodes.some((n) => n.kind === "function" && n.group === "apps"),
  ).toBe(true);
});

it("retains the file silhouette when zooming out and excludes hidden groups and links", () => {
  const snapshot = createDemoSnapshot();
  const wide = spatialGraph(snapshot, "packages", null, null, "Explore");
  expect(wide.nodes.filter((n) => n.kind === "file")).toHaveLength(
    snapshot.nodes.filter((n) => n.kind === "file").length,
  );
  const graph = spatialGraph(snapshot, "functions", null, null, "Explore", [
    "apps",
    "tests",
  ]);
  expect(graph.nodes.some((n) => ["apps", "tests"].includes(n.group))).toBe(
    false,
  );
  const ids = new Set(graph.nodes.map((n) => n.id));
  expect(graph.edges.every((e) => ids.has(e.source) && ids.has(e.target))).toBe(
    true,
  );
});
