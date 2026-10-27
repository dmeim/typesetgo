import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { withFixtureBrowser, routeFixtureRequests, fixtureOrigin, artifactPath, expectWithinViewport, expectCaretInside } from "../runtime.mjs";
import { expectLoadedFace, expectRenderedFont } from "../font-assertions.mjs";

const { fonts } = JSON.parse(await readFile(new URL("../../../public/fonts/catalog.json", import.meta.url), "utf8"));
const representative = "café naïve façade résumé 0123456789!?";

async function prepare(page, key = "jetbrains-mono", mode = "dark") {
  await page.addInitScript(({ key, mode }) => {
    localStorage.setItem("typesetgo_settings", JSON.stringify({
      mode: "words", wordTarget: 10, soundEnabled: false, typingFontSize: 2, typingFontFamily: key,
    }));
    localStorage.setItem("typesetgo-theme-mode", mode);
  }, { key, mode });
  // runtime.mjs blocks ALL foreign requests/WebSockets, including Google Fonts
  // and CDNFonts. Any attempted external request fails the scenario.
  await routeFixtureRequests(page, (route, url) => {
    if (url.pathname.startsWith("/words/") && !url.pathname.endsWith("/manifest.json")) {
      return route.fulfill({ json: ["café", "naïve", "façade", "résumé"] });
    }
    return route.fallback();
  });
  await page.goto(fixtureOrigin);
  await expect(page.getByRole("textbox", { name: "Typing practice", exact: true })).toBeEnabled();
  await expect(page.locator("[data-typing-word]")).toHaveCount(10);
  await expect(page.locator("html")).toHaveCSS("color-scheme", mode);
}

await withFixtureBrowser(async (browser) => {
  for (const font of fonts) {
    // A new context per stored selection proves cold loads cannot accidentally
    // pass because a previous picker visit populated the font cache.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const requests = [];
    page.on("request", (request) => { if (request.resourceType() === "font") requests.push(request.url()); });
    await prepare(page, font.key);
    await expectLoadedFace(page, font.family, 400, "normal", representative);
    await expectRenderedFont(page, "[data-typing-word]", font.assets.flatMap((asset) => asset.postScriptNames[400] ?? []));
    const firstWord = (await page.locator("[data-typing-word]").first().textContent()).trim();
    await page.getByRole("textbox", { name: "Typing practice", exact: true }).fill(firstWord.slice(0, 2));
    await expectCaretInside(page);
    assert.ok(requests.length > 0);
    for (const request of requests) {
      const url = new URL(request);
      assert.equal(url.origin, fixtureOrigin);
      assert.ok([font.key, "jetbrains-mono"].includes(url.pathname.split("/")[2]), "Unselected font fetched: " + request);
    }
    if (font.key === "jetbrains-mono") console.log("Cold default font requests:", requests.map((url) => new URL(url).pathname));
    await context.close();
  }
  console.log(`All ${fonts.length} stored selections render custom font glyphs in fresh contexts; only selected/UI fonts fetched PASS`);

  // The font picker lives on the Profile page (/profile/text); Home renders whatever it stored.
  for (const width of [390, 1280]) {
    for (const mode of ["dark", "light"]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      await prepare(page, "opendyslexic", mode);
      await expectLoadedFace(page, "OpenDyslexic", 400, "normal", representative);
      await page.getByRole("textbox", { name: "Typing practice", exact: true }).focus();
      await expectRenderedFont(page, "[data-typing-word]", ["OpenDyslexic-Regular"]);
      await expectWithinViewport(page, page.locator(".cursor-text"));
      await page.screenshot({ path: artifactPath(`fonts-practice-${width}-${mode}.png`) });
      await context.close();
    }
  }
  console.log("Stored OpenDyslexic selection renders on Home, wide/narrow and light/dark PASS");
});
