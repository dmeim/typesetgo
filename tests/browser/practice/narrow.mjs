import { withFixtureBrowser, artifactPath, routeFixtureRequests, visibleBounds, expectWithinViewport, fixtureOrigin } from "../runtime.mjs";
import { expect } from "@playwright/test";
await withFixtureBrowser(async browser => {
  const p = await browser.newPage({
    viewport: {
      width: 390,
      height: 844
    },
    reducedMotion: "reduce"
  });
  let themeFetches = 0;
  await p.addInitScript(() => localStorage.setItem("typesetgo_settings", JSON.stringify({
    mode: "words",
    wordTarget: 10,
    soundEnabled: false,
    ghostWriterEnabled: true,
    ghostWriterSpeed: 60
  })));
  await routeFixtureRequests(p, async r => {
    const u = new URL(r.request().url());
    if (u.hostname !== "127.0.0.1") return r.abort();
    if (u.pathname.startsWith("/words/") && !u.pathname.endsWith("/manifest.json")) return r.fulfill({
      json: ["cat"]
    });
    if (u.pathname === "/themes/manifest.json") return r.fulfill({
      json: {
        themes: ["typesetgo", "fire-force", "1984"],
        default: "typesetgo"
      }
    });
    if (u.pathname.startsWith("/themes/") && !u.pathname.endsWith("/manifest.json")) {
      themeFetches++;
      await new Promise(r => setTimeout(r, 1000));
    }
    return r.fallback();
  });
  await p.goto(fixtureOrigin);
  const i = p.getByRole("textbox", {
    name: "Typing practice",
    exact: true
  });
  await expect(i).toBeEnabled();
  // Spotlight is the default style: the full board, with Tab, Enter and a right Shift.
  await expect(p.locator("[data-key]")).toHaveCount(54);
  const keyboard = p.getByRole("region", { name: "On-screen keyboard" });
  await expect(keyboard).toHaveAttribute("data-keyboard-style", "spotlight");
  await i.dispatchEvent("keydown", { key: "CapsLock", code: "CapsLock", modifierCapsLock: true });
  await expect(keyboard.getByRole("status")).toContainText("Caps Lock is on");
  await expect(keyboard.locator('[data-key="Shift"]')).not.toHaveAttribute("data-next-key", "true");
  await expect(keyboard.locator('[data-key="ShiftRight"]')).not.toHaveAttribute("data-next-key", "true");
  await expect(keyboard.locator('[data-key="CapsLock"]')).toHaveClass(/bg-warning/);
  await expect(keyboard.locator('[data-key="c"]')).toHaveAttribute("data-next-key", "true");
  await p.screenshot({ path: artifactPath("practice-caps-lock-narrow.png") });
  await i.dispatchEvent("keyup", { key: "CapsLock", code: "CapsLock", modifierCapsLock: false });
  await expect(keyboard.getByRole("status")).toBeEmpty();
  await expect(keyboard.locator('[data-key="CapsLock"]')).not.toHaveClass(/bg-warning/);
  console.log("Keyboard defaults on; Caps Lock highlights only Caps, with next-letter guidance intact PASS");
  expect(themeFetches).toBeLessThanOrEqual(1);
  // The keyboard is pinned to the bottom, just above the footer, and the text block stays put once typing starts.
  const layout = () => p.evaluate(() => {
    const board = document.querySelector('[data-testid="keyboard-container"]').getBoundingClientRect();
    const text = document.querySelector(".cursor-text").getBoundingClientRect();
    return { boardTop: Math.round(board.top), gap: Math.round(document.querySelector("footer").getBoundingClientRect().top - board.bottom), textTop: Math.round(text.top) };
  });
  await expect(keyboard.getByText("Caps Lock is on", { exact: true })).toHaveCount(0);
  const idleLayout = await layout();
  expect(idleLayout.gap).toBeGreaterThanOrEqual(0);
  expect(idleLayout.gap).toBeLessThanOrEqual(24);
  await i.fill("x ");
  await expect(p.locator("[data-next-key=true][data-key=c]")).toHaveCount(1);
  await expect(p.locator("[data-next-key=true][data-key=Backspace]")).toHaveCount(0);
  await p.waitForTimeout(1000);
  await expect(p.locator("[data-ghost-caret]")).toHaveCount(1);
  expect(await layout()).toEqual(idleLayout);
  console.log("keyboard pinned above the footer; text and keyboard still once typing starts PASS");
  const ghost = await visibleBounds(p.locator("[data-ghost-caret]"));
  console.log("historical error correction guidance + elapsed ghost PASS", ghost);
  await p.setViewportSize({
    width: 260,
    height: 700
  });
  // The styled keyboards scale with their container instead of hiding.
  await expect(p.locator("[data-key]")).toHaveCount(54);
  const narrowOverflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(narrowOverflow).toBeLessThanOrEqual(0);
  await p.setViewportSize({
    width: 900,
    height: 850
  });
  await expect(p.locator("[data-key]")).toHaveCount(54);
  console.log("keyboard260\u2192900 fits without sideways scroll PASS");
  // Phones: the same test settings pill as desktop, wrapped to fit, with everything the old Quick Settings offered.
  const noSideways = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  for (const width of [390, 320]) {
    await p.setViewportSize({ width, height: 844 });
    await p.reload();
    await expect(i).toBeEnabled();
    await expect(p.getByRole("link", { name: "Change theme", exact: true })).toHaveAttribute("href", "/profile/theme");
    await expect(p.getByRole("button", { name: "Quick Settings" })).toHaveCount(0);
    const summary = p.getByRole("button", { name: /^Test settings/ });
    await expectWithinViewport(p, summary);
    expect(await noSideways()).toBe(true);
    await summary.click();
    const panel = p.getByRole("group", { name: "Test settings", exact: true });
    await expect(async () => { await expectWithinViewport(p, panel); }).toPass();
    expect(await noSideways()).toBe(true);
    // Each pick loads a new prompt and the centred pill can shift while it does, so retry a pick until it lands.
    const pick = (control, attribute) => expect(async () => {
      if (await control.getAttribute(attribute) !== "true") await control.click();
      await expect(control).toHaveAttribute(attribute, "true", { timeout: 1000 });
    }).toPass();
    await pick(panel.getByRole("radio", { name: "time", exact: true }), "aria-checked");
    await pick(panel.getByRole("radio", { name: "60s", exact: true }), "aria-checked");
    await pick(panel.getByRole("radio", { name: "hard", exact: true }), "aria-checked");
    await pick(panel.getByRole("button", { name: "punctuation" }), "aria-pressed");
    // Custom length unfolds inside the pill, floating over the test instead of opening a dialog or pushing it down.
    // Measured inside the scrolling practice screen, since the tall editor may scroll it on phones.
    const promptTop = () => p.locator(".cursor-text").evaluate((element) => {
      const screen = element.closest("[class*='overflow-y-auto']");
      return element.getBoundingClientRect().top - screen.getBoundingClientRect().top + screen.scrollTop;
    });
    const restingTop = await promptTop();
    await panel.getByRole("button", { name: "Custom length" }).click();
    const lengthEditor = p.getByRole("region", { name: "Custom duration", exact: true });
    const field = lengthEditor.getByRole("textbox", { name: "Custom duration" });
    await expect(field).toBeFocused();
    await expect(field).toHaveValue("");
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await field.fill("90");
    await expect(lengthEditor.getByRole("status")).toContainText("About 60 words at 40 wpm");
    await lengthEditor.scrollIntoViewIfNeeded();
    await expect(async () => { await expectWithinViewport(p, lengthEditor); }).toPass();
    // The open editor covers the prompt on its own layer; nothing below the pill moves.
    expect(Math.abs(await promptTop() - restingTop)).toBeLessThan(1);
    expect(await noSideways()).toBe(true);
    await p.screenshot({ path: artifactPath(`practice-pill-custom-length-${width}.png`) });
    await field.press("Escape");
    await expect(lengthEditor).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Custom length" })).toBeFocused();
    await panel.getByRole("button", { name: "Custom length" }).click();
    await field.fill("1:30");
    await lengthEditor.getByRole("button", { name: "Use 1:30" }).click();
    await expect(panel).toHaveCount(0);
    await expect(summary).toHaveAccessibleName(/^Test settings: time, 90s, hard/);
    await expect(i).toBeFocused();
    // Preset with no text unfolds its text box straight away.
    await summary.click();
    await panel.getByRole("radio", { name: "preset", exact: true }).click();
    const box = p.getByRole("textbox", { name: "Practice text" });
    await expect(box).toBeFocused();
    await expect(p.getByRole("status").filter({ hasText: "Add your own text above to start." })).toBeVisible();
    await panel.getByRole("button", { name: "Every letter" }).click();
    await expect(box).toHaveValue(/^Sphinx of black quartz/);
    const textEditor = p.getByRole("region", { name: "Your own text" });
    await textEditor.scrollIntoViewIfNeeded();
    await expect(async () => { await expectWithinViewport(p, textEditor); }).toPass();
    expect(await noSideways()).toBe(true);
    await p.screenshot({ path: artifactPath(`practice-pill-own-text-${width}.png`) });
    await panel.getByRole("button", { name: "Practice this" }).click();
    await expect(p.locator("[data-typing-word]").first()).toHaveText("Sphinx");
    await expect(i).toBeFocused();
    await p.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem("typesetgo_settings"));
      localStorage.setItem("typesetgo_settings", JSON.stringify({ ...stored, mode: "words", wordTarget: 10, presetText: "" }));
    });
  }
  console.log("phone settings pill at 390/320: mode, length, difficulty, extras, custom length and own text unfold without sideways scroll PASS");
  // The text sits halfway between the settings pill and the keyboard, or the bottom edge without the keyboard.
  for (const keyboard of [false, true]) {
    const centred = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await centred.addInitScript((showOnScreenKeyboard) => localStorage.setItem("typesetgo_settings", JSON.stringify({
      mode: "words", wordTarget: 25, soundEnabled: false, showOnScreenKeyboard,
    })), keyboard);
    await routeFixtureRequests(centred, r => new URL(r.request().url()).hostname === "127.0.0.1" ? r.fallback() : r.abort());
    await centred.goto(fixtureOrigin);
    await expect(centred.getByRole("textbox", { name: "Typing practice", exact: true })).toBeEnabled();
    await expect(centred.locator("[data-testid=keyboard-container]")).toHaveCount(keyboard ? 1 : 0);
    const offCentre = () => centred.evaluate(() => {
      const pill = document.querySelector("[aria-label^='Test settings']").getBoundingClientRect();
      const board = document.querySelector("[data-testid=keyboard-container]");
      const lower = board ? board.getBoundingClientRect().top : document.querySelector("main").getBoundingClientRect().bottom;
      const text = document.querySelector(".cursor-text").getBoundingClientRect();
      return Math.abs(text.top + text.height / 2 - (pill.bottom + lower) / 2);
    });
    for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768]]) {
      await centred.setViewportSize({ width, height });
      await expect.poll(offCentre, `text block centred ${keyboard ? "above the keyboard" : "above the bottom edge"} at ${width}x${height}`)
        .toBeLessThanOrEqual(6);
    }
    await centred.close();
  }
  console.log("text block centred between the pill and the keyboard or bottom edge PASS");
});
