import { expect, test, type Page } from "@playwright/test";
import { guardFixtureContext } from "../../browser/runtime.mjs";
import type {} from "./mock-convex";

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page, baseURL }) => {
  browserErrors.set(page, await guardFixtureContext(page.context(), baseURL!));
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

const callsNamed = (page: Page, name: string) =>
  page.evaluate((target) => window.__connectFixture.calls.filter((call) => call.name === target).map((call) => call.args), name);

/** Simulates a host action from another browser by updating the shared mock store. */
const hostDoes = (page: Page, name: string, args: Record<string, unknown> = {}) =>
  page.evaluate(([action, extra]) => { window.__connectFixture.host(action, extra); }, [name, args] as const);

const typingInput = (page: Page) => page.getByRole("textbox", { name: "Typing practice", exact: true });

async function typeIntoTest(page: Page, text: string) {
  const input = typingInput(page);
  await expect(input).toBeEnabled();
  await input.focus();
  await page.keyboard.type(text, { delay: 30 });
}

async function expectNoHorizontalScroll(page: Page) {
  const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(size.scroll, "page must not scroll horizontally").toBeLessThanOrEqual(size.width);
}

test.describe("landing", () => {
  test("Connect nav link follows a vertical separator and is active; Host and Join cards render", async ({ page }) => {
    await page.goto("/connect?fixture=landing");
    const nav = page.getByRole("navigation", { name: "Practice modes" });
    const link = nav.getByRole("link", { name: "Connect", exact: true });
    await expect(link).toHaveAttribute("aria-current", "page");
    expect(await link.evaluate((element) => {
      const previous = element.previousElementSibling;
      return previous?.getAttribute("role") === "separator" && previous.getAttribute("aria-orientation") === "vertical";
    })).toBe(true);
    await expect(nav.getByRole("link", { name: "Type", exact: true })).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1, name: "Connect" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Host a room" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Join a room" })).toBeVisible();
  });

  test("join code is sanitized to four uppercase characters and previews the room", async ({ page }) => {
    await page.goto("/connect?fixture=landing");
    const join = page.getByRole("region", { name: "Join a room" });
    const code = join.getByLabel("Room code");
    await code.pressSequentially("ab-c!d9");
    await expect(code).toHaveValue("ABCD");
    await expect(join.getByText(/Joining\s*Period 3\s*hosted by\s*Ms\. Rivera/)).toBeVisible();

    await code.fill("");
    await code.pressSequentially("o0i1");
    await expect(code, "ambiguous characters are outside the code alphabet").toHaveValue("");
    await expect(join.getByText("Enter the 4-character code from your host.")).toBeVisible();

    await code.pressSequentially("wxyz");
    await expect(code).toHaveValue("WXYZ");
    await expect(join.getByText("No live room with this code")).toBeVisible();
  });

  test("joining with a link code focuses the name and lands in the room", async ({ page }) => {
    await page.goto("/connect/join?code=abcd&fixture=landing");
    const join = page.getByRole("region", { name: "Join a room" });
    await expect(join.getByLabel("Room code")).toHaveValue("ABCD");
    await expect(join.getByLabel("Your name")).toBeFocused();
    await page.keyboard.type("Alex");
    await join.getByRole("button", { name: "Join room" }).click();
    await expect(page).toHaveURL(/\/connect\/room\/room-live$/);
    await expect(page.getByText("Test 1 of 4")).toBeVisible();
    expect(await callsNamed(page, "connect:join")).toEqual([
      expect.objectContaining({ code: "ABCD", name: "Alex" }),
    ]);
  });

  test("recent rooms list a live room to resume and an ended room to reopen", async ({ page }) => {
    await page.goto("/connect?fixture=landing");
    const recent = page.getByRole("region", { name: /Recent rooms/ });
    await expect(recent.getByText("Reopening an ended room keeps its tests and gives it a new code.")).toBeVisible();
    await expect(recent.getByRole("button", { name: "Resume Period 3" })).toBeVisible();
    await expect(recent.getByText("Ended 2 h ago")).toBeVisible();
    await recent.getByRole("button", { name: "Reopen Period 2" }).click();
    await expect(page).toHaveURL(/\/connect\/host\/room-ended$/);
    await expect(page.getByRole("button", { name: "Share room code QRST" })).toBeVisible();
    expect(await callsNamed(page, "connect:reopenRoom")).toEqual([expect.objectContaining({ roomId: "room-ended" })]);
  });
});

test.describe("host panel", () => {
  test("code, host-paced test states and adding a test", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host");
    await expect(page.getByRole("button", { name: "Share room code ABCD" })).toBeVisible();
    const list = page.getByRole("region", { name: "Tests" }).getByRole("listitem");
    await expect(list).toHaveCount(4);

    // Test 1 is done (greyed), test 2 is current, tests 3 and 4 are upcoming.
    await expect(list.nth(0)).toContainText("(finished)");
    await expect(list.nth(0)).toHaveClass(/text-muted-foreground/);
    await expect(list.nth(0)).not.toHaveAttribute("aria-current", "step");
    await expect(list.nth(1)).toHaveAttribute("aria-current", "step");
    await expect(list.nth(1)).toContainText("(current)");
    for (const index of [2, 3]) {
      await expect(list.nth(index)).not.toHaveAttribute("aria-current", "step");
      await expect(list.nth(index)).not.toContainText(/\((finished|current)\)/);
      await expect(list.nth(index)).not.toHaveClass(/text-muted-foreground/);
      await expect(list.nth(index).getByRole("button", { name: `Edit test ${index + 1}` })).toBeVisible();
    }
    await expect(list.nth(0)).toContainText("Locked");
    await expect(list.nth(1)).toContainText("Locked");
    await expect(page.getByRole("region", { name: "Run" })).toContainText("Test 2 of 4");

    const editor = page.getByRole("region", { name: "Add a test" });
    await editor.getByRole("radio", { name: "Words" }).click();
    await editor.getByRole("button", { name: "Add to list" }).click();
    await expect(list).toHaveCount(5);
    await expect(page.getByRole("region", { name: "Tests" })).toContainText("5 of 50");
    const saved = await callsNamed(page, "connect:setTests");
    expect(saved).toHaveLength(1);
    const tests = saved[0].tests as { id: string; mode: string }[];
    expect(tests.map((item) => item.id).slice(0, 4)).toEqual(["t1", "t2", "t3", "t4"]);
    expect(tests[4].mode).toBe("words");
  });

  test("pacing toggle and a participant-settings override save through updateRoom", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host-lobby");
    const run = page.getByRole("region", { name: "Run" });
    const pacing = run.getByRole("radiogroup", { name: "Pacing" });
    await expect(pacing.getByRole("radio", { name: "Host-led" })).toHaveAttribute("aria-checked", "true");
    await pacing.getByRole("radio", { name: "Self-paced" }).click();
    await expect(pacing.getByRole("radio", { name: "Self-paced" })).toHaveAttribute("aria-checked", "true");
    await expect(run.getByText("Everyone works through the list at their own speed after you start.")).toBeVisible();
    expect(await callsNamed(page, "connect:updateRoom")).toEqual([expect.objectContaining({ pacing: "participant" })]);

    const settings = page.getByRole("region", { name: "Participant settings" });
    const textOverride = settings.getByRole("switch", { name: "Use room setting for text" });
    await expect(textOverride).toHaveAttribute("aria-checked", "false");
    await expect(settings.getByLabel("Font")).toBeDisabled();
    await textOverride.click();
    await expect(textOverride).toHaveAttribute("aria-checked", "true");
    await expect(settings.getByText("Everyone uses this font, size, and alignment.")).toBeVisible();
    await expect(settings.getByLabel("Font")).toBeEnabled();
    await expect.poll(async () => (await callsNamed(page, "connect:updateRoom")).at(-1)).toEqual(
      expect.objectContaining({ overrides: expect.objectContaining({ typography: expect.objectContaining({ enabled: true }) }) }),
    );
    // Pacing is locked once the room runs.
    await run.getByRole("button", { name: "Start" }).click();
    await expect(pacing.getByRole("radio", { name: "Host-led" })).toBeDisabled();
  });

  test("participants section shows cards with Fullscreen, Pop out and Open in new tab", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host");
    const section = page.getByRole("region", { name: "Participants" });
    await expect(section.getByText("3 joined · 2 online")).toBeVisible();
    for (const name of ["Bea", "Cam", "Dev"]) await expect(section.getByRole("article", { name })).toBeVisible();
    await expect(section.getByRole("article", { name: "Bea" })).toContainText("52");
    await expect(section.getByRole("button", { name: "Remove Bea" })).toBeVisible();

    const newTab = section.getByRole("link", { name: "Open in new tab" });
    await expect(newTab).toHaveAttribute("href", "/connect/host/room-live/board");
    await expect(newTab).toHaveAttribute("target", "_blank");

    const popupPromise = page.waitForEvent("popup");
    await section.getByRole("button", { name: "Pop out" }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/\/connect\/host\/room-live\/board$/);
    await expect(popup.getByRole("heading", { level: 1, name: "Period 3" })).toBeVisible();
    await popup.close();

    await section.getByRole("button", { name: "Fullscreen" }).click();
    await expect(section.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
    expect(await page.evaluate(() => document.fullscreenElement?.getAttribute("aria-labelledby"))).toBe("connect-participants-heading");
    await expect(section.getByRole("button", { name: "Pop out" })).toHaveCount(0);
    await section.getByRole("button", { name: "Exit fullscreen" }).click();
    await expect(section.getByRole("button", { name: "Fullscreen" })).toBeVisible();
  });
});

test.describe("participant room", () => {
  test("waiting screen lists the tests, then the host starts the run", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-lobby");
    await expect(page.getByRole("heading", { name: "Waiting for the host to start" })).toBeVisible();
    await expect(page.getByText("You're in as Alex.")).toBeVisible();
    const tests = page.getByRole("list", { name: "Tests in this room" }).getByRole("listitem");
    await expect(tests).toHaveCount(4);
    await expect(tests.nth(0)).toContainText("Warm up");
    await expect(tests.nth(1)).toContainText("Time · 30s");
    await hostDoes(page, "start");
    await expect(page.getByText("Test 1 of 4")).toBeVisible();
    await expect(typingInput(page)).toBeEnabled();
  });

  test("host-paced test: typing works, Escape does not end it, results wait for the host", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-host");
    await expect(page.getByText("Test 1 of 4")).toBeVisible();
    await typeIntoTest(page, "the cat");
    await page.keyboard.press("Escape");
    const results = page.getByRole("region", { name: "Test results" });
    // Give a regression time to render results before asserting their absence.
    await page.waitForTimeout(400);
    await expect(results).toHaveCount(0);
    await expect(typingInput(page)).toHaveValue("the cat");
    await typingInput(page).focus();
    await page.keyboard.type(" sat", { delay: 30 });
    await expect(results).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Waiting for the host to start the next test" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next test" })).toHaveCount(0);
    await expect.poll(async () => (await callsNamed(page, "connect:reportProgress")).some((args) => (args.stats as { isFinished: boolean }).isFinished)).toBe(true);
  });

  test("self-paced: results, Next test, Up next splash, next test and the all-done summary", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-self");
    await expect(page.getByText("Test 1 of 2")).toBeVisible();
    await typeIntoTest(page, "the cat sat");
    const next = page.getByRole("button", { name: "Next test" });
    await expect(next).toBeEnabled();
    await expect(page.getByText("Waiting for the host to start the next test")).toHaveCount(0);
    await next.click();

    await expect(page.getByRole("heading", { name: "Up next" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Up next" })).toContainText("Sprint");
    await expect(page.getByRole("list", { name: "Tests in this room" }).getByRole("listitem").nth(1)).toHaveAttribute("aria-current", "step");
    // The splash continues on its own.
    await expect(page.getByText("Test 2 of 2")).toBeVisible({ timeout: 6000 });
    await typeIntoTest(page, "a dog ran");
    const finish = page.getByRole("button", { name: "Finish" });
    await expect(finish).toBeEnabled();
    await finish.click();

    await expect(page.getByRole("heading", { name: "All done, Alex!" })).toBeVisible();
    const rows = page.getByRole("list", { name: "Your results" }).getByRole("listitem");
    await expect(rows).toHaveCount(2);
    for (const index of [0, 1]) await expect(rows.nth(index)).toContainText(/\d+ wpm/);
    expect((await callsNamed(page, "connect:advance")).map((args) => args.stepIndex)).toEqual([0, 1]);
  });

  test("host removal mid-room shows the removed screen", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-host");
    await expect(page.getByText("Test 1 of 4")).toBeVisible();
    await hostDoes(page, "removeParticipant", { participantId: "p-self" });
    await expect(page.getByRole("heading", { name: "The host removed you from this room" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Join again" })).toHaveAttribute("href", "/connect/join");
  });

  test("a removed seat on load shows the removed screen", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-removed");
    await expect(page.getByRole("heading", { name: "The host removed you from this room" })).toBeVisible();
  });

  test("ending the room shows the ended screen", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-lobby");
    await expect(page.getByRole("heading", { name: "Waiting for the host to start" })).toBeVisible();
    await hostDoes(page, "endRoom");
    await expect(page.getByRole("heading", { name: "This room has ended" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Connect" })).toHaveAttribute("href", "/connect");
  });
});

test.describe("board", () => {
  test("host-paced board shows the summary strip and cards", async ({ page }) => {
    await page.goto("/connect/host/room-live/board?fixture=host");
    await expect(page.getByRole("heading", { level: 1, name: "Period 3" })).toBeVisible();
    await expect(page.getByLabel("Room code A B C D")).toBeVisible();
    const summary = page.getByRole("region", { name: "Room progress" });
    await expect(summary.getByRole("heading", { name: "Test 2 of 4" })).toBeVisible();
    await expect(summary.getByRole("list", { name: "1 of 4 tests done" })).toBeVisible();
    const cards = page.getByRole("list", { name: "Participants" }).getByRole("article");
    await expect(cards).toHaveCount(3);
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
    await expect(page).toHaveTitle("Period 3 · Board");
  });

  test("self-paced cards show each participant's own test", async ({ page }) => {
    await page.goto("/connect/host/room-live/board?fixture=board-self");
    await expect(page.getByRole("region", { name: "Room progress" }).getByRole("heading", { name: "4 tests · own pace" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Bea" })).toContainText("Test 3 of 4 · Sprint");
    await expect(page.getByRole("article", { name: "Cam" })).toContainText("Test 1 of 4 · Warm up");
    await expect(page.getByRole("article", { name: "Dev" })).toContainText("All 4 tests done");
  });
});

test.describe("360px width", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  const pages: [string, string, (page: Page) => Promise<void>][] = [
    ["landing", "/connect?fixture=landing", async (page) => { await expect(page.getByRole("region", { name: /Recent rooms/ })).toBeVisible(); }],
    ["host", "/connect/host/room-live?fixture=host", async (page) => { await expect(page.getByRole("article", { name: "Bea" })).toBeVisible(); }],
    ["room lobby", "/connect/room/room-live?fixture=room-lobby", async (page) => { await expect(page.getByRole("list", { name: "Tests in this room" })).toBeVisible(); }],
    ["room typing", "/connect/room/room-live?fixture=room-host", async (page) => { await expect(typingInput(page)).toBeEnabled(); }],
    ["board", "/connect/host/room-live/board?fixture=board-self", async (page) => { await expect(page.getByRole("article", { name: "Dev" })).toBeVisible(); }],
  ];
  for (const [name, url, ready] of pages) {
    test(`${name} does not scroll horizontally`, async ({ page }) => {
      await page.goto(url);
      await ready(page);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `/tmp/typesetgo-connect-360-${name.replace(/\s+/g, "-")}.png`, fullPage: true });
    });
  }
});
