import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.protocol === "data:")
      return route.continue();
    return route.abort();
  });
});

async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const dialog = page.getByRole("dialog");
  if (await dialog.count())
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
}

test("narrow host settings, plan editing, focus return and visible participant actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/connect/host?name=FixtureHost");
  await expect(page.getByRole("heading", { name: "Host panel" })).toBeVisible();
  await noOverflow(page);
  await page.getByRole("slider", { name: "Card size" }).fill("2");
  await noOverflow(page);
  await expect(
    page.getByRole("button", {
      name: "Reset AlexandriaVeryLongUnbrokenParticipantNameForLayout",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "plan", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Plan builder" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add step" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A long warm-up step with enough text to wrap at phone width");
  await page.getByRole("button", { name: "preset", exact: true }).click();
  await page.getByRole("button", { name: "Timed", exact: true }).click();
  await page
    .getByLabel("Custom text", { exact: true })
    .fill("Hello everyone. Practice this supplied text together.");
  await page.getByRole("dialog").getByLabel("Duration (seconds)").fill("45");
  await noOverflow(page);
  await page.screenshot({
    path: "/tmp/typesetgo-connect-plan-phone.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Add step" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Quick words");
  await page.getByRole("button", { name: "words", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Word count").fill("10");
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "plan", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Previous step" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("Step 2 of 2: Quick words")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next step" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous step" }).click();
  await expect(
    page.getByRole("button", { name: "Previous step" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Start test" }).click();
  await expect(page.getByRole("button", { name: "Stop test" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit plan" })).toBeDisabled();
  await page.getByRole("button", { name: "Stop test" }).click();
  await expect(page.getByRole("button", { name: "Edit plan" })).toBeEnabled();
  await page.getByRole("button", { name: "Sound settings" }).click();
  await expect(page.getByLabel("Typing sound", { exact: true })).toBeDisabled();
  await page.getByLabel("Enable sound").check();
  await page.getByLabel("Typing sound", { exact: true }).selectOption("creamy");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Sound settings" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Fixture light" }).click();
  await noOverflow(page);
  await page.screenshot({
    path: "/tmp/typesetgo-connect-host-phone-light.png",
    fullPage: false,
  });
});

test("wide, zoomed and reduced-motion layout keeps dialogs bounded and keyboard focus contained", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/connect/host?name=FixtureHost");
  await expect(page.getByRole("heading", { name: "Host panel" })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: "/tmp/typesetgo-connect-host-wide-dark.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Appearance & ghost", exact: true })
    .click();
  await page.getByLabel("Typing text size (rem)").fill("4.2");
  const dialog = page.getByRole("dialog");
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Appearance & ghost", exact: true }),
  ).toBeFocused();
  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  await noOverflow(page);
  await page.getByRole("button", { name: "Share room DEMO1" }).click();
  await noOverflow(page);
  await expect(page.getByLabel("Invite link")).toHaveValue(
    /\/connect\/join\?code=DEMO1$/,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await noOverflow(page);
});

test("failed room requests remain bounded until retry", async ({ page }) => {
  await page.goto("/connect/host?name=Fixture&failure=create");
  await expect(page.getByRole("alert")).toContainText(
    "Fixture connection unavailable",
  );
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { connectFixture: { requests: unknown[] } })
          .connectFixture.requests.length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { connectFixture: { requests: unknown[] } })
            .connectFixture.requests.length,
      ),
    )
    .toBe(2);
  await page.goto("/connect/join?code=BAD&name=Fixture&failure=join");
  await expect(page.getByRole("alert")).toContainText("Fixture room not found");
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { connectFixture: { requests: unknown[] } })
          .connectFixture.requests.length,
    ),
  ).toBe(1);
  await page.getByRole("link", { name: "Edit code" }).click();
  await expect(page.getByLabel("Room code")).toHaveValue("BAD");
});

test("touch swipes on card content scroll the page without dragging", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto("http://127.0.0.1:54319/connect/host?name=TouchFixture");
  const card = page.getByRole("article").first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  const startY = Math.min(740, box!.y + box!.height - 30);
  const startX = box!.x + box!.width - 40;
  const previousScroll = await page.evaluate(() => scrollY);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y: startY }],
  });
  for (let step = 1; step <= 6; step++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX, y: startY - step * 35 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(previousScroll + 50);
  await expect(
    page.getByRole("combobox", { name: "Sort participants" }),
  ).toHaveValue("join");
  await expect(
    page.getByRole("button", {
      name: "Remove AlexandriaVeryLongUnbrokenParticipantNameForLayout",
      exact: true,
    }),
  ).toBeAttached();
  await context.close();
});
