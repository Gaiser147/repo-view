import { minimatch } from "minimatch";
import type { NodePosition, Vec3 } from "./index";
export function scenePosition(
  position: NodePosition,
  id: string,
  group: string,
  options: {
    morph: number;
    focus?: string | null;
    focusAmount?: number;
    rules?: Record<string, string>;
  },
): Vec3 {
  const { morph, focus, focusAmount = 1, rules = {} } = options;
  let layer = position.layers;
  if (Object.keys(rules).length) {
    const rule = Object.entries(rules).find(
      ([pattern]) =>
        group === pattern ||
        minimatch(id.split("#")[0], pattern, { dot: true }) ||
        (id.startsWith("pkg:") &&
          minimatch(`${group}/`, pattern, { dot: true })),
    );
    layer = [layer[0], rule ? (1.5 - Number(rule[1])) * 3.8 : -9.5, layer[2]];
  }
  if (morph >= 1) return [...layer];
  const amount = focus === group ? focusAmount * (1 - morph) : 0;
  if (morph <= 0 && amount >= 1) return [...position.focus];
  return position.cloud.map((v, i) => {
    const local = v + (position.focus[i] - v) * amount;
    return local + (layer[i] - local) * morph;
  }) as Vec3;
}
