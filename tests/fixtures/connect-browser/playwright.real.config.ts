import { defineConfig } from "@playwright/test";
import base from "./playwright.config.ts";
export default defineConfig({
  ...base,
  testMatch: "connect-session.spec.ts",
  outputDir: "/tmp/typesetgo-connect-session-results",
  workers: 1,
  use: { ...base.use, baseURL: "http://127.0.0.1:54320" },
  webServer: {
    command: "bunx vite --config tests/fixtures/connect-browser/vite.real.config.ts",
    cwd: "../../..",
    url: "http://127.0.0.1:54320/connect",
    reuseExistingServer: false,
  },
});
