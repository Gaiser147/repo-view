import { test, expect } from "@playwright/test";
test("groups can be isolated in Layers and restored, while the distant cloud retains files", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => (window as any).__repoViewGraph?.controls);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("button", { name: "Group visibility" }).click();
  await page.getByRole("button", { name: "Only apps", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Show tests", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Show all groups" }).click();
  await page.getByRole("button", { name: "Close group visibility" }).click();
  await page.evaluate(() => {
    const s = (window as any).__repoViewStore.getState();
    s.set({ reducedMotion: true });
    const g = (window as any).__repoViewGraph;
    g.camera.position.copy(g.controls.target).add({ x: 0, y: 0, z: 150 });
    g.controls.update();
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        let n = 0;
        (window as any).__repoViewGraph.scene.traverse((o: any) => {
          if (o.userData.repoNodes)
            n = o.userData.ids.filter(
              (id: string) => !id.startsWith("pkg:"),
            ).length;
        });
        return n;
      }),
    )
    .toBeGreaterThan(400);
});
test("branch switch is directly available at the current branch", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch branch" }).click();
  await expect(
    page.getByRole("searchbox", { name: "Find or enter branch" }),
  ).toBeVisible();
  await expect(
    page.getByText("Demo has one illustrative branch."),
  ).toBeVisible();
});

test("detail labels settle at separate nodes in reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForFunction(() => (window as any).__repoViewGraph?.controls);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(() => page.locator(".node-label:visible").count())
    .toBeGreaterThan(1);
  await expect
    .poll(() =>
      page.locator(".node-label:visible").evaluateAll((labels) => {
        const rects = labels.map((l) => l.getBoundingClientRect());
        return rects.every((r, i) =>
          rects.every(
            (q, j) =>
              i === j ||
              r.right <= q.left ||
              r.left >= q.right ||
              r.bottom <= q.top ||
              r.top >= q.bottom,
          ),
        );
      }),
    )
    .toBe(true);
});

test("an isolated layer is elevated and framed around its files on tablet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForFunction(() => (window as any).__repoViewGraph?.controls);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("button", { name: "Group visibility" }).click();
  await page.getByRole("button", { name: "Only apps", exact: true }).click();
  await page.getByRole("button", { name: "Close group visibility" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__repoViewGraph,
          offset = g.camera.position.clone().sub(g.controls.target);
        let mesh: any;
        g.scene.traverse((o: any) => {
          if (o.userData.repoNodes) mesh = o;
        });
        const ids = mesh.userData.ids,
          positions = mesh.geometry.attributes.position.array;
        return (
          offset.y / offset.length() > 0.3 &&
          ids.every((id: string, i: number) => {
            if (!id.startsWith("apps/")) return true;
            const p = g.camera.position
              .clone()
              .fromArray(positions, i * 3)
              .project(g.camera);
            return Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95;
          })
        );
      }),
    )
    .toBe(true);
});
