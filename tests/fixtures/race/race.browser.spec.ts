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

async function noPageScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

for (const width of [320, 768, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`results fit ${width}px ${theme}, every racer listed with long names bounded`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/race/results/race-room?fixture=results&theme=${theme}`);
      await expect(page.getByRole("heading", { level: 1, name: "You won!" })).toBeVisible();
      expect(await noPageScroll(page)).toBe(true);
      await expect(page.getByRole("list", { name: "Podium" }).getByRole("listitem")).toHaveCount(3);
      const everyone = page.getByRole("list", { name: "Everyone" }).getByRole("listitem");
      await expect(everyone).toHaveCount(50);
      await expect(everyone.nth(30)).toContainText("90");
      await expect(everyone.nth(49)).toContainText("DNF");
      // Long unbroken names truncate inside their row instead of pushing the stats out.
      for (const index of [0, 1, 49]) {
        const row = await everyone.nth(index).boundingBox();
        expect(row!.x).toBeGreaterThanOrEqual(0);
        expect(row!.x + row!.width).toBeLessThanOrEqual(width);
        expect(await everyone.nth(index).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      }
      await page.screenshot({
        path: `/tmp/typesetgo-race-results-${width}-${theme}.png`,
        fullPage: false,
      });
    });
  }
}

test("spectator results, 200% zoom, reduced motion and long names remain bounded", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/race/results/race-room?fixture=spectator&theme=light");
  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  await expect(page.getByRole("heading", { level: 1, name: "Race results" })).toBeVisible();
  expect(await noPageScroll(page)).toBe(true);
  await expect(page.getByRole("list", { name: "Your race" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Everyone" }).getByRole("listitem")).toHaveCount(49);
  await expect(page.getByRole("list", { name: "Everyone" }).getByRole("listitem").first()).toBeVisible();
});

test("emoji popover flips within a short narrow viewport, keyboard choices and Escape restore focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/race/lobby/race-room?fixture=lobby&theme=light");
  const trigger = page.getByRole("button", { name: "Change avatar" });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const popover = page.getByRole("dialog", { name: "Choose a racing avatar" });
  await expect(popover).toBeVisible();
  const bounds = await popover.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(8);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(312);
  expect(bounds!.y).toBeGreaterThanOrEqual(8);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(472);
  await expect(
    page.getByRole("button", { name: "Rocket", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Airplane", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("lobby pending and failed departure stays visible; retry disconnects before navigation", async ({
  page,
}) => {
  await page.goto("/race/lobby/race-room?fixture=lobby");
  await page.evaluate(() => {
    window.__raceFixture.fail("participants:disconnect");
    window.__raceFixture.setDelay(300);
  });
  await page.getByRole("button", { name: "Leave race" }).click();
  await expect(page.getByRole("button", { name: "Leaving…" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Could not leave");
  expect(new URL(page.url()).pathname).toBe("/race/lobby/race-room");
  await page.evaluate(() =>
    window.__raceFixture.fail("participants:disconnect", false),
  );
  await page.getByRole("button", { name: "Leave race" }).click();
  await expect(page).toHaveURL(/\/race$/);
});

test("track map keeps every racer inside the map at 320px, with finishers parked in the infield", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/race/race-room?fixture=active");
  const map = page.locator("[data-track-map]");
  await expect(map).toHaveAttribute("aria-label", /^You are 2nd of 3, \d+ percent round the lap$/);
  const dots = map.locator("[data-map-dot]");
  await expect(dots).toHaveCount(3);
  const box = (await map.boundingBox())!;
  for (const dot of await dots.all()) {
    const bounds = (await dot.locator("[data-map-token]").boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(box.x - 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(bounds.y).toBeGreaterThanOrEqual(box.y - 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(box.y + box.height + 1);
  }
  // The finisher wears its place and sits in the middle of the map, off the tarmac.
  const parked = (await dots.filter({ hasText: "1" }).locator("[data-map-token]").boundingBox())!;
  expect(parked.y + parked.height / 2).toBeLessThan(box.y + box.height * 0.65);
  await expect(page.getByRole("region", { name: "Standings" }).getByRole("listitem")).toHaveCount(3);
  expect(await noPageScroll(page)).toBe(true);
});

test("landing joins with a code and hosts a new race through the switch", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/race?code=abc123");
  await expect(page.getByLabel("Room code")).toHaveValue("ABC123");
  await page.getByRole("button", { name: "Join race" }).click();
  await expect(page.getByRole("alert")).toHaveText("Pick a racer name first.");
  await page.getByLabel("Racer name").fill("Dimi");
  await page.getByRole("button", { name: "Join race" }).click();
  await expect(page).toHaveURL(/\/race\/lobby\/race-room$/);
  expect(await page.evaluate(() => window.__raceFixture.calls.find((call) => call.name === "participants:join")?.args)).toMatchObject({ roomCode: "ABC123", name: "Dimi" });
  await page.goto("/race");
  await page.getByRole("radio", { name: "Host a race" }).click();
  await expect(page.getByLabel("Room code")).toHaveCount(0);
  await page.getByLabel("Racer name").fill("Host");
  await page.getByRole("button", { name: "Create race" }).click();
  await expect(page).toHaveURL(/\/race\/lobby\/race-room$/);
  expect(await noPageScroll(page)).toBe(true);
});

test("lobby: settings save, readying rolls you to the grid and the countdown starts the race", async ({ page }) => {
  await page.goto("/race/lobby/race-room?fixture=lobby");
  const map = page.locator("[data-track-map]");
  await expect(map).toHaveAttribute("aria-label", "6 racers on the starting grid, 1 still in the pit lane");
  await page.getByRole("combobox", { name: "Lap length" }).selectOption("50");
  await expect(page.getByRole("combobox", { name: "Lap length" })).toHaveValue("50");
  await page.getByRole("button", { name: "Roll out to the line" }).click();
  await expect(map).toHaveAttribute("aria-label", "7 racers on the starting grid, 0 still in the pit lane");
  await expect(page.getByRole("status")).toContainText("Race starts in");
  await expect(page.getByRole("button", { name: /Starting in/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Change avatar" })).toBeDisabled();
  await expect(page).toHaveURL(/\/race\/race-room$/, { timeout: 8000 });
  await expect(page.getByRole("heading", { name: "Lap 1/1" })).toBeVisible();
});

test("loading, missing and not-yet-saved results have distinct recovery", async ({
  page,
}) => {
  await page.goto("/race/results/race-room?fixture=loading");
  await expect(page.getByRole("status")).toHaveText("Loading results…");
  await page.goto("/race/results/race-room?fixture=missing");
  await expect(
    page.getByRole("heading", { name: "Race not found" }),
  ).toBeVisible();
  await page.goto("/race/results/race-room?fixture=no-results");
  await expect(
    page.getByRole("button", { name: "Prepare results" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Prepare results" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "You won!" }),
  ).toBeVisible();
});

test("real typing engine resumes exact incorrect input/time and ignores reactive echoes", async ({
  page,
}) => {
  await page.goto("/race/race-room?fixture=active");
  const input = page.locator('section[aria-label="Your lap"] input');
  await expect(input).toHaveValue("helxo ");
  await input.evaluate((element) => (element as HTMLInputElement).focus());
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__raceFixture.snapshot().participant.typedText,
      ),
    )
    .toBe("helxo ");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("lo w");
  await expect(input).toHaveValue("hello w");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__raceFixture.calls
            .filter((call) => call.name === "participants:updateProgress")
            .at(-1)?.args.typedText,
      ),
    )
    .toBe("hello w");
  const saved = await page.evaluate(
    () => window.__raceFixture.snapshot().participant,
  );
  expect(saved.stats.timeElapsed).toBeGreaterThanOrEqual(4000);
  await page.evaluate(() => {
    for (let i = 0; i < 10; i++) window.__raceFixture.echo();
  });
  await expect(input).toHaveValue("hello w");
  await page.evaluate(() => window.__raceFixture.reset());
  await expect(input).toHaveValue("");
  await page.getByRole("button", { name: "Leave race" }).click();
  await expect(
    page.getByRole("dialog", { name: "Leave this race?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Leave race" })).toBeFocused();
});
