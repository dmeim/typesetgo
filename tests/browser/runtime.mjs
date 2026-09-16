import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { browserOptions } from "./browser-options.mjs";

export const fixtureOrigin = "http://127.0.0.1:4317";
const failures = new WeakMap();
const pageFailures = new WeakMap();
const output = process.env.TYPESETGO_BROWSER_ARTIFACTS
  ?? path.join(os.tmpdir(), "typesetgo-browser-acceptance");
await mkdir(output, { recursive: true });

export function artifactPath(name) {
  return path.join(output, name);
}

function blockRequest(route, errors, origin) {
  const url = new URL(route.request().url());
  if (url.origin === origin) return false;
  errors.push("Blocked unexpected request: " + url.origin + url.pathname);
  return true;
}

// Page-level mocks must preserve the same origin fence as the context route.
export async function routeFixtureRequests(page, handler) {
  const state = pageFailures.get(page);
  assert.ok(state, "Use a guarded fixture page before installing mocks");
  await page.route("**/*", (route) => blockRequest(route, state.errors, state.origin)
    ? route.abort()
    : handler(route, new URL(route.request().url())));
}

export async function guardFixtureContext(context, origin) {
  const errors = [];
  const watchPage = (page) => {
    pageFailures.set(page, { errors, origin });
    page.on("pageerror", (error) => errors.push(error.message));
  };
  context.on("page", watchPage);
  context.pages().forEach(watchPage);
  await context.route("**/*", (route) => blockRequest(route, errors, origin)
    ? route.abort()
    : route.continue());
  await context.routeWebSocket("**/*", (socket) => {
    const url = new URL(socket.url());
    if (url.origin === origin.replace("http:", "ws:")) {
      socket.connectToServer();
    } else {
      errors.push("Blocked unexpected WebSocket: " + url.origin + url.pathname);
      socket.close({ code: 1008, reason: "Fixture origin only" });
    }
  });
  return errors;
}

export async function launchFixtureBrowser() {
  const browser = await chromium.launch(browserOptions());
  const contextErrors = [];
  failures.set(browser, contextErrors);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options = {}) => {
    const context = await newContext({ ...options, serviceWorkers: "block" });
    contextErrors.push(await guardFixtureContext(context, fixtureOrigin));
    return context;
  };
  browser.newPage = async (options) => {
    const context = await browser.newContext(options);
    return context.newPage();
  };
  return browser;
}

export async function assertBrowserClean(browser) {
  // Includes errors from pages a scenario already closed and always releases Chrome.
  await browser.close();
  assert.deepEqual(failures.get(browser)?.flat(), [], "Unexpected page errors or external requests");
}

export async function withFixtureBrowser(scenario) {
  const browser = await launchFixtureBrowser();
  const errors = [];
  try {
    await scenario(browser);
  } catch (error) {
    errors.push(error);
    for (const [index, page] of browser.contexts().flatMap((context) => context.pages()).entries()) {
      await page.screenshot({
        path: artifactPath("failure-" + path.basename(process.argv[1], ".mjs") + "-" + index + ".png"),
      }).catch(() => {});
    }
  } finally {
    try {
      await assertBrowserClean(browser);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, "Fixture scenario and browser checks failed");
}

export async function visibleBounds(locator) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  assert.ok(bounds && bounds.width > 0 && bounds.height > 0, "Expected nonzero rendered geometry");
  return bounds;
}

export async function expectWithinViewport(page, locator) {
  const bounds = await visibleBounds(locator);
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(-1);
  expect(bounds.y).toBeGreaterThanOrEqual(-1);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  return bounds;
}

export async function expectCaretInside(page) {
  const caret = page.locator("[data-typing-caret]");
  const area = page.locator(".cursor-text");
  await expect.poll(async () => {
    const c = await caret.boundingBox();
    const a = await area.boundingBox();
    return Boolean(c && a && c.width > 0 && c.height > 0 && a.width > 0 && a.height > 0
      && c.x >= a.x - 1 && c.y >= a.y - 1
      && c.x + c.width <= a.x + a.width + 1
      && c.y + c.height <= a.y + a.height + 1);
  }).toBe(true);
}
