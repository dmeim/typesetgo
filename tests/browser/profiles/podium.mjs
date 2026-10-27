import assert from "node:assert/strict";
import path from "node:path";
import { expect } from "@playwright/test";

// Tab label and the accessible title used for the podium and rank list.
const periods = [
  { tab: "All time", title: "All time", range: "all-time" },
  { tab: "Today", title: "Today", range: "today" },
  { tab: "7 days", title: "Last 7 days", range: "week" },
];
const winners = [
  { rank: 1, name: "Maya", wpm: 150 },
  { rank: 2, name: "SecondPlaceWithAnExceptionallyLongUnbrokenName", wpm: 150 },
  { rank: 3, name: "Leo the typist", wpm: 148 },
];

async function podiumGeometry(podium) {
  return podium.evaluate((element) => {
    const bounds = (node) => {
      const { x, y, width, height, bottom } = node.getBoundingClientRect();
      return { x, y, width, height, bottom };
    };
    const settled = (node) => {
      const style = getComputedStyle(node);
      return style.transform === "none" && style.animationName === "none" && style.opacity === "1";
    };
    return {
      podium: bounds(element),
      entries: [...element.querySelectorAll("[data-podium-rank]")].map((item) => {
        const identity = item.querySelector("[data-podium-identity]");
        const step = item.querySelector("[data-podium-step]");
        return {
          rank: Number(item.dataset.podiumRank),
          identity: bounds(identity),
          avatar: bounds(item.querySelector("[data-leaderboard-avatar]")),
          step: bounds(step),
          stationary: [identity, step, ...identity.querySelectorAll("*")].every(settled),
        };
      }),
    };
  });
}

function assertGeometry(geometry, count, label) {
  const { entries, podium } = geometry;
  assert.deepEqual(entries.map(({ rank }) => rank), [1, 2, 3].slice(0, count), `${label}: semantic rank order`);
  const [first, second, third] = entries;
  assert.ok(Math.abs(first.step.x + first.step.width / 2 - (podium.x + podium.width / 2)) <= 1, `${label}: first stays centered`);
  for (const entry of entries) {
    assert.ok(entry.stationary, `${label}: names, scores, crown and steps are settled`);
    assert.ok(Math.abs(entry.step.bottom - first.step.bottom) <= 1, `${label}: shared pedestal baseline`);
    assert.ok(entry.identity.bottom <= entry.step.y + 1, `${label}: identity is above its independent pedestal`);
    assert.ok(Math.abs(entry.identity.height - first.identity.height) <= 1, `${label}: identities reserve equal room for the longest name`);
    assert.ok(entry.identity.x >= podium.x - 1 && entry.identity.x + entry.identity.width <= podium.x + podium.width + 1, `${label}: identity remains in the podium`);
  }
  if (second) {
    assert.ok(second.step.x + second.step.width < first.step.x, `${label}: second is left of first`);
    assert.ok(first.step.height > second.step.height, `${label}: first pedestal is higher than second`);
    assert.ok(first.identity.y < second.identity.y && first.avatar.y < second.avatar.y, `${label}: first identity remains highest despite the longer second name`);
  }
  if (third) {
    assert.ok(first.step.x + first.step.width < third.step.x, `${label}: third is right of first`);
    assert.ok(second.step.height > third.step.height, `${label}: second pedestal is higher than third`);
    assert.ok(second.identity.y < third.identity.y && second.avatar.y < third.avatar.y, `${label}: third identity is below second`);
  }
}

async function choosePeriod(page, tab) {
  const trigger = page.getByRole("tab", { name: tab, exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-selected", "true");
}

/** Reduced motion must land on the final state at once; otherwise wait for the morph to settle. */
async function settledGeometry(podium, reducedMotion) {
  if (reducedMotion !== "reduce") {
    await expect.poll(async () => (await podiumGeometry(podium)).entries.every((entry) => entry.stationary), { timeout: 3000 }).toBe(true);
  }
  return podiumGeometry(podium);
}

async function assertPodium(page, period, count, label, reducedMotion = "reduce") {
  const panel = page.getByRole("tabpanel");
  const podium = panel.getByRole("list", { name: `${period.title} podium`, exact: true });
  await expect(podium.getByRole("listitem")).toHaveCount(Math.min(count, 3));
  const geometry = await settledGeometry(podium, reducedMotion);
  for (const winner of winners.slice(0, count)) {
    const item = podium.locator(`[data-podium-rank="${winner.rank}"]`);
    await expect(item.getByText(`Rank ${winner.rank}`, { exact: true })).toHaveCount(1);
    const name = item.getByRole("link", { name: winner.name, exact: true });
    await expect(name).toBeVisible();
    await expect(name).toHaveAttribute("href", `/user/leaderboard-user-${winner.rank}`);
    await expect(item).toContainText(`${winner.wpm}WPM`);
    const text = await name.evaluate((element) => ({
      fontSize: parseFloat(getComputedStyle(element).fontSize),
      width: element.clientWidth,
      contentWidth: element.scrollWidth,
      height: element.clientHeight,
      contentHeight: element.scrollHeight,
    }));
    assert.ok(text.fontSize >= 14 && text.contentWidth <= text.width + 1 && text.contentHeight <= text.height + 1, `${label}: full readable rank ${winner.rank} name: ${JSON.stringify(text)}`);
  }
  const firstImage = podium.locator('[data-podium-rank="1"] img');
  await expect(firstImage).toHaveAttribute("src", "/assets/Banner-Color.svg");
  await expect.poll(() => firstImage.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(podium.locator('[data-podium-rank="1"] [data-podium-crown]')).toHaveCount(1);
  if (count >= 2) {
    const second = podium.locator('[data-podium-rank="2"]');
    await expect(second.locator("img")).toHaveCount(0);
    await expect(second.getByText("S", { exact: true })).toBeVisible();
  }
  if (count >= 3) {
    const third = podium.locator('[data-podium-rank="3"]');
    await expect(third.locator("img")).toHaveCount(0);
    await expect(third.getByText("L", { exact: true })).toBeVisible();
  }
  const ranks = panel.getByRole("list", { name: `${period.title} ranks 4 and below`, exact: true });
  if (count > 3) {
    const rows = ranks.getByRole("listitem");
    await expect(rows).toHaveCount(count - 3);
    await expect(rows.first()).toContainText(/^Rank 4/);
    await expect(rows.last()).toContainText(new RegExp(`^Rank ${count}`));
  } else {
    await expect(ranks).toHaveCount(0);
  }
  assertGeometry(geometry, Math.min(count, 3), `${label}, ${period.title}`);
  return geometry;
}

export async function checkPodium({ page, open, noOverflow, output, checks }) {
  for (const width of [320, 390, 768, 1024, 1280, 1439, 1440]) {
    const theme = [320, 768, 1280].includes(width) ? "light" : "dark";
    const reducedMotion = width === 390 || width === 1440 ? "no-preference" : "reduce";
    const label = `podium ${width}px ${theme} ${reducedMotion}`;
    await open("/leaderboard", { scenario: "podium", podiumCount: 50, width, height: 1000, theme, reducedMotion });
    await expect(page.getByRole("tab", { name: "All time", exact: true })).toHaveAttribute("aria-selected", "true");
    // The first board is in place on load: no entrance movement, fade or crown pop.
    const loaded = await podiumGeometry(page.getByRole("list", { name: "All time podium", exact: true }));
    assert.ok(loaded.entries.every((entry) => entry.stationary), `${label}: first board has no entrance animation`);
    for (const period of [...periods.slice(1), periods[0]]) {
      await choosePeriod(page, period.tab);
      await assertPodium(page, period, 50, label, reducedMotion);
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
      await noOverflow(`${label}, ${period.title}`);
    }
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: path.join(output, `leaderboard-podium-${width}-${theme}.png`) });
    }
    checks.push(`${label}: one 2–1–3 podium per period, readable names, avatar fallbacks, tied ranks, 50 immediate scores, settled period morph`);
  }

  for (const count of [1, 2, 3]) {
    for (const width of [320, 1440]) {
      const label = `podium ${count} entrants ${width}px`;
      await open("/leaderboard", { scenario: "podium", podiumCount: count, width, height: 1000 });
      for (const period of periods) {
        await choosePeriod(page, period.tab);
        await assertPodium(page, period, count, label);
      }
      await noOverflow(label);
    }
  }
  await open("/leaderboard", { scenario: "empty", width: 320 });
  for (const period of periods) {
    await choosePeriod(page, period.tab);
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByText("No scores yet", { exact: true })).toBeVisible();
    await expect(panel.getByRole("list")).toHaveCount(0);
  }
  checks.push("podium 0/1/2/3 entries: empty state per period, no invented winners, stable sparse slots at 320px and 1440px");

  await open("/leaderboard", { scenario: "podium", podiumCount: 50, width: 390, you: "leaderboard-user-7" });
  const standing = page.getByRole("complementary", { name: "Your standing", exact: true });
  await expect(standing).toContainText("You’re #7 of all time");
  await expect(standing).toContainText("1 WPM behind all-time ExtremelyLongUnbrokenUsernameNumber6");
  await expect(page.locator('[data-leaderboard-row="7"]').getByText("You", { exact: true })).toBeVisible();
  await choosePeriod(page, "Today");
  await expect(standing).toContainText("You’re #7 today");
  await noOverflow("standing bar 390px");
  await open("/leaderboard", { scenario: "podium", podiumCount: 50, width: 390 });
  await expect(page.getByRole("complementary", { name: "Your standing", exact: true })).toContainText("You’re not in the top 50 of all time yet");
  await open("/leaderboard", { scenario: "anonymous", width: 390 });
  await expect(page.getByRole("complementary", { name: "Your standing", exact: true })).toHaveCount(0);
  checks.push("signed-in standing bar from the loaded board; absent when signed out");

  for (const scenario of ["visitor", "anonymous"]) {
    for (const rank of [1, 4]) {
      await open("/leaderboard", { scenario, width: 390 });
      const panel = page.getByRole("tabpanel");
      const links = panel.getByRole("link");
      await expect(links).toHaveCount(50);
      assert.deepEqual(await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href"))), Array.from({ length: 50 }, (_, index) => `/user/leaderboard-user-${index + 1}`));
      const username = `all-time ExtremelyLongUnbrokenUsernameNumber${rank}`;
      const link = panel.getByRole("link", { name: username, exact: true });
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/user/leaderboard-user-${rank}$`));
      await expect(page.getByRole("heading", { name: username, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Lifetime statistics", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh achievements", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: /View details/ }).first().click();
      await expect(page.getByRole("dialog", { name: "Test details", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Delete test", exact: true })).toHaveCount(0);
      assert.deepEqual(await page.evaluate(() => window.profileFixtureCalls), []);
      await noOverflow(`${scenario} linked profile rank ${rank}`);
    }
  }
  checks.push("podium/list profile links use stable IDs and open by keyboard for visitors and anonymous viewers with owner actions withheld");
}
