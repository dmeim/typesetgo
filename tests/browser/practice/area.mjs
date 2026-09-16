import { withFixtureBrowser, artifactPath, visibleBounds, expectWithinViewport } from "../runtime.mjs";
import { expect } from "@playwright/test";
await withFixtureBrowser(async browser => {
  const page = await browser.newPage({
    viewport: {
      width: 390,
      height: 844
    },
    reducedMotion: "reduce"
  });
  await page.goto("http://127.0.0.1:4317/?area&resume&paused");
  const input = page.locator("input[type=text]");
  await expect(input).toHaveValue("ca");
  await expect(input).toBeDisabled();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__areaReports.length)).toBe(0);
  await page.getByRole("button", {
    name: "Resume fixture"
  }).click();
  await page.waitForTimeout(250);
  await expect.poll(() => page.evaluate(() => window.__areaReports.at(-1)?.typedText)).toBe("ca");
  const resumed = await page.evaluate(() => window.__areaReports.at(-1));
  expect(resumed.elapsedMs).toBeGreaterThan(1200);
  expect(resumed.elapsedMs).toBeLessThan(5000);
  await page.getByRole("button", {
    name: "Pause fixture"
  }).click();
  await page.waitForTimeout(100);
  const count = await page.evaluate(() => window.__areaReports.length);
  await page.getByRole("button", {
    name: "Rerender fixture"
  }).click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__areaReports.length)).toBe(count);
  await page.goto("http://127.0.0.1:4317/?area");
  await input.waitFor();
  await input.fill("cattt d");
  expect(await page.evaluate(() => window.__areaFinishes.length)).toBe(0);
  await expect(page.locator("[data-typing-caret]")).toHaveCount(1);
  await input.press("Home");
  expect(await input.evaluate(el => el.selectionStart)).toBe(7);
  await input.press("Tab");
  expect(await input.evaluate(el => document.activeElement === el)).toBe(false);
  await input.fill("cattt dog");
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__areaFinishes.length)).toBe(1);
  await page.goto("http://127.0.0.1:4317/?area&long");
  await input.waitFor();
  const long = "supercalifragilisticexpialidocious".repeat(3);
  await input.fill(long.slice(0, 70));
  await page.waitForTimeout(150);
  const caret = page.locator("[data-typing-caret]");
  await visibleBounds(caret);
  await expect.poll(() => caret.evaluate(element => {
    let parent = element.parentElement;
    while (parent && getComputedStyle(parent).overflow !== "hidden") parent = parent.parentElement;
    if (!parent) return false;
    const c = element.getBoundingClientRect();
    const v = parent.getBoundingClientRect();
    return c.width > 0 && c.height > 0 && v.width > 0 && v.height > 0 && c.x >= v.x - 1 && c.y >= v.y - 1 && c.right <= v.right + 1 && c.bottom <= v.bottom + 1;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: artifactPath("practice-area-long-narrow.png")
  });
  await page.goto("http://127.0.0.1:4317/?area&long&tape");
  await input.waitFor();
  for (let i = 1; i < 70; i += 4) await input.fill(long.slice(0, i));
  await page.waitForTimeout(200);
  await expectWithinViewport(page, page.locator("[data-typing-caret]"));
  console.log("Area resume, pause, editing, wrapping, and tape geometry PASS");
});
