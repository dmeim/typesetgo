import { withFixtureBrowser, artifactPath, routeFixtureRequests, fixtureOrigin, expectWithinViewport } from "../runtime.mjs";
import { expect } from "@playwright/test";
// Home settings live behind the collapsed summary pill.
async function openTestSettings(page) {
  const trigger = page.getByRole("button", { name: /^Test settings/ });
  if (await trigger.isVisible()) await trigger.click();
}
await withFixtureBrowser(async browser => {
  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 1000
    },
    reducedMotion: "reduce"
  });
  await routeFixtureRequests(page, async route => {
    const u = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(u.hostname)) return route.abort();
    if (u.pathname.startsWith("/words/") && !u.pathname.endsWith("/manifest.json")) return route.fulfill({
      json: ["cat"]
    });
    if (u.pathname.startsWith("/quotes/") && !u.pathname.endsWith("/manifest.json")) {
      await new Promise(r => setTimeout(r, 500));
      return route.fulfill({
        json: [{
          quote: "cat dog",
          author: "Fixture Author",
          source: "Fixture",
          date: "2026"
        }]
      });
    }
    return route.fallback();
  });
  const input = page.getByRole("textbox", {
    name: "Typing practice",
    exact: true
  });
  const words = page.locator("[data-typing-word]");
  const results = page.getByRole("region", {
    name: "Test results"
  });
  await page.goto(fixtureOrigin);
  await expect(input).toBeEnabled();
  const modes = page.getByRole("navigation", { name: "Practice modes" });
  // Wide: one centered pill holds everything. Phones: the logo row sits above a centered pill of pages and tools.
  const dock = page.locator("[data-header-dock]");
  const pagesPill = modes.locator("..");
  const expectPageCentered = async (locator) => {
    await expect.poll(async () => {
      const bounds = await locator.boundingBox();
      return bounds ? Math.abs(bounds.x + bounds.width / 2 - page.viewportSize().width / 2) : Infinity;
    }).toBeLessThan(1);
  };
  for (const width of [1920, 1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectPageCentered(width >= 768 ? dock : pagesPill);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of [
      modes.getByRole("link", { name: "Type", exact: true }),
      page.getByRole("link", { name: "Leaderboard", exact: true }),
      page.getByRole("link", { name: "Change theme", exact: true }),
      page.getByRole("link", { name: "Settings", exact: true }),
    ]) {
      await expectWithinViewport(page, control);
    }
    const modesBounds = await modes.boundingBox();
    const settingsBounds = await page.getByRole("link", { name: "Settings", exact: true }).boundingBox();
    expect(settingsBounds.x).toBeGreaterThanOrEqual(modesBounds.x + modesBounds.width);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Home has no theme or settings dialogs: the Dock sends both to the Profile tabs.
  await expect(page.getByRole("link", { name: "Change theme", exact: true })).toHaveAttribute("href", "/profile/theme");
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("href", "/profile/typing");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  console.log("dock header stays centered from 320 to 1920px with tools after the practice modes; theme/settings link to Profile PASS");
  await openTestSettings(page);
  await page.getByRole("radio", {
    name: "words",
    exact: true
  }).click();
  await expect(words).toHaveCount(25);
  await page.getByRole("radio", {
    name: "10",
    exact: true
  }).click();
  await expect(words).toHaveCount(10);
  await page.getByRole("radio", {
    name: "50",
    exact: true
  }).click();
  await expect(words).toHaveCount(50);
  await page.getByRole("radio", {
    name: "10",
    exact: true
  }).click();
  await expect(words).toHaveCount(10);
  console.log("counts25\u219210\u219250\u219210 PASS");
  await input.focus();
  await page.keyboard.press("Tab");
  await expect(input).not.toBeFocused();
  await input.fill("cattt");
  await expect(page.locator("[data-typing-caret]")).toHaveCount(1);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect(input).toHaveValue("cat");
  await input.fill(Array(10).fill("cat").join(" ") + " ");
  await expect(results).toBeVisible();
  // No heading row over the graph (the heading is for screen readers) and no help text under the buttons.
  await expect(results.getByRole("heading", { name: "Results", exact: true })).toHaveClass(/sr-only/);
  await expect(results.getByRole("button", { name: "About these results" })).toHaveCount(0);
  await expect(results.getByText("will not appear on leaderboards", { exact: false })).toHaveCount(0);
  await expect(results).toBeFocused();
  // Results sit centered at their natural size with room around them, rather than stretching to fill the page, and never scroll it.
  for (const [width, height] of [[1440, 1000], [1920, 1080], [1280, 720], [1280, 560]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => {
      const main = document.querySelector("main");
      const area = main.getBoundingClientRect();
      const box = document.querySelector('[role="region"][aria-label="Test results"]').getBoundingClientRect();
      const scrolls = [main, main.firstElementChild].some((element) => element.scrollHeight > element.clientHeight);
      const above = box.top - area.top;
      const below = area.bottom - box.bottom;
      return !scrolls && above > 40 && Math.abs(above - below) < 24;
    }), `results centered without scrolling at ${width}x${height}`).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log("results centered at their natural size without page scroll from 1920x1080 to 1280x560 PASS");
  // The scores card stretches so the buttons end level with the bottom of the graph.
  await expect.poll(() => page.evaluate(() => {
    const region = document.querySelector('[role="region"][aria-label="Test results"]');
    const next = region.querySelector('button[aria-label="Next Test"]');
    // The graph's card: the bordered box around the chart, or the dashed "no graph" box for an instant test.
    const graph = region.querySelector('[role="img"]')?.closest(".border") ?? region.querySelector(".border-dashed");
    return next && graph ? Math.abs(next.getBoundingClientRect().bottom - graph.getBoundingClientRect().bottom) : null;
  })).toBeLessThan(2);
  console.log("results show no header line or help text; the buttons end level with the graph PASS");
  const oldText = Array(10).fill("cat").join(" ");
  // Settings are chosen before a test: results show no settings pill.
  await expect(page.getByRole("button", { name: /^Test settings/ })).toHaveCount(0);
  await expect(results).toBeVisible();
  await page.getByRole("button", {
    name: "Repeat Test",
    exact: true
  }).click();
  await expect(input).toBeEnabled();
  await expect(words).toHaveCount(10);
  await expect(input).toHaveValue("");
  console.log("finish (no settings on results)\u2192repeat PASS", (await words.allTextContents()).join(" ").replace(/\s+/g, " ").trim());
  await input.fill(oldText + " ");
  await expect(results).toBeVisible();
  await page.getByRole("button", {
    name: "Next Test",
    exact: true
  }).click();
  await expect(input).toBeEnabled();
  await openTestSettings(page);
  await page.getByRole("radio", {
    name: "quote",
    exact: true
  }).click();
  await expect(page.getByText("Fixture Author", {
    exact: true
  })).toBeVisible();
  await expect(words).toHaveCount(2);
  await input.fill("cattt d");
  await expect(results).toHaveCount(0);
  await expect(input).toHaveValue("cattt d");
  await input.fill("cattt dog");
  await expect(results).toBeVisible();
  console.log("cold Quote + word-aligned completion PASS");
  await page.screenshot({
    path: artifactPath("practice-final-results-wide.png")
  });
  // The quote's author stays credited under the graph at every width.
  const attribution = results.getByText("— Fixture Author", { exact: false });
  for (const width of [1920, 1024, 390, 320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(async () => { await expectWithinViewport(page, attribution); }).toPass();
  }
  console.log("quote attribution under the graph at every width PASS");
});
