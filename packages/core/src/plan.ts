import type { CodeNode, Vec3 } from "./index";

/** A room on the floor plan: a group, folder or file drawn as a rectangle. */
export interface PlanFrame {
  id: string;
  label: string;
  kind: "group" | "folder" | "file";
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Item {
  id: string;
  label: string;
  kind: PlanFrame["kind"];
  weight: number;
  children: Item[];
  node?: CodeNode;
}
type Rect = { x: number; y: number; w: number; h: number };

const WIDTH = 34,
  HEIGHT = 20;

function worst(row: number[], side: number) {
  const sum = row.reduce((a, b) => a + b, 0),
    max = Math.max(...row),
    min = Math.min(...row);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}
/** Squarified treemap: lays weighted items into a rectangle with rooms as close to square as possible. */
export function squarify<T extends { weight: number }>(items: T[], rect: Rect) {
  const out: { item: T; rect: Rect }[] = [],
    total = items.reduce((a, b) => a + b.weight, 0);
  if (!items.length || total <= 0 || rect.w <= 0 || rect.h <= 0) return out;
  const scale = (rect.w * rect.h) / total,
    queue = [...items].sort((a, b) => b.weight - a.weight);
  let free = { ...rect };
  while (queue.length) {
    const side = Math.min(free.w, free.h),
      row: T[] = [queue.shift()!];
    while (queue.length) {
      const areas = row.map((r) => r.weight * scale),
        next = [...areas, queue[0].weight * scale];
      if (worst(next, side) > worst(areas, side)) break;
      row.push(queue.shift()!);
    }
    const area = row.reduce((a, r) => a + r.weight * scale, 0),
      horizontal = free.w >= free.h,
      thickness = area / (horizontal ? free.h : free.w);
    let offset = 0;
    for (const item of row) {
      const length = (item.weight * scale) / thickness;
      out.push({
        item,
        rect: horizontal
          ? { x: free.x, y: free.y + offset, w: thickness, h: length }
          : { x: free.x + offset, y: free.y, w: length, h: thickness },
      });
      offset += length;
    }
    free = horizontal
      ? { x: free.x + thickness, y: free.y, w: free.w - thickness, h: free.h }
      : { x: free.x, y: free.y + thickness, w: free.w, h: free.h - thickness };
  }
  return out;
}

function tree(nodes: CodeNode[]): Item[] {
  const groups = new Map<string, Item>();
  for (const n of nodes) {
    if (n.kind !== "file") continue;
    let group = groups.get(n.group);
    if (!group) {
      group = { id: `pkg:${n.group}`, label: n.group, kind: "group", weight: 0, children: [] };
      groups.set(n.group, group);
    }
    const parts = n.path.split("/"),
      start = parts[0] === n.group ? 1 : 0;
    let parent = group;
    for (let i = start; i < parts.length - 1; i++) {
      const id = `dir:${parts.slice(0, i + 1).join("/")}`;
      let folder = parent.children.find((c) => c.id === id);
      if (!folder) {
        folder = { id, label: parts[i], kind: "folder", weight: 0, children: [] };
        parent.children.push(folder);
      }
      parent = folder;
    }
    parent.children.push({
      id: n.id,
      label: n.name,
      kind: "file",
      weight: Math.max(1, n.loc) + 12,
      children: [],
      node: n,
    });
  }
  const sum = (item: Item): number =>
    item.children.length
      ? (item.weight = item.children.reduce((a, c) => a + sum(c), 0))
      : item.weight;
  for (const g of groups.values()) sum(g);
  // A folder with a single child folder collapses into it, so the plan does not nest empty corridors.
  const collapse = (item: Item): Item => {
    item.children = item.children.map(collapse);
    if (item.kind === "folder" && item.children.length === 1 && item.children[0].kind === "folder") {
      const only = item.children[0];
      return { ...only, label: `${item.label}/${only.label}` };
    }
    return item;
  };
  return [...groups.values()].map(collapse);
}

/**
 * Floor plan of the repository: groups, folders and files as nested rooms
 * sized by lines of code, centred on the origin in the XY plane. Returns a
 * position per node (files at the centre of their room, functions on a grid
 * inside it, groups at their room's top-left corner) and the frames to draw.
 */
export function planLayout(nodes: CodeNode[]) {
  const positions = new Map<string, Vec3>(),
    frames: PlanFrame[] = [];
  const place = (item: Item, rect: Rect, depth: number) => {
    frames.push({ id: item.id, label: item.label, kind: item.kind, depth, ...rect });
    if (item.kind === "file") {
      positions.set(item.id, [rect.x + rect.w / 2 - WIDTH / 2, HEIGHT / 2 - (rect.y + rect.h / 2), 0]);
      return;
    }
    if (item.kind === "group")
      positions.set(item.id, [rect.x - WIDTH / 2 + 0.2, HEIGHT / 2 - rect.y + 0.35, 0]);
    // Rooms keep a margin and a header strip for their name.
    const pad = Math.min(0.18, rect.w * 0.06, rect.h * 0.06),
      header = item.kind === "group" ? Math.min(0.55, rect.h * 0.18) : Math.min(0.32, rect.h * 0.14),
      inner = {
        x: rect.x + pad,
        y: rect.y + pad + header,
        w: Math.max(0, rect.w - pad * 2),
        h: Math.max(0, rect.h - pad * 2 - header),
      };
    for (const { item: child, rect: r } of squarify(item.children, inner)) place(child, r, depth + 1);
  };
  for (const { item, rect } of squarify(tree(nodes), { x: 0, y: 0, w: WIDTH, h: HEIGHT }))
    place(item, rect, 0);
  // Functions sit on a small grid inside their file's room.
  const byFile = new Map<string, CodeNode[]>();
  for (const n of nodes)
    if (n.kind === "function" && n.parent)
      byFile.set(n.parent, [...(byFile.get(n.parent) ?? []), n]);
  const frameOf = new Map(frames.map((f) => [f.id, f]));
  for (const [file, fns] of byFile) {
    const f = frameOf.get(file);
    if (!f) continue;
    const cols = Math.ceil(Math.sqrt(fns.length)),
      rows = Math.ceil(fns.length / cols);
    fns.forEach((fn, i) => {
      const cx = f.x + (f.w * ((i % cols) + 0.5)) / cols,
        cy = f.y + (f.h * (Math.floor(i / cols) + 0.5)) / rows;
      positions.set(fn.id, [cx - WIDTH / 2, HEIGHT / 2 - cy, 0.05]);
    });
  }
  return { positions, frames, width: WIDTH, height: HEIGHT };
}
