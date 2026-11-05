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

const showHost = (page: Page) => page.getByRole("radio", { name: /Host a room/ }).click();

test.describe("landing", () => {
  test("Connect nav link is active; the card opens on Join and switches to Host", async ({ page }) => {
    await page.goto("/connect?fixture=landing");
    const nav = page.getByRole("navigation", { name: "Practice modes" });
    const link = nav.getByRole("link", { name: "Connect", exact: true });
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Type", exact: true })).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1, name: "Type together, live." })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Join a room/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("region", { name: "Join a room" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Host a room" })).toHaveCount(0);
    await showHost(page);
    await expect(page.getByRole("region", { name: "Host a room" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Join a room" })).toHaveCount(0);
  });

  test("join code is sanitized to four uppercase characters and finds the room", async ({ page }) => {
    await page.goto("/connect?fixture=landing");
    const join = page.getByRole("region", { name: "Join a room" });
    const code = join.getByLabel("Room code");
    const submit = join.getByRole("button", { name: "Join room" });
    await expect(submit).toBeDisabled();
    await code.pressSequentially("ab-c!d9");
    await expect(code).toHaveValue("ABCD");
    await expect(join.getByText("Found it!")).toBeVisible();
    await expect(join.getByText("with Ms. Rivera")).toBeVisible();
    await expect(join.getByLabel("What should we call you?")).toBeVisible();

    await code.fill("");
    await code.pressSequentially("o0i1");
    await expect(code, "ambiguous characters are outside the code alphabet").toHaveValue("");
    await expect(join.getByText(/Ask your teacher for the\s*4-character\s*code\./)).toBeVisible();

    await code.pressSequentially("wxyz");
    await expect(code).toHaveValue("WXYZ");
    await expect(join.getByText("Hmm, no room with that code. Check the letters?")).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test("joining with a link code focuses the name and lands in the room", async ({ page }) => {
    await page.goto("/connect/join?code=abcd&fixture=landing");
    const join = page.getByRole("region", { name: "Join a room" });
    await expect(join.getByLabel("Room code")).toHaveValue("ABCD");
    await expect(join.getByLabel("What should we call you?")).toBeFocused();
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
    await showHost(page);
    const recent = page.getByRole("region", { name: /recent rooms/i });
    await expect(recent.getByText(/Reopening an ended room keeps its tests and gives it a new code\./)).toBeVisible();
    await expect(recent.getByRole("button", { name: "Resume Period 3" })).toBeVisible();
    await expect(recent.getByText("Ended 2 h ago")).toBeVisible();
    await recent.getByRole("button", { name: "Reopen Period 2" }).click();
    await expect(page).toHaveURL(/\/connect\/host\/room-ended$/);
    await expect(page.getByRole("region", { name: "Room code" }).getByRole("img", { name: "Room code Q R S T" })).toBeVisible();
    expect(await callsNamed(page, "connect:reopenRoom")).toEqual([expect.objectContaining({ roomId: "room-ended" })]);
  });
});

test.describe("host panel", () => {
  test("code, host-paced test states and adding a test", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host");
    await expect(page.getByRole("region", { name: "Room code" }).getByRole("img", { name: "Room code A B C D" })).toBeVisible();
    const testsCard = page.getByRole("region", { name: "Tests" });
    const list = testsCard.getByRole("listitem");
    await expect(list).toHaveCount(4);

    // Test 1 is done, test 2 is current, tests 3 and 4 are upcoming and still editable.
    await expect(list.nth(0)).toContainText("(finished)");
    await expect(list.nth(0)).not.toHaveAttribute("aria-current", "step");
    await expect(list.nth(1)).toHaveAttribute("aria-current", "step");
    await expect(list.nth(1)).toContainText("(current)");
    for (const index of [2, 3]) {
      await expect(list.nth(index)).not.toHaveAttribute("aria-current", "step");
      await expect(list.nth(index)).not.toContainText(/\((finished|current)\)/);
      await expect(list.nth(index).getByRole("button", { name: new RegExp(`^Edit test ${index + 1}:`) })).toBeVisible();
    }
    await expect(list.nth(0)).toContainText("Locked");
    await expect(list.nth(1)).toContainText("Locked");
    await expect(page.getByRole("region", { name: "Run the room" })).toContainText("Test 2 of 4");

    await testsCard.getByRole("button", { name: "Add a test or break" }).click();
    const editor = page.getByRole("form", { name: "Add a test or break" });
    await editor.getByRole("radio", { name: "Words" }).click();
    await editor.getByRole("button", { name: "Add to list" }).click();
    await expect(list).toHaveCount(5);
    await expect(testsCard).toContainText("5 of 50");
    const saved = await callsNamed(page, "connect:setTests");
    expect(saved).toHaveLength(1);
    const tests = saved[0].tests as { id: string; mode: string }[];
    expect(tests.map((item) => item.id).slice(0, 4)).toEqual(["t1", "t2", "t3", "t4"]);
    expect(tests[4].mode).toBe("words");
  });

  test("pacing and an Everyone gets group save through updateRoom", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host-lobby");
    const run = page.getByRole("region", { name: "Run the room" });
    const pacing = run.getByRole("radiogroup", { name: "Pacing" });
    await expect(pacing.getByRole("radio", { name: "Together" })).toHaveAttribute("aria-checked", "true");
    await pacing.getByRole("radio", { name: "Own pace" }).click();
    await expect(pacing.getByRole("radio", { name: "Own pace" })).toHaveAttribute("aria-checked", "true");
    await expect(run.getByText("Everyone works through the list at their own speed once you start.")).toBeVisible();
    expect(await callsNamed(page, "connect:updateRoom")).toEqual([expect.objectContaining({ pacing: "participant" })]);

    const everyone = page.getByRole("region", { name: "Everyone gets" });
    const textGroup = everyone.getByRole("switch", { name: "Everyone gets the same text" });
    await expect(textGroup).toHaveAttribute("aria-checked", "false");
    await expect(everyone.getByRole("combobox", { name: "Font" })).toHaveCount(0);
    await textGroup.click();
    await expect(textGroup).toHaveAttribute("aria-checked", "true");
    await expect(everyone.getByText(/Everyone uses this font, size and layout\./)).toBeVisible();
    await expect(everyone.getByRole("combobox", { name: "Font" })).toBeEnabled();
    await expect.poll(async () => (await callsNamed(page, "connect:updateRoom")).at(-1)).toEqual(
      expect.objectContaining({ overrides: expect.objectContaining({ typography: expect.objectContaining({ enabled: true }) }) }),
    );
    // Pacing is locked once the room runs.
    await run.getByRole("button", { name: "Start" }).click();
    await expect(pacing.getByRole("radio", { name: "Together" })).toBeDisabled();
  });

  test("adds a word goal, which turns Own pace off", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host-lobby");
    const tests = page.getByRole("region", { name: "Tests" });
    await tests.getByRole("button", { name: "Add a test or break" }).click();
    const form = page.getByRole("form");
    await form.getByRole("radio", { name: "Word goal" }).click();
    await expect(form.getByRole("radio", { name: "1,000" })).toHaveAttribute("aria-checked", "true");
    await expect(form.getByText("only correct words count", { exact: false })).toBeVisible();
    await form.getByRole("button", { name: "Add to list" }).click();
    await expect.poll(async () => ((await callsNamed(page, "connect:setTests")).at(-1)?.tests as { mode: string; wordTarget: number }[])?.at(-1)).toMatchObject({ mode: "goal", wordTarget: 1000 });
    await expect(tests.getByText("Word goal · 1,000", { exact: true })).toBeVisible();
    const run = page.getByRole("region", { name: "Run the room" });
    await expect(run.getByRole("radio", { name: "Own pace" })).toBeDisabled();
    await expect(run.getByText("Own pace is off while the list has one", { exact: false })).toBeVisible();
  });

  test("own-pace rooms don't offer word goals", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=board-self");
    const tests = page.getByRole("region", { name: "Tests" });
    await expect(tests.getByRole("button", { name: /1,000-word goal/ })).toHaveCount(0);
    await tests.getByRole("button", { name: "Add a test or break" }).click();
    await expect(page.getByRole("form").getByRole("radio", { name: "Word goal" })).toBeDisabled();
  });

  test("the host sets the keyboard style and line layout, or Kid-friendly in one tap", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host-lobby");
    const everyone = page.getByRole("region", { name: "Everyone gets" });
    const lastOverrides = async () => ((await callsNamed(page, "connect:updateRoom")).at(-1)?.overrides ?? {}) as Record<string, Record<string, unknown>>;

    await everyone.getByRole("switch", { name: "Everyone gets the same on-screen keyboard" }).click();
    await expect(everyone.getByRole("radio", { name: /Spotlight/ })).toHaveAttribute("aria-checked", "true");
    await everyone.getByRole("radio", { name: /Keycaps/ }).click();
    await expect.poll(async () => (await lastOverrides()).keyboard?.keyboardStyle).toBe("keycaps");
    await expect(everyone.getByText("Shown · QWERTY · Keycaps")).toBeVisible();

    await everyone.getByRole("switch", { name: "Everyone gets the same text" }).click();
    await everyone.getByRole("slider", { name: "Lines shown" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await lastOverrides()).typography?.linePreview).toBe(4);
    await expect(everyone.getByRole("slider", { name: "Words per line" })).toBeVisible();

    await everyone.getByRole("button", { name: "Kid-friendly" }).click();
    await expect.poll(lastOverrides).toMatchObject({
      typography: { enabled: true, typingFontSize: 5.5, linePreview: 2, maxWordsPerLine: 5 },
      ghost: { enabled: true, ghostWriterEnabled: false },
      keyboard: { enabled: true, showOnScreenKeyboard: true, keyboardStyle: "finger" },
    });
    await expect(everyone.getByRole("radio", { name: /Finger guide/ })).toHaveAttribute("aria-checked", "true");
  });

  test("a word goal shows its tally on the host panel, in fullscreen and on the pop-out, and Fit still fits", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/connect/host/room-live?fixture=host-goal");
    await expect(page.getByRole("region", { name: "Run the room" }).getByText("412 of 1,000 words")).toBeVisible();

    const board = page.getByRole("region", { name: "Live board" });
    const tally = board.getByRole("region", { name: "Room word goal" });
    await expect(tally.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "412");
    await expect(tally.getByText("41% · 588 to go")).toBeVisible();
    const priya = board.getByRole("article", { name: "Priya" });
    await expect(priya).toContainText("92");
    await expect(priya).toContainText("71 WPM");
    await expect(priya.getByLabel("Most words right now")).toBeVisible();

    await board.getByRole("button", { name: "Fit" }).click();
    await board.getByRole("button", { name: "Fullscreen" }).click();
    await expect(tally).toBeVisible();
    const list = board.getByRole("list", { name: "Players" });
    await expect.poll(() => list.evaluate((element) => element.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
    await board.getByRole("button", { name: "Exit fullscreen" }).click();

    const popout = await page.context().newPage();
    await popout.setViewportSize({ width: 1280, height: 720 });
    await popout.goto("/connect/host/room-live/board?fixture=host-goal");
    await expect(popout.getByRole("region", { name: "Room word goal" }).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "412");
    await expect.poll(() => popout.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
    await popout.close();
  });

  test("roster removes a player after confirming; End room asks twice", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host");
    const roster = page.getByRole("region", { name: "Who's here" });
    await expect(roster.getByText("3 joined · 2 online")).toBeVisible();
    await roster.getByRole("button", { name: "Remove Cam" }).click();
    await expect(roster.getByText("Remove Cam? They can rejoin with the code.")).toBeVisible();
    await roster.getByRole("button", { name: "Remove", exact: true }).click();
    await expect.poll(() => callsNamed(page, "connect:removeParticipant")).toEqual([expect.objectContaining({ participantId: "p-cam" })]);

    await page.getByRole("button", { name: "End room" }).click();
    expect(await callsNamed(page, "connect:endRoom")).toEqual([]);
    await page.getByRole("button", { name: "Tap again to end" }).click();
    await expect(page).toHaveURL(/\/connect$/);
  });

  test("live board shows cards with Fullscreen, Pop out and New tab", async ({ page }) => {
    await page.goto("/connect/host/room-live?fixture=host");
    const board = page.getByRole("region", { name: "Live board" });
    for (const name of ["Bea", "Cam", "Dev"]) await expect(board.getByRole("article", { name })).toBeVisible();
    await expect(board.getByRole("article", { name: "Bea" })).toContainText("52");
    await expect(board.getByRole("article", { name: "Bea" }).getByLabel("Fastest right now")).toBeVisible();
    await expect(board.getByRole("article", { name: "Bea" }).locator("[data-avatar=picture] img")).toBeVisible();
    await expect(board.getByRole("article", { name: "Cam" }).locator("[data-avatar=letter]")).toHaveText("C");
    await expect(board.getByRole("button", { name: /^Remove / })).toHaveCount(0);

    const newTab = board.getByRole("link", { name: "New tab" });
    await expect(newTab).toHaveAttribute("href", "/connect/host/room-live/board");
    await expect(newTab).toHaveAttribute("target", "_blank");

    const popupPromise = page.waitForEvent("popup");
    await board.getByRole("button", { name: "Pop out" }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/\/connect\/host\/room-live\/board$/);
    await expect(popup.getByRole("heading", { level: 1, name: "Period 3" })).toBeVisible();
    await popup.close();

    await board.getByRole("button", { name: "Fullscreen" }).click();
    await expect(board.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
    expect(await page.evaluate(() => document.fullscreenElement?.getAttribute("data-board"))).toBe("live");
    await expect(board.getByRole("button", { name: "Pop out" })).toHaveCount(0);
    await board.getByRole("button", { name: "Exit fullscreen" }).click();
    await expect(board.getByRole("button", { name: "Fullscreen" })).toBeVisible();
  });

  test("the sort shares the title row, and Fit fills the fullscreen board and the pop-out without scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/connect/host/room-live?fixture=showcase");
    const board = page.getByRole("region", { name: "Live board" });
    const title = await board.getByRole("heading", { name: "Live board" }).boundingBox();
    const sort = await board.getByRole("radiogroup", { name: "Sort by" }).boundingBox();
    expect(Math.abs((sort!.y + sort!.height / 2) - (title!.y + title!.height / 2))).toBeLessThan(8);
    await expect(board.getByText("What the class sees", { exact: false })).toHaveCount(0);

    const list = board.getByRole("list", { name: "Players" });
    await board.getByRole("button", { name: "Fit" }).click();
    await expect(board.getByRole("button", { name: "Fit" })).toHaveAttribute("aria-pressed", "true");
    await board.getByRole("button", { name: "Fullscreen" }).click();
    await expect(board.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
    // Eight cards on a 1440x900 screen fit well above the slider's 100%, with the last row on screen.
    await expect.poll(async () => Number(await list.getAttribute("data-card-size"))).toBeGreaterThan(1.2);
    await expect.poll(() => list.evaluate((element) => element.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
    await board.getByRole("button", { name: "Exit fullscreen" }).click();

    // The pop-out follows Fit and sizes the cards for its own window.
    const popout = await page.context().newPage();
    await popout.setViewportSize({ width: 1280, height: 720 });
    await popout.goto("/connect/host/room-live/board?fixture=showcase");
    const popoutList = popout.getByRole("list", { name: "Players" });
    await expect.poll(async () => Number(await popoutList.getAttribute("data-card-size"))).toBeGreaterThan(1);
    await expect.poll(() => popout.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
    await popout.close();

    // Picking a size by hand leaves Fit.
    await board.getByRole("button", { name: "Bigger cards" }).click();
    await expect(board.getByRole("button", { name: "Fit" })).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("participant room", () => {
  test("waiting screen lists the tests, then the host starts the run", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-lobby");
    await expect(page.getByRole("heading", { name: "Waiting for Ms. Rivera to start" })).toBeVisible();
    await expect(page.getByText(/You're in as\s*Alex\./)).toBeVisible();
    await expect(page.getByText("Typing as Alex (guest)")).toBeVisible();
    const tests = page.getByRole("list", { name: "Tests in this room" }).getByRole("listitem");
    await expect(tests).toHaveCount(4);
    await expect(tests.nth(0)).toContainText("Warm up");
    await expect(tests.nth(1)).toContainText("Time · 30s");
    await hostDoes(page, "start");
    await expect(page.getByText("Test 1 of 4")).toBeVisible();
    await expect(typingInput(page)).toBeEnabled();
  });

  test("host-paced test: typing works, Escape does not end it, results wait for everyone", async ({ page }) => {
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
    await expect(page.getByRole("status").filter({ hasText: "Waiting for everyone to finish" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next test" })).toHaveCount(0);
    await expect.poll(async () => (await callsNamed(page, "connect:reportProgress")).some((args) => (args.stats as { isFinished: boolean }).isFinished)).toBe(true);
  });

  test("word goal: only correct words count, the total moves, and reaching the goal ends the test", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-goal");
    const tally = page.getByRole("region", { name: "Room word goal" });
    await expect(tally.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    await expect(tally.getByText("/ 5 words")).toBeVisible();
    await expect(page.getByText("Word goal · 5", { exact: true })).toBeVisible();
    await expect(typingInput(page)).toBeEnabled();

    // The first report carries the generated prompt, so the test can type it exactly.
    await expect.poll(async () => (await callsNamed(page, "connect:reportProgress")).length).toBeGreaterThan(0);
    const prompt = String((await callsNamed(page, "connect:reportProgress"))[0].targetText).split(" ");
    await typeIntoTest(page, `${prompt[0]} zzz `);
    await expect(tally.getByText("You: 1")).toBeVisible();
    await expect(tally.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");

    // A word only counts once it is finished with a space, and Escape never ends the test.
    await page.keyboard.type(prompt[2], { delay: 30 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await expect(tally.getByText("You: 1")).toBeVisible();
    await expect(page.getByRole("region", { name: "Test results" })).toHaveCount(0);

    await typingInput(page).focus();
    await page.keyboard.type(` ${prompt[3]} `, { delay: 30 });
    await expect(tally.getByText("Goal reached!")).toBeVisible();
    await expect(tally.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "5");
    await expect(page.getByRole("region", { name: "Test results" })).toBeVisible();
    await expect.poll(async () => (await callsNamed(page, "connect:reportProgress")).some((args) => (args.stats as { isFinished: boolean }).isFinished)).toBe(true);
  });

  for (const { fixture, width, height, keyboardStyle, hands } of [
    { fixture: "room-goal", width: 1815, height: 885, keyboardStyle: "finger", hands: true },
    { fixture: "room-goal", width: 1366, height: 650, keyboardStyle: "finger", hands: false },
    { fixture: "room-host", width: 1366, height: 650, keyboardStyle: "spotlight", hands: false },
  ]) {
    test(`stats, text and keyboard keep their own space: ${fixture}, ${keyboardStyle}, ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`/connect/room/room-live?fixture=${fixture}`);
      await hostDoes(page, "updateRoom", { overrides: {
        typography: { enabled: true, typingFontFamily: "monospace", typingFontSize: 5.5, textAlign: "center", linePreview: 2 },
        keyboard: { enabled: true, showOnScreenKeyboard: true, keyboardLayout: "qwerty", keyboardStyle },
      } });
      const text = page.locator(".cursor-text");
      const keyboard = page.locator("[aria-label='On-screen keyboard']");
      const top = async () => Math.round((await text.boundingBox())!.y);
      // The text eases to its size and place, so wait for it to stop moving.
      const settled = async () => {
        await expect.poll(async () => {
          const first = await top();
          await page.waitForTimeout(150);
          return first === await top();
        }).toBe(true);
        return top();
      };
      await typingInput(page).focus();
      const before = await settled();

      await page.keyboard.type("qq zz ", { delay: 20 });
      const wpm = page.getByText("wpm", { exact: true });
      await expect(wpm).toBeVisible();
      // Typing's first key changes nothing: the stats already held their place.
      expect(await settled()).toBe(before);

      const [statsBox, textBox, keyboardBox] = await Promise.all([wpm.boundingBox(), text.boundingBox(), keyboard.boundingBox()]);
      expect(statsBox!.y + statsBox!.height).toBeLessThanOrEqual(textBox!.y);
      expect(textBox!.y + textBox!.height).toBeLessThanOrEqual(keyboardBox!.y);
      expect(keyboardBox!.y + keyboardBox!.height).toBeLessThanOrEqual(height);
      const scroll = await text.evaluate((element) => { const root = element.closest(".overflow-y-auto")!; return root.scrollHeight - root.clientHeight; });
      expect(scroll).toBe(0);
      if (keyboardStyle === "finger") expect(await page.getByText("Left", { exact: true }).isVisible()).toBe(hands);
    });
  }

  test("word goal: the words keep coming on a long run", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-goal");
    await expect(typingInput(page)).toBeEnabled();
    await expect.poll(async () => (await callsNamed(page, "connect:reportProgress")).length).toBeGreaterThan(0);
    await typingInput(page).focus();
    // Wrong words move the caret just as well, so this runs far past the first prompt without reaching the goal.
    for (let burst = 0; burst < 20; burst++) await page.keyboard.insertText("x ".repeat(20));
    await expect.poll(async () => String((await callsNamed(page, "connect:reportProgress")).at(-1)?.typedText).split(" ").length).toBe(51);
    const last = (await callsNamed(page, "connect:reportProgress")).at(-1)!;
    expect(String(last.targetText).split(" ").length).toBeGreaterThan(51);
    await expect(page.getByRole("region", { name: "Test results" })).toHaveCount(0);
    await expect(page.locator("[data-goal-meter]").getByText("You: 0")).toBeVisible();
  });

  test("long timed test: reports keep getting through once the text passes the server's limit", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-long");
    await expect(typingInput(page)).toBeEnabled();
    await typingInput(page).focus();
    // In bursts, so the prompt keeps growing ahead of the caret as it does for a real student.
    for (let burst = 0; burst < 105; burst++) await page.keyboard.insertText("xxxxxxxxx ".repeat(20));
    await expect(typingInput(page)).toHaveValue("xxxxxxxxx ".repeat(2100));
    const lastReport = async () => (await callsNamed(page, "connect:reportProgress")).at(-1) as { typedText: string; targetText: string; stats: { wordsTyped: number } };
    // The mock refuses over-long text as the server does, so a saved count means the report got through.
    await expect.poll(() => page.evaluate(() => window.__connectFixture.snapshot().participants.find((row) => row._id === "p-self")?.stats.wordsTyped)).toBe(2100);
    const last = await lastReport();
    expect(last.typedText.split(" ")).toHaveLength(51);
    expect(last.targetText.split(" ").length).toBeGreaterThan(51);
    await expect(page.getByRole("region", { name: "Test results" })).toHaveCount(0);
  });

  test("long timed test: a refresh keeps the speed, accuracy and word count, and typing carries on", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-long-restored");
    await expect(typingInput(page)).toBeEnabled();
    await expect(typingInput(page)).toHaveValue("the ".repeat(50));
    const lastStats = async () => ((await callsNamed(page, "connect:reportProgress")).at(-1)?.stats ?? {}) as { wordsTyped: number; wpm: number; accuracy: number };
    await expect.poll(async () => (await lastStats()).wordsTyped).toBe(5100);
    expect((await lastStats()).wpm).toBe(102);
    expect((await lastStats()).accuracy).toBeCloseTo(97.5, 1);
    await expect(page.locator("[data-typing-word]").first()).toBeVisible();
    await typingInput(page).focus();
    await page.keyboard.insertText("the the ");
    await expect.poll(async () => (await lastStats()).wordsTyped).toBe(5102);
    expect((await lastStats()).wpm).toBe(102);
    expect((await lastStats()).accuracy).toBeCloseTo(97.5, 1);
  });

  test("long Words test: reports get through from the first words, though the whole prompt is over the server's limit", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-long-words");
    await expect(typingInput(page)).toBeEnabled();
    await typingInput(page).focus();
    await page.keyboard.insertText("xxxxxxxxx ".repeat(60));
    // The mock refuses over-long text as the server does, so a saved count means the report got through.
    await expect.poll(() => page.evaluate(() => window.__connectFixture.snapshot().participants.find((row) => row._id === "p-self")?.stats.wordsTyped)).toBe(60);
    const last = (await callsNamed(page, "connect:reportProgress")).at(-1) as { targetText: string };
    expect(last.targetText.split(" ").length).toBeLessThan(200);
    await expect(page.getByRole("region", { name: "Test results" })).toHaveCount(0);
  });

  test("long Words test: a refresh deals the missing words again, and it ends at the host's target", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-long-words-restored");
    await expect(typingInput(page)).toBeEnabled();
    await expect(typingInput(page)).toHaveValue("the ".repeat(50));
    const wordsSaved = () => page.evaluate(() => window.__connectFixture.snapshot().participants.find((row) => row._id === "p-self")?.stats.wordsTyped);
    await typingInput(page).focus();
    // Past the end of the words that came back with the snapshot.
    await page.keyboard.insertText("the ".repeat(120));
    await expect.poll(wordsSaved).toBe(5220);
    await expect(page.getByRole("region", { name: "Test results" })).toHaveCount(0);
    await page.keyboard.insertText("the ".repeat(80));
    await expect(page.getByRole("region", { name: "Test results" })).toBeVisible();
    await expect.poll(wordsSaved).toBe(5300);
  });

  test("self-paced: results, Next test, Up next splash, next test and the all-done summary", async ({ page }) => {
    await page.goto("/connect/room/room-live?fixture=room-self");
    await expect(page.getByText("Test 1 of 2")).toBeVisible();
    await typeIntoTest(page, "the cat sat");
    const next = page.getByRole("button", { name: "Next test" });
    await expect(next).toBeEnabled();
    await expect(page.getByText("Waiting for everyone to finish")).toHaveCount(0);
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
    await expect(page.getByRole("heading", { name: "Waiting for Ms. Rivera to start" })).toBeVisible();
    await hostDoes(page, "endRoom");
    await expect(page.getByRole("heading", { name: "This room has ended" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Connect" })).toHaveAttribute("href", "/connect");
  });
});

test.describe("board", () => {
  test("host-paced board shows the summary strip and cards", async ({ page }) => {
    await page.goto("/connect/host/room-live/board?fixture=host");
    await expect(page.getByRole("heading", { level: 1, name: "Period 3" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Room code A B C D" })).toBeVisible();
    const summary = page.getByRole("region", { name: "Room progress" });
    await expect(summary.getByRole("heading", { name: /^Test 2 of 4 · / })).toBeVisible();
    await expect(summary.getByRole("list", { name: "Test 2 of 4" })).toBeVisible();
    const cards = page.getByRole("list", { name: "Players" }).getByRole("article");
    await expect(cards).toHaveCount(3);
    await expect(page.getByRole("button", { name: /^(Remove|Reorder) / })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Board settings" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();
    await expect(page).toHaveTitle("Period 3 · Board");
  });

  test("self-paced cards show each participant's own test", async ({ page }) => {
    await page.goto("/connect/host/room-live/board?fixture=board-self");
    await expect(page.getByRole("region", { name: "Room progress" }).getByRole("heading", { name: "4 tests · own pace" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Bea" }).getByRole("list", { name: "Test 3 of 4: Sprint" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Cam" }).getByRole("list", { name: "Test 1 of 4: Warm up" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Dev" }).getByRole("list", { name: "All 4 tests done" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Dev" })).toContainText("All done");
  });
});

test.describe("360px width", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  const pages: [string, string, (page: Page) => Promise<void>][] = [
    ["landing", "/connect?fixture=landing", async (page) => { await expect(page.getByRole("region", { name: "Join a room" })).toBeVisible(); }],
    ["landing host", "/connect?fixture=landing", async (page) => { await showHost(page); await expect(page.getByRole("region", { name: /recent rooms/i })).toBeVisible(); }],
    ["host", "/connect/host/room-live?fixture=host", async (page) => { await expect(page.getByRole("article", { name: "Bea" })).toBeVisible(); }],
    ["room lobby", "/connect/room/room-live?fixture=room-lobby", async (page) => { await expect(page.getByRole("list", { name: "Tests in this room" })).toBeVisible(); }],
    ["room typing", "/connect/room/room-live?fixture=room-host", async (page) => { await expect(typingInput(page)).toBeEnabled(); }],
    ["board", "/connect/host/room-live/board?fixture=board-self", async (page) => { await expect(page.getByRole("article", { name: "Dev" })).toBeVisible(); }],
    ["room word goal", "/connect/room/room-live?fixture=room-goal", async (page) => { await expect(page.getByRole("region", { name: "Room word goal" })).toBeVisible(); await expect(typingInput(page)).toBeEnabled(); }],
    ["board word goal", "/connect/host/room-live/board?fixture=host-goal", async (page) => { await expect(page.getByRole("region", { name: "Room word goal" })).toBeVisible(); }],
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
