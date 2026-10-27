import { withFixtureBrowser, routeFixtureRequests, fixtureOrigin } from "../runtime.mjs";
import { expect } from "@playwright/test";
await withFixtureBrowser(async browser => {
  const p = await browser.newPage({
    viewport: {
      width: 1280,
      height: 900
    },
    reducedMotion: "reduce"
  });
  await p.addInitScript(() => {
    window.__sessionDelay = 1800;
    window.__preferences = undefined;
    localStorage.setItem("typesetgo_settings", JSON.stringify({
      mode: "words",
      wordTarget: 10,
      soundEnabled: false,
      typingFontSize: 2
    }));
  });
  await routeFixtureRequests(p, r => {
    const u = new URL(r.request().url());
    if (u.hostname !== "127.0.0.1") return r.abort();
    if (u.pathname.startsWith("/words/") && !u.pathname.endsWith("/manifest.json")) return r.fulfill({
      json: ["cat"]
    });
    return r.fallback();
  });
  await p.goto(fixtureOrigin + "/?ranked");
  const i = p.getByRole("textbox", {
    name: "Typing practice",
    exact: true
  });
  await expect(i).toBeEnabled();
  await expect(p.locator("[data-typing-word]")).toHaveCount(10);
  await i.fill("ca");
  await p.evaluate(() => window.__setPreferences({
    defaultMode: "words",
    defaultDuration: 30,
    defaultWordTarget: 50,
    defaultDifficulty: "beginner",
    defaultQuoteLength: "all",
    defaultPunctuation: false,
    defaultNumbers: false,
    defaultCapitalization: false,
    defaultPresetModeType: "finish",
    soundEnabled: false,
    typingSound: "",
    warningSound: "",
    ghostWriterEnabled: false,
    ghostWriterSpeed: 40,
    typingFontSize: 5,
    typingFontFamily: "monospace",
    iconFontSize: 1,
    helpFontSize: 1,
    textAlign: "center",
    linePreview: 3,
    maxWordsPerLine: 10
  }));
  // The chosen size, capped on short screens (practiceFontSize).
  await expect.poll(() => p.locator(".cursor-text").evaluate(e => e.style.fontSize)).toMatch(/^min\(5rem, /);
  await expect(i).toHaveValue("ca");
  await expect(p.locator("[data-typing-word]")).toHaveCount(10);
  await p.waitForTimeout(1900);
  await expect(i).toHaveValue("ca");
  await i.fill(Array(10).fill("cat").join(" ") + " ");
  await expect(p.getByRole("region", {
    name: "Test results"
  })).toBeVisible();
  await expect.poll(() => p.evaluate(() => window.__mutations.filter(x => x.name === "testResults:saveResult").length)).toBe(1);
  await p.getByRole("button", {
    name: "Repeat Test",
    exact: true
  }).click();
  await expect(p.locator("[data-typing-word]")).toHaveCount(10);
  await i.fill(Array(10).fill("cat").join(" ") + " ");
  await expect(p.getByRole("region", {
    name: "Test results"
  })).toBeVisible();
  await p.getByRole("button", {
    name: "Next Test",
    exact: true
  }).click();
  await expect(p.locator("[data-typing-word]")).toHaveCount(50);
  await expect(i).toHaveValue("");
  console.log("lateprefs preserve active input, originalsave and exactRepeat; Next applies restored50worddefault PASS");

  // Settings live on the Profile page: edits there are what Home starts with, and a pill edit made just
  // before leaving Home is what the Profile page (and the next Home visit) reads.
  const home = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await home.addInitScript(() => {
    if (sessionStorage.getItem("fixture-seeded")) return;
    sessionStorage.setItem("fixture-seeded", "1");
    localStorage.setItem("typesetgo_settings", JSON.stringify({ mode: "words", wordTarget: 25, soundEnabled: false, showOnScreenKeyboard: false }));
  });
  await routeFixtureRequests(home, r => {
    const u = new URL(r.request().url());
    if (u.hostname !== "127.0.0.1") return r.abort();
    if (u.pathname.startsWith("/words/") && !u.pathname.endsWith("/manifest.json")) return r.fulfill({ json: ["cat"] });
    return r.fallback();
  });
  await home.goto(fixtureOrigin);
  const words = home.locator("[data-typing-word]");
  await expect(words).toHaveCount(25);
  await home.getByRole("button", { name: /^Test settings/ }).click();
  await home.getByRole("radio", { name: "10", exact: true }).click();
  await expect(words).toHaveCount(10);
  // Leave at once, before Home's debounced save would have run.
  await home.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(home).toHaveURL(/\/profile\/typing$/);
  await home.getByRole("navigation", { name: "Profile sections" }).getByRole("button", { name: /Keyboard/ }).click();
  await expect(home).toHaveURL(/\/profile\/keyboard$/);
  const keyboardSwitch = home.getByRole("switch", { name: "On-screen keyboard" });
  await expect(keyboardSwitch).toHaveAttribute("aria-checked", "false");
  await keyboardSwitch.click();
  await expect(keyboardSwitch).toHaveAttribute("aria-checked", "true");
  await home.getByRole("navigation", { name: "Practice modes" }).getByRole("link", { name: "Type", exact: true }).click();
  await expect(home).toHaveURL(fixtureOrigin + "/");
  await expect(words).toHaveCount(10);
  await expect(home.getByRole("region", { name: "On-screen keyboard" })).toBeVisible();
  await home.close();
  console.log("Home pill edit survives an instant trip to Profile; Profile keyboard switch is on when Home returns PASS");
});
