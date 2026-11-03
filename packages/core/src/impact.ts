import type { RepoSnapshot } from "./index";

export interface Impact {
  /** Node id → hops from the selection (the selection and its contents are 0). */
  distance: Map<string, number>;
  /** Dependents per hop, files only, nearest first. */
  byHop: string[][];
  /** True when the walk stopped at the depth or node bound. */
  truncated: boolean;
  /** Unresolved imports in the snapshot: dependents behind them cannot be seen. */
  unresolved: number;
}

/**
 * What depends on a node, hop by hop. Every edge reads "source depends on
 * target" (an importer on the file it imports, a caller on the function it
 * calls), so dependents are the sources of incoming edges. Selecting a file
 * or group seeds everything it contains; containment is never climbed back up.
 * The result is a lower bound: unresolved and dynamic references are not edges.
 */
export function impactOf(
  snapshot: RepoSnapshot,
  id: string,
  depth = 3,
  limit = 5000,
): Impact {
  const nodes = new Map(snapshot.nodes.map((n) => [n.id, n])),
    seed = nodes.get(id);
  const distance = new Map<string, number>(),
    empty = {
      distance,
      byHop: [],
      truncated: false,
      unresolved: snapshot.coverage.unresolvedImports,
    };
  if (!seed) return empty;
  const incoming = new Map<string, string[]>();
  for (const e of snapshot.edges)
    if (e.kind === "import" || e.kind === "call") {
      const list = incoming.get(e.target);
      if (list) list.push(e.source);
      else incoming.set(e.target, [e.source]);
    }
  const file = (nodeId: string) => {
    const n = nodes.get(nodeId);
    return n?.kind === "function" ? n.parent : n?.kind === "file" ? n.id : undefined;
  };
  let frontier = snapshot.nodes
    .filter(
      (n) =>
        n.id === id ||
        n.parent === id ||
        (seed.kind === "package" && n.group === seed.group && n.kind !== "package"),
    )
    .map((n) => n.id);
  for (const s of frontier) distance.set(s, 0);
  const byHop: string[][] = [];
  let truncated = false;
  for (let hop = 1; hop <= depth && frontier.length; hop++) {
    const next: string[] = [];
    for (const target of frontier)
      for (const source of incoming.get(target) ?? []) {
        if (distance.has(source)) continue;
        if (distance.size >= limit) {
          truncated = true;
          break;
        }
        distance.set(source, hop);
        next.push(source);
        // A dependent function makes its whole file a dependent at the same hop.
        const parent = file(source);
        if (parent && !distance.has(parent)) {
          distance.set(parent, hop);
          next.push(parent);
        }
      }
    const files = [
      ...new Set(next.map(file).filter((f): f is string => !!f && distance.get(f) === hop)),
    ].sort();
    if (files.length) byHop.push(files);
    frontier = next;
    if (hop === depth && frontier.some((t) => (incoming.get(t) ?? []).some((s) => !distance.has(s))))
      truncated = true;
  }
  return { ...empty, distance, byHop, truncated };
}
