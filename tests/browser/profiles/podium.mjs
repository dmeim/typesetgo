import assert from "node:assert/strict";
import path from "node:path";
import { expect } from "@playwright/test";

// Tab label and the accessible title used for the podium and rank list. The first is the board you land on.
const periods = [
  { tab: "7 days", title: "Last 7 days", range: "week" },
  { tab: "Today", title: "Today", range: "today" },
  { tab: "All time", title: "All time", range: "all-time" },
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
    await expect(name).toHaveAttribute("href", `/profile/leaderboard-user-${winner.rank}`);
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

/** Page and list scroll state plus the parts of rows the viewer can actually see. */
async function layoutState(page) {
  return page.evaluate(() => {
    const rect = (element) => element.getBoundingClientRect();
    const scroller = document.querySelector("[data-leaderboard-scroller]");
    const panel = scroller ? rect(scroller) : null;
    const standing = document.querySelector('aside[aria-label="Your standing"]');
    // Clip each row to the viewport and, where the list scrolls, to its panel; keep the parts still showing.
    const top = Math.max(0, panel?.top ?? 0);
    const bottom = Math.min(innerHeight, panel?.bottom ?? innerHeight);
    const visibleRows = [...document.querySelectorAll("[data-leaderboard-row]")].map(rect)
      .map((row) => ({ top: Math.max(row.top, top), bottom: Math.min(row.bottom, bottom) }))
      .filter((row) => row.bottom - row.top > 1);
    const you = document.querySelector("[data-leaderboard-you]");
    return {
      page: { scrollHeight: document.documentElement.scrollHeight, height: innerHeight, scrollY },
      scroller: scroller && { scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight, role: scroller.getAttribute("role"), tabIndex: scroller.getAttribute("tabindex"), name: scroller.getAttribute("aria-label") },
      panel: panel && { top: panel.top, bottom: panel.bottom },
      footerTop: rect(document.querySelector("footer")).top,
      standing: standing && { top: rect(standing).top, bottom: rect(standing).bottom },
      you: you && { top: rect(you).top, bottom: rect(you).bottom },
      visibleRows,
    };
  });
}

function assertStandingClear(state, label) {
  assert.ok(state.standing, `${label}: standing bar shown`);
  for (const row of state.visibleRows) {
    assert.ok(row.bottom <= state.standing.top + 1 || row.top >= state.standing.bottom - 1, `${label}: standing bar covers a row ${JSON.stringify({ row, standing: state.standing })}`);
  }
}

async function checkRankListScrolling({ page, open, noOverflow, output, checks }) {
  // Desktop and tablet: the page fits the viewport and ranks 4–50 scroll inside their own focusable panel.
  for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768], [768, 1024]]) {
    const label = `rank list ${width}x${height}`;
    await open("/leaderboard", { scenario: "podium", podiumCount: 50, width, height, you: "leaderboard-user-30" });
    const scroller = page.getByRole("region", { name: "Last 7 days ranks 4 and below, scrollable", exact: true });
    await expect(scroller).toBeVisible();
    let state = await layoutState(page);
    assert.ok(state.page.scrollHeight <= state.page.height + 1, `${label}: page does not scroll ${JSON.stringify(state.page)}`);
    assert.ok(state.scroller.scrollHeight > state.scroller.clientHeight + 100, `${label}: list overflows its panel ${JSON.stringify(state.scroller)}`);
    assert.ok(state.panel.bottom <= state.footerTop + 1, `${label}: panel ends above the footer`);
    // Your row is brought into view inside the panel on load, without moving focus.
    assert.ok(state.scroller.scrollTop > 0 && state.you.top >= state.panel.top - 1 && state.you.bottom <= state.panel.bottom + 1, `${label}: your row is in view ${JSON.stringify({ you: state.you, panel: state.panel })}`);
    assert.equal(await page.evaluate(() => document.activeElement === document.body), true, `${label}: focus untouched`);
    assertStandingClear(state, label);
    await noOverflow(label);
    if (width === 1280) await page.screenshot({ path: path.join(output, `leaderboard-split-${width}x${height}.png`) });

    // Keyboard: focus the panel and page through it; only the panel moves.
    await scroller.focus();
    await page.keyboard.press("Home");
    await expect.poll(async () => (await layoutState(page)).scroller.scrollTop).toBe(0);
    await page.keyboard.press("End");
    await expect.poll(async () => { const next = await layoutState(page); return next.scroller.scrollTop + next.scroller.clientHeight >= next.scroller.scrollHeight - 1; }).toBe(true);
    state = await layoutState(page);
    assert.equal(state.page.scrollY, 0, `${label}: page stays put while the list scrolls`);
    await expect(page.locator('[data-leaderboard-row="50"]')).toBeInViewport();

    // Switching period keeps the layout and morphs into the other board.
    await choosePeriod(page, "All time");
    await expect(page.getByRole("region", { name: "All time ranks 4 and below, scrollable", exact: true })).toBeVisible();
    state = await layoutState(page);
    assert.ok(state.page.scrollHeight <= state.page.height + 1, `${label}: page still fits after switching period`);
    checks.push(`${label}: podium beside an internally scrolling, keyboard-scrollable rank list; page fits the viewport; your row in view; standing bar clear of rows`);
  }

  // Phones: stacked podium, standing bar and list; the page scrolls and the list is not a nested scroll area.
  for (const [width, height] of [[390, 844], [320, 568]]) {
    const label = `rank list ${width}x${height}`;
    await open("/leaderboard", { scenario: "podium", podiumCount: 50, width, height, you: "leaderboard-user-30" });
    await expect(page.locator('[data-leaderboard-row="4"]')).toHaveCount(1);
    await expect(page.getByRole("region", { name: /ranks 4 and below, scrollable$/ })).toHaveCount(0);
    let state = await layoutState(page);
    assert.ok(state.page.scrollHeight > state.page.height, `${label}: page scrolls`);
    assert.equal(state.scroller.scrollHeight, state.scroller.clientHeight, `${label}: list is not a nested scroller`);
    for (const y of [0, 900, 2400]) {
      await page.evaluate((top) => scrollTo(0, top), y);
      state = await layoutState(page);
      assertStandingClear(state, `${label} at ${y}px`);
    }
    await noOverflow(label);
    checks.push(`${label}: stacked podium, standing bar and rank list scroll with the page without horizontal overflow; standing bar never covers rows`);
  }
}

export async function checkPodium({ page, open, noOverflow, output, checks }) {
  for (const width of [320, 390, 768, 1024, 1280, 1439, 1440]) {
    const theme = [320, 768, 1280].includes(width) ? "light" : "dark";
    const reducedMotion = width === 390 || width === 1440 ? "no-preference" : "reduce";
    const label = `podium ${width}px ${theme} ${reducedMotion}`;
    await open("/leaderboard", { scenario: "podium", podiumCount: 50, width, height: 1000, theme, reducedMotion });
    await expect(page.getByRole("tab", { name: "7 days", exact: true })).toHaveAttribute("aria-selected", "true");
    // The first board (7 days) is in place on load: no entrance movement, fade or crown pop.
    const loaded = await podiumGeometry(page.getByRole("list", { name: "Last 7 days podium", exact: true }));
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
  await expect(standing).toContainText("You’re #7 in the last 7 days");
  await choosePeriod(page, "All time");
  await expect(standing).toContainText("You’re #7 of all time");
  await expect(standing).toContainText("1 WPM behind all-time ExtremelyLongUnbrokenUsernameNumber6");
  await expect(page.locator('[data-leaderboard-row="7"]').getByText("You", { exact: true })).toBeVisible();
  await noOverflow("standing bar 390px");
  await open("/leaderboard", { scenario: "podium", podiumCount: 50, width: 390 });
  await expect(page.getByRole("complementary", { name: "Your standing", exact: true })).toContainText("You’re not in the top 50 in the last 7 days yet");
  await open("/leaderboard", { scenario: "anonymous", width: 390 });
  await expect(page.getByRole("complementary", { name: "Your standing", exact: true })).toHaveCount(0);
  checks.push("signed-in standing bar from the loaded board; absent when signed out");

  await checkRankListScrolling({ page, open, noOverflow, output, checks });

  for (const scenario of ["visitor", "anonymous"]) {
    for (const rank of [1, 4]) {
      await open("/leaderboard", { scenario, width: 390 });
      await choosePeriod(page, "All time");
      const panel = page.getByRole("tabpanel");
      const links = panel.getByRole("link");
      await expect(links).toHaveCount(50);
      assert.deepEqual(await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href"))), Array.from({ length: 50 }, (_, index) => `/profile/leaderboard-user-${index + 1}`));
      const username = `all-time ExtremelyLongUnbrokenUsernameNumber${rank}`;
      const link = panel.getByRole("link", { name: username, exact: true });
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      // Leaderboard names link straight to the public Profile view.
      await expect(page).toHaveURL(new RegExp(`/profile/leaderboard-user-${rank}$`));
      await expect(page.getByRole("heading", { name: username, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Lifetime statistics", exact: true })).toBeVisible();
      await expect(page.getByText(/public profile/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh achievements", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Delete test", exact: true })).toHaveCount(0);
      assert.deepEqual(await page.evaluate(() => window.profileFixtureCalls), []);
      await noOverflow(`${scenario} linked profile rank ${rank}`);
    }
  }
  checks.push("podium/list profile links use stable IDs and open by keyboard for visitors and anonymous viewers with owner actions withheld");
}
