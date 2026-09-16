import { withFixtureBrowser, artifactPath, visibleBounds, expectWithinViewport } from "../runtime.mjs";
import { expect } from "@playwright/test";
await withFixtureBrowser(async browser => {
  const page = await browser.newPage({
    viewport: {
      width: 390,
      height: 844
    },
    hasTouch: true
  });
  await page.goto("http://127.0.0.1:4317/?color");
  const trigger = page.getByRole("button", {
    name: "Pick color"
  }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Color picker"
  });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(100);
  await expectWithinViewport(page, dialog);
  const hue = page.getByRole("slider", {
    name: "Hue"
  });
  await hue.focus();
  await page.keyboard.press("PageUp");
  await expect(hue).toHaveAttribute("aria-valuenow", "10");
  await expect(page.getByRole("status", {
    name: "Selected color"
  })).toHaveText("#ff2a00"); // Existing HSV conversion rounds 42.49999999999999 to 42.
  const box = await visibleBounds(hue);
  await page.touchscreen.tap(box.x + box.width - 5, box.y + box.height / 2);
  await expect(hue).toHaveAttribute("aria-valuenow", "90");
  await expect(page.getByRole("status", {
    name: "Selected color"
  })).toHaveText("#80ff00");
  await page.screenshot({
    path: artifactPath("practice-color-narrow.png"),
    fullPage: false
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await trigger.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  console.log("repeated open/close and Escape focus passed");
});
