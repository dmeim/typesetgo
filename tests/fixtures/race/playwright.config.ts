import { defineConfig } from "@playwright/test";
import { browserOptions } from "../../browser/browser-options.mjs";

export default defineConfig({
  testDir: ".",
  testMatch: "race.browser.spec.ts",
  outputDir: "/tmp/typesetgo-race-browser-results",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4318",
    browserName: "chromium",
    launchOptions: browserOptions(),
    serviceWorkers: "block",
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
