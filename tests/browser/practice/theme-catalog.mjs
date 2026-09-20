import { expect } from "@playwright/test";
import { withFixtureBrowser, fixtureOrigin, artifactPath, expectWithinViewport } from "../runtime.mjs";

await withFixtureBrowser(async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const requests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/themes/")) requests.push(url.pathname);
  });
  await page.goto(fixtureOrigin);
  await expect(page.getByRole("textbox", { name: "Typing practice", exact: true })).toBeEnabled();
  const startupRequests = [...requests];
  expect(startupRequests).not.toContain("/themes/catalog.json");
  const beforePreview = await page.locator("html").evaluate((element) => ({
    style: element.getAttribute("style"), mode: element.dataset.themeMode,
    stored: ["typesetgo-theme-id", "typesetgo-theme-variant-id", "typesetgo-theme-mode"].map((key) => localStorage.getItem(key)),
  }));
  const indexResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/themes/catalog.json");
  const coldStart = performance.now();
  await page.getByRole("button", { name: "Change theme", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Theme", exact: true });
  await expect(dialog.getByRole("img", { name: /TypeSetGo.*miniature typing homepage/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Select TypeSetGo", exact: true })).toBeVisible();
  const coldMs = performance.now() - coldStart;
  const index = await (await indexResponse).json();
  expect(index.themes.length).toBeGreaterThan(1500);
  expect(index.themes.reduce((count, theme) => count + theme.variants.length, 0)).toBeGreaterThan(4900);
  expect(requests.filter((url) => !["/themes/catalog.json", "/themes/manifest.json"].includes(url)))
    .toEqual(startupRequests.filter((url) => url !== "/themes/manifest.json"));
  const lightPreview = dialog.getByRole("button", { name: "Select TypeSetGo, light mode", exact: true });
  const darkPreview = dialog.getByRole("button", { name: "Select TypeSetGo, dark mode", exact: true });
  await lightPreview.focus();
  await page.keyboard.press("Tab");
  await expect(darkPreview).toBeFocused();
  expect(await darkPreview.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await expect(dialog.getByRole("img", { name: /TypeSetGo · Default · dark/ })).toBeVisible();
  // Hovering without clicking must resume pointer previews after real Tab navigation.
  await lightPreview.hover();
  await expect(dialog.getByRole("img", { name: /TypeSetGo · Default · light/ })).toBeVisible();
  await expect(darkPreview).toBeFocused();
  const search = dialog.getByRole("searchbox", { name: "Search themes" });
  await search.fill("Shinra Kusakabe");
  const fireForce = dialog.getByRole("button", { name: "Fire Force variants", exact: true });
  await expect(fireForce).toBeVisible();
  expect(requests).not.toContain("/themes/fire-force.json");
  await fireForce.focus();
  await expect(dialog.getByRole("img", { name: /Fire Force.*miniature typing homepage/ })).toBeVisible();
  expect(requests.filter((url) => url === "/themes/fire-force.json")).toHaveLength(1);
  expect(await page.locator("html").evaluate((element) => ({
    style: element.getAttribute("style"), mode: element.dataset.themeMode,
    stored: ["typesetgo-theme-id", "typesetgo-theme-variant-id", "typesetgo-theme-mode"].map((key) => localStorage.getItem(key)),
  }))).toEqual(beforePreview);
  await fireForce.press("Enter");
  const variant = dialog.getByRole("button", { name: "Select Fire Force: Shinra Kusakabe, light mode", exact: true });
  await variant.focus();
  await expect(dialog.getByRole("img", { name: /Fire Force · Shinra Kusakabe · light/ })).toBeVisible();
  await page.screenshot({ path: artifactPath("theme-catalog-desktop-preview-light.png") });
  await variant.press("Enter");
  await expect(variant).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "light");
  const loadedRequests = [...requests];
  await page.keyboard.press("Escape");
  const warmStart = performance.now();
  await page.getByRole("button", { name: "Change theme", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Select TypeSetGo", exact: true })).toBeVisible();
  await expect(dialog.getByRole("img", { name: /Fire Force · Shinra Kusakabe · light/ })).toBeVisible();
  const warmMs = performance.now() - warmStart;
  expect(requests).toEqual(loadedRequests);
  const resources = await page.evaluate(() => performance.getEntriesByType("resource")
    .filter((entry) => new URL(entry.name).pathname.startsWith("/themes/"))
    .map((entry) => ({ path: new URL(entry.name).pathname, durationMs: entry.duration,
      transferBytes: entry.transferSize, encodedBodyBytes: entry.encodedBodySize, decodedBodyBytes: entry.decodedBodySize })));
  console.log("Real theme catalog measurement", JSON.stringify({
    conditions: "Installed Chrome, local isolated Vite fixture, 1440x1000, reduced motion, no network/CPU throttle; guarded routing disables HTTP cache; metadata cache reused on reopen",
    themeCount: index.themes.length, coldReadyMs: Math.round(coldMs), warmReadyMs: Math.round(warmMs),
    requests, resources,
  }));
  for (const [width, height] of [[320, 700], [390, 844], [640, 450], [768, 900], [1024, 800]]) {
    await page.setViewportSize({ width, height });
    await expectWithinViewport(page, dialog);
    await expectWithinViewport(page, dialog.getByRole("img"));
    const scene = dialog.locator("[data-theme-site-preview]");
    expect(await scene.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
    await search.fill("GitHub");
    await expect(dialog.getByRole("button", { name: "Select GitHub", exact: true })).toBeInViewport();
    await page.screenshot({ path: artifactPath(`theme-catalog-${width}x${height}.png`) });
  }
  expect(requests).toEqual(loadedRequests);
  console.log("Real catalog browsing, isolated keyboard preview, variant selection, warm cache, narrow/short dialog PASS");
});
