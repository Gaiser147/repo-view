import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/pages",
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:4173/repo-view/",
    headless: true,
    launchOptions: {
      args: [
        "--enable-unsafe-swiftshader",
        "--use-gl=angle",
        "--use-angle=swiftshader",
      ],
    },
  },
  webServer: {
    command: "npm run build:pages && npm run preview:pages",
    url: "http://127.0.0.1:4173/repo-view/",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
