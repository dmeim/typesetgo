import { test, expect, type Page } from "@playwright/test";
import type { fixture } from "../fixtures/connect-browser/convex";
declare global { interface Window { connectFixture: typeof fixture } }

const diagnostics = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }, testInfo) => {
  const messages = diagnostics.get(page) ?? [];
  if (messages.length) await testInfo.attach("browser-diagnostics", { body: messages.join("\n"), contentType: "text/plain" });
  expect(messages).toEqual([]);
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

  await page.evaluate(() => { const f = window.connectFixture; f.room.status = "active"; f.room.runVersion++; f.emit(); });
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue("");
  await input.fill("hello ");
  await page.clock.runFor(2100);
  await page.evaluate(() => { window.connectFixture.participants[0].resetVersion++; window.connectFixture.emit(); });
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
