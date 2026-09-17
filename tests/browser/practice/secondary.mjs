import { withFixtureBrowser, artifactPath, routeFixtureRequests, visibleBounds, expectCaretInside, expectWithinViewport, fixtureOrigin } from "../runtime.mjs";
import { expect } from "@playwright/test";
await withFixtureBrowser(async browser => {
  const p = await browser.newPage({
    viewport: {
      width: 390,
      height: 844
    },
    reducedMotion: "reduce",
    hasTouch: true
  });
  const token = "supercalifragilisticexpialidocious".repeat(3);
  await p.addInitScript(() => localStorage.setItem("typesetgo_settings", JSON.stringify({
    mode: "quote",
    quoteLength: "short",
    typingFontSize: 6,
    soundEnabled: false
  })));
  await routeFixtureRequests(p, r => {
    const u = new URL(r.request().url());
    if (u.hostname !== "127.0.0.1") return r.abort();
    if (u.pathname.startsWith("/quotes/") && !u.pathname.endsWith("/manifest.json")) return r.fulfill({
      json: [{
        quote: token + " dog",
        author: "Long Fixture Author",
        source: "Fixture",
        date: "2026"
      }]
    });
    return r.fallback();
  });
  await p.goto(fixtureOrigin);
  const input = p.getByRole("textbox", {
    name: "Typing practice",
    exact: true
  });
  await expect(input).toBeEnabled();
  await input.fill(token.slice(0, 80));
  const caret = p.locator("[data-typing-caret]");
  await expect(caret).toHaveCount(1);
  await expect.poll(async () => {
    const a = await caret.boundingBox(),
      b = await p.locator(".cursor-text").boundingBox();
    return a.y + a.height <= b.y + b.height + 1;
  }).toBe(true);
  await expectCaretInside(p);
  const c = await visibleBounds(caret);
  const v = await p.locator(".cursor-text").boundingBox();
  expect(c.x).toBeGreaterThanOrEqual(v.x);
  expect(c.x + c.width).toBeLessThanOrEqual(v.x + v.width + 1);
  expect(c.y).toBeGreaterThanOrEqual(v.y - 1);
  expect(c.y + c.height).toBeLessThanOrEqual(v.y + v.height + 1);
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const author = p.getByText(/Long Fixture Author/).first();
  expect(await author.evaluate(e => getComputedStyle(e.parentElement).opacity)).toBe("0");
  console.log("Home longtoken6rem wrap/caret + immediate quote metadatafade PASS", c, v);
  await input.fill("x".repeat(280) + " dog");
  await expect(p.getByRole("region", {
    name: "Test results"
  })).toBeVisible();
  await p.getByRole("button", {
    name: "1 Incorrect",
    exact: true
  }).tap();
  await expect(p.getByText("Incorrect Words", {
    exact: true
  })).toBeVisible();
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await p.keyboard.press("Escape");
  await expect(p.getByRole("button", {
    name: "1 Incorrect",
    exact: true
  })).toBeFocused();
  console.log("touch worddetails + longcontent + Escapefocus PASS");
  const save = p.getByRole("button", {
    name: "Save Results",
    exact: true
  });
  const colors = await save.evaluate(e => ({
    bg: getComputedStyle(e).backgroundColor,
    fg: getComputedStyle(e).color
  }));
  expect(colors.bg).not.toBe("rgba(0, 0, 0, 0)");
  expect(colors.fg).not.toBe(colors.bg);
  await p.getByRole("button", {
    name: "Switch to light mode",
    exact: true
  }).click();
  await expect.poll(() => save.evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe(colors.bg);
  console.log("result semantic colors light", await save.evaluate(e => ({
    bg: getComputedStyle(e).backgroundColor,
    fg: getComputedStyle(e).color
  })));
  await p.screenshot({
    path: artifactPath("practice-final-results-narrow-light.png")
  });
  const info = p.getByRole("button", { name: "About these results" });
  const explanation = p.getByRole("dialog", { name: "About these results" });
  await info.tap();
  // Popover positioning settles after the content mounts.
  await expect(async () => { await expectWithinViewport(p, explanation); }).toPass();
  await expect(explanation).toContainText("will not appear on leaderboards");
  await p.screenshot({ path: artifactPath("practice-results-info-narrow-light.png") });
  await info.tap();
  await expect(explanation).toHaveCount(0);
  await info.tap();
  await p.getByRole("heading", { name: "Results", exact: true }).tap();
  await expect(explanation).toHaveCount(0);
  console.log("results info touch toggle, outside dismissal and narrow viewport PASS");
  await save.click();
  await expect(p.getByText("Sign-in is unavailable. Your result is kept here; try saving again when sign-in is available.", {
    exact: true
  })).toBeVisible();
  await expect(p.getByRole("button", {
    name: "Error - Try Again",
    exact: true
  })).toBeEnabled();
  console.log("auth-disabled save visible explanation + retry PASS");
});
