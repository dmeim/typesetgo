import { expect } from "@playwright/test";
import { withFixtureBrowser, fixtureOrigin, artifactPath } from "../runtime.mjs";

// Measure the painted foreground against the composited ancestor backgrounds,
// rather than just asserting a CSS variable name or a palette value.
async function contrast(locator) {
  return locator.evaluate((element) => {
    const rgb = (value) => value.match(/[\d.]+/g).map(Number);
    const ancestors = [];
    for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
    let background = [255, 255, 255];
    for (const node of ancestors) {
      const [r, g, b, a = 1] = rgb(getComputedStyle(node).backgroundColor);
      background = [r, g, b].map((channel, index) => channel * a + background[index] * (1 - a));
    }
    const [r, g, b, a = 1] = rgb(getComputedStyle(element).color);
    const foreground = [r, g, b].map((channel, index) => channel * a + background[index] * (1 - a));
    const luminance = (color) => color.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const fg = luminance(foreground);
    const bg = luminance(background);
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
}

await withFixtureBrowser(async (browser) => {
  for (const [themeId, variantId, mode] of [
    ["danganronpa", "celestia-ludenberg", "dark"],
    ["danganronpa", "celestia-ludenberg", "light"],
    ["houston-dynamo-fc", "2006-away-white-orange", "dark"],
    ["bubblegum", "default", "light"],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await page.addInitScript(({ themeId, variantId, mode }) => {
      localStorage.setItem("typesetgo-theme-id", themeId);
      localStorage.setItem("typesetgo-theme-variant-id", variantId);
      localStorage.setItem("typesetgo-theme-mode", mode);
      localStorage.setItem("typesetgo_settings", JSON.stringify({ mode: "words", wordTarget: 25, soundEnabled: false }));
    }, { themeId, variantId, mode });
    await page.goto(fixtureOrigin);
    const input = page.getByRole("textbox", { name: "Typing practice", exact: true });
    await expect(input).toBeEnabled();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("typesetgo-theme-id"))).toBe(themeId);
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", mode);
    const firstWord = await page.locator("[data-typing-word]").first().innerText();
    await input.fill(firstWord.slice(0, 2));
    for (const label of ["wpm", "acc"]) {
      const caption = page.getByText(label, { exact: true });
      await expect(caption).toBeVisible();
      const value = caption.locator("..").locator("span").first();
      expect(await contrast(value), `${themeId}/${mode} ${label} value`).toBeGreaterThanOrEqual(4.5);
      expect(await contrast(caption), `${themeId}/${mode} ${label} caption`).toBeGreaterThanOrEqual(4.5);
    }
    const typed = page.locator("[data-typing-word]").first().locator(":scope > span").first();
    expect(await contrast(typed), `${themeId}/${mode} correct text`).toBeGreaterThanOrEqual(4.5);
    const untyped = page.locator("[data-typing-word]").nth(1).locator(":scope > span").first();
    expect(await contrast(untyped), `${themeId}/${mode} untyped text`).toBeGreaterThanOrEqual(3);
    // Use the same measurement for the narrow, solid caret by treating its paint as ink.
    const caretRatio = await page.locator("[data-typing-caret]").evaluate(async (element) => {
      const { contrastRatio } = await import("/src/lib/colors.ts");
      return contrastRatio(getComputedStyle(element).backgroundColor,
        getComputedStyle(document.documentElement).getPropertyValue("--background").trim());
    });
    expect(caretRatio, `${themeId}/${mode} caret`).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: artifactPath(`theme-contrast-${themeId}-${mode}.png`) });
    await page.close();
  }
  console.log("Rendered live stats, captions, exercise text and carets retain contrast in problem palettes PASS");
});
