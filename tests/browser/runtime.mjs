import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const failures = new WeakMap();
const output = process.env.TYPESETGO_BROWSER_ARTIFACTS ?? path.join(os.tmpdir(), "typesetgo-browser-acceptance");
await mkdir(output, { recursive: true });

export function artifactPath(name) {
  return path.join(output, name);
}

export function browserOptions() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  return executablePath
    ? { headless: true, executablePath }
    : { headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" };
}

// Observe every page, including ones a scenario closes before its final checks.
export async function launchFixtureBrowser() {
  const browser = await chromium.launch(browserOptions());
  const errors = [];
  failures.set(browser, errors);
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.context().route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin === "http://127.0.0.1:4317") return route.continue();
      errors.push(`Blocked unexpected request: ${url.origin}${url.pathname}`);
      return route.abort();
    });
    return page;
  };
  return browser;
}

export async function assertBrowserClean(browser) {
  const errors = failures.get(browser) ?? [];
  // Close even when the assertion fails, so a failed check cannot hang the runner.
  await browser.close();
  assert.deepEqual(errors, [], "Unexpected page errors or external requests");
}
