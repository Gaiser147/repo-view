import { test as base, expect } from "@playwright/test";
/** Returning-visitor state: skips the first-run start screen and tips so tests begin in the demo. */
export const returning = () => {
  localStorage.setItem("repo-view:started", "1");
  localStorage.setItem("repo-view:hints", "done");
};
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(returning);
    await use(page);
  },
});
export { expect };
