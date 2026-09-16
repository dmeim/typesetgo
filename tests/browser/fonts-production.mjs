import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { preview } from "vite";
import { browserOptions } from "./browser-options.mjs";
import { guardFixtureContext } from "./runtime.mjs";
import { expectLoadedFace, expectRenderedFont } from "./font-assertions.mjs";

const { fonts } = JSON.parse(await readFile(new URL("../../public/fonts/catalog.json", import.meta.url), "utf8"));
// Consume the real build's HTML/CSS/asset paths, but never boot live providers.
// The full Home/picker runs separately in the existing isolated practice fixture.
const builtHtml = await readFile(new URL("../../dist/index.html", import.meta.url), "utf8").catch(() => {
  throw new Error("Build first: VITE_CONVEX_URL=https://fixture.invalid VITE_CLERK_PUBLISHABLE_KEY= bun run build");
});
const probeHtml = builtHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
  .replace('<div id="root"></div>', '<span id="font-probe">Font asset check</span>');
const origin = "http://127.0.0.1:4318";
const server = await preview({ configFile: false, preview: { host: "127.0.0.1", port: 4318, strictPort: true } });
let browser;
try {
  browser = await chromium.launch(browserOptions());
  const context = await browser.newContext({ serviceWorkers: "block" });
  const errors = await guardFixtureContext(context, origin);
  const page = await context.newPage();
  await page.route(origin + "/font-asset-probe/deep", (route) => route.fulfill({ contentType: "text/html", body: probeHtml }));
  const requests = new Set();
  page.on("request", (request) => {
    if (request.resourceType() === "font") {
      assert.equal(new URL(request.url()).origin, origin);
      requests.add(new URL(request.url()).pathname);
    }
  });
  await page.goto(origin + "/font-asset-probe/deep");
  let combinations = 0;
  for (const font of fonts) {
    const license = await context.request.get(origin + font.license.path);
    assert.equal(license.status(), 200);
    assert.equal(createHash("sha256").update(await license.body()).digest("hex"), font.license.sha256);
    for (const asset of font.assets) {
      const response = await context.request.get(origin + asset.path);
      assert.equal(response.status(), 200, asset.path);
      assert.match(response.headers()["content-type"], /font\/woff2/);
      assert.equal(createHash("sha256").update(await response.body()).digest("hex"), asset.sha256);
      for (const weight of asset.weights) {
        // The recorded sample comes from the binary cmap intersected with its
        // Google unicode-range. Exercise every shipped subset, including non-Latin.
        const text = asset.subset === "latin" ? "café naïve façade 0123456789!?" : asset.sample;
        assert.ok(text.length > 0, asset.path + " needs a rendered coverage sample");
        await page.locator("#font-probe").evaluate((element, { family, weight, style, text }) => {
          element.style.cssText = `font-family: "${family}"; font-size: 32px; font-weight: ${weight}; font-style: ${style}; font-synthesis: none;`;
          element.textContent = text;
        }, { family: font.family, weight, style: asset.style, text });
        await expectLoadedFace(page, font.family, weight, asset.style, text);
        await expectRenderedFont(page, "#font-probe", asset.postScriptNames[weight]);
        combinations++;
      }
      assert.ok(requests.has(asset.path), "CSS must request the actual subset: " + asset.path);
    }
  }
  assert.deepEqual(errors, [], "Unexpected page errors or external requests");
  console.log(`Production CSS: ${requests.size} same-origin WOFF2 files rendered; ${combinations} subset/weight/style combinations; all asset/license hashes and nested-route paths PASS`);
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
