import assert from "node:assert/strict";
import path from "node:path";
import { expect } from "@playwright/test";

const periods = ["All-Time", "Today", "This Week"];
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
    return {
      podium: bounds(element),
      entries: [...element.querySelectorAll("[data-podium-rank]")].map((item) => {
        const identity = item.querySelector("[data-podium-identity]");
        const step = item.querySelector("[data-podium-step]");
        return {
          rank: Number(item.dataset.podiumRank),
          identity: bounds(identity),
          avatar: bounds(item.querySelector("[data-podium-avatar]")),
          step: bounds(step),
          stationary: [identity, step].every((node) => {
            const style = getComputedStyle(node);
            return style.transform === "none" && style.animationName === "none" && style.opacity === "1";
          }),
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
    assert.ok(entry.stationary, `${label}: names, scores and steps have no entrance movement or opacity delay`);
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

async function assertPodium(page, title, count, label) {
  const region = page.getByRole("region", { name: title, exact: true });
  const podium = region.getByRole("list", { name: `${title} podium`, exact: true });
  await expect(podium.getByRole("listitem")).toHaveCount(Math.min(count, 3));
  for (const winner of winners.slice(0, count)) {
    const item = podium.locator(`[data-podium-rank="${winner.rank}"]`);
    await expect(item.getByText(`Rank ${winner.rank}`, { exact: true })).toHaveCount(1);
    const name = item.getByText(winner.name, { exact: true });
    await expect(name).toBeVisible();
    await expect(item.getByText(`${winner.wpm} WPM`, { exact: true })).toBeVisible();
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
  if (count > 3) {
    const table = region.getByRole("table", { name: `${title} ranks 4 and below`, exact: true });
    await expect(table.getByRole("row")).toHaveCount(count - 2);
    await expect(table.locator("tbody tr").first().locator("td").first()).toHaveText("4");
    await expect(table.locator("tbody tr").last().locator("td").first()).toHaveText(String(count));
  } else {
    await expect(region.getByRole("table")).toHaveCount(0);
  }
  const geometry = await podiumGeometry(podium);
  assertGeometry(geometry, Math.min(count, 3), `${label}, ${title}`);
  return geometry;
}

export async function checkPodium({ page, open, noOverflow, output, checks }) {
  for (const width of [320, 390, 768, 1024, 1280, 1439, 1440]) {
    const theme = [320, 768, 1280].includes(width) ? "light" : "dark";
    const reducedMotion = width === 390 || width === 1440 ? "no-preference" : "reduce";
    const label = `podium ${width}px ${theme} ${reducedMotion}`;
    await open("/leaderboard", { scenario: "podium", podiumCount: 50, width, height: 1000, theme, reducedMotion });
    const geometry = [];
    for (const title of periods) geometry.push(await assertPodium(page, title, 50, label));
    await noOverflow(label);

    const sections = await page.locator("main > div > section").evaluateAll((elements) => elements.map((element) => {
      const { x, y } = element.getBoundingClientRect();
      return { x, y };
    }));
    if (width < 1440) {
      assert.ok(sections[0].y < sections[1].y && sections[1].y < sections[2].y, `${label}: all periods stack until there is room`);
    } else {
      assert.ok(sections[0].x < sections[1].x && sections[1].x < sections[2].x, `${label}: roomy desktop period columns`);
    }

    const awards = await page.locator("[data-podium-award]").evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return { transform: style.transform, animation: style.animationName, duration: parseFloat(style.animationDuration), delay: style.animationDelay, iterations: style.animationIterationCount };
    }));
    for (const award of awards) {
      if (reducedMotion === "reduce") {
        assert.equal(award.transform, "none", `${label}: reduced motion has no award transform`);
        assert.equal(award.animation, "none", `${label}: reduced motion disables award entrance`);
      } else {
        assert.ok(award.duration > 0 && award.duration <= 0.4 && award.iterations === "1" && award.delay === "0s", `${label}: award entrance is bounded and immediate`);
      }
    }
    await page.locator("[data-podium-award]").evaluateAll((elements) => elements.forEach((element) => element.getAnimations().forEach((animation) => animation.finish())));
    for (const [index, title] of periods.entries()) {
      const finalGeometry = await podiumGeometry(page.getByRole("list", { name: `${title} podium`, exact: true }));
      assert.deepEqual(finalGeometry, geometry[index], `${label}: finishing decoration does not move identity or pedestal geometry`);
    }
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: path.join(output, `leaderboard-podium-${width}-${theme}.png`) });
    }
    checks.push(`${label}: 2–1–3 geometry, readable names, avatar fallbacks, tied ranks, 50 immediate scores`);
  }

  for (const count of [1, 2, 3]) {
    for (const width of [320, 1440]) {
      const label = `podium ${count} entrants ${width}px`;
      await open("/leaderboard", { scenario: "podium", podiumCount: count, width, height: 1000 });
      for (const title of periods) await assertPodium(page, title, count, label);
      await noOverflow(label);
    }
  }
  await open("/leaderboard", { scenario: "empty", width: 320 });
  for (const title of periods) {
    const region = page.getByRole("region", { name: title, exact: true });
    await expect(region.getByText("No scores yet", { exact: true })).toBeVisible();
    await expect(region.getByRole("list")).toHaveCount(0);
  }
  checks.push("podium 0/1/2/3 entries: independent empty state, no invented winners, stable sparse slots at 320px and 1440px");
}
