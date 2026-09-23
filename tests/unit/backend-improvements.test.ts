// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { backendContract, resultRow, userRow } from "./fixtures/backend-contract";
import { getLocalCalendarFields } from "../../src/lib/activity-calendar";
import { todayTitleUTC, utcDayStart, weekTitleUTC } from "../../src/lib/leaderboard-period";

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

function saveArgs() {
  return { wpm: 80, accuracy: 98, mode: "words", duration: 30_000,
    wordCount: 50, difficulty: "easy", punctuation: false, numbers: false,
    wordsCorrect: 48, wordsIncorrect: 2, charsMissed: 1, charsExtra: 0,
    ...getLocalCalendarFields() };
}

describe("unranked result validation and public projection", () => {
  it("rejects impossible client metrics before storing or granting progress", async () => {
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    const owner = t.withIdentity({ subject: "owner" });
    for (const bad of [
      { accuracy: 101 }, { duration: -1 }, { wpm: Number.POSITIVE_INFINITY },
      { wordsCorrect: -1 }, { charsMissed: 1.5 }, { wordCount: 1_000_001 },
      { wpm: 290, wordCount: 1 }, { wordsCorrect: 1000, wordCount: 1 },
      { mode: "unknown" }, { difficulty: "unknown" },
    ]) {
      await expect(owner.mutation(api.testResults.saveResult, { ...saveArgs(), ...bad })).rejects.toThrow(/Invalid practice|Inconsistent practice/);
    }
    expect(await t.run((ctx) => ctx.db.query("testResults").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("userStatsCache").collect())).toEqual([]);
    const saved = await owner.mutation(api.testResults.saveResult, saveArgs());
    expect(saved.resultId).toBeTruthy();
    expect(saved.newAchievements).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("userStatsCache").collect())).toEqual([]);
    expect(await t.query(api.achievements.getUserAchievementsByUserId, { userId })).toEqual({});
    const publicStats = await t.query(api.testResults.getUserStatsByUserId, { userId });
    expect(publicStats?.allResults[0]).toEqual({
      _id: saved.resultId, wpm: 80, accuracy: 98, mode: "words", duration: 30_000,
      wordCount: 50, difficulty: "easy", punctuation: false, numbers: false,
      capitalization: undefined, wordsCorrect: 48, wordsIncorrect: 2,
      charsMissed: 1, charsExtra: 0, isValid: true, invalidReason: undefined,
      verification: "unverified",
      createdAt: expect.any(Number),
    });
  });

  it("derives verification status for legacy and invalid public history without internal flags", async () => {
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    await t.run(async (ctx) => {
      await ctx.db.insert("testResults", resultRow(userId, { rankedEligible: undefined }));
      await ctx.db.insert("testResults", resultRow(userId, { isValid: false, invalidReason: "review" }));
    });
    const results = (await t.query(api.testResults.getUserStatsByUserId, { userId }))!.allResults;
    expect(results.map((row) => row.verification)).toEqual(["invalid", "verified"]);
    for (const result of results) {
      expect(result).not.toHaveProperty("rankedEligible");
      expect(result).not.toHaveProperty("localCalendar");
      expect(result).not.toHaveProperty("userId");
    }
  });
});

describe("admin login isolation", () => {
  it("requires sign-in and gives each authenticated caller a separate attempt allowance", async () => {
    const t = backendContract();
    await expect(t.action(api.admin.login, { password: "guess" })).rejects.toThrow(/Sign in/);
    const first = t.withIdentity({ subject: "first" });
    const second = t.withIdentity({ subject: "second" });
    await first.mutation(internal.sessionCleanup.consumeAdminLoginRateLimit, { subject: "first" });
    await expect(first.mutation(internal.sessionCleanup.consumeAdminLoginRateLimit, { subject: "first" })).rejects.toThrow(/Rate limit/);
    await expect(second.mutation(internal.sessionCleanup.consumeAdminLoginRateLimit, { subject: "second" })).resolves.toBeNull();
  });

  it("allows a signed-in administrator with the server password to open a session", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "fixture-secret");
    const t = backendContract();
    const result = await t.withIdentity({ subject: "admin" }).action(api.admin.login, { password: "fixture-secret" });
    expect(result.token).toBeTruthy();
    const sessions = await t.run((ctx) => ctx.db.query("adminSessions").collect());
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokenHash).not.toBe(result.token);
  });
});

describe("UTC leaderboard windows", () => {
  it("matches UTC labels to day boundaries and ranks each user's best eligible period score", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T00:01:00Z"));
    const day = utcDayStart(Date.now());
    expect(todayTitleUTC(day)).toBe("Wednesday, Sep 23");
    expect(weekTitleUTC(day)).toBe("Sep 16 – Sep 23");
    const t = backendContract();
    const ids = await t.run(async (ctx) => {
      const a = await ctx.db.insert("users", userRow("a"));
      const b = await ctx.db.insert("users", userRow("b"));
      await ctx.db.insert("testResults", resultRow(a, { wpm: 250, createdAt: day - 1 }));
      await ctx.db.insert("testResults", resultRow(a, { wpm: 110, createdAt: day + 10 }));
      await ctx.db.insert("testResults", resultRow(a, { wpm: 120, createdAt: day + 20 }));
      await ctx.db.insert("testResults", resultRow(b, { wpm: 115, createdAt: day + 30 }));
      await ctx.db.insert("testResults", resultRow(b, { wpm: 220, isValid: false, createdAt: day + 40 }));
      return { a, b };
    });
    const today = await t.query(api.testResults.getLeaderboard, { timeRange: "today", periodStart: day });
    expect(today.map((entry) => [entry.userId, entry.wpm])).toEqual([[ids.a, 120], [ids.b, 115]]);
    expect((await t.query(api.testResults.getLeaderboard, { timeRange: "week", periodStart: day }))[0].wpm).toBe(250);
  });
});

describe("bounded stats repair", () => {
  it("reports migration kickoff separately from completed rebuilds", async () => {
    vi.useFakeTimers();
    const t = backendContract();
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", userRow("owner"));
      for (let i = 0; i < 101; i++) await ctx.db.insert("testResults", resultRow(userId));
    });
    const backfill = await t.action(internal.migrations.backfillAllCaches, { maxBatches: 1 });
    expect(backfill).toMatchObject({ userStatsRebuildsStarted: 1, userStatsRebuildsCompleted: 0,
      userStatsRebuildsPending: 1, failedUserIds: [] });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const cache = await t.run((ctx) => ctx.db.query("userStatsCache").first());
    expect(cache?.totalTests).toBe(101);
  });

  it("finds the next valid best through the score index", async () => {
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    const bestId = await t.run(async (ctx) => {
      await ctx.db.insert("testResults", resultRow(userId, { wpm: 90, isValid: undefined }));
      await ctx.db.insert("testResults", resultRow(userId, { wpm: 150, isValid: false }));
      await ctx.db.insert("testResults", resultRow(userId, { wpm: 200, rankedEligible: false }));
      const id = await ctx.db.insert("testResults", resultRow(userId, { wpm: 120 }));
      await ctx.db.insert("userStatsCache", { userId, totalTests: 2, totalWpm: 210,
        bestWpm: 120, totalAccuracy: 198, totalTimeTyped: 60_000,
        totalWordsTyped: 100, updatedAt: Date.now() });
      return id;
    });
    await t.withIdentity({ subject: "owner" }).mutation(api.testResults.deleteResult, { clerkId: "owner", resultId: bestId });
    const cache = await t.run((ctx) => ctx.db.query("userStatsCache").first());
    expect(cache?.bestWpm).toBe(90);
  });

  it("pages a full rebuild and publishes the exact aggregate", async () => {
    vi.useFakeTimers();
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    await t.run(async (ctx) => {
      for (let i = 0; i < 230; i++) {
        await ctx.db.insert("testResults", resultRow(userId, { wpm: i, isValid: i % 10 === 0 ? false : true }));
      }
      await ctx.db.insert("testResults", resultRow(userId, { wpm: 300, rankedEligible: false }));
    });
    expect((await t.mutation(internal.statsCache.rebuildUserStatsCacheForUser, { userId })).pending).toBe(true);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const cache = await t.run((ctx) => ctx.db.query("userStatsCache").first());
    expect(cache?.totalTests).toBe(207);
    expect(cache?.bestWpm).toBe(229);
    expect(cache?.totalWpm).toBe(Array.from({ length: 230 }, (_, i) => i).filter((i) => i % 10 !== 0).reduce((a, b) => a + b, 0));
  });

  it("restarts a pending rebuild when a save arrives and ignores stale queued pages", async () => {
    vi.useFakeTimers();
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    await t.run(async (ctx) => {
      for (let i = 0; i < 201; i++) await ctx.db.insert("testResults", resultRow(userId, { wpm: 50 }));
    });
    await t.mutation(internal.statsCache.rebuildUserStatsCacheForUser, { userId });
    const first = await t.run((ctx) => ctx.db.query("userStatsRebuild").first());
    await t.run((ctx) => ctx.db.insert("testResults", resultRow(userId, { wpm: 80 })));
    await t.mutation(internal.statsCache.updateUserStatsCache, {
      userId, wpm: 80, accuracy: 99, duration: 30_000, wordCount: 50, isValid: true,
    });
    const restarted = await t.run((ctx) => ctx.db.query("userStatsRebuild").first());
    expect(restarted?.generation).toBe((first?.generation ?? 0) + 1);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const cache = await t.run((ctx) => ctx.db.query("userStatsCache").first());
    expect(cache?.totalTests).toBe(202);
    expect(cache?.totalWpm).toBe(201 * 50 + 80);
  });
});
