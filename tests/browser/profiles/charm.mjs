import assert from "node:assert/strict";
import path from "node:path";
import { expect } from "@playwright/test";

const TIERS = ["copper", "silver", "gold", "diamond", "emerald"];

export async function checkProfileCharm({ page, open, noOverflow, dialogWithinViewport, output, checks }) {
  for (const options of [
    { width: 320, height: 740, theme: "light" },
    { width: 390, height: 844, theme: "dark", reducedMotion: "no-preference" },
    { width: 1440, height: 1000, theme: "dark" },
    { width: 768, height: 900, theme: "dark", palette: "synthwave" },
  ]) {
    const label = `${options.width}-${options.palette ?? options.theme}`;
    await open("/profile/achievements", { ...options, scenario: "charm" });
    const emptyCategory = page.getByRole("button", { name: /^Special Moments: 0 of 6 earned/ });
    await expect(emptyCategory).toBeVisible();
    await expect(emptyCategory).toHaveAttribute("data-achievement-state", "unearned");
    await expect(page.locator('[data-achievement-category="speed"]')).toHaveAttribute("data-achievement-state", "earned");
    await page.locator('[data-achievement-category="speed"]').scrollIntoViewIfNeeded();
    await noOverflow(`charm achievements ${label}`);
    await page.screenshot({ path: path.join(output, `charm-achievements-${label}.png`) });

    const category = page.getByRole("button", { name: /^Speed Demons:/ });
    await category.click();
    const journey = page.getByRole("dialog", { name: "Speed Demons", exact: true });
    await expect(journey).toBeVisible();
    await dialogWithinViewport(`charm journey ${label}`);
    await page.screenshot({ path: path.join(output, `charm-journey-${label}.png`) });
    const surfaces = new Set();
    for (const tier of TIERS) {
      const treatments = [];
      for (const state of ["earned", "unearned"]) {
        const step = journey.locator(`li[data-achievement-tier="${tier}"][data-achievement-state="${state}"]`).first();
        await step.scrollIntoViewIfNeeded();
        const treatment = await step.evaluate((element) => {
          const style = getComputedStyle(element);
          return { surface: style.getPropertyValue("--achievement-surface").trim(), scroll: element.scrollWidth, width: element.clientWidth };
        });
        assert.ok(treatment.surface, `${label}: ${tier} ${state} step has a tier surface`);
        assert.ok(treatment.scroll <= treatment.width + 1, `${label}: ${tier} ${state} step fits its width`);
        treatments.push(treatment.surface);
      }
      assert.notEqual(treatments[0], treatments[1], `${tier} has distinct earned and unearned surfaces`);
      surfaces.add(treatments[0]);
    }
    assert.equal(surfaces.size, 5, "All five earned tiers have distinct surfaces");
    await page.keyboard.press("Escape");
    await expect(category).toBeFocused();

    await open("/profile/history", { ...options, scenario: "charm" });
    const row = page.getByRole("button", { name: /Test details$/ }).first();
    await expect(row).toContainText("300");
    await row.click();
    await expect(row.locator("xpath=..").getByText("Not recorded", { exact: true })).toHaveCount(4);
    const metrics = await row.evaluate((element) => [...element.querySelectorAll("strong")].map((strong) => {
      const range = document.createRange();
      range.selectNodeContents(strong);
      const rects = [...range.getClientRects()];
      return { text: strong.textContent, lines: new Set(rects.map((rect) => Math.round(rect.top))).size };
    }));
    assert.deepEqual(metrics.map((metric) => metric.text), ["300"]);
    assert.equal(metrics[0].lines, 1, `${label}: 300 WPM stays on one line`);
    await noOverflow(`charm history ${label}`);
    await page.screenshot({ path: path.join(output, `charm-history-${label}.png`) });
    checks.push(`five tiers × earned/unearned on the achievement journey, empty category, focus return and history: ${label}`);
  }
}
