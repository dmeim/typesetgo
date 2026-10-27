import { expect } from "@playwright/test";
import { withFixtureBrowser, fixtureOrigin, artifactPath, expectWithinViewport } from "../runtime.mjs";

await withFixtureBrowser(async (browser) => {
  for (const width of [390, 1352]) {
    for (const mode of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await page.addInitScript((mode) => {
        localStorage.setItem("typesetgo-theme-mode", mode);
        localStorage.setItem("typesetgo_settings", JSON.stringify({ mode: "words", soundEnabled: false, ghostWriterEnabled: false, showOnScreenKeyboard: false }));
      }, mode);
      await page.goto(fixtureOrigin);
      const settingsLink = page.getByRole("link", { name: "Settings", exact: true });
      await settingsLink.focus();
      await expect(page.getByRole("tooltip", { name: "Settings", exact: true })).toBeVisible();
      await expect(settingsLink).toHaveAttribute("href", "/profile/typing");
      // Phones and desktop share one settings pill.
      await page.getByRole("button", { name: /^Test settings/ }).click();
      await expect(async () => { await expectWithinViewport(page, page.getByRole("group", { name: "Test settings", exact: true })); }).toPass();
      const counts = page.getByRole("radiogroup", { name: "Word Count", exact: true });
      const wordCount = counts.getByRole("radio", { name: "25", exact: true });
      await wordCount.focus();
      await page.keyboard.press("ArrowLeft");
      await expect(counts.getByRole("radio", { name: "10", exact: true })).toBeFocused();
      await page.keyboard.press("Space");
      await expect(counts.getByRole("radio", { name: "10", exact: true, checked: true })).toBeVisible();
      // Desktop prompt changes return focus to the typing input; refocus to repeat.
      await counts.getByRole("radio", { name: "10", exact: true }).focus();
      // Activating the current choice again must keep the selected value.
      await page.keyboard.press("Space");
      await expect(counts.getByRole("radio", { name: "10", exact: true, checked: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("typesetgo_settings")).wordTarget)).toBe(10);
      await expect(page.locator("[data-typing-word]")).toHaveCount(10);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: artifactPath(`shadcn-practice-${width}-${mode}.png`) });
      await page.close();
    }
  }
  console.log("Dock tooltips, settings link, pill keyboard selectors and repeated selection: narrow/wide, light/dark PASS");
});
