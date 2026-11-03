import { test, expect, returning } from "./fixtures";
test("graph labels retain selection, zoom reveals detail, and panels can be hidden", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "packages", exact: false })
    .filter({ has: page.locator(".cluster-dot") })
    .first()
    .click();
  await expect(
    page.getByRole("complementary", { name: "Inspector" }),
  ).toContainText("packages");
  await page.getByRole("button", { name: "Close inspector" }).click();
  await expect(
    page.getByRole("complementary", { name: "Inspector" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByTestId("graph-detail")).toContainText("Functions");
  await page.getByRole("button", { name: "Expand cloud" }).click();
  await expect(
    page.getByRole("button", { name: "Exit fullscreen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Files" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Exit fullscreen" }).click();
});
test("analysis views are closeable workspaces and tablet controls fit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  const open = {
    Dependencies: async () => {
      await page
        .getByRole("button", { name: "Dependencies", exact: true })
        .click();
      await page
        .getByRole("button", { name: "All imports and packages" })
        .click();
    },
    Functions: async () => {
      await page
        .getByRole("button", { name: "Dependencies", exact: true })
        .click();
      await page.getByRole("button", { name: "Function calls" }).click();
    },
    Pipelines: () =>
      page.getByRole("button", { name: "Pipelines", exact: true }).click(),
  };
  for (const view of ["Dependencies", "Functions", "Pipelines"] as const) {
    await open[view]();
    await expect(
      page.getByRole("region", { name: `${view} workspace` }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back to cloud" }).click();
    await expect(
      page.getByRole("region", { name: `${view} workspace` }),
    ).not.toBeVisible();
  }
  await page.getByRole("button", { name: "Hide history" }).click();
  await expect(
    page.getByRole("region", { name: "Commit history" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Show history" }).click();
  await expect(
    page.getByRole("region", { name: "Commit history" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("direct canvas picking selects the point under the pointer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForFunction(() => (window as any).__repoViewGraph?.controls);
  await page.waitForTimeout(1200);
  const target = await page.evaluate(() => {
    const graph = (window as any).__repoViewGraph;
    if (!graph) throw new Error("Graph unavailable");
    let cloud: any;
    graph.scene.traverse((object: any) => {
      if (object.userData.repoNodes) cloud = object;
    });
    const positions = cloud.geometry.attributes.position.array,
      box = graph.canvas.getBoundingClientRect();
    const projected: any[] = [];
    for (let i = 0; i < cloud.userData.ids.length; i++) {
      const p = graph.camera.position
        .clone()
        .fromArray(positions, i * 3)
        .project(graph.camera);
      const x = box.x + ((p.x + 1) * box.width) / 2,
        y = box.y + ((1 - p.y) * box.height) / 2;
      if (
        p.z >= -1 &&
        p.z <= 1 &&
        x > box.x + 40 &&
        x < box.right - 40 &&
        y > box.y + 130 &&
        y < box.bottom - 100 &&
        document.elementFromPoint(x, y) === graph.canvas
      )
        projected.push({ id: cloud.userData.ids[i], x, y });
    }
    const isolated = projected.find((p) =>
      projected.every(
        (q) => q.id === p.id || Math.hypot(p.x - q.x, p.y - q.y) > 10,
      ),
    );
    if (!isolated) throw new Error("No isolated visible node");
    return isolated;
  });
  await page.mouse.click(target.x, target.y);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__repoViewStore.getState().selectedId,
      ),
    )
    .toBe(target.id);
});

test("tablet pinch zooms without selecting and panels use a single drawer", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: true,
  });
  await context.addInitScript(returning);
  const page = await context.newPage();
  await page.goto("/");
  await page.waitForFunction(() => (window as any).__repoViewGraph?.controls);
  await page.waitForTimeout(1200);
  const distance = () =>
    page.evaluate(() => {
      const g = (window as any).__repoViewGraph;
      return g.camera.position.distanceTo(g.controls.target);
    });
  const before = await distance(),
    box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Canvas missing");
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2,
    client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 35, y, id: 1 },
      { x: x + 35, y, id: 2 },
    ],
  });
  for (let i = 1; i <= 6; i++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 35 - i * 10, y, id: 1 },
        { x: x + 35 + i * 10, y, id: 2 },
      ],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(distance).toBeLessThan(before * 0.9);
  await page.getByRole("button", { name: "Toggle files" }).click();
  await expect(
    page.getByRole("complementary", { name: "Files" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Repository health" }).click();
  await expect(
    page.getByRole("complementary", { name: "Inspector" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Files" }),
  ).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("focused function stays in frame and browser shortcuts remain native", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForFunction(() => (window as any).__repoViewGraph?.controls);
  const id = await page.evaluate(() => {
    const store = (window as any).__repoViewStore,
      state = store.getState(),
      fn = state.snapshot.nodes.find(
        (n: any) => n.kind === "function" && n.group === "tests",
      );
    state.set({ focus: "tests", reducedMotion: true });
    state.select(fn.id);
    return fn.id;
  });
  await page.waitForTimeout(250);
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const g = (window as any).__repoViewGraph;
        let mesh: any;
        g.scene.traverse((o: any) => {
          if (o.userData.repoNodes) mesh = o;
        });
        const i = mesh.userData.ids.indexOf(id);
        if (i < 0) return false;
        const p = g.camera.position
          .clone()
          .fromArray(mesh.geometry.attributes.position.array, i * 3)
          .project(g.camera);
        return Math.abs(p.x) < 0.85 && Math.abs(p.y) < 0.85;
      }, id),
    )
    .toBe(true);
  const revision = await page.evaluate(
    () => (window as any).__repoViewStore.getState().cameraCommand.revision,
  );
  await page.keyboard.press("Control+Equal");
  expect(
    await page.evaluate(
      () => (window as any).__repoViewStore.getState().cameraCommand.revision,
    ),
  ).toBe(revision);
  await page.keyboard.press("Control+f");
  expect(
    await page.evaluate(
      () => (window as any).__repoViewStore.getState().expanded,
    ),
  ).toBe(false);
});
