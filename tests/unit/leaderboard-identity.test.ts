// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { backendContract, resultRow, userRow } from "./fixtures/backend-contract";

afterEach(() => vi.useRealTimers());

async function fixture() {
  const t = backendContract();
  const ids = await t.run(async (ctx) => {
    const first = await ctx.db.insert("users", { ...userRow("first"), avatarUrl: "/first.png" });
    const second = await ctx.db.insert("users", userRow("second"));
    await ctx.db.insert("testResults", resultRow(first, { wpm: 140, createdAt: 100 }));
    await ctx.db.insert("testResults", resultRow(second, { wpm: 160, createdAt: 200 }));
    await ctx.db.insert("testResults", resultRow(first, { wpm: 190, isValid: false, createdAt: 300 }));
    return { first, second };
  });
  return { t, ...ids };
}

describe("public leaderboard contract", () => {
  it("ranks distinct account IDs with duplicate usernames and rejects invalid scores", async () => {
    const { t, first, second } = await fixture();
    expect(await t.query(api.testResults.getLeaderboard, { timeRange: "all-time", limit: 50 })).toEqual([
      { rank: 1, userId: second, username: "Same username", avatarUrl: null, wpm: 160, createdAt: 200 },
      { rank: 2, userId: first, username: "Same username", avatarUrl: "/first.png", wpm: 140, createdAt: 100 },
    ]);
  });

  it("immediately reflects identity changes and returns only public profile fields", async () => {
    const { t, second } = await fixture();
    await t.withIdentity({ subject: "second" }).mutation(api.users.updateProfile, { clerkId: "second", username: "Renamed" });
    const [entry] = await t.query(api.testResults.getLeaderboard, { timeRange: "all-time", limit: 1 });
    expect(entry.userId).toBe(second);
    expect(entry.username).toBe("Renamed");
    expect(await t.query(api.users.getUserById, { userId: second })).toEqual({ _id: second, username: "Renamed", createdAt: 1 });
    expect(await t.run((ctx) => ctx.db.query("leaderboardCache").collect())).toEqual([]);
  });

  it("finds a lower replacement after UTC rollover and deletion; never ranks unranked saves", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T00:01:00Z"));
    const { t, first } = await fixture();
    const currentId = await t.run(async (ctx) => {
      await ctx.db.insert("testResults", resultRow(first, { wpm: 180, createdAt: Date.parse("2026-09-21T23:59:00Z") }));
      await ctx.db.insert("testResults", resultRow(first, { wpm: 250, rankedEligible: false }));
      return ctx.db.insert("testResults", resultRow(first, { wpm: 130 }));
    });
    expect((await t.query(api.testResults.getLeaderboard, { timeRange: "today" }))[0].wpm).toBe(130);
    await t.withIdentity({ subject: "first" }).mutation(api.testResults.deleteResult, { clerkId: "first", resultId: currentId });
    expect(await t.query(api.testResults.getLeaderboard, { timeRange: "today" })).toEqual([]);
    expect((await t.query(api.testResults.getLeaderboard, { timeRange: "week" }))[0].wpm).toBe(180);
  });
});
