import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startProfileFixtureServer } from "./server.mjs";
import { browserOptions } from "../browser-options.mjs";
import { checkPodium } from "./podium.mjs";
import { checkProfileCharm } from "./charm.mjs";

// Run with: node tests/browser/profiles/check.mjs
// Uses installed Chrome by default; PLAYWRIGHT_CHANNEL can select another installed channel.
const { server, url } = await startProfileFixtureServer();
const output = await mkdtemp(path.join(os.tmpdir(), "typesetgo-profiles-"));
let browser;
const errors = [];
const blockedRequests = [];
const checks = [];

try {
  browser = await chromium.launch(browserOptions());
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin === url) return route.continue();
    blockedRequests.push(route.request().url());
    return route.abort();
  });

  async function open(route, { scenario = "owner", theme = "dark", width = 390, height = 844, zoom = 1, reducedMotion = "reduce", podiumCount, palette } = {}) {
    // Browser zoom changes the available CSS viewport; CSS zoom does not correctly
    // emulate viewport units in fixed dialogs. Exercise the equivalent reflow size.
    await page.setViewportSize({ width: Math.floor(width / zoom), height: Math.floor(height / zoom) });
    await page.emulateMedia({ reducedMotion });
    const query = new URLSearchParams({ scenario, theme });
    if (podiumCount !== undefined) query.set("podiumCount", String(podiumCount));
    if (palette) query.set("palette", palette);
    await page.goto(`${url}${route}?${query}`);
    await page.locator("#root > *").first().waitFor();
    await page.waitForTimeout(200);
  }

  async function noOverflow(label) {
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert.ok(sizes.content <= sizes.viewport + 1, `${label}: ${JSON.stringify(sizes)}`);
  }

  async function dialogWithinViewport(label) {
    const bounds = await page.getByRole("dialog").last().boundingBox();
    const viewport = page.viewportSize();
    assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, `${label}: ${JSON.stringify(bounds)}`);
  }

  const matrix = [
    { width: 320, height: 740, theme: "light", reducedMotion: "reduce" },
    { width: 390, height: 844, theme: "dark", reducedMotion: "no-preference" },
    { width: 768, height: 900, theme: "light", reducedMotion: "reduce" },
    { width: 1440, height: 1000, theme: "dark", reducedMotion: "no-preference" },
    { width: 1280, height: 900, theme: "light", zoom: 2, reducedMotion: "reduce" },
  ];
  for (const options of matrix) {
    const label = `${options.width}-${options.theme}-${options.zoom ?? 1}x`;
    await open("/user/profile-owner", options);
    await expect(page.getByRole("heading", { name: "Lifetime statistics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent test history" })).toBeVisible();
    await noOverflow(`profile ${label}`);
    await page.screenshot({ path: path.join(output, `profile-${label}.png`) });
    const card = page.getByRole("button", { name: /^Best WPM:/ });
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Recent WPM" })).toBeVisible();
    await expect(page.getByText("Lifetime best WPM: 180", { exact: true })).toBeVisible();
    await expect(page.getByText(/Tests shown: 99 of the latest 100 saved/)).toBeVisible();
    await dialogWithinViewport(`chart ${label}`);
    await page.screenshot({ path: path.join(output, `chart-${label}.png`) });
    await page.keyboard.press("Escape");
    await expect(card).toBeFocused();
    await open("/leaderboard", options);
    for (const name of ["All-Time", "Today", "This Week"]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
    await noOverflow(`leaderboard ${label}`);
    await page.screenshot({ path: path.join(output, `leaderboard-${label}.png`) });
    checks.push(`layout, chart keyboard focus, and leaderboard ranges: ${label}`);
  }

  await open("/user/profile-owner");
  await page.getByRole("button", { name: /^Best WPM:/ }).click();
  const sampleToggle = page.getByRole("button", { name: "Highest in sample", exact: true });
  await sampleToggle.focus();
  await page.keyboard.press("Space");
  await expect(sampleToggle).toHaveAttribute("aria-pressed", "false");
  const disclosure = page.locator("summary", { hasText: "View chart data (99 tests)" });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  const dataTable = page.getByRole("table", { name: "Recent chart tests, oldest first" });
  await expect(dataTable).toBeVisible();
  await expect(dataTable.getByRole("row")).toHaveCount(100);
  await expect(dataTable).toContainText("89 (highest in sample)");
  await page.keyboard.press("Escape");
  checks.push("lifetime best outside recent sample, sample toggles and keyboard chart-data disclosure");
  const row = page.getByRole("button", { name: /View details/ }).first();
  await row.focus();
  await page.keyboard.press("Enter");
  const detail = page.getByRole("dialog", { name: "Test details", exact: true });
  await expect(detail).toBeVisible();
  await expect(detail.getByText("Not recorded", { exact: true })).toHaveCount(4);
  await dialogWithinViewport("test details");
  const deleteButton = page.getByRole("button", { name: "Delete test", exact: true });
  await deleteButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alertdialog", { name: "Delete this test?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detail).toBeVisible();
  await expect(deleteButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(row).toBeFocused();
  checks.push("legacy values and nested delete dialog keyboard restoration");

  for (const scenario of ["visitor", "anonymous"]) {
    await open("/user/profile-owner", { scenario });
    await expect(page.getByRole("button", { name: /Refresh achievements/i })).toHaveCount(0);
    await page.getByRole("button", { name: /View details/ }).first().click();
    await expect(page.getByRole("button", { name: "Delete test", exact: true })).toHaveCount(0);
    assert.deepEqual(await page.evaluate(() => window.profileFixtureCalls), []);
    checks.push(`${scenario}: public profile is read-only`);
  }

  await open("/user/profile-owner", { width: 320, height: 740, theme: "light" });
  const refresh = page.getByRole("button", { name: "Refresh achievements", exact: true });
  await refresh.click();
  assert.deepEqual(await page.evaluate(() => window.profileFixtureCalls), [
    { name: "achievements:recheckAllAchievements", args: { clerkId: "clerk-owner" } },
  ]);
  const category = page.getByRole("button", { name: /^Speed Demons:/ });
  await category.focus();
  await page.keyboard.press("Enter");
  const board = page.getByRole("dialog", { name: "All Achievements", exact: true });
  await expect(board).toBeVisible();
  await dialogWithinViewport("achievement board");
  await page.screenshot({ path: path.join(output, "achievements-320-light.png") });
  const achievement = board.getByRole("button", { name: /, (?:earned|not yet earned)$/ }).first();
  await achievement.focus();
  await page.keyboard.press("Enter");
  const achievementDetail = page.getByRole("dialog", { name: "Achievement details", exact: true });
  await expect(achievementDetail).toBeVisible();
  await dialogWithinViewport("achievement details");
  await achievementDetail.getByRole("button", { name: "Next achievement", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(achievementDetail.getByRole("status")).toHaveText(/^2 \//);
  await achievementDetail.getByRole("combobox", { name: "Choose achievement" }).selectOption("3");
  await expect(achievementDetail.getByRole("status")).toHaveText(/^4 \//);
  await page.screenshot({ path: path.join(output, "achievement-detail-320-light.png") });
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    assert.ok(await achievementDetail.evaluate((element) => element.contains(document.activeElement)), "Focus must remain inside nested achievement dialog");
  }
  await page.keyboard.press("Escape");
  await expect(board).toBeVisible();
  await expect(achievement).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(category).toBeFocused();
  checks.push("owner refresh identity and nested achievement keyboard focus at 320px");

  await open("/user/profile-owner", { scenario: "error" });
  await page.getByRole("button", { name: "Refresh achievements", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Achievements could not be refreshed");
  await expect(page.getByRole("button", { name: "Refresh achievements", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: /View details/ }).first().click();
  await page.getByRole("button", { name: "Delete test", exact: true }).click();
  await page.getByRole("button", { name: "Confirm delete", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Delete this test?" }).getByRole("alert")).toBeVisible();
  checks.push("refresh and delete mutation failures remain recoverable");

  for (const scenario of ["empty", "loading"]) {
    await open("/leaderboard", { scenario, width: 320 });
    for (const name of ["All-Time", "Today", "This Week"]) {
      await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
    }
    await noOverflow(`leaderboard ${scenario}`);
  }
  for (const scenario of ["empty", "loading", "achievements-loading", "missing"]) {
    await open("/user/profile-owner", { scenario, width: 320 });
    await noOverflow(`profile ${scenario}`);
    await page.screenshot({ path: path.join(output, `profile-${scenario}.png`) });
  }
  checks.push("empty, loading, missing, and independent achievement loading states");

  await open("/notifications", { width: 320, theme: "light" });
  const notificationTrigger = page.getByRole("button", { name: /^Notifications/ });
  await notificationTrigger.focus();
  await page.keyboard.press("Enter");
  const notification = page.getByRole("button", { name: /^Fixture achievement unlocked/ });
  await notification.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "All Achievements", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(notificationTrigger).toBeFocused();
  checks.push("notification achievement dialog returns focus to surviving Notifications trigger");

  await checkPodium({ page, open, noOverflow, output, checks });
  await checkProfileCharm({ page, open, noOverflow, dialogWithinViewport, output, checks });

  assert.deepEqual(errors, [], "Browser errors");
  assert.deepEqual(blockedRequests, [], "Unexpected external requests (blocked before leaving localhost)");
  console.log(JSON.stringify({ checks, screenshots: output, browser: await browser.version() }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
