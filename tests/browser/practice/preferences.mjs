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
    errorSound: "",
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
  await expect.poll(() => p.locator(".cursor-text").evaluate(e => e.style.fontSize)).toBe("5rem");
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
    name: "\u21BB Next Test",
    exact: true
  }).click();
  await expect(p.locator("[data-typing-word]")).toHaveCount(50);
  await expect(i).toHaveValue("");
  console.log("lateprefs preserve active input, originalsave and exactRepeat; Next applies restored50worddefault PASS");
});
