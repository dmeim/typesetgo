import { withFixtureBrowser, artifactPath, routeFixtureRequests, fixtureOrigin } from "../runtime.mjs";
import { expect } from "@playwright/test";
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
  const tabs = page.getByRole("navigation", { name: "Practice modes" }).locator(":scope > div");
  const expectPageCentered = async (locator) => {
    await expect.poll(async () => {
      const bounds = await locator.boundingBox();
      return bounds ? Math.abs(bounds.x + bounds.width / 2 - page.viewportSize().width / 2) : Infinity;
    }).toBeLessThan(1);
  };
  for (const width of [1920, 1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectPageCentered(tabs);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width >= 1024) {
      const tabBounds = await tabs.boundingBox();
      const leftBounds = await page.getByRole("button", { name: "Settings", exact: true }).locator("..").boundingBox();
      const rightBounds = await page.getByRole("link", { name: "Leaderboard", exact: true }).locator("..").boundingBox();
      expect(leftBounds.x + leftBounds.width).toBeLessThanOrEqual(tabBounds.x);
      expect(rightBounds.x).toBeGreaterThanOrEqual(tabBounds.x + tabBounds.width);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log("header tabs stay page-centered from 320 to 1920px without overlapping side controls PASS");
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
  const heading = results.getByRole("heading", { name: "Results", exact: true });
  const info = results.getByRole("button", { name: "About these results" });
  const explanation = page.getByRole("dialog", { name: "About these results" });
  await expect(heading).toBeVisible();
  await expect(explanation).toHaveCount(0);
  await expect(results).toBeFocused();
  await info.hover();
  await expect(explanation).toContainText("This practice can be saved to your history, but will not appear on leaderboards.");
  await expectPageCentered(explanation);
  await expect(results).toBeFocused();
  await explanation.hover();
  await expect(explanation).toBeVisible();
  await heading.hover();
  await expect(explanation).toHaveCount(0);
  await expect(results).toBeFocused();
  await info.hover();
  await info.click();
  await heading.hover();
  // Wait beyond the hover-dismiss delay to prove that clicking pinned it.
  await page.waitForTimeout(250);
  await expect(explanation).toBeVisible();
  await info.click();
  await expect(explanation).toHaveCount(0);
  await info.click();
  await heading.click();
  await expect(explanation).toHaveCount(0);
  await info.focus();
  await page.keyboard.press("Enter");
  await expect(explanation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(explanation).toHaveCount(0);
  await expect(info).toBeFocused();
  await page.keyboard.press("Space");
  await expect(explanation).toBeVisible();
  await page.keyboard.press("Space");
  await expect(explanation).toHaveCount(0);
  console.log("results info hover, pointer transfer, pin, toggle, outside click and keyboard PASS");
  const oldText = Array(10).fill("cat").join(" ");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("slider", {
    name: "Text Size",
    exact: true
  }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[aria-label=\"Test results\"]")).toBeAttached();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(results).toBeVisible();
  await page.getByRole("button", {
    name: "Repeat Test",
    exact: true
  }).click();
  await expect(input).toBeEnabled();
  await expect(words).toHaveCount(10);
  await expect(input).toHaveValue("");
  console.log("finish\u2192settings\u2192repeat PASS", (await words.allTextContents()).join(" ").replace(/\s+/g, " ").trim());
  await input.fill(oldText + " ");
  await expect(results).toBeVisible();
  await page.getByRole("button", {
    name: "Next Test",
    exact: true
  }).click();
  await expect(input).toBeEnabled();
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
  await info.click();
  await expect(explanation).toBeVisible();
  for (const width of [1920, 1024, 390, 320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectPageCentered(explanation);
  }
  await page.screenshot({ path: artifactPath("practice-results-info-wide.png") });
});
