import { expect } from "@playwright/test";
import { withFixtureBrowser, fixtureOrigin, artifactPath, expectWithinViewport } from "../runtime.mjs";

await withFixtureBrowser(async (browser) => {
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await page.goto(`${fixtureOrigin}/?toasts&ranked`);
    const toasts = page.locator('[data-slot="toast"]');
    const viewport = page.getByRole("region", { name: "Notifications (F6)", exact: true });
    const input = page.getByRole("textbox", { name: "Typing input" });
    await input.fill("cat");
    await input.press("Enter");
    await expect(toasts).toHaveCount(1);
    await expect(input).toBeFocused();
    await page.keyboard.press("F6");
    await expect(viewport).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(toasts).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toasts).toHaveCount(0);
    await expect(input).toBeFocused();

    await page.getByRole("button", { name: "Show error", exact: true }).click();
    for (const mode of ["light", "dark"]) {
      await page.getByRole("button", { name: `${mode === "light" ? "Light" : "Dark"} theme` }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme-mode", mode);
      await expectWithinViewport(page, toasts);
      await expect.poll(() => toasts.evaluate((element) => {
        const probe = document.createElement("div");
        probe.style.backgroundColor = "var(--popover)";
        probe.style.color = "var(--popover-foreground)";
        document.body.append(probe);
        const actual = getComputedStyle(element);
        const expected = getComputedStyle(probe);
        const titleColor = getComputedStyle(element.querySelector('[data-slot="toast-title"]')).color;
        const matches = actual.backgroundColor === expected.backgroundColor && actual.color === expected.color && titleColor === expected.color;
        probe.remove();
        return matches;
      })).toBe(true);
      // Let the browser paint inherited text colors after the theme variable swap.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: artifactPath(`toast-${width}-${mode}.png`) });
    }
    const oldBackground = await toasts.evaluate((element) => getComputedStyle(element).backgroundColor);
    await page.getByRole("button", { name: "Alternate theme" }).click();
    await expect.poll(() => toasts.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(oldBackground);
    await page.getByRole("button", { name: "Dismiss toasts" }).click();
    await expect(toasts).toHaveCount(0);

    await page.getByRole("button", { name: "Open dialog" }).click();
    const modal = page.getByRole("dialog", { name: "Notification dialog fixture", exact: true });
    await modal.getByRole("button", { name: "Invalid count" }).click();
    await expect(toasts).toHaveCount(1);
    await expect(toasts).toBeVisible();
    await expect(modal.getByRole("button", { name: "Invalid count" })).toBeFocused();
    expect(await viewport.evaluate((element) => Boolean(element.closest('[aria-hidden="true"], [inert]')))).toBe(false);
    await toasts.hover();
    await toasts.locator('[data-slot="toast-close"]').click();
    await expect(toasts).toHaveCount(0);
    await expect(modal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);

    await page.getByRole("button", { name: "Award achievement", exact: true }).click();
    await expect(toasts).toHaveCount(1);
    await toasts.hover();
    await expectWithinViewport(page, toasts);
    await page.screenshot({ path: artifactPath(`toast-achievement-${width}.png`) });
    await toasts.getByRole("button", { name: "Ok", exact: true }).click();
    await expect(toasts).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Notifications, 1 unread", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Notifications, 1 unread", exact: true })).toBeVisible();
    await expect(toasts).toHaveCount(0);
    await page.getByRole("button", { name: "Notifications, 1 unread", exact: true }).click();
    await page.getByRole("button", { name: "Mark all read" }).click();
    await page.getByRole("button", { name: "Close notifications" }).click();
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Award burst", exact: true }).click();
    await expect(toasts).toHaveCount(10);
    await expect(page.locator('[data-slot="toast"][data-limited][inert]')).toHaveCount(3);
    await toasts.first().hover();
    await expectWithinViewport(page, viewport);
    const lastVisible = page.locator('[data-slot="toast"]:not([data-limited])').last();
    await lastVisible.scrollIntoViewIfNeeded();
    await expectWithinViewport(page, lastVisible);
    await page.screenshot({ path: artifactPath(`toast-burst-${width}.png`) });
    await page.mouse.move(width - 2, 880);
    await expect(viewport).not.toHaveAttribute("data-expanded");
    await page.getByRole("button", { name: "Dismiss toasts" }).click();
    await expect(toasts).toHaveCount(0);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("typesetgo_notifications")));
    expect(saved).toHaveLength(11);

    await page.getByRole("button", { name: "Promise toast" }).click();
    await expect(toasts).toHaveCount(1);
    await expect(toasts).toContainText("Saved successfully");
    await expect(toasts).toHaveCount(1);
    await page.getByRole("button", { name: "Dismiss toasts" }).click();
    await expect(toasts).toHaveCount(0);
    await page.getByRole("button", { name: "Timed toast" }).click();
    await expect(toasts).toHaveCount(1);
    await toasts.hover();
    await page.waitForTimeout(1000);
    await expect(toasts).toHaveCount(1);
    await page.mouse.move(width - 2, 880);
    await expect(toasts).toHaveCount(0);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, reducedMotion: "no-preference" });
  await page.goto(`${fixtureOrigin}/?toasts&ranked`);
  await page.getByRole("button", { name: "Show error", exact: true }).click();
  const card = page.locator('[data-slot="toast"]');
  await expect.poll(async () => (await card.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
  await expectWithinViewport(page, card);
  const title = card.locator('[data-slot="toast-title"]');
  const bounds = await title.boundingBox();
  await page.mouse.move(bounds.x + 10, bounds.y + 8);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 150, bounds.y + 8, { steps: 12 });
  await page.mouse.up();
  await expect(card).toHaveCount(0);
  await page.close();
  const touchPage = await browser.newPage({ viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  await touchPage.goto(`${fixtureOrigin}/?toasts&ranked`);
  await touchPage.getByRole("button", { name: "Award burst", exact: true }).tap();
  const touchViewport = touchPage.locator('[data-slot="toast-viewport"]');
  const front = touchPage.locator('[data-slot="toast"]').first();
  await front.locator('[data-slot="toast-title"]').tap();
  await expect(touchViewport).toHaveAttribute("data-expanded");
  await expect.poll(() => touchViewport.evaluate((element) => element.clientHeight)).toBeGreaterThan(600);
  const cdp = await touchPage.context().newCDPSession(touchPage);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 160, y: 650 }] });
  for (let y = 620; y >= 200; y -= 30) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 160, y }] });
    await touchPage.waitForTimeout(20);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => touchViewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(touchPage.locator('[data-slot="toast"]')).toHaveCount(10);
  await touchPage.close();
  console.log("Toast focus, themes, modal feedback, history, burst overflow, promises and hover timers PASS");
});
