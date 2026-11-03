import type { RepoSnapshot } from "./index";

export interface ArchitectureBox {
  id: string;
  label: string;
  group: string;
  files: number;
  loc: number;
}
export interface ArchitectureLink {
  source: string;
  target: string;
  /** Resolved imports between the two boxes. */
  weight: number;
}

/** Top folder inside a group: `apps/web/x.ts` → `apps/web`; files directly in the group stay in the group. */
export function folderOf(path: string, group: string) {
  const parts = path.split("/"),
    start = parts[0] === group ? 1 : 0;
  return parts.length - start > 1 ? parts.slice(0, start + 1).join("/") : group;
}

/**
 * The repository as boxes and arrows: groups containing their top folders,
 * linked by how many resolved imports cross between them. Groups are ranked
 * so that what others depend on sits to the right of what depends on it.
 */
export function architecture(snapshot: RepoSnapshot) {
  const files = snapshot.nodes.filter((n) => n.kind === "file"),
    boxes = new Map<string, ArchitectureBox>(),
    boxOf = new Map<string, string>();
  for (const f of files) {
    const id = folderOf(f.path, f.group),
      box = boxes.get(id) ?? {
        id,
        label: id === f.group ? `${f.group} (root)` : id.split("/").slice(-1)[0] ?? id,
        group: f.group,
        files: 0,
        loc: 0,
      };
    box.files++;
    box.loc += f.loc;
    boxes.set(id, box);
    boxOf.set(f.id, id);
  }
  const weights = new Map<string, number>();
  for (const e of snapshot.edges) {
    if (e.kind !== "import") continue;
    const a = boxOf.get(e.source),
      b = boxOf.get(e.target);
    if (!a || !b || a === b) continue;
    weights.set(`${a}\u0000${b}`, (weights.get(`${a}\u0000${b}`) ?? 0) + 1);
  }
  const links: ArchitectureLink[] = [...weights]
    .map(([key, weight]) => {
      const [source, target] = key.split("\u0000");
      return { source, target, weight };
    })
    .sort((a, b) => b.weight - a.weight);
  // Rank groups: a group sits one column right of the furthest group that depends on it.
  const groups = [...new Set(files.map((f) => f.group))].sort(),
    groupDeps = new Map(groups.map((g) => [g, new Set<string>()]));
  for (const l of links) {
    const a = boxes.get(l.source)!.group,
      b = boxes.get(l.target)!.group;
    if (a !== b) groupDeps.get(a)!.add(b);
  }
  const rank = new Map(groups.map((g) => [g, 0]));
  for (let i = 0; i < groups.length; i++)
    for (const [g, deps] of groupDeps)
      for (const d of deps) if (rank.get(d)! < rank.get(g)! + 1 && rank.get(g)! + 1 < groups.length) rank.set(d, rank.get(g)! + 1);
  return {
    boxes: [...boxes.values()].sort((a, b) => b.loc - a.loc),
    links,
    groups: groups.map((g) => ({ group: g, rank: rank.get(g)! })),
  };
}
