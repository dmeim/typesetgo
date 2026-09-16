import { expect } from "@playwright/test";
import { withFixtureBrowser, routeFixtureRequests, fixtureOrigin, artifactPath, expectCaretInside } from "../runtime.mjs";

async function expectCentered(caret) {
  await expect(caret).toHaveCount(1);
  await expect.poll(() => caret.evaluate((element) => {
    const cursor = element.getBoundingClientRect();
    const character = element.parentElement.getBoundingClientRect();
    return Math.abs(cursor.top + cursor.height / 2 - character.top - character.height / 2);
  })).toBeLessThan(0.75);
}

await withFixtureBrowser(async (browser) => {
  for (const font of ["jetbrains-mono", "monospace", "opendyslexic"]) {
    for (const size of [1, 3.5, 6]) {
      const context = await browser.newContext({ viewport: { width: 1352, height: 1000 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.addInitScript(({ font, size }) => {
        localStorage.setItem("typesetgo_settings", JSON.stringify({
          mode: "words", wordTarget: 25, typingFontFamily: font, typingFontSize: size,
          soundEnabled: false, ghostWriterEnabled: true, ghostWriterSpeed: 1,
        }));
        localStorage.setItem("typesetgo-theme-mode", "light");
      }, { font, size });
      await routeFixtureRequests(page, (route, url) => url.pathname.startsWith("/words/") && !url.pathname.endsWith("/manifest.json")
        ? route.fulfill({ json: ["pack"] }) : route.fallback());
      await page.goto(fixtureOrigin);
      const input = page.getByRole("textbox", { name: "Typing practice", exact: true });
      await expect(input).toBeEnabled();
      await input.focus();
      await page.evaluate(() => document.fonts.ready);
      const caret = page.locator("[data-typing-caret]");
      await expectCentered(caret);
      // Includes a character, word-end space, extra characters and the next row.
      for (const text of ["pa", "pack", "packkk", "pack ".repeat(8) + "pa"]) {
        await input.fill(text);
        await expectCentered(caret);
        await expectCaretInside(page);
      }
      await expectCentered(page.locator("[data-ghost-caret]"));
      if (font === "jetbrains-mono" && size === 3.5) {
        await page.screenshot({ path: artifactPath("practice-caret-aligned.png") });
      }
      await context.close();
    }
  }
  console.log("Caret and ghost centered across fonts, 1–6rem sizes, word boundaries, extras and scrolling PASS");
});
