// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { backendContract, userRow } from "./fixtures/backend-contract";
import { getLocalCalendarFields } from "../../src/lib/activity-calendar";
import { activityCalendar } from "../../convex/lib/activityCalendar";
import { getUserIdsBatch } from "../../convex/migrations";
import type { QueryCtx } from "../../convex/_generated/server";

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("activity-aware typing session retention", () => {
  it("keeps recent activity, long timed deadlines and idle prepared sessions, then expires abandoned sessions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T15:00:00Z"));
    const t = backendContract();
    const now = Date.now();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    const ids = await t.run(async (ctx) => {
      const base = {
        userId, settings: { mode: "time", duration: 60, difficulty: "easy", punctuation: false, numbers: false },
        targetText: "test", createdAt: now - 3600000, lastEventAt: now - 3600000,
        eventCount: 0, lastTypedLength: 0, maxCharsPerSecond: 0, maxBurstChars: 0,
      };
      return {
        prepared: await ctx.db.insert("typingSessions", base),
        active: await ctx.db.insert("typingSessions", { ...base, startedAt: now - 3600000, lastEventAt: now - 1000 }),
        long: await ctx.db.insert("typingSessions", { ...base, startedAt: now - 3600000, settings: { ...base.settings, duration: 25199 } }),
        abandoned: await ctx.db.insert("typingSessions", { ...base, startedAt: now - 3600000 }),
        stalePrepared: await ctx.db.insert("typingSessions", { ...base, createdAt: now - 25 * 3600000 }),
        staleWords: await ctx.db.insert("typingSessions", { ...base, startedAt: now - 3600000, settings: { ...base.settings, mode: "words", duration: undefined } }),
      };
    });
    expect(await t.mutation(internal.sessionCleanup.cleanupExpiredSessions, {})).toEqual({ deleted: 3 });
    for (const id of [ids.prepared, ids.active, ids.long]) expect(await t.run((ctx) => ctx.db.get(id))).not.toBeNull();
    for (const id of [ids.abandoned, ids.stalePrepared, ids.staleWords]) expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
    // A prepared session starts from its first progress, not the old preparation timestamp.
    await t.withIdentity({ subject: "owner" }).mutation(api.typingSessions.recordProgress, { sessionId: ids.prepared, typedLength: 1 });
    expect((await t.run((ctx) => ctx.db.get(ids.prepared)))?.startedAt).toBe(now);
  });

  it("authenticates progress/finalization and rejects malformed IDs through registered validators", async () => {
    const t = backendContract();
    await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    await t.run((ctx) => ctx.db.insert("users", userRow("other")));
    const owner = t.withIdentity({ subject: "owner" });
    const session = await owner.mutation(api.typingSessions.startSession, { mode: "words", difficulty: "easy", wordTarget: 25 });
    await expect(t.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: 2 })).resolves.toEqual({ success: false });
    await expect(t.withIdentity({ subject: "other" }).mutation(api.typingSessions.finalizeSession, { sessionId: session.sessionId, typedText: "x", clientElapsedMs: 1, ...getLocalCalendarFields() })).rejects.toThrow(/belong/);
    // @ts-expect-error Deliberate invalid ID tests registration validators.
    await expect(owner.mutation(api.typingSessions.recordProgress, { sessionId: "invalid-id", typedLength: 2 })).rejects.toThrow();
  });
});

describe("calendar policy and native migration pagination", () => {
  it("uses coherent local dates across UTC midnight and DST", () => {
    vi.stubEnv("TZ", "America/New_York");
    const evening = Date.parse("2026-09-22T02:00:00Z");
    expect(getLocalCalendarFields(evening)).toMatchObject({ localDate: "2026-09-21", localHour: 22, dayOfWeek: 1, month: 8, day: 21 });
    expect(getLocalCalendarFields(Date.parse("2026-03-08T06:30:00Z"))).toMatchObject({ localDate: "2026-03-08", localHour: 1 });
    expect(getLocalCalendarFields(Date.parse("2026-03-08T07:30:00Z"))).toMatchObject({ localDate: "2026-03-08", localHour: 3 });
    expect(() => activityCalendar({ ...getLocalCalendarFields(evening), localDate: "2026-09-22" }, evening)).toThrow(/calendar/);
  });

  it("buckets daily activity in server UTC even when the local calendar is yesterday", async () => {
    vi.useFakeTimers();
    vi.stubEnv("TZ", "America/New_York");
    vi.setSystemTime(new Date("2026-09-22T02:00:00Z"));
    const t = backendContract();
    await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    const owner = t.withIdentity({ subject: "owner" });
    await owner.mutation(api.testResults.saveResult, {
      wpm: 100, accuracy: 100, mode: "time", duration: 30000, wordCount: 50,
      difficulty: "easy", punctuation: false, numbers: false, wordsCorrect: 50,
      wordsIncorrect: 0, charsMissed: 0, charsExtra: 0, ...getLocalCalendarFields(),
    });
    expect(await owner.query(api.streaks.getUserStreak, { clerkId: "owner" })).toMatchObject({ currentStreak: 0, lastActivityDate: null });
  });

  it("does not interpret out-of-order IDs as the cursor", async () => {
    const ids = ["users:z", "users:a", "users:m", "users:b", "users:y"];
    const paginate = vi.fn(async ({ cursor, numItems }: { cursor: string | null; numItems: number }) => {
      const offset = cursor === null ? 0 : Number(cursor.slice("native-offset:".length));
      const next = Math.min(offset + numItems, ids.length);
      return { page: ids.slice(offset, next).map((_id) => ({ _id })), isDone: next === ids.length, continueCursor: `native-offset:${next}` };
    });
    // Supplements the registered contract test with deliberately nonlexicographic IDs;
    // convex-test itself generates sequential IDs, unlike the real backend.
    const ctx = { db: { query: () => ({ paginate }) } } as unknown as QueryCtx;
    const first = await getUserIdsBatch._handler(ctx, { batchSize: 2 });
    const second = await getUserIdsBatch._handler(ctx, { batchSize: 2, cursor: first.nextCursor! });
    const third = await getUserIdsBatch._handler(ctx, { batchSize: 2, cursor: second.nextCursor! });
    expect([...first.userIds, ...second.userIds, ...third.userIds]).toEqual(ids);
    expect(third.nextCursor).toBeNull();
    expect(paginate.mock.calls[1][0].cursor).toBe("native-offset:2");
  });

  it("paginates each user once using native opaque cursors despite ID ordering", async () => {
    const t = backendContract();
    const expected = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 23; i++) ids.push(await ctx.db.insert("users", userRow(`owner-${i}`)));
      return ids;
    });
    const visited: string[] = [];
    let cursor: string | undefined;
    do {
      const batch = await t.query(internal.migrations.getUserIdsBatch, { cursor, batchSize: 4 });
      visited.push(...batch.userIds);
      cursor = batch.nextCursor ?? undefined;
      if (cursor) expect(expected).not.toContain(cursor);
    } while (cursor);
    expect(new Set(visited).size).toBe(23);
    expect(visited).toEqual(expected);
  });
});
