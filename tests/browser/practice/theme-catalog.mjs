import { expect } from "@playwright/test";
import { withFixtureBrowser, fixtureOrigin, artifactPath } from "../runtime.mjs";

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
  // Home no longer has a theme dialog; the Dock sends you to the Profile theme gallery.
  const themeLink = page.getByRole("link", { name: "Change theme", exact: true });
  await expect(themeLink).toHaveAttribute("href", "/profile/theme");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /^Test settings/ }).click();
  await expect(page.getByRole("group", { name: "Test settings", exact: true })).toBeVisible();
  await page.screenshot({ path: artifactPath("theme-catalog-home-startup.png") });
  expect(requests).toEqual(startupRequests);
  console.log("Home startup never requests the theme catalog; Change theme links to the Profile gallery PASS");
});
