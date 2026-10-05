import { test, expect, type Page } from "@playwright/test";
import type { fixture } from "../fixtures/connect-browser/convex";
declare global { interface Window { connectFixture: typeof fixture } }

const diagnostics = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }, testInfo) => {
  const messages = diagnostics.get(page) ?? [];
  if (messages.length) await testInfo.attach("browser-diagnostics", { body: messages.join("\n"), contentType: "text/plain" });
  expect(messages).toEqual([]);
});

test("real Connect restores partial and completed attempts across refresh with scoped room colors", async ({ page }) => {
  const errors: string[] = [];
  diagnostics.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" || url.protocol === "data:" ? route.continue() : route.abort();
  });
  await page.goto("/connect/join?code=DEMO1&name=Tester");
  await expect.poll(() => page.evaluate(() => Boolean(window.connectFixture))).toBe(true);
  await page.clock.install();
  const personalTheme = await page.evaluate(() => document.documentElement.style.cssText);
  const longWord = "antidisestablishmentarianism";
  await page.evaluate((word) => {
    const f = window.connectFixture;
    f.room.settings = { ...f.room.settings, mode: "words", wordTarget: 3, theme: {
      cursor: "#ffff00", ghostCursor: "#00ffff", defaultText: "#ff00ff", upcomingText: "#ff00ff",
      correctText: "#ffffff", incorrectText: "#ff0000", backgroundColor: "#000000", surfaceColor: "#111111",
      buttonUnselected: "#ffff00", buttonSelected: "#00ffff",
    } };
    f.room.status = "active";
    f.room.runVersion = 1;
    f.participants[0] = { ...f.participants[0], resetVersion: 1, typedText: word + " ", targetText: word + " cat dog",
      stats: { wpm: 25, accuracy: 100, progress: 33, wordsTyped: 1, timeElapsed: 12500, isFinished: false } };
    f.requests = [];
    f.emit();
  }, longWord);
  const input = page.getByRole("textbox", { name: "Typing practice" });
  await expect(input).toHaveValue(longWord + " ");
  await page.reload();
  await expect(input).toHaveValue(longWord + " ");
  await expect.poll(async () => (await lastStats(page))?.timeElapsed).toBeGreaterThanOrEqual(12500);
  expect((await lastStats(page)).timeElapsed).toBeLessThan(13000);
  expect(await page.evaluate(() => document.documentElement.style.cssText)).toBe(personalTheme);
  await expect(page.locator("[data-typing-word]").nth(1).locator("span").first()).toHaveCSS("color", "rgb(255, 0, 255)");
  await expect(page.locator("[data-typing-caret]")).toHaveCSS("background-color", "rgb(255, 255, 0)");
  expect(await input.evaluate((element) => getComputedStyle(element.closest('[style*="--theme-typing-default"]')!).backgroundColor)).toBe("rgb(0, 0, 0)");
  await expect(page.getByRole("button", { name: "Leave room", exact: true })).toBeEnabled();
  await input.fill(longWord + " cat ");
  await page.clock.runFor(600);
  expect(await page.evaluate(() => window.connectFixture.requests.filter((r) => r.name === "participants:updateStats").at(-1)?.args.stats)).toMatchObject({ wordsTyped: 2, isFinished: false });
  await input.fill(longWord + " cat dog ");
  await expect(page.getByRole("region", { name: "Test results" })).toBeVisible();
  await expect.poll(async () => (await lastStats(page)).isFinished).toBe(true);
  const completedElapsed = (await lastStats(page)).timeElapsed;
  await page.evaluate(() => { window.connectFixture.requests = []; window.connectFixture.emit(); });
  await page.reload();
  await expect(page.getByRole("region", { name: "Test results" })).toBeVisible();
  await expect.poll(async () => (await lastStats(page))?.isFinished).toBe(true);
  expect((await lastStats(page)).timeElapsed).toBe(completedElapsed);
  expect(await page.evaluate(() => window.connectFixture.requests.filter((r) => r.name === "participants:updateStats").every((r) =>
    (r.args.stats as { isFinished: boolean }).isFinished && r.args.typedText === "antidisestablishmentarianism cat dog "))).toBe(true);
  await page.getByRole("button", { name: "Leave room", exact: true }).click();
  await expect(page).toHaveURL(/\/connect$/);
});

async function reportCount(page: Page) {
  return page.evaluate(() => window.connectFixture.requests.filter((r) => r.name === "participants:updateStats").length);
}
async function lastStats(page: Page) {
  return page.evaluate(() => window.connectFixture.requests.filter((r) => r.name === "participants:updateStats").at(-1)?.args.stats as { timeElapsed: number; isFinished: boolean });
}

test("real Join executes the selected timed plan and obeys stop, reset and fresh start", async ({ page }) => {
  const errors: string[] = [];
  diagnostics.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" || url.protocol === "data:" ? route.continue() : route.abort();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/connect/join?code=DEMO1&name=Tester");
  await expect.poll(() => page.evaluate(() => Boolean(window.connectFixture)), { message: "Connect fixture must bootstrap before scenario setup" }).toBe(true);
  await page.evaluate(() => {
    const f = window.connectFixture;
    f.room.settings = {
      ...f.room.settings, mode: "plan", planIndex: 0,
      plan: [{ id: "timed", mode: "preset", settings: {
        presetModeType: "time", duration: 45, presetText: "hello world ".repeat(300),
      }, metadata: { title: "Timed warmup", subtitle: "45 seconds" }, syncSettings: { waitForAll: false, zenWaiting: false } }],
    };
    f.room.status = "active"; f.room.runVersion++;
    f.emit();
  });
  const input = page.locator('input[name="typing-test-input"]');
  await expect(input).toBeEnabled();
  await page.clock.install();
  await input.fill("hel");
  await page.clock.runFor(5100);
  await expect.poll(async () => (await lastStats(page))?.timeElapsed).toBeGreaterThanOrEqual(5000);
  await page.evaluate(() => { window.connectFixture.room.status = "waiting"; window.connectFixture.emit(); });
  await expect(input).toBeDisabled();
  const stoppedReports = await reportCount(page);
  await page.clock.runFor(10000);
  expect(await reportCount(page)).toBe(stoppedReports);
  await expect(input).toHaveValue("hel");

  await page.evaluate(() => { const f = window.connectFixture; f.room.status = "active"; f.room.runVersion++; f.resetAttempt(); f.emit(); });
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue("");
  await input.fill("hello ");
  await page.clock.runFor(2100);
  await page.evaluate(() => { const f = window.connectFixture; f.participants[0].resetVersion++; f.resetAttempt(f.participants[0]._id); f.emit(); });
  await expect(input).toHaveValue("");
  await input.fill("hello ");
  await page.clock.runFor(44000);
  expect((await lastStats(page)).isFinished).toBe(false);
  await page.clock.runFor(1500);
  await expect.poll(async () => (await lastStats(page)).isFinished).toBe(true);
  expect((await lastStats(page)).timeElapsed).toBeGreaterThanOrEqual(45000);
  expect((await lastStats(page)).timeElapsed).toBeLessThan(46000);
  const requests = await page.evaluate(() => window.connectFixture.requests);
  expect(requests.filter((r) => /^(typingSessions|testResults):/.test(r.name))).toEqual([]);
  const reports = requests.filter((r) => r.name === "participants:updateStats");
  expect(reports.at(-1)?.args).toMatchObject({ runVersion: 2, resetVersion: 1 });
  expect(errors).toEqual([]);
});
