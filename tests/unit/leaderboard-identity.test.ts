import { describe, expect, it, vi } from "vitest";
import { getLeaderboard } from "../../convex/testResults";
import { getUserById } from "../../convex/users";
import type { Id } from "../../convex/_generated/dataModel";
import { multiplayerDb } from "./fixtures/multiplayer-db";

const firstId = "users:first" as Id<"users">;
const secondId = "users:second" as Id<"users">;

function fixture() {
  return multiplayerDb({
    users: [
      { _id: firstId, clerkId: "clerk-first", username: "Same username", avatarUrl: "/first.png" },
      { _id: secondId, clerkId: "clerk-second", username: "Same username" },
    ],
    testResults: [
      { _id: "testResults:first", userId: firstId, wpm: 140, accuracy: 99, duration: 30000, isValid: true, rankedEligible: true, createdAt: 100 },
      { _id: "testResults:second", userId: secondId, wpm: 160, accuracy: 99, duration: 30000, isValid: true, rankedEligible: true, createdAt: 200 },
      { _id: "testResults:invalid", userId: firstId, wpm: 190, accuracy: 50, duration: 30000, isValid: false, rankedEligible: true, createdAt: 300 },
    ],
  });
}

describe("public leaderboard identity (isolated handlers)", () => {
  it("returns the matching Convex user ID for each ranked score despite duplicate usernames", async () => {
    const db = fixture();
    expect(await getLeaderboard._handler(db.ctx, { timeRange: "all-time", limit: 50 })).toEqual([
      { rank: 1, userId: secondId, username: "Same username", avatarUrl: null, wpm: 160, createdAt: 200 },
      { rank: 2, userId: firstId, username: "Same username", avatarUrl: "/first.png", wpm: 140, createdAt: 100 },
    ]);
  });

  it("keeps the public destination stable through a username rename and needs no viewer identity", async () => {
    const db = fixture();
    const ctx = { ...db.ctx, auth: { getUserIdentity: vi.fn(async () => null) } };
    const [before] = await getLeaderboard._handler(ctx, { timeRange: "all-time", limit: 1 });
    await db.ctx.db.patch(secondId, { username: "Renamed typist" });
    const [after] = await getLeaderboard._handler(ctx, { timeRange: "all-time", limit: 1 });
    expect(after).toEqual({ ...before, username: "Renamed typist" });
    expect(await getUserById._handler(ctx, { userId: after.userId })).toMatchObject({
      _id: secondId, clerkId: "clerk-second", username: "Renamed typist",
    });
    expect(after.userId).not.toBe("clerk-second");
    expect(ctx.auth.getUserIdentity).not.toHaveBeenCalled();
  });
});
