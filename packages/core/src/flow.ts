import type { CodeNode, RepoSnapshot } from "./index";

export interface FlowStep {
  id: string;
  depth: number;
  /** The step that first reached this one; undefined for the start. */
  via?: string;
}
export interface Flow {
  start: CodeNode;
  /** Steps in breadth-first order, nearest first. */
  steps: FlowStep[];
  /** Every followed edge between steps, including ones that rejoin earlier steps. */
  links: { source: string; target: string }[];
  distance: Map<string, number>;
  kind: "calls" | "imports";
  truncated: boolean;
}
export interface EntryPoint {
  node: CodeNode;
  kind: "calls" | "imports";
  /** How many functions or files are reachable from it. */
  reach: number;
}

function outgoing(snapshot: RepoSnapshot, kind: "call" | "import") {
  const map = new Map<string, string[]>();
  for (const e of snapshot.edges)
    if (e.kind === kind && e.source !== e.target) {
      const list = map.get(e.source);
      if (list) list.push(e.target);
      else map.set(e.source, [e.target]);
    }
  return map;
}

/**
 * What a function calls, and what those call, step by step: the static
 * "how does this run" view. Files follow their imports instead. Only
 * resolved edges are followed, so dynamic dispatch and callbacks are absent.
 */
export function flowFrom(
  snapshot: RepoSnapshot,
  id: string,
  depth = 4,
  limit = 80,
): Flow | null {
  const start = snapshot.nodes.find((n) => n.id === id);
  if (!start || start.kind === "package") return null;
  const kind = start.kind === "function" ? "calls" : "imports",
    next = outgoing(snapshot, kind === "calls" ? "call" : "import"),
    distance = new Map([[id, 0]]),
    steps: FlowStep[] = [{ id, depth: 0 }],
    links: Flow["links"] = [];
  let frontier = [id],
    truncated = false;
  for (let d = 1; d <= depth && frontier.length; d++) {
    const found: string[] = [];
    for (const source of frontier)
      for (const target of next.get(source) ?? []) {
        links.push({ source, target });
        if (distance.has(target)) continue;
        if (steps.length >= limit) {
          truncated = true;
          continue;
        }
        distance.set(target, d);
        steps.push({ id: target, depth: d, via: source });
        found.push(target);
      }
    frontier = found;
    if (d === depth && frontier.some((f) => (next.get(f) ?? []).length)) truncated = true;
  }
  return {
    start,
    steps,
    links: links.filter((l) => distance.has(l.source) && distance.has(l.target)),
    distance,
    kind,
    truncated,
  };
}

/**
 * Likely starting points: functions that nothing resolved calls but that call
 * others, and files that nothing imports but that import others, ranked by
 * how much of the codebase they reach.
 */
export function entryPoints(snapshot: RepoSnapshot, limit = 8): EntryPoint[] {
  const result: EntryPoint[] = [];
  for (const [kind, edgeKind] of [
    ["calls", "call"],
    ["imports", "import"],
  ] as const) {
    const next = outgoing(snapshot, edgeKind),
      targeted = new Set(
        snapshot.edges.filter((e) => e.kind === edgeKind && e.source !== e.target).map((e) => e.target),
      );
    for (const n of snapshot.nodes) {
      if (n.kind !== (kind === "calls" ? "function" : "file")) continue;
      if (targeted.has(n.id) || !(next.get(n.id) ?? []).length) continue;
      if (/(^|\/)(tests?|__tests__|e2e|spec)\//.test(n.path) || /\.(test|spec)\./.test(n.path)) continue;
      const seen = new Set([n.id]);
      let frontier = [n.id];
      while (frontier.length && seen.size < 400) {
        frontier = frontier.flatMap((f) => (next.get(f) ?? []).filter((t) => !seen.has(t) && seen.add(t)));
      }
      result.push({ node: n, kind, reach: seen.size - 1 });
    }
  }
  return result
    .sort((a, b) => b.reach - a.reach || a.node.path.localeCompare(b.node.path))
    .slice(0, limit);
}
