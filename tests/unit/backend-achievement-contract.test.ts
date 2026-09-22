// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { backendContract, resultRow, userRow } from "./fixtures/backend-contract";
import { advanceAchievementState, emptyAchievementState } from "../../convex/lib/achievementEvaluator";
import { getLocalCalendarFields } from "../../src/lib/activity-calendar";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { sha256Hex } from "../../convex/lib/crypto";

afterEach(() => vi.useRealTimers());

function pureResult(overrides: Partial<Doc<"testResults">> = {}): Doc<"testResults"> {
  return { _id: "testResults:test" as Id<"testResults">, _creationTime: 0,
    ...resultRow("users:owner" as Id<"users">), ...overrides };
}

function calendar(timestamp: number) {
  const fields = getLocalCalendarFields(timestamp);
  return { localDate: fields.localDate, localHour: fields.localHour, dayOfWeek: fields.dayOfWeek, month: fields.month, day: fields.day };
}

async function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-22T15:00:00Z"));
  const t = backendContract();
  const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
  return { t, userId, owner: t.withIdentity({ subject: "owner" }) };
}

describe("one achievement evaluator for save and rebuild", () => {
  it("keeps unranked short tests exempt-only on save, refresh, deletion and admin invalidation", async () => {
    const { t, userId, owner } = await setup();
    const saved = await owner.mutation(api.testResults.saveResult, {
      clerkId: "owner", wpm: 180, accuracy: 100, mode: "time", duration: 10000,
      wordCount: 30, difficulty: "easy", punctuation: false, numbers: false,
      wordsCorrect: 30, wordsIncorrect: 0, charsMissed: 0, charsExtra: 0,
      ...getLocalCalendarFields(),
    });
    const before = await t.query(api.achievements.getUserAchievementsByUserId, { userId });
    expect(Object.keys(before)).toContain("special-first-test");
    expect(Object.keys(before).some((id) => id.startsWith("speed-"))).toBe(false);
    await owner.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" });
    expect(await t.query(api.achievements.getUserAchievementsByUserId, { userId })).toEqual(before);
    const tokenHash = await sha256Hex("admin-test");
    await t.run((ctx) => ctx.db.insert("adminSessions", { tokenHash, createdAt: Date.now(), expiresAt: Date.now() + 60000 }));
    await t.mutation(api.admin.setValidity, { token: "admin-test", resultId: saved.resultId, isValid: false });
    expect(await t.query(api.achievements.getUserAchievementsByUserId, { userId })).toEqual({});
    await t.mutation(api.admin.setValidity, { token: "admin-test", resultId: saved.resultId, isValid: true });
    expect(Object.keys(await t.query(api.achievements.getUserAchievementsByUserId, { userId })).sort()).toEqual(Object.keys(before).sort());
    await owner.mutation(api.testResults.deleteResult, { clerkId: "owner", resultId: saved.resultId });
    expect(await t.query(api.achievements.getUserAchievementsByUserId, { userId })).toEqual({});
  });

  it("awards actual ranked finalization identically on refresh and persists local facts", async () => {
    const { t, userId, owner } = await setup();
    const session = await owner.mutation(api.typingSessions.startSession, { mode: "words", wordTarget: 25, difficulty: "easy" });
    for (let i = 0; i <= 3; i++) {
      if (i) vi.setSystemTime(Date.now() + 10000);
      await owner.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: Math.floor(session.targetText.length * i / 3) });
    }
    const result = await owner.mutation(api.typingSessions.finalizeSession, {
      sessionId: session.sessionId, typedText: session.targetText, clientElapsedMs: 30000,
      ...getLocalCalendarFields(),
    });
    expect(result.isValid).toBe(true);
    const before = await t.query(api.achievements.getUserAchievementsByUserId, { userId });
    expect(Object.keys(before).some((id) => id.startsWith("speed-"))).toBe(true);
    expect((await t.run((ctx) => ctx.db.get(result.resultId)))?.localCalendar).toEqual(calendar(Date.now()));
    await owner.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" });
    expect(await t.query(api.achievements.getUserAchievementsByUserId, { userId })).toEqual(before);
    await owner.mutation(api.testResults.deleteResult, { clerkId: "owner", resultId: result.resultId });
    expect(await owner.query(api.streaks.getUserStreak, { clerkId: "owner" })).toEqual({ currentStreak: 0, longestStreak: 0, lastActivityDate: null });
  });

  it("rebuilds in bounded pages, includes saves arriving during replay, and ignores obsolete generations", async () => {
    const { t, userId, owner } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 250; i++) await ctx.db.insert("testResults", resultRow(userId, { createdAt: Date.now() - 1000 + i }));
    });
    const refresh = await owner.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" });
    expect(refresh.pending).toBe(true);
    const first = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(first?.state.totalTests).toBe(100);
    const extra = await t.run((ctx) => ctx.db.insert("testResults", resultRow(userId)));
    await t.mutation(internal.achievements.checkAndAwardAchievements, { userId, resultId: extra });
    await owner.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" });
    await t.mutation(internal.achievements.continueRebuild, { userId, generation: first!.generation });
    const restarted = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(restarted?.state.totalTests).toBe(100);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const final = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(final?.pending).toBe(false);
    expect(final?.state.totalTests).toBe(251);
    const before = await t.query(api.achievements.getUserAchievementsByUserId, { userId });
    await owner.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.query(api.achievements.getUserAchievementsByUserId, { userId })).toEqual(before);
  });

  it("includes an append during a pending rebuild without restarting that rebuild", async () => {
    const { t, userId, owner } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 250; i++) {
        await ctx.db.insert("testResults", resultRow(userId, { wpm: 60, createdAt: Date.now() - 1000 + i }));
      }
    });
    expect((await owner.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" })).pending).toBe(true);
    const first = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(first?.state.totalTests).toBe(100);
    const saved = await owner.mutation(api.testResults.saveResult, {
      wpm: 42, accuracy: 100, mode: "words", duration: 30000,
      wordCount: 50, difficulty: "hard", punctuation: true, numbers: false,
      wordsCorrect: 50, wordsIncorrect: 0, charsMissed: 0, charsExtra: 0,
      ...getLocalCalendarFields(),
    });
    expect(saved.newAchievements).toEqual([]);
    const pending = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(pending?.generation).toBe(first?.generation);
    expect(pending?.state.totalTests).toBe(100);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const final = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(final?.generation).toBe(first?.generation);
    expect(final?.pending).toBe(false);
    expect(final?.state.totalTests).toBe(251);
    const expected = emptyAchievementState();
    const history = await t.run((ctx) => ctx.db.query("testResults").withIndex("by_user_and_date", (q) => q.eq("userId", userId)).collect());
    for (const result of history) advanceAchievementState(expected, result);
    expect(final?.state).toEqual(expected);
    const awards = await t.query(api.achievements.getUserAchievementsByUserId, { userId });
    expect(awards).toEqual(expected.awards);
    expect(awards["quirky-42"]).toBeTruthy();
  });

  it.each(["deletion", "admin invalidation"] as const)("restarts after %s of an already-replayed result and prevents stale queued pages from regranting it", async (operation) => {
    const { t, userId, owner } = await setup();
    const targetId = await t.run(async (ctx) => {
      let target: Id<"testResults"> | undefined;
      for (let i = 0; i < 350; i++) {
        const resultId = await ctx.db.insert("testResults", resultRow(userId, {
          wpm: i === 125 ? 100 : 60, accuracy: i === 125 ? 100 : 99,
          createdAt: Date.now() - 1000 + i,
        }));
        if (i === 125) target = resultId;
      }
      return target!;
    });
    expect((await owner.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" })).pending).toBe(true);
    // Execute one actual scheduled continuation, leaving the next pages queued.
    vi.runOnlyPendingTimers();
    await t.finishInProgressScheduledFunctions();
    const interrupted = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(interrupted?.pending).toBe(true);
    expect(interrupted?.state.totalTests).toBe(200);
    expect(interrupted?.state.awards["speed-emerald-5"]).toBeTruthy();

    if (operation === "deletion") {
      await owner.mutation(api.testResults.deleteResult, { clerkId: "owner", resultId: targetId });
    } else {
      const tokenHash = await sha256Hex("admin-interleave");
      await t.run((ctx) => ctx.db.insert("adminSessions", { tokenHash, createdAt: Date.now(), expiresAt: Date.now() + 60000 }));
      await t.mutation(api.admin.setValidity, { token: "admin-interleave", resultId: targetId, isValid: false });
    }
    const restarted = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(restarted?.generation).toBe(interrupted!.generation + 1);
    expect(restarted?.pending).toBe(true);
    expect(restarted?.state.totalTests).toBe(100);
    // A stale page must not advance or publish the new generation.
    await t.mutation(internal.achievements.continueRebuild, { userId, generation: interrupted!.generation });
    expect(await t.run((ctx) => ctx.db.get(restarted!._id))).toEqual(restarted);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const final = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(final?.pending).toBe(false);
    expect(final?.state.totalTests).toBe(349);
    const expected = emptyAchievementState();
    const history = await t.run((ctx) => ctx.db.query("testResults").withIndex("by_user_and_date", (q) => q.eq("userId", userId)).collect());
    for (const result of history) advanceAchievementState(expected, result);
    expect(final?.state).toEqual(expected);
    const awards = await t.query(api.achievements.getUserAchievementsByUserId, { userId });
    expect(awards).toEqual(expected.awards);
    expect(awards["speed-emerald-5"]).toBeUndefined();
    expect(awards["milestone-100wpm-100acc"]).toBeUndefined();
    await t.mutation(internal.achievements.continueRebuild, { userId, generation: interrupted!.generation });
    expect(await t.query(api.achievements.getUserAchievementsByUserId, { userId })).toEqual(awards);
  });

  it("keeps normal-save database reads constant after 2,000 historical results", async () => {
    const { t, userId, owner } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 2000; i++) await ctx.db.insert("testResults", resultRow(userId, { createdAt: Date.now() - 10000 + i }));
    });
    await owner.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const resultId = await t.run((ctx) => ctx.db.insert("testResults", resultRow(userId)));
    const metrics = await t.run(async (ctx) => {
      await ctx.runMutation(internal.achievements.checkAndAwardAchievements, { userId, resultId });
      return ctx.meta.getTransactionMetrics();
    });
    expect(metrics.documentsRead.used).toBeLessThanOrEqual(8);
    expect(metrics.databaseQueries.used).toBeLessThanOrEqual(5);
    const progress = await t.run((ctx) => ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first());
    expect(progress?.state.totalTests).toBe(2001);
    expect(progress?.state.recentWpms).toHaveLength(10);
    expect(JSON.stringify(progress?.state).length).toBeLessThan(40000);
  });
});

describe("persisted achievement facts", () => {
  it("earns weekend and full weekday coverage without already owning those badges", () => {
    const state = emptyAchievementState();
    for (let i = 0; i < 10; i++) {
      const createdAt = Date.parse("2026-09-19T15:00:00Z") + i;
      advanceAchievementState(state, pureResult({ createdAt, localCalendar: calendar(createdAt) }));
    }
    expect(state.awards["special-weekend-warrior"]).toBeTruthy();
    for (let day = 20; day <= 25; day++) {
      const createdAt = Date.parse(`2026-09-${day}T15:00:00Z`);
      advanceAchievementState(state, pureResult({ createdAt, localCalendar: calendar(createdAt) }));
    }
    expect(state.awards["timebased-all-weekdays"]).toBeTruthy();
    expect(state.awards["timebased-all-weekend"]).toBeTruthy();
  });

  it("requires a qualified 100 WPM result on each of seven UTC days", () => {
    const state = emptyAchievementState();
    for (let i = 0; i < 7; i++) advanceAchievementState(state, pureResult({ wpm: i === 3 ? 90 : 100, createdAt: Date.parse("2026-09-01T15:00:00Z") + i * 86400000 }));
    expect(state.awards["milestone-week-streak-100wpm"]).toBeUndefined();
    for (let i = 7; i < 11; i++) advanceAchievementState(state, pureResult({ createdAt: Date.parse("2026-09-01T15:00:00Z") + i * 86400000 }));
    expect(state.awards["milestone-week-streak-100wpm"]).toBeTruthy();
  });

  it("supports advertised variance thresholds beyond ten tests without retaining history", () => {
    const state = emptyAchievementState();
    for (let i = 0; i < 750; i++) advanceAchievementState(state, pureResult({ createdAt: Date.now() + i, wpm: 100 }));
    expect(state.lowVarianceTests).toBe(750);
    expect(state.awards["consistency-variance-emerald-5"]).toBeTruthy();
    expect(state.recentWpms).toHaveLength(10);
  });

  it("earns Category Master from the displayed category IDs and stabilizes collection counts", () => {
    const state = emptyAchievementState();
    advanceAchievementState(state, pureResult({ wpm: 100 }));
    expect(state.awards["collection-category-complete"]).toBeTruthy();
    const count = Object.keys(state.awards).length;
    expect(count).toBe(new Set(Object.keys(state.awards)).size);
    expect(state.awards["collection-gold-1"]).toBeTruthy();
  });

  it("does not invent missing historical local facts or let unranked history satisfy speed combinations", () => {
    const state = emptyAchievementState();
    advanceAchievementState(state, pureResult({ wpm: 180, mode: "words", rankedEligible: false }));
    advanceAchievementState(state, pureResult({ wpm: 180, mode: "quote", rankedEligible: false }));
    advanceAchievementState(state, pureResult({ mode: "time", wpm: 80 }));
    expect(state.awards["milestone-all-modes-80wpm"]).toBeUndefined();
    expect(state.awards["timebased-all-weekend"]).toBeUndefined();
    expect(state.awards["special-night-owl"]).toBeUndefined();
    expect(Object.keys(state.awards).filter((id) => id.startsWith("speed-"))).not.toContain("speed-emerald-5");
  });
});
