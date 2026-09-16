import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "../../e2e",
  testMatch: "connect-ui.spec.ts",
  outputDir: "/tmp/typesetgo-connect-browser-results",
  use: {
    baseURL: "http://127.0.0.1:54319",
    browserName: "chromium",
    channel: "chrome",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  webServer: {
    command: "bunx vite --config tests/fixtures/connect-browser/vite.config.ts",
    cwd: "../../..",
    url: "http://127.0.0.1:54319/connect",
    reuseExistingServer: false,
  },
});
