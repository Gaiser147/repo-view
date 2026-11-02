import { expect, it } from "vitest";
import { hash, layoutGraph } from "../packages/core/src/layout";
import { createDemoSnapshot } from "../packages/core/src/demo";
it("decorrelates spatial axes so a cloud fills volume rather than a thin ring", () => {
  const values = Array.from({ length: 200 }, (_, i) => [
    hash(`file-${i}u`) / 2 ** 32,
    hash(`file-${i}v`) / 2 ** 32,
  ]);
  const mean = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const x = values.map((v) => v[0]),
    y = values.map((v) => v[1]),
    mx = mean(x),
    my = mean(y);
  const corr =
    mean(values.map((v) => (v[0] - mx) * (v[1] - my))) /
    Math.sqrt(
      mean(x.map((n) => (n - mx) ** 2)) * mean(y.map((n) => (n - my) ** 2)),
    );
  expect(Math.abs(corr)).toBeLessThan(0.2);
  const l = layoutGraph(createDemoSnapshot().nodes);
  expect(Object.keys(l).length).toBeGreaterThan(1000);
});
