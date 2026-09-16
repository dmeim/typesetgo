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
      const opener = page.getByRole("button", { name: "Settings", exact: true });
      await opener.focus();
      await expect(page.getByRole("tooltip", { name: "Settings", exact: true })).toBeVisible();
      await opener.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Settings", exact: true });
      await expectWithinViewport(page, dialog);
      await dialog.getByRole("tab", { name: "All", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(dialog.getByRole("tab", { name: "Type", selected: true })).toBeFocused();
      await expect(dialog.getByRole("slider", { name: "Preview Lines" })).toBeVisible();
      await page.keyboard.press("ArrowLeft");
      await expect(dialog.getByRole("tab", { name: "All", selected: true })).toBeFocused();
      await dialog.getByRole("switch", { name: "Ghost", checked: false }).click();
      await expect(dialog.getByRole("slider", { name: "Target Speed" })).toBeEnabled();
      await dialog.getByRole("switch", { name: "Keyboard", checked: false }).click();
      await dialog.getByRole("radio", { name: "COLEMAK" }).click();
      await expect(dialog.getByRole("radio", { name: "COLEMAK", checked: true })).toBeVisible();
      await dialog.getByRole("switch", { name: "Sound", checked: false }).click();
      await expect(dialog.getByRole("switch", { name: "Sound", checked: true })).toBeVisible();
      await dialog.getByRole("tab", { name: "All" }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: artifactPath(`shadcn-settings-${width}-${mode}.png`) });
      await page.getByRole("button", { name: "Close settings" }).click();
      await expect(opener).toBeFocused();
      if (width === 390) {
        await page.getByRole("button", { name: "Quick Settings", exact: true }).click();
      }
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
      if (width === 390) await page.keyboard.press("Escape");
      await expect(page.locator("[data-typing-word]")).toHaveCount(10);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: artifactPath(`shadcn-practice-${width}-${mode}.png`) });
      await page.close();
    }
  }
  console.log("Shadcn tabs, switches, tooltips, keyboard selectors and repeated selection: narrow/wide, light/dark PASS");
});
