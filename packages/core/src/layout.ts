import type { CodeNode, Layout, NodePosition, Vec3 } from "./index";
import { planLayout } from "./plan";
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
function random(s: string): number {
  return hash(s) / 4294967295;
}
export const GROUPS = [
  "apps",
  "packages",
  "services",
  "tests",
  "infra",
  ".github",
  "docs",
  "root",
];
export function groupIndex(group: string): number {
  const i = GROUPS.indexOf(group);
  return i >= 0 ? i : (hash(group) % 12) + 8;
}
export function layoutGraph(nodes: CodeNode[]): Layout {
  const result: Layout = {};
  const plan = planLayout(nodes).positions;
  const groups = [...new Set(nodes.map((n) => n.group))].sort();
  for (const n of nodes) {
    const i = groupIndex(n.group),
      angle = i * 2.399963,
      rad = 3.8 + Math.sqrt(i) * 1.8;
    const center: Vec3 = [
      Math.cos(angle) * rad,
      Math.sin(angle) * rad * 0.65,
      ((i % 3) - 1) * 2,
    ];
    const u = random(n.id + "u"),
      v = random(n.id + "v"),
      r = Math.cbrt(random(n.id + "r")) * (n.kind === "function" ? 3.4 : 3.1),
      theta = u * Math.PI * 2,
      phi = Math.acos(2 * v - 1);
    const offset: Vec3 = [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
    const slot = groups.indexOf(n.group),
      col = Math.floor(i / 4),
      layer: Vec3 = [
        (u - 0.5) * 15 + col * 2,
        ((groups.length - 1) / 2 - slot) * 2.6,
        (v - 0.5) * 8,
      ];
    result[n.id] = {
      cloud:
        n.kind === "package"
          ? center
          : [
              center[0] + offset[0],
              center[1] + offset[1],
              center[2] + offset[2],
            ],
      layers: n.kind === "package" ? [-8.5, layer[1], 0] : layer,
      focus: [
        center[0] + (u - 0.5) * 7,
        center[1] + (1 - (hash(n.path.split("/")[1] ?? "root") % 3)) * 2.5,
        center[2] + (v - 0.5) * 5,
      ],
      plan: plan.get(n.id) ?? [0, 0, 0],
    };
  }
  for (const node of nodes.filter((n) => n.kind === "function")) {
    const parent = node.parent ? result[node.parent] : undefined;
    if (!parent) continue;
    const angle = random(node.id + "child") * Math.PI * 2,
      offset: Vec3 = [
        Math.cos(angle) * 0.45,
        (random(node.id + "height") - 0.5) * 0.65,
        Math.sin(angle) * 0.45,
      ];
    result[node.id] = {
      cloud: parent.cloud.map((v, i) => v + offset[i]) as Vec3,
      layers: parent.layers.map((v, i) => v + offset[i] * 0.6) as Vec3,
      focus: parent.focus.map((v, i) => v + offset[i]) as Vec3,
      plan: plan.get(node.id) ?? parent.plan ?? [0, 0, 0],
    };
  }
  return result;
}
export function morphPosition(p: NodePosition, t: number): Vec3 {
  if (t <= 0) return [...p.cloud];
  if (t >= 1) return [...p.layers];
  return p.cloud.map((v, i) => v + (p.layers[i] - v) * t) as Vec3;
}
