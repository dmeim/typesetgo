import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function expectRenderedFont(page, selector, postScriptNames) {
  await page.evaluate(() => document.fonts.ready);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    assert.ok(nodeId, "Rendered font target: " + selector);
    const actual = await session.send("CSS.getPlatformFontsForNode", { nodeId });
    await expect.poll(async () => {
      const { fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      return fonts.some((font) => font.isCustomFont && font.glyphCount > 0
        // CoreText may append a variation-instance suffix (e.g.
        // Inconsolata-Regular_Medium) when no PostScript instance name exists.
        && postScriptNames.some((name) => font.postScriptName === name || font.postScriptName.startsWith(name + "_")));
    }, { message: "Actual webfont glyphs for " + selector + ": " + JSON.stringify(actual) }).toBe(true);
  } finally {
    await session.detach();
  }
}

export async function expectLoadedFace(page, family, weight, style, text) {
  const faces = await page.evaluate(async ({ family, weight, style, text }) => {
    const loaded = await document.fonts.load(`${style} ${weight} 32px "${family}"`, text);
    return loaded.map((face) => ({ family: face.family.replaceAll('"', ""), status: face.status }));
  }, { family, weight, style, text });
  assert.ok(faces.length > 0, `${family} ${style} ${weight} must match a real FontFace`);
  assert.ok(faces.every((face) => face.family === family && face.status === "loaded"));
}
