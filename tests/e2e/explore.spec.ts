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
  await page.keyboard.press("4");
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
