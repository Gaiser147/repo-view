import { test, expect } from "./fixtures";
test("explore morph, focus, search, history and health", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Repository explorer" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Layers", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cloud", exact: true }).click();
  await page.getByRole("button", { name: "Group visibility" }).click();
  await page
    .getByRole("button", { name: "Focus group apps", exact: true })
    .click();
  await page.getByRole("button", { name: "Close group visibility" }).click();
  await expect(page.getByRole("button", { name: "Exit focus" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Exit focus" }),
  ).not.toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search repository" })
    .fill("session");
  await page
    .getByRole("option", { name: /session/ })
    .first()
    .click();
  await expect(
    page.getByRole("complementary", { name: "Inspector" }),
  ).toBeVisible();
  const sha = await page.getByTestId("commit-sha").textContent();
  await page.getByRole("button", { name: "Previous commit" }).click();
  await expect(page.getByTestId("commit-sha")).not.toHaveText(sha!);
  await page.getByRole("button", { name: "Repository health" }).click();
  await expect(page.getByText("heuristic-v1", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Pipelines", exact: true }).click();
  await expect(page.getByText("Workflow jobs")).toBeVisible();
});
test("validates repository input without leaving the current graph", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open repository" }).click();
  await page.getByLabel("Repository URL").fill("https://example.com/a/b");
  await page.getByRole("button", { name: "Analyze repository" }).click();
  await expect(page.getByRole("alert")).toContainText("github.com");
});
test("mobile and reduced motion retain navigable data", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle files" }).click();
  await expect(
    page.getByRole("complementary", { name: "Files" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close files" }).click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Layers", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("reduced-motion mode changes the rendered graph, not just the layout toggle", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForSelector("canvas");
  await page.waitForTimeout(600);
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Missing graph canvas");
  const clip = {
    x: box.x + 70,
    y: box.y + 135,
    width: box.width - 140,
    height: box.height - 255,
  };
  const before = await page.screenshot({ clip });
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.waitForTimeout(300);
  const after = await page.screenshot({ clip });
  expect(before.equals(after)).toBe(false);
});

test("first visit offers a start screen and tips, then lenses re-ink the same plan", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Open a repository" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /acme\/atlas-commerce/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Start with a question" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip tips" }).click();
  await page.getByRole("button", { name: "Hotspots", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Hotspots lens" }),
  ).toContainText("changes");
  await page.keyboard.press("6");
  await expect(
    page.getByRole("button", { name: "Evolution", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await context.close();
});
test("comparing two revisions marks the difference and survives a shared link", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForSelector("canvas");
  const track = await page.locator(".spine-track").boundingBox();
  if (!track) throw new Error("Time spine missing");
  const y = track.y + track.height - 6;
  await page.mouse.move(track.x + track.width * 0.4, y);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width * 0.7, y, { steps: 6 });
  await page.mouse.up();
  await expect(
    page.getByRole("region", { name: "Evolution lens" }),
  ).toContainText("chosen base");
  await expect(page.getByTestId("commit-sha")).toBeVisible();
  await expect.poll(() => page.url()).toContain("from=");
  const url = page.url();
  await page.goto(url);
  await expect(
    page.getByRole("region", { name: "Evolution lens" }),
  ).toContainText("chosen base");
  await page.getByRole("button", { name: "Clear comparison" }).first().click();
  await expect(
    page.getByRole("region", { name: "Evolution lens" }),
  ).not.toContainText("chosen base");
});

test("impact lens, floor plan and back/forward work together", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Plan", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Impact", exact: true }).click();
  const card = page.getByRole("region", { name: "Impact lens" });
  await expect(card).toContainText("Select a file");
  await card.locator(".legend-list button").first().click();
  await expect(card).toContainText(/depend on|Nothing indexed depends/);
  await expect(
    page.getByRole("navigation", { name: "Location" }),
  ).toContainText(".ts");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(card).toContainText("Select a file");
  await page.keyboard.press("]");
  await expect(card).toContainText(/depend on|Nothing indexed depends/);
  await expect.poll(() => page.url()).toContain("layout=plan");
});
test("comparison filters changes and dims unchanged files", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForSelector("canvas");
  const track = await page.locator(".spine-track").boundingBox();
  if (!track) throw new Error("Time spine missing");
  const y = track.y + track.height - 6;
  await page.mouse.move(track.x + track.width * 0.85, y);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width * 0.97, y, { steps: 6 });
  await page.mouse.up();
  const card = page.getByRole("region", { name: "Evolution lens" });
  await expect(card).toContainText("chosen base");
  await card.getByRole("checkbox", { name: "Dim unchanged files" }).check();
  await card.getByRole("button", { name: /^Changed/ }).click();
  await expect(card.getByRole("button", { name: /^Changed/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await card.locator(".change-list button").first().click();
  await expect(
    page.getByRole("complementary", { name: "Inspector" }),
  ).toBeVisible();
});
test("flow, architecture and script views explain how the code runs", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "Flow", exact: true }).click();
  const card = page.getByRole("region", { name: "Flow lens" });
  await card.locator(".legend-list button").first().click();
  await expect(card).toContainText(/calls \d+ functions/);
  await card.getByRole("button", { name: "Open flow diagram" }).click();
  const flow = page.getByRole("region", { name: "Flow workspace" });
  await expect(flow.locator(".diagram-box").first()).toBeVisible();
  expect(await flow.locator(".diagram-box").count()).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Back to cloud" }).click();
  await card.getByRole("button", { name: "Architecture diagram" }).click();
  const arch = page.getByRole("region", { name: "Architecture workspace" });
  await expect(arch).toContainText("import routes");
  expect(await arch.locator(".diagram-link").count()).toBeGreaterThan(3);
  await page.getByRole("button", { name: "Back to cloud" }).click();
  await page.getByRole("button", { name: "Pipelines", exact: true }).click();
  await page.getByRole("button", { name: "npm scripts" }).click();
  await expect(
    page.getByRole("region", { name: "Pipelines workspace" }),
  ).toContainText("runs lint → test → build");
});
test("labels can be reduced and arrow keys orbit the camera", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => (window as any).__repoViewGraph?.controls);
  await page.getByRole("button", { name: /^Labels:/ }).click();
  await expect(
    page.getByRole("button", { name: "Labels: groups only" }),
  ).toBeVisible();
  await page.keyboard.press("l");
  await expect(page.getByRole("button", { name: "Labels: off" })).toBeVisible();
  const before = await page.evaluate(
    () => (window as any).__repoViewGraph.camera.position.x,
  );
  await page
    .locator("canvas")
    .focus()
    .catch(() => {});
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__repoViewGraph.camera.position.x),
    )
    .not.toBeCloseTo(before, 1);
});
