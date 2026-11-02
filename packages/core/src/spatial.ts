import type { CodeEdge, RepoSnapshot } from "./index";
export type DetailLevel = "packages" | "files" | "functions";
export function zoomLevel(distance: number): DetailLevel {
  return distance > 40 ? "packages" : distance < 17 ? "functions" : "files";
}
export function spatialGraph(
  snapshot: RepoSnapshot,
  level: DetailLevel,
  focus: string | null,
  selectedId: string | null,
  view: string,
) {
  const nodes = snapshot.nodes.filter((n) =>
    level === "packages"
      ? n.kind === "package"
      : n.kind === "file" ||
        (n.kind === "function" &&
          level === "functions" &&
          (view === "Functions" ||
            n.group === focus ||
            n.parent === selectedId)),
  );
  const ids = new Set(nodes.map((n) => n.id)),
    byId = new Map(snapshot.nodes.map((n) => [n.id, n])),
    map = new Map<string, CodeEdge>();
  for (const edge of snapshot.edges) {
    if (edge.kind === "contains" && edge.source !== selectedId) continue;
    if (
      view === "Functions" &&
      edge.kind !== "call" &&
      edge.kind !== "contains"
    )
      continue;
    let source = edge.source,
      target = edge.target;
    if (level === "packages") {
      const a = byId.get(source),
        b = byId.get(target);
      if (!a || !b || edge.kind === "contains") continue;
      source = `pkg:${a.group}`;
      target = `pkg:${b.group}`;
      if (source === target) continue;
    }
    if (!ids.has(source) || !ids.has(target)) continue;
    const id = `${edge.kind}:${source}>${target}`;
    map.set(id, { ...edge, id, source, target });
  }
  const edges = [...map.values()].sort(
    (a, b) =>
      Number(b.source === selectedId || b.target === selectedId) -
      Number(a.source === selectedId || a.target === selectedId),
  );
  return {
    nodes,
    edges: edges.slice(0, 12000),
    omittedEdges: Math.max(0, edges.length - 12000),
  };
}
