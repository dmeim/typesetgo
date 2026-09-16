import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "race.browser.spec.ts",
  outputDir: "/tmp/typesetgo-race-browser-results",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4318",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bunx vite --config tests/fixtures/race/vite.config.ts",
    cwd: "../../..",
    url: "http://127.0.0.1:4318/race",
    // Refuse an occupied port so another worker's fixture cannot be tested accidentally.
    reuseExistingServer: false,
  },
});
