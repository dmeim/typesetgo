import { withFixtureBrowser, artifactPath, routeFixtureRequests, visibleBounds, expectWithinViewport, fixtureOrigin } from "../runtime.mjs";
import { expect } from "@playwright/test";
await withFixtureBrowser(async browser => {
  const p = await browser.newPage({
    viewport: {
      width: 390,
      height: 844
    },
    reducedMotion: "reduce"
  });
  let fail1984 = true;
  let themeFetches = 0;
  await p.addInitScript(() => localStorage.setItem("typesetgo_settings", JSON.stringify({
    mode: "words",
    wordTarget: 10,
    soundEnabled: false,
    showOnScreenKeyboard: true,
    ghostWriterEnabled: true,
    ghostWriterSpeed: 60
  })));
  await routeFixtureRequests(p, async r => {
    const u = new URL(r.request().url());
    if (u.hostname !== "127.0.0.1") return r.abort();
    if (u.pathname.startsWith("/words/") && !u.pathname.endsWith("/manifest.json")) return r.fulfill({
      json: ["cat"]
    });
    if (u.pathname === "/themes/manifest.json") return r.fulfill({
      json: {
        themes: ["typesetgo", "fire-force", "1984"],
        default: "typesetgo"
      }
    });
    if (u.pathname.startsWith("/themes/") && !u.pathname.endsWith("/manifest.json")) {
      themeFetches++;
      if (u.pathname.endsWith("/1984.json") && fail1984) return r.fulfill({
        status: 503,
        body: "Fixture temporary failure"
      });
      await new Promise(r => setTimeout(r, 1000));
    }
    return r.fallback();
  });
  await p.goto(fixtureOrigin);
  const i = p.getByRole("textbox", {
    name: "Typing practice",
    exact: true
  });
  await expect(i).toBeEnabled();
  await expect(p.locator("[data-key]")).toHaveCount(51);
  expect(themeFetches).toBeLessThanOrEqual(1);
  await i.fill("x ");
  await expect(p.locator("[data-next-key=true][data-key=c]")).toHaveCount(1);
  await expect(p.locator("[data-next-key=true][data-key=Backspace]")).toHaveCount(0);
  await p.waitForTimeout(1000);
  await expect(p.locator("[data-ghost-caret]")).toHaveCount(1);
  const ghost = await visibleBounds(p.locator("[data-ghost-caret]"));
  console.log("historical error correction guidance + elapsed ghost PASS", ghost);
  await p.setViewportSize({
    width: 260,
    height: 700
  });
  await expect(p.locator("[data-key]")).toHaveCount(0);
  await p.setViewportSize({
    width: 900,
    height: 850
  });
  await expect(p.locator("[data-key]")).toHaveCount(51);
  console.log("keyboard260\u2192900 recovery PASS");
  await p.setViewportSize({
    width: 390,
    height: 844
  });
  await i.press("Tab");
  await p.getByRole("button", {
    name: "Change theme",
    exact: true
  }).click();
  const dialog = p.getByRole("dialog", {
    name: "Theme",
    exact: true
  });
  await expect(dialog).toBeVisible();
  await expect(p.getByText("Loading themes\u2026", {
    exact: true
  })).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("1 themes could not be loaded");
  fail1984 = false;
  await dialog.getByRole("button", {
    name: "Retry",
    exact: true
  }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(p.getByText("Loading themes\u2026", {
    exact: true
  })).toHaveCount(0);
  let b = await expectWithinViewport(p, dialog);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  expect(b.height).toBeLessThanOrEqual(844);
  console.log("narrow dialog + catalog loading/error/retry PASS", b);
  await dialog.getByRole("button", {
    name: "Collapse all",
    exact: true
  }).click();
  await expect(dialog.getByRole("button", {
    name: "Fire Force variants",
    exact: true
  })).toHaveCount(0);
  await dialog.getByRole("searchbox", {
    name: "Search themes",
    exact: true
  }).fill("Fire Force");
  await dialog.getByRole("button", {
    name: "Fire Force variants",
    exact: true
  }).click();
  const drawer = dialog.locator("#theme-variants-fire-force");
  await expect(drawer).toBeVisible();
  const drawerSize = await drawer.evaluate(e => ({
    client: e.clientHeight,
    scroll: e.scrollHeight
  }));
  expect(drawerSize.client).toBeGreaterThan(0);
  const lastVariant = drawer.getByRole("button").last();
  await lastVariant.scrollIntoViewIfNeeded();
  await expect(lastVariant).toBeInViewport();
  const light = drawer.getByRole("button", {
    name: /light mode/
  }).first();
  await light.click();
  await expect(light).toHaveAttribute("aria-pressed", "true");
  await p.screenshot({
    path: artifactPath("practice-final-theme-narrow.png")
  });
  await p.setViewportSize({
    width: 1280,
    height: 900
  });
  await expect(drawer).toBeVisible();
  b = await dialog.boundingBox();
  expect(b.x + b.width).toBeLessThanOrEqual(1280);
  await p.setViewportSize({
    width: 640,
    height: 450
  });
  await expect.poll(async () => (await dialog.boundingBox()).height).toBeLessThanOrEqual(450);
  b = await dialog.boundingBox();
  expect(b.height).toBeLessThanOrEqual(450);
  expect(b.x + b.width).toBeLessThanOrEqual(640);
  console.log("wide resize + compact200%-equivalent viewport PASS", b);
  await p.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(p.getByRole("button", {
    name: "Change theme",
    exact: true
  })).toBeFocused();
});
