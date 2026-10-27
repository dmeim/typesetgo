/**
 * Captures the changelog and README screenshots from the real TypeSetGo UI.
 *
 *   bun run shots:changelog                       # every shot
 *   bun run shots:changelog results-page fonts    # only the named shots (file names without .webp)
 *
 * Needs installed Google Chrome (or PLAYWRIGHT_CHANNEL / PLAYWRIGHT_CHROMIUM_EXECUTABLE, as in
 * tests/browser/README.md) and free loopback ports 4317 (Practice) and 4319 (Connect); the
 * Profiles fixture picks a free port. Nothing talks to Clerk or the live Convex deployment:
 * every page runs on the isolated browser-test fixtures, and requests that leave the fixture
 * origin are blocked and fail the run.
 *
 * - Practice fixture (tests/browser/practice): Home, typing, keyboard, results, theme dialog.
 * - Profiles fixture (tests/browser/profiles, `?scenario=showcase`): /profile/* and /leaderboard.
 * - Connect fixture (tests/fixtures/connect-browser, `?fixture=showcase`): the real App, so it also
 *   serves /privacy and the not-found page at their real paths. Its pages are opened as
 *   https://typesetgo.app and answered locally, so printed join links read like the live site.
 *
 * The `showcase` scenarios exist only for these shots: ordinary names, a few local SVG pictures and
 * believable history. Tune the content there, not with page edits here.
 *
 * Output: public/changelog/<name>.webp, 2x device pixels, WebP quality 82 (lowered step by step
 * when a file would pass ~350 KB). The changelog data in src/lib/changelog.ts points at these paths.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";
import { createServer } from "vite";
import { browserOptions } from "../tests/browser/browser-options.mjs";
import { fixtureOrigin, guardFixtureContext, withFixtureBrowser } from "../tests/browser/runtime.mjs";
import { startProfileFixtureServer } from "../tests/browser/profiles/server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Tailwind scans sources relative to the working directory, as in tests/browser/run.mjs.
process.chdir(root);

const OUTPUT = path.join(root, "public/changelog");
const QUALITY = 82;
const MIN_QUALITY = 66;
const MAX_BYTES = 350 * 1024;
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const CONNECT_ORIGIN = "http://127.0.0.1:4319";
// The address the Connect pages print, as on the live site; see serveFixtureAs.
const PUBLIC_ORIGIN = "https://typesetgo.app";
// Settings a returning visitor might have: words practice, sound off for a quiet headless run.
const PRACTICE_SETTINGS = { mode: "words", wordTarget: 25, difficulty: "beginner", soundEnabled: false, showOnScreenKeyboard: true };

const SHOTS = [
  "settings-pill", "stats-ticker", "keyboard-designs", "results-page", "results-details", "dock-header", "theme-catalog",
  "phone-home", "phone-results", "keyboard-styles", "leaderboard-arena", "profile-stats", "profile-settings",
  "profile-history", "profile-achievements", "fonts", "connect-landing", "connect-host", "connect-board",
  "connect-pictures", "friendly-legal", "keycap-screens",
];
const requested = new Set(process.argv.slice(2));
const unknown = [...requested].filter((name) => !SHOTS.includes(name));
if (unknown.length) throw new Error(`Unknown shot(s): ${unknown.join(", ")}. Choose from: ${SHOTS.join(", ")}`);
const wanted = (...names) => names.some((name) => !requested.size || requested.has(name));
const saved = [];

/** Jumps finite Web Animations (rolling digits, morphs) to their end state. */
function finishAnimations(page) {
  return page.evaluate(() => document.getAnimations().forEach((animation) => {
    if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
  }));
}

/**
 * Waits for a still moment, so springs (rolling numbers, shakes, morphs) have settled: quick 1x
 * probes must match before and after the full-size capture. Live readouts tick every 500 ms, so a
 * still moment comes between ticks. `ignore` lists parts that never stop moving (a timed test's
 * progress bar): they are masked in the probes only.
 */
async function stillFrame(target, options, ignore = []) {
  const page = "page" in target ? target.page() : target;
  const finish = () => finishAnimations(page);
  const probe = async () => {
    await finish();
    return target.screenshot({ type: "png", animations: "disabled", caret: "initial", ...options, scale: "css", mask: ignore });
  };
  let previous = await probe();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const next = await probe();
    if (next.equals(previous)) {
      await finish();
      const full = await target.screenshot({ type: "png", animations: "disabled", caret: "initial", ...options });
      const after = await probe();
      if (after.equals(next)) return full;
      previous = after;
    } else {
      previous = next;
    }
  }
  throw new Error("The page never held still; still moving inside " + JSON.stringify(await changedBox(previous, await probe())));
}

/** The box around pixels that differ between two same-sized PNGs, to say what kept moving. */
async function changedBox(a, b) {
  const [left, right] = await Promise.all([a, b].map((png) => sharp(png).raw().toBuffer({ resolveWithObject: true })));
  const { width, channels } = left.info;
  const box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
  for (let index = 0; index < left.data.length; index += channels) {
    if (left.data.compare(right.data, index, index + channels, index, index + channels) === 0) continue;
    const pixel = index / channels;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    Object.assign(box, { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) });
  }
  return box;
}

/** Screenshots a page (optionally clipped) or a locator and writes it as WebP under the size budget. */
async function save(name, target, { ignore, ...options } = {}) {
  const png = await stillFrame(target, options, ignore);
  let quality = QUALITY;
  let webp = await sharp(png).webp({ quality, effort: 6 }).toBuffer();
  while (webp.length > MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 4;
    webp = await sharp(png).webp({ quality, effort: 6 }).toBuffer();
  }
  const file = path.join(OUTPUT, name + ".webp");
  await writeFile(file, webp);
  const { width, height } = await sharp(webp).metadata();
  saved.push({ name, width, height, kb: Math.round(webp.length / 1024), quality });
  console.log(`  ${name}.webp  ${width}x${height}  ${Math.round(webp.length / 1024)} KB  q${quality}`);
}

/** A clip around an element, padded and kept inside the page. */
async function clipAround(page, locator, pad = { x: 40, y: 40 }) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Cannot clip around a hidden element");
  const { width, height } = page.viewportSize();
  const x = Math.max(0, Math.floor(box.x - pad.x));
  const y = Math.max(0, Math.floor(box.y - (pad.top ?? pad.y)));
  return {
    x, y,
    width: Math.min(width, Math.ceil(box.x + box.width + pad.x)) - x,
    height: Math.min(height, Math.ceil(box.y + box.height + (pad.bottom ?? pad.y))) - y,
  };
}

/** Waits for web fonts, images and two frames so nothing is caught mid-paint. */
async function settle(page, ms = 300) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.complete ? null : image.decode().catch(() => null)));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(ms);
}

/** Drops keyboard focus so programmatic focus rings don't show up in a still. */
const blur = (page) => page.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());

function failOnErrors(errors, label) {
  if (errors.length) throw new Error(`${label}: unexpected page errors or external requests:\n${errors.join("\n")}`);
}

// ---------------------------------------------------------------------------------------------
// Practice fixture

const typingInput = (page) => page.getByRole("textbox", { name: "Typing practice", exact: true });

async function targetWords(page) {
  return (await page.locator("[data-typing-word]").allTextContents()).map((word) => word.trim());
}

// A neighbouring key, so a slip looks like a real one.
const NEIGHBOURS = { a: "s", b: "v", c: "x", d: "s", e: "r", f: "g", g: "h", h: "j", i: "o", j: "k", k: "l", l: "k", m: "n", n: "m", o: "i", p: "o", q: "w", r: "t", s: "a", t: "r", u: "y", v: "b", w: "e", x: "z", y: "u", z: "x" };

/**
 * Types the first `count` target words like a person: speed drifts word to word, and words in
 * `slips` get one wrong letter that is left in. Returns once the last space is typed.
 */
async function typeLikeAPerson(page, count, { wpm = 72, slips = [], pauses = [], trailingSpace = true } = {}) {
  const words = await targetWords(page);
  await typingInput(page).focus();
  const total = Math.min(count, words.length);
  for (let index = 0; index < total; index += 1) {
    // Warm up over the first words, find a rhythm, and wobble a little.
    const warmUp = 0.55 + 0.45 * Math.min(1, index / Math.max(4, total * 0.35));
    const pace = wpm * warmUp * (1 + 0.25 * Math.sin(index * 0.7) + 0.1 * Math.cos(index * 2.3));
    const delay = Math.round(60_000 / (pace * 5));
    if (pauses.includes(index)) await page.waitForTimeout(1400);
    let word = words[index];
    if (slips.includes(index) && word.length > 1) {
      const at = Math.min(word.length - 1, 1 + (index % (word.length - 1)));
      word = word.slice(0, at) + (NEIGHBOURS[word[at].toLowerCase()] ?? "e") + word.slice(at + 1);
    }
    await page.keyboard.type(word, { delay });
    if (trailingSpace || index < count - 1) await page.keyboard.type(" ", { delay });
  }
}

async function openPracticeHome(browser, { viewport = DESKTOP, settings = {}, reducedMotion = "reduce" } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion });
  // A controllable clock (it runs normally until `freeze`), so a mid-test frame can be held still.
  await context.clock.install();
  await context.addInitScript((stored) => {
    // Only on the fixture's first load in this context, so later reloads keep what the page saved.
    if (location.protocol === "http:" && !sessionStorage.getItem("shots-seeded")) {
      localStorage.setItem("typesetgo_settings", JSON.stringify(stored));
      localStorage.setItem("typesetgo_layout", JSON.stringify({ linePreview: 3, maxWordsPerLine: 6 }));
      sessionStorage.setItem("shots-seeded", "1");
    }
  }, { ...PRACTICE_SETTINGS, ...settings });
  const page = await context.newPage();
  await page.goto(fixtureOrigin + "/");
  await expect(typingInput(page)).toBeEnabled();
  await expect(page.locator("[data-typing-word]").first()).toBeVisible();
  await settle(page);
  return page;
}

/**
 * Stops the page clock mid-test and plays about 1 s of timers and frames, so the speed and timer
 * readouts stop changing and their rolling digits land.
 */
async function freeze(page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 50);
  for (let step = 0; step < 6; step += 1) {
    await page.clock.runFor(200);
    // Web Animations follow the real timeline, so finish them and let the next frames clean up.
    await finishAnimations(page);
  }
}

async function finishWithResults(page, count, options) {
  await typeLikeAPerson(page, count, options);
  const results = page.getByRole("region", { name: "Test results" });
  await expect(results).toBeVisible();
  await settle(page, 900);
  await blur(page);
  return results;
}

async function practiceShots() {
  if (!wanted("settings-pill", "stats-ticker", "keyboard-designs", "results-page", "results-details", "dock-header", "theme-catalog", "phone-home", "phone-results")) return;
  console.log("Practice fixture");
  const server = await createServer({ configFile: path.join(root, "tests/browser/practice/vite.config.ts"), logLevel: "warn" });
  await server.listen();
  try {
    await withFixtureBrowser(async (browser) => {
      if (wanted("settings-pill")) {
        const page = await openPracticeHome(browser);
        await page.getByRole("button", { name: /^Test settings/ }).click();
        const group = page.getByRole("group", { name: "Test settings" });
        await expect(group).toBeVisible();
        await settle(page, 600);
        await blur(page);
        const box = await group.boundingBox();
        await save("settings-pill", page, { clip: { x: 0, y: 0, width: DESKTOP.width, height: Math.ceil(box.y + box.height + 72) } });
        await page.context().close();
      }

      if (wanted("stats-ticker")) {
        const page = await openPracticeHome(browser, { settings: { mode: "time", duration: 60 } });
        await typeLikeAPerson(page, 9, { wpm: 84, slips: [5] });
        await freeze(page);
        await save("stats-ticker", page);
        await page.context().close();
      }

      if (wanted("keyboard-designs")) {
        const page = await openPracticeHome(browser);
        await typeLikeAPerson(page, 4, { wpm: 80 });
        // A wrong letter: the Spotlight board lights delete and says how to fix it.
        const next = (await targetWords(page))[4];
        await page.keyboard.type(next.slice(0, 1) + (NEIGHBOURS[next[1]] ?? "e"), { delay: 140 });
        await expect(page.getByRole("status").filter({ hasText: "Oops, wrong letter" })).toBeVisible();
        await freeze(page);
        await save("keyboard-designs", page);
        await page.context().close();
      }

      if (wanted("results-page", "results-details")) {
        const page = await openPracticeHome(browser, { settings: { wordTarget: 50 } });
        await finishWithResults(page, 50, { wpm: 84, slips: [6, 17, 24, 31, 44], pauses: [21, 36] });
        if (wanted("results-page")) await save("results-page", page);
        if (wanted("results-details")) {
          await page.getByRole("button", { name: /^\d+ mistakes?$/ }).click();
          await expect(page.getByRole("button", { name: "Back to the graph" }).first()).toBeVisible();
          await settle(page, 900);
          await blur(page);
          await save("results-details", page);
        }
        await page.context().close();
      }

      if (wanted("dock-header")) {
        const page = await openPracticeHome(browser, { viewport: { width: 1600, height: 900 } });
        const dock = page.locator("[data-header-dock]");
        await save("dock-header", page, { clip: await clipAround(page, dock, { x: 56, top: 14, bottom: 14 }) });
        await page.context().close();
      }

      if (wanted("theme-catalog")) {
        const page = await openPracticeHome(browser);
        await page.getByRole("button", { name: "Change theme", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("button", { name: "Expand all" })).toBeVisible();
        await expect(dialog.getByText("Loading themes…")).toHaveCount(0);
        // Open one category so its grid of cards shows, then hover a card so the preview follows it.
        await dialog.getByRole("button", { name: /^Featured \(/ }).click();
        await dialog.getByRole("button", { name: /^Editor\/IDE \(/ }).click();
        const cards = dialog.locator("#theme-category-editor button[aria-label]");
        await expect(cards.first()).toBeVisible();
        // The card's name area, not its light/dark buttons, previews the theme in the mode in use.
        await dialog.getByRole("button", { name: "Select Dracula", exact: true }).hover({ position: { x: 40, y: 50 } });
        await page.waitForLoadState("networkidle");
        await expect(dialog.getByText(/Loading preview/)).toHaveCount(0);
        await settle(page, 900);
        await blur(page);
        await save("theme-catalog", page);
        await page.context().close();
      }

      if (wanted("phone-home")) {
        const page = await openPracticeHome(browser, { viewport: PHONE });
        await typeLikeAPerson(page, 5, { wpm: 70 });
        await freeze(page);
        await save("phone-home", page);
        await page.context().close();
      }

      if (wanted("phone-results")) {
        const page = await openPracticeHome(browser, { viewport: PHONE, settings: { wordTarget: 25 } });
        await finishWithResults(page, 25, { wpm: 66, slips: [7, 18] });
        await save("phone-results", page);
        await page.context().close();
      }
    });
  } finally {
    await server.close();
  }
}

// ---------------------------------------------------------------------------------------------
// Profiles fixture

async function profileShots() {
  if (!wanted("keyboard-styles", "leaderboard-arena", "profile-stats", "profile-settings", "profile-history", "profile-achievements", "fonts")) return;
  console.log("Profiles fixture");
  const { server, url } = await startProfileFixtureServer();
  const browser = await chromium.launch(browserOptions());
  try {
    const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2, reducedMotion: "reduce", serviceWorkers: "block" });
    const errors = await guardFixtureContext(context, url);
    const page = await context.newPage();
    const open = async (route, query = {}) => {
      await page.goto(`${url}${route}?${new URLSearchParams({ scenario: "showcase", theme: "dark", ...query })}`);
      await page.locator("#root > *").first().waitFor();
      await page.waitForLoadState("networkidle");
      await settle(page, 500);
    };

    if (wanted("profile-stats")) {
      await open("/profile");
      await expect(page.getByRole("heading", { name: "Lifetime statistics" })).toBeVisible();
      await settle(page, 600);
      await save("profile-stats", page);
    }
    if (wanted("profile-settings")) {
      await open("/profile/theme");
      await expect(page.getByRole("radiogroup", { name: "Theme categories" })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await settle(page, 900);
      await save("profile-settings", page);
    }
    if (wanted("profile-history")) {
      await open("/profile/history");
      const row = page.getByRole("button", { name: /Test details$/ }).first();
      await row.click();
      await expect(row).toHaveAttribute("aria-expanded", "true");
      await settle(page, 600);
      await blur(page);
      await save("profile-history", page);
    }
    if (wanted("profile-achievements")) {
      await open("/profile/achievements");
      await expect(page.locator('[data-achievement-category="speed"]')).toBeVisible();
      await save("profile-achievements", page);
    }
    if (wanted("fonts")) {
      await open("/profile/text");
      await expect(page.getByRole("radiogroup").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      await settle(page, 900);
      await save("fonts", page);
    }
    if (wanted("keyboard-styles")) {
      // Tall enough for all four style previews under the header.
      await page.setViewportSize({ width: DESKTOP.width, height: 1420 });
      await open("/profile/keyboard");
      await expect(page.getByRole("radiogroup", { name: "Keyboard style" })).toBeVisible();
      await settle(page, 600);
      await save("keyboard-styles", page);
      await page.setViewportSize(DESKTOP);
    }
    if (wanted("leaderboard-arena")) {
      // Podium plus ranks 4-9, sized so the sticky "You're #11" bar lands over rank 10 instead of cutting a row in half.
      await page.setViewportSize({ width: DESKTOP.width, height: 1400 });
      await open("/leaderboard", { you: "leaderboard-user-11" });
      await expect(page.getByRole("heading", { name: "Leaderboard", exact: true })).toBeVisible();
      await expect(page.locator("[data-podium-rank]")).toHaveCount(3);
      const rowNine = await page.locator('[data-leaderboard-row="9"]').boundingBox();
      const bar = await page.getByRole("complementary", { name: "Your standing" }).boundingBox();
      if (!rowNine || !bar) throw new Error("Leaderboard row 9 or the standing bar is missing");
      await page.setViewportSize({ width: DESKTOP.width, height: Math.ceil(rowNine.y + rowNine.height + 6 + bar.height + 16) });
      await settle(page, 900);
      await save("leaderboard-arena", page);
    }
    failOnErrors(errors, "Profiles fixture");
  } finally {
    await browser.close();
    await server.close();
  }
}

// ---------------------------------------------------------------------------------------------
// Connect fixture (the real App with Convex and Clerk replaced)

/**
 * The host panel and board print the site's own address ("Join at …/connect/join"). The page is
 * opened at the public address and every request for it is answered by the local fixture, so the
 * shots read typesetgo.app instead of 127.0.0.1:4319. Anything else is blocked and fails the run.
 */
async function serveFixtureAs(context, publicOrigin, localOrigin) {
  const errors = [];
  context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== publicOrigin) {
      errors.push("Blocked unexpected request: " + url.origin + url.pathname);
      return route.abort();
    }
    const response = await route.fetch({ url: localOrigin + url.pathname + url.search });
    return route.fulfill({ response });
  });
  await context.routeWebSocket("**/*", (socket) => {
    // Vite's dev client still opens its socket with HMR off; leave it as an idle mock.
    if (new URL(socket.url()).host === new URL(publicOrigin).host) return;
    errors.push("Blocked unexpected WebSocket: " + socket.url());
    socket.close({ code: 1008, reason: "Fixture only" });
  });
  return errors;
}

/** Grows the viewport to the page's full height (up to `max`) so a long page shows in one shot. */
async function fitHeight(page, max) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: page.viewportSize().width, height: Math.min(max, height) });
  await settle(page, 300);
}

async function connectShots() {
  if (!wanted("connect-landing", "connect-host", "connect-board", "connect-pictures", "friendly-legal", "keycap-screens")) return;
  console.log("Connect fixture");
  const server = await createServer({ configFile: path.join(root, "tests/fixtures/connect-browser/vite.config.ts"), logLevel: "warn" });
  await server.listen();
  const browser = await chromium.launch(browserOptions());
  try {
    const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2, reducedMotion: "reduce", serviceWorkers: "block" });
    const errors = await serveFixtureAs(context, PUBLIC_ORIGIN, CONNECT_ORIGIN);
    const page = await context.newPage();
    const open = async (route) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(PUBLIC_ORIGIN + route);
      await page.locator("#root > *").first().waitFor();
      await page.waitForLoadState("networkidle");
      await settle(page, 500);
    };

    if (wanted("connect-landing")) {
      await open("/connect?fixture=landing");
      const join = page.getByRole("region", { name: "Join a room" });
      await join.getByLabel("Room code").pressSequentially("abcd", { delay: 90 });
      await expect(join.getByText("Found it!")).toBeVisible();
      await join.getByLabel("What should we call you?").pressSequentially("Alex", { delay: 60 });
      await fitHeight(page, 1400);
      await settle(page, 900);
      await blur(page);
      await save("connect-landing", page);
    }
    if (wanted("connect-host")) {
      await open("/connect/host/room-live?fixture=showcase");
      await expect(page.getByRole("region", { name: "Room code" })).toBeVisible();
      // Down to the end of the test list; the Everyone gets and Live board cards below are left out.
      await page.setViewportSize({ width: DESKTOP.width, height: 1500 });
      await settle(page, 900);
      const tests = await page.getByRole("region", { name: "Tests" }).boundingBox();
      await save("connect-host", page, { clip: { x: 0, y: 0, width: DESKTOP.width, height: Math.ceil(tests.y + tests.height + 20) } });
    }
    if (wanted("connect-board", "connect-pictures")) {
      await open("/connect/host/room-live/board?fixture=showcase");
      const players = page.getByRole("list", { name: "Players" });
      const cards = players.getByRole("article");
      await expect(cards).toHaveCount(8);
      await settle(page, 1200);
      if (wanted("connect-board")) {
        const list = await players.boundingBox();
        await save("connect-board", page, { clip: { x: 0, y: 0, width: DESKTOP.width, height: Math.ceil(list.y + list.height + 40) } });
      }
      if (wanted("connect-pictures")) {
        // Both rows of cards: account pictures for Maya, Priya, Sofia and Ava, letters for guests.
        const first = await cards.nth(0).boundingBox();
        const last = await cards.nth(7).boundingBox();
        const pad = 12;
        await save("connect-pictures", page, {
          clip: { x: first.x - pad, y: first.y - pad, width: last.x + last.width - first.x + 2 * pad, height: last.y + last.height - first.y + 2 * pad },
        });
      }
    }
    if (wanted("friendly-legal")) {
      await open("/privacy");
      await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
      await save("friendly-legal", page);
    }
    if (wanted("keycap-screens")) {
      await open("/this-page-does-not-exist");
      const heading = page.getByRole("heading", { name: "Page not found" });
      await expect(heading).toBeVisible();
      await settle(page, 1200);
      await save("keycap-screens", page, { clip: await clipAround(page, page.locator("main > section"), { x: 300, y: 110 }) });
    }
    failOnErrors(errors, "Connect fixture");
  } finally {
    await browser.close();
    await server.close();
  }
}

await mkdir(OUTPUT, { recursive: true });
await practiceShots();
await profileShots();
await connectShots();
console.log(`\n${saved.length} screenshot(s) in ${path.relative(root, OUTPUT)}/`);
