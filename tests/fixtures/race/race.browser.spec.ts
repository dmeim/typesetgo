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

for (const width of [320, 768, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`results fit ${width}px ${theme}, full table stays scrollable`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/race/results/race-room?fixture=results&theme=${theme}`);
      await expect(
        page.getByRole("heading", { name: "Race Results" }),
      ).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
      await expect(page.getByRole("row")).toHaveCount(51);
      await expect(
        page.getByRole("cell", { name: "71", exact: true }),
      ).toBeVisible();
      const region = page.getByRole("region", { name: /Race results table/ });
      if (width === 320)
        expect(
          await region.evaluate(
            (element) => element.scrollWidth > element.clientWidth,
          ),
        ).toBe(true);
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
  await expect(
    page.getByRole("heading", { name: "Race Results" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  expect(
    await page
      .getByRole("region", { name: "Race podium" })
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(1000);
  await expect(page.getByText("Your position", { exact: true })).toHaveCount(0);
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
  await page.getByRole("button", { name: "Leave Race" }).click();
  await expect(page.getByRole("button", { name: "Leaving…" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Could not leave");
  expect(new URL(page.url()).pathname).toBe("/race/lobby/race-room");
  await page.evaluate(() =>
    window.__raceFixture.fail("participants:disconnect", false),
  );
  await page.getByRole("button", { name: "Leave Race" }).click();
  await expect(page).toHaveURL(/\/race$/);
});

test("active track reserves full avatar bounds at zero and complete", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/race/race-room?fixture=active");
  await expect(page.locator("[data-race-track]")).toHaveCount(3);
  for (const track of await page.locator("[data-race-track]").all()) {
    const lane = await track.boundingBox();
    const avatar = await track.locator("[data-race-avatar]").boundingBox();
    expect(avatar!.x).toBeGreaterThanOrEqual(lane!.x);
    expect(avatar!.x + avatar!.width).toBeLessThanOrEqual(
      lane!.x + lane!.width,
    );
    expect(avatar!.y).toBeGreaterThanOrEqual(lane!.y);
    expect(avatar!.y + avatar!.height).toBeLessThanOrEqual(
      lane!.y + lane!.height,
    );
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
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
    page.getByRole("heading", { name: "Race Results" }),
  ).toBeVisible();
});

test("real typing engine resumes exact incorrect input/time and ignores reactive echoes", async ({
  page,
}) => {
  await page.goto("/race/race-room?fixture=active");
  const input = page.locator('section[aria-label="Race typing"] input');
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
  await page.getByRole("button", { name: "Leave Race" }).click();
  await expect(
    page.getByRole("dialog", { name: "Leave this race?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Leave Race" })).toBeFocused();
});
