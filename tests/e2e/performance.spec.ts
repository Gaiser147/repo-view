import { test, expect } from "@playwright/test";
test("renders a deterministic 5,000-file repository without losing interaction", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForSelector("canvas");
  await page.evaluate(async () => {
    const useRepo = (window as unknown as { __repoViewStore: any })
      .__repoViewStore;
    const s = useRepo.getState(),
      base = s.snapshot,
      files = base.nodes.filter((n: any) => n.kind === "file");
    const nodes = Array.from({ length: 5000 }, (_, i) => {
      const file = files[i % files.length];
      return {
        ...file,
        id: `${file.group}/bench/file-${i}.ts`,
        path: `${file.group}/bench/file-${i}.ts`,
        name: `file-${i}.ts`,
      };
    });
    const groups = base.nodes.filter((n: any) => n.kind === "package");
    const edges = nodes.map((n: any, i: number) => ({
      id: `bench:${i}`,
      source: n.id,
      target: nodes[(i + 1) % nodes.length].id,
      kind: "import",
    }));
    s.replace({
      ...base,
      nodes: [...groups, ...nodes],
      edges,
      coverage: { ...base.coverage, total: 5000, analyzed: 5000 },
    });
  });
  await expect(page.getByText("5K files", { exact: false })).toBeVisible();
  await page.waitForTimeout(1500);
  const fps = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const times: number[] = [];
        let start = performance.now(),
          last = start;
        function frame(now: number) {
          times.push(now - last);
          last = now;
          if (now - start > 2500)
            resolve(1000 / (times.reduce((a, b) => a + b, 0) / times.length));
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  console.log(
    `BENCHMARK 5000 files / 5000 edges / 1440×1000 / ${fps.toFixed(1)} FPS / Chromium SwiftShader`,
  );
  expect(fps).toBeGreaterThan(10); // Software-renderer floor; hardware target is 30 FPS.
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Layers", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
