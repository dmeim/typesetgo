import assert from "node:assert/strict";
import path from "node:path";
import { expect } from "@playwright/test";

export async function checkProfileCharm({ page, open, noOverflow, dialogWithinViewport, output, checks }) {
  for (const options of [
    { width: 320, height: 740, theme: "light" },
    { width: 390, height: 844, theme: "dark", reducedMotion: "no-preference" },
    { width: 1440, height: 1000, theme: "dark" },
    { width: 768, height: 900, theme: "dark", palette: "synthwave" },
  ]) {
    const label = `${options.width}-${options.palette ?? options.theme}`;
    await open("/user/profile-owner", { ...options, scenario: "charm" });
    const emptyCategory = page.getByRole("button", { name: "Special Moments: 0 of 6 earned", exact: true });
    await expect(emptyCategory).toBeVisible();
    await expect(emptyCategory).not.toHaveAttribute("data-achievement-tier", /.+/);
    await page.locator('[data-achievement-category="speed"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `charm-profile-${label}.png`) });
    await page.getByRole("button", { name: /^Speed Demons:/ }).click();
    const board = page.getByRole("dialog", { name: "All Achievements", exact: true });
    await expect(board).toBeVisible();
    await dialogWithinViewport(`charm board ${label}`);
    await page.screenshot({ path: path.join(output, `charm-board-${label}.png`) });
    const surfaces = new Set();
    for (const tier of ["copper", "silver", "gold", "diamond", "emerald"]) {
      const treatments = [];
      for (const state of ["earned", "unearned"]) {
        const tile = board.locator(`button[data-achievement-tier="${tier}"][data-achievement-state="${state}"]`).first();
        await expect(tile).toBeEnabled();
        const treatment = await tile.evaluate((element) => {
          const style = getComputedStyle(element);
          return { surface: style.backgroundColor, opacity: style.opacity, filter: style.filter, scroll: element.scrollWidth, width: element.clientWidth };
        });
        assert.equal(treatment.opacity, "1", "Unearned text must remain readable");
        assert.equal(treatment.filter, "none", "Tier hue must survive unearned state");
        assert.ok(treatment.scroll <= treatment.width + 1, "Achievement tile content fits its width");
        treatments.push(treatment.surface);
        await tile.click();
        const detail = page.getByRole("dialog", { name: "Achievement details", exact: true });
        await expect(detail).toBeVisible();
        await expect(detail.locator(`[aria-hidden="false"] [data-achievement-tier="${tier}"][data-achievement-state="${state}"]`)).toBeVisible();
        await dialogWithinViewport(`charm detail ${label} ${tier} ${state}`);
        if (tier === "copper" || (tier === "emerald" && options.width === 1440)) {
          await page.screenshot({ path: path.join(output, `charm-detail-${label}-${tier}-${state}.png`) });
        }
        await page.keyboard.press("Escape");
        await expect(tile).toBeFocused();
      }
      assert.notEqual(treatments[0], treatments[1], `${tier} has distinct earned and unearned surfaces`);
      surfaces.add(treatments[0]);
    }
    assert.equal(surfaces.size, 5, "All five earned tiers have distinct surfaces");
    await page.keyboard.press("Escape");
    const history = page.getByRole("region", { name: "Recent test history" });
    await history.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `charm-history-${label}.png`) });
    await history.getByRole("button", { name: /View details/ }).first().click();
    const detail = page.getByRole("dialog", { name: "Test details", exact: true });
    await expect(detail.getByText("Not recorded", { exact: true })).toHaveCount(4);
    await dialogWithinViewport(`charm result ${label}`);
    const metrics = await detail.locator("dl").first().locator("dd").evaluateAll((elements) => elements.map((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = [...range.getClientRects()];
      return { text: element.textContent, lines: new Set(rects.map((rect) => Math.round(rect.top))).size, contentWidth: element.scrollWidth, width: element.clientWidth };
    }));
    assert.deepEqual(metrics.map((metric) => metric.text), ["300", "100%"]);
    for (const metric of metrics) {
      assert.equal(metric.lines, 1, `${label}: ${metric.text} stays on one line`);
      assert.ok(metric.contentWidth <= metric.width + 1, `${label}: ${metric.text} fits its metric panel`);
    }
    await page.screenshot({ path: path.join(output, `charm-result-${label}.png`) });
    await page.keyboard.press("Escape");
    await noOverflow(`charm profile ${label}`);
    checks.push(`five tiers × earned/unearned, empty category, detail focus and history: ${label}`);
  }
}
