import { expect } from "@playwright/test";
import { expectCaretInside, fixtureOrigin, withFixtureBrowser } from "../runtime.mjs";

await withFixtureBrowser(async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.__sessionDelay = 0;
    window.__sessionWordCount = 22_500;
    localStorage.setItem("typesetgo_settings", JSON.stringify({
      mode: "time", duration: 3600, soundEnabled: false,
    }));
  });
  await page.goto(fixtureOrigin + "/?ranked");
  const input = page.getByRole("textbox", { name: "Typing practice" });
  await expect(input).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.__mutations.find((entry) =>
    entry.name === "typingSessions:startSession")?.args.duration)).toBe(3600);
  await expect.poll(() => page.locator("[data-typing-word]").count()).toBeGreaterThan(200);
  expect(await page.locator("[data-typing-word]").count()).toBeLessThanOrEqual(300);

  for (let length = 1; length <= 15; length++) await input.fill("d".repeat(length));
  const progressCount = await page.evaluate(() => window.__mutations.filter((entry) =>
    entry.name === "typingSessions:recordProgress").length);
  expect(progressCount).toBeGreaterThanOrEqual(2);
  expect(progressCount).toBeLessThan(15);

  await input.fill("dog ".repeat(155));
  expect(await page.locator("[data-typing-word]").count()).toBeLessThanOrEqual(300);
  await expectCaretInside(page);
  await input.fill("dog ".repeat(75));
  await expectCaretInside(page);
  console.log("One-hour ranked prompt, bounded DOM, progress batching, and caret recovery PASS");
});
