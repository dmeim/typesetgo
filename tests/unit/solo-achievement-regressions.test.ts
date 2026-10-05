// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { backendContract, resultRow, userRow } from "./fixtures/backend-contract";

afterEach(() => vi.useRealTimers());

describe("generated-content achievement eligibility on historical replay", () => {
  it.each(["quote", "preset", "kid"])("ignores stored generated settings for %s results", async (mode) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T15:00:00Z"));
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    await t.run(async (ctx) => {
      for (const difficulty of ["easy", "medium", "hard"]) {
        await ctx.db.insert("testResults", resultRow(userId, {
          mode, difficulty, punctuation: true, numbers: true, capitalization: true, accuracy: 100,
        }));
      }
    });
    await t.withIdentity({ subject: "owner" }).mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" });
    const awards = await t.query(api.achievements.getUserAchievementsByUserId, { userId });
    expect(Object.keys(awards).some((id) => id.startsWith("challenge-"))).toBe(false);
    for (const id of ["explorer-punctuation", "explorer-numbers", "explorer-all-difficulties", "milestone-50wpm-100acc-hard"]) {
      expect(awards[id]).toBeUndefined();
    }
    const progress = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(progress?.state.difficulties).toEqual([]);
    // Ordinary applicable activity achievements still work.
    expect(awards["special-first-test"]).toBeDefined();
    if (mode === "quote" || mode === "preset") expect(awards[`explorer-${mode}-mode`]).toBeDefined();
  });

  it.each(["time", "words", "zen"])("preserves generated challenge and difficulty exploration for %s", async (mode) => {
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    await t.run(async (ctx) => {
      for (const difficulty of ["easy", "medium", "hard"]) {
        await ctx.db.insert("testResults", resultRow(userId, {
          mode, difficulty, punctuation: true, numbers: true, capitalization: true, accuracy: 100,
        }));
      }
    });
    await t.withIdentity({ subject: "owner" }).mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" });
    const awards = await t.query(api.achievements.getUserAchievementsByUserId, { userId });
    for (const id of ["challenge-hard-punctuation", "challenge-hard-numbers", "challenge-hard-both-80wpm", "explorer-all-difficulties", "milestone-50wpm-100acc-hard"]) {
      expect(awards[id]).toBeDefined();
    }
  });
});
