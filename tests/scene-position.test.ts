import { expect, it } from "vitest";
import { scenePosition } from "../packages/core/src/scene-position";
const position = {
  cloud: [1, 2, 3] as [number, number, number],
  layers: [4, 5, 6] as [number, number, number],
  focus: [7, 8, 9] as [number, number, number],
};
it("uses the same focused and custom-layer positions for camera and geometry", () => {
  expect(
    scenePosition(position, "apps/api/a.ts", "apps", {
      morph: 0,
      focus: "apps",
    }),
  ).toEqual([7, 8, 9]);
  expect(
    scenePosition(position, "apps/api/a.ts", "apps", {
      morph: 1,
      rules: { "apps/**": "2" },
    }),
  ).toEqual([4, -1.9, 6]);
  expect(
    scenePosition(position, "pkg:apps", "apps", {
      morph: 1,
      rules: { "apps/**": "2" },
    }),
  ).toEqual([4, -1.9, 6]);
});
