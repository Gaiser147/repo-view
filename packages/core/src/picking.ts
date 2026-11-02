export interface ScreenNode {
  id: string;
  x: number;
  y: number;
  z: number;
}
/** Match the painted point in screen pixels, independent of scene scale/depth. */
export function nearestScreenNode(
  x: number,
  y: number,
  nodes: ScreenNode[],
  radius: number,
): string | null {
  let best: string | null = null,
    distance = radius * radius,
    depth = Infinity;
  for (const node of nodes) {
    if (node.z < -1 || node.z > 1) continue;
    const next = (node.x - x) ** 2 + (node.y - y) ** 2;
    if (
      next < distance - 0.25 ||
      (Math.abs(next - distance) < 0.25 && node.z < depth)
    ) {
      best = node.id;
      distance = next;
      depth = node.z;
    }
  }
  return best;
}
