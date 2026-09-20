import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { withFixtureBrowser, routeFixtureRequests, fixtureOrigin, artifactPath, expectCaretInside } from "../runtime.mjs";

async function rows(page, limit = 7) {
  return page.locator("[data-typing-word]").evaluateAll((words, count) => {
    const viewport = words[0].closest(".overflow-hidden").getBoundingClientRect();
    const lines = [];
    for (const word of words.slice(0, count)) {
      const bounds = word.getBoundingClientRect();
      let line = lines.find((candidate) => Math.abs(candidate.top - bounds.top) < 1);
      if (!line) { line = { top: bounds.top, left: bounds.left, right: bounds.right, count: 0 }; lines.push(line); }
      line.right = bounds.right;
      line.count++;
    }
    return { left: viewport.left, right: viewport.right, lines };
  }, limit);
}

await withFixtureBrowser(async (browser) => {
  for (const size of [1, 3.5, 6]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.addInitScript((fontSize) => {
      localStorage.setItem("typesetgo_settings", JSON.stringify({
        mode: "words", wordTarget: 25, textAlign: "justify", typingFontSize: fontSize,
        soundEnabled: false, showOnScreenKeyboard: false, ghostWriterEnabled: true, ghostWriterSpeed: 1,
      }));
      localStorage.setItem("typesetgo_layout", JSON.stringify({ maxWordsPerLine: 7, linePreview: 3 }));
    }, size);
    await routeFixtureRequests(page, (route, url) => url.pathname.startsWith("/words/") && !url.pathname.endsWith("/manifest.json")
      ? route.fulfill({ json: ["cat"] }) : route.fallback());
    await page.goto(fixtureOrigin);
    const input = page.getByRole("textbox", { name: "Typing practice", exact: true });
    await expect(input).toBeEnabled();
    await input.focus();
    await page.evaluate(() => document.fonts.ready);
    const justified = await rows(page);
    for (const line of justified.lines.filter((line) => line.count > 1)) {
      assert.ok(Math.abs(line.left - justified.left) < 1, "Justified rows start at the left edge");
      assert.ok(Math.abs(line.right - justified.right) < 1, `Justified ${size}rem row must fill the width: ${JSON.stringify(justified)}`);
    }
    const final = await page.locator("[data-typing-word]").evaluateAll((words) => {
      const container = words[0].closest(".overflow-hidden").getBoundingClientRect();
      const last = words.at(-1).getBoundingClientRect();
      return { remaining: container.right - last.right };
    });
    assert.ok(final.remaining > 20, "The short final row stays naturally spaced");

    await input.fill("cattt");
    await expectCaretInside(page);
    await input.press("Backspace");
    await expect(input).toHaveValue("catt");
    const prompt = await page.locator("[data-typing-word]").allTextContents();
    for (const align of ["Left", "Center", "Right", "Justify"]) {
      await input.press("Tab");
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("radio", { name: align.toLowerCase(), exact: true }).click();
      await page.getByRole("button", { name: "Close settings", exact: true }).click();
      await expect(input).toHaveValue("catt");
      assert.deepEqual(await page.locator("[data-typing-word]").allTextContents(), prompt, "Changing alignment preserves the prompt and extra characters");
      const current = await rows(page);
      const first = current.lines[0];
      if (align === "Left" || align === "Justify") assert.ok(Math.abs(first.left - current.left) < 1);
      if (align === "Right" || align === "Justify") assert.ok(Math.abs(first.right - current.right) < 1);
      if (align === "Center") assert.ok(Math.abs((first.left + first.right) - (current.left + current.right)) < 2);
      await input.focus();
      await expectCaretInside(page);
    }
    await input.fill("cat ".repeat(15) + "ca");
    await expectCaretInside(page);
    await expect(page.locator("[data-ghost-caret]")).toHaveCount(1);
    if (size === 3.5) await page.screenshot({ path: artifactPath("practice-justified.png") });
    await context.close();
  }

  for (const size of [1, 6]) {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 }, reducedMotion: "reduce" });
    const longWord = "supercalifragilisticexpialidocious".repeat(3);
    await page.addInitScript((fontSize) => {
      localStorage.setItem("typesetgo_settings", JSON.stringify({
        mode: "quote", quoteLength: "all", textAlign: "justify", typingFontSize: fontSize,
        soundEnabled: false, showOnScreenKeyboard: false,
      }));
      localStorage.setItem("typesetgo_layout", JSON.stringify({ maxWordsPerLine: 7, linePreview: 3 }));
    }, size);
    await routeFixtureRequests(page, (route, url) => url.pathname.startsWith("/quotes/") && !url.pathname.endsWith("/manifest.json")
      ? route.fulfill({ json: [{ quote: longWord, author: "Long word fixture", source: "Fixture", date: "2026" }] }) : route.fallback());
    await page.goto(fixtureOrigin);
    const input = page.getByRole("textbox", { name: "Typing practice", exact: true });
    await expect(input).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const word = page.locator("[data-typing-word]");
    await expect(word).toHaveCount(1);
    await expect(word).toHaveText(longWord);
    await expect(page.locator("[data-typing-line]")).toHaveCount(1);
    assert.ok(await word.evaluate((element) => {
      const viewport = element.closest(".overflow-hidden");
      const area = viewport.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      return bounds.height > parseFloat(getComputedStyle(viewport).lineHeight)
        && bounds.left >= area.left - 1 && bounds.right <= area.right + 1
        && [...element.children].every((character) => {
          const rect = character.getBoundingClientRect();
          return rect.left >= area.left - 1 && rect.right <= area.right + 1;
        });
    }), `A single long word wraps without clipping characters at 320px / ${size}rem`);
    for (const length of [1, 35, 70]) {
      await input.fill(longWord.slice(0, length));
      await expectCaretInside(page);
    }
    await input.press("Backspace");
    await expect(input).toHaveValue(longWord.slice(0, 69));
    await expectCaretInside(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at 320px / ${size}rem`);
    await page.close();
  }

  const ranked = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
  await ranked.addInitScript(() => {
    window.__sessionDelay = 0;
    localStorage.setItem("typesetgo_settings", JSON.stringify({
      mode: "words", wordTarget: 25, textAlign: "justify", typingFontSize: 1.5,
      soundEnabled: false, showOnScreenKeyboard: false,
    }));
    localStorage.setItem("typesetgo_layout", JSON.stringify({ maxWordsPerLine: 7, linePreview: 3 }));
  });
  await routeFixtureRequests(ranked, (route, url) => url.pathname.startsWith("/words/") && !url.pathname.endsWith("/manifest.json")
    ? route.fulfill({ json: ["cat"] }) : route.fallback());
  await ranked.goto(`${fixtureOrigin}/?ranked`);
  const input = ranked.getByRole("textbox", { name: "Typing practice", exact: true });
  await expect(input).toBeEnabled();
  await expect.poll(() => ranked.locator("[data-typing-word]").allTextContents()).toEqual(Array(25).fill("dog"));
  const prefix = "dog ".repeat(7);
  await input.fill(prefix + "d");
  const progressBeforeDraft = await ranked.evaluate(() => window.__mutations.filter(({ name }) => name === "typingSessions:recordProgress"));
  assert.equal(progressBeforeDraft.length, 1);
  const sessionId = progressBeforeDraft[0].args.sessionId;

  await input.dispatchEvent("compositionstart", { data: "" });
  await input.fill(prefix + "日本語仮");
  await expect(input).toHaveValue(prefix + "日本語仮");
  await expect(ranked.locator("[data-typing-line]").nth(1).locator("[data-typing-word]").first()).toHaveText("dog仮");
  await expectCaretInside(ranked);
  assert.deepEqual(await ranked.evaluate(() => window.__mutations.filter(({ name }) => name === "typingSessions:recordProgress")), progressBeforeDraft, "IME drafts do not report committed progress");
  await input.fill(prefix + "日");
  await input.dispatchEvent("compositionend", { data: "日" });
  await expect(input).toHaveValue(prefix + "日");
  await expect(ranked.locator("[data-typing-caret]").locator("..")).toHaveText("o");
  await expectCaretInside(ranked);
  await expect.poll(() => ranked.evaluate(() => window.__mutations.filter(({ name }) => name === "typingSessions:recordProgress").length)).toBe(2);

  for (const align of ["Left", "Center", "Right", "Justify"]) {
    await input.press("Tab");
    await ranked.getByRole("button", { name: "Settings", exact: true }).click();
    await ranked.getByRole("radio", { name: align.toLowerCase(), exact: true }).click();
    await ranked.getByRole("button", { name: "Close settings", exact: true }).click();
    await expect(input).toHaveValue(prefix + "日");
    assert.deepEqual(await ranked.locator("[data-typing-word]").allTextContents(), Array(25).fill("dog"));
    assert.deepEqual(await ranked.evaluate(() => window.__mutations.filter(({ name }) => name === "typingSessions:startSession" || name === "typingSessions:cancelSession").map(({ name }) => name)), ["typingSessions:startSession"], "Alignment changes retain the existing ranked session");
    await input.focus();
    await expectCaretInside(ranked);
  }

  const completedText = "dog ".repeat(25);
  await input.dispatchEvent("compositionstart", { data: "" });
  await input.fill(completedText);
  await expect(ranked.getByRole("region", { name: "Test results" })).toHaveCount(0);
  await expectCaretInside(ranked);
  assert.equal(await ranked.evaluate(() => window.__mutations.filter(({ name }) => name === "typingSessions:finalizeSession").length), 0, "A completed IME draft waits for composition end");
  await input.dispatchEvent("compositionend", { data: "dog " });
  await expect(ranked.getByRole("region", { name: "Test results" })).toBeVisible();
  await expect.poll(() => ranked.evaluate(() => window.__mutations.filter(({ name }) => name === "typingSessions:finalizeSession").length)).toBe(1);
  const finalization = await ranked.evaluate(() => window.__mutations.find(({ name }) => name === "typingSessions:finalizeSession"));
  assert.equal(finalization.args.sessionId, sessionId, "The original session receives the final result after alignment changes");
  assert.equal(finalization.args.typedText, completedText);
  await ranked.close();
  console.log("Justified forced/natural rows, short final row, all alignments, preserved input/session, narrow long words, IME, extra/ghost carets and scrolling PASS");
});
