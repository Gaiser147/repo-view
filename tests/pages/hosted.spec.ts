import { test, expect } from "@playwright/test";
const sha = "a".repeat(40);
test("Pages subpath loads assets and analyzes a public repo without an API server", async ({
  page,
  context,
}) => {
  const localApi: string[] = [],
    assetErrors: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (
      new URL(r.url()).origin === "http://127.0.0.1:4173" &&
      new URL(r.url()).pathname.startsWith("/api/")
    )
      localApi.push(r.url());
  });
  page.on("response", (r) => {
    if (r.url().includes("/repo-view/assets/") && r.status() >= 400)
      assetErrors.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    let json: any;
    if (url === "https://api.github.com/repos/example/project")
      json = { private: false, default_branch: "master" };
    else if (url.includes("/commits?"))
      json = [
        {
          sha,
          commit: {
            message: "Add hello",
            author: { name: "Sam", date: "2026-01-01" },
          },
        },
      ];
    else if (url.includes("/commits/")) json = { sha };
    else if (url.includes("/git/trees/"))
      json = {
        truncated: false,
        tree: [
          {
            path: "src/hello.ts",
            type: "blob",
            mode: "100644",
            sha: "file",
            size: 45,
          },
        ],
      };
    else if (url.includes("/actions/runs?")) json = { workflow_runs: [] };
    else throw new Error("Unexpected GitHub URL " + url);
    await route.fulfill({
      json,
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await context.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({
      body: "export function hello() { return 42; }",
      headers: {
        "access-control-allow-origin": "*",
        "content-type": "text/plain",
      },
    }),
  );
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Repository explorer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "repo-view home" }),
  ).toHaveAttribute("href", "/repo-view/");
  await page.getByRole("button", { name: "Open repository" }).click();
  await page
    .getByLabel("Repository URL")
    .fill("https://github.com/example/project");
  await page.getByRole("button", { name: "Analyze repository" }).click();
  await expect(
    page.getByRole("button", { name: "Open repository" }),
  ).toContainText("project", { timeout: 30000 });
  await expect(page.getByText("master", { exact: true })).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search repository" })
    .fill("hello");
  await page.getByRole("button", { name: /hello/ }).first().click();
  await expect(
    page.getByRole("complementary", { name: "Inspector" }),
  ).toContainText("hello");
  expect(localApi).toEqual([]);
  expect(assetErrors).toEqual([]);
  expect(errors).toEqual([]);
});
