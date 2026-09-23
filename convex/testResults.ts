import { activityCalendar } from "./lib/activityCalendar";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getStartOfDayUTC } from "./lib/utc";
import {
  isLeaderboardEligible,
  validityForUnrankedSave,
} from "./lib/leaderboardEligibility";
import { requireAuthedUser, requireIdentity } from "./lib/identity";
import { consumeRateLimit } from "./lib/consumeRateLimit";
import { RESULT_WRITE_RATE_LIMIT } from "./lib/rateLimit";

function validateUnrankedSave(args: {
  wpm: number; accuracy: number; duration: number; wordCount: number;
  wordsCorrect: number; wordsIncorrect: number; charsMissed: number; charsExtra: number;
  mode: string; difficulty: string;
}) {
  if (!["time", "words", "quote", "zen", "preset"].includes(args.mode) ||
      !["beginner", "easy", "medium", "hard", "expert"].includes(args.difficulty)) {
    throw new Error("Invalid practice settings.");
  }
  if (!Number.isFinite(args.wpm) || args.wpm < 0 ||
      !Number.isFinite(args.accuracy) || args.accuracy < 0 || args.accuracy > 100 ||
      !Number.isFinite(args.duration) || args.duration <= 0 || args.duration > 24 * 60 * 60 * 1000) {
    throw new Error("Invalid practice metrics.");
  }
  for (const count of [args.wordCount, args.wordsCorrect, args.wordsIncorrect, args.charsMissed, args.charsExtra]) {
    if (!Number.isSafeInteger(count) || count < 0 || count > 1_000_000) {
      throw new Error("Invalid practice counts.");
    }
  }
  // The browser reports floor(typed characters / 5) as wordCount and gross WPM.
  const maximumWpm = Math.round((args.wordCount + 0.8) * 60_000 / args.duration) + 1;
  if (args.wpm > maximumWpm ||
      args.wordsCorrect + args.wordsIncorrect > Math.ceil((args.wordCount * 5 + 5) / 2)) {
    throw new Error("Inconsistent practice metrics.");
  }
}

// Save an unverified result for history only, never progress or ranking.
// Ranked path is typingSessions.finalizeSession. Guests must sign in.
// Identity comes from ctx.auth; a compatibility clerkId must match that identity.
export const saveResult = mutation({
  args: {
    clerkId: v.optional(v.string()),
    wpm: v.number(),
    accuracy: v.number(),
    mode: v.string(),
    duration: v.number(),
    wordCount: v.number(),
    difficulty: v.string(),
    punctuation: v.boolean(),
    numbers: v.boolean(),
    capitalization: v.optional(v.boolean()),
    wordsCorrect: v.number(),
    wordsIncorrect: v.number(),
    charsMissed: v.number(),
    charsExtra: v.number(),
    localDate: v.string(),
    localHour: v.number(),
    isWeekend: v.boolean(),
    dayOfWeek: v.number(),
    month: v.number(),
    day: v.number(),
  },
  handler: async (ctx, args): Promise<{ resultId: Id<"testResults">; newAchievements: string[] }> => {
    const user = await requireAuthedUser(ctx, args.clerkId);
    validateUnrankedSave(args);

    await consumeRateLimit(ctx, `saveResult:${user._id}`, RESULT_WRITE_RATE_LIMIT);

    const createdAt = Date.now();
    const validity = validityForUnrankedSave(args.wpm);

    const resultId = await ctx.db.insert("testResults", {
      userId: user._id,
      wpm: args.wpm,
      accuracy: args.accuracy,
      mode: args.mode,
      duration: args.duration,
      wordCount: args.wordCount,
      difficulty: args.difficulty,
      punctuation: args.punctuation,
      numbers: args.numbers,
      capitalization: args.capitalization,
      wordsCorrect: args.wordsCorrect,
      wordsIncorrect: args.wordsIncorrect,
      charsMissed: args.charsMissed,
      charsExtra: args.charsExtra,
      isValid: validity.isValid,
      invalidReason: validity.invalidReason,
      rankedEligible: false,
      localCalendar: activityCalendar(args, createdAt),
      createdAt,
    });

    // No matching server-owned prompt exists for this fallback save. Keep it in
    // history, but never use client-reported facts for progress or aggregates.
    return { resultId, newAchievements: [] };
  },
});

// Delete a test result
export const deleteResult = mutation({
  args: {
    resultId: v.id("testResults"),
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; removedAchievements: string[] }> => {
    const user = await requireAuthedUser(ctx, args.clerkId);

    // Get the test result
    const result = await ctx.db.get(args.resultId);

    if (!result) {
      throw new Error("Test result not found.");
    }

    // Verify ownership
    if (result.userId !== user._id) {
      throw new Error("You can only delete your own test results.");
    }

    // Check if this was the user's best WPM (for cache recalculation)
    const cachedStats = await ctx.db
      .query("userStatsCache")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const wasBestWpm = cachedStats ? result.wpm === cachedStats.bestWpm : false;

    // Delete the result
    await ctx.db.delete(args.resultId);

    // Recheck achievements and remove any that user no longer qualifies for
    const { removedAchievements } = await ctx.runMutation(
      internal.achievements.recheckAchievementsAfterDeletion,
      { userId: user._id }
    );

    // Update user stats cache
    await ctx.runMutation(internal.statsCache.decrementUserStatsCache, {
      userId: user._id,
      wpm: result.wpm,
      accuracy: result.accuracy,
      duration: result.duration,
      wordCount: result.wordCount,
      wasValid: result.isValid !== false && result.rankedEligible !== false,
      wasBestWpm,
    });

    return { success: true, removedAchievements };
  },
});

// Get user's test results (most recent first)
export const getUserResults = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireIdentity(ctx, args.clerkId);
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const limit = args.limit ?? 50;

    // Get results ordered by creation date (descending)
    const results = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return results;
  },
});

// Get aggregated stats for a user
// Uses userStatsCache for aggregates (efficient), fetches results only for history
// Note: Aggregates only use valid results
// History shows all results with isValid flag for UI distinction
export const getUserStats = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireIdentity(ctx, args.clerkId);
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Try to get cached stats first (single row read)
    const cachedStats = await ctx.db
      .query("userStatsCache")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Get recent results for history display (limited to avoid excessive reads)
    // We still need this for the allResults field
    const recentResults = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100); // Limit history to last 100 results

    if (!cachedStats) {
      // No cache yet - return empty stats with whatever results exist
      return {
        totalTests: 0,
        averageWpm: 0,
        bestWpm: 0,
        averageAccuracy: 0,
        totalTimeTyped: 0,
        totalWordsTyped: 0,
        totalCharactersTyped: 0,
        allResults: recentResults,
      };
    }

    // Calculate derived stats from cache
    const totalTests = cachedStats.totalTests;
    const averageWpm = totalTests > 0 ? Math.round(cachedStats.totalWpm / totalTests) : 0;
    const bestWpm = cachedStats.bestWpm;
    const averageAccuracy = totalTests > 0 ? Math.round((cachedStats.totalAccuracy / totalTests) * 10) / 10 : 0;
    const totalTimeTyped = cachedStats.totalTimeTyped;
    const totalWordsTyped = cachedStats.totalWordsTyped;
    const totalCharactersTyped = totalWordsTyped * 5;

    return {
      totalTests,
      averageWpm,
      bestWpm,
      averageAccuracy,
      totalTimeTyped,
      totalWordsTyped,
      totalCharactersTyped,
      allResults: recentResults,
    };
  },
});

// Get aggregated stats for a user by Convex user ID (for public profile pages)
// Uses userStatsCache for aggregates (efficient), fetches results only for history
// Note: Aggregates only use valid results
// History shows all results with isValid flag for UI distinction
export const getUserStatsByUserId = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Try to get cached stats first (single row read)
    const cachedStats = await ctx.db
      .query("userStatsCache")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Get recent results for history display (limited to avoid excessive reads)
    const recentResults = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100); // Limit history to last 100 results
    const publicResults = recentResults.map((result) => ({
      _id: result._id,
      wpm: result.wpm,
      accuracy: result.accuracy,
      mode: result.mode,
      duration: result.duration,
      wordCount: result.wordCount,
      difficulty: result.difficulty,
      punctuation: result.punctuation,
      numbers: result.numbers,
      capitalization: result.capitalization,
      wordsCorrect: result.wordsCorrect,
      wordsIncorrect: result.wordsIncorrect,
      charsMissed: result.charsMissed,
      charsExtra: result.charsExtra,
      isValid: result.isValid,
      invalidReason: result.invalidReason,
      verification: result.isValid === false ? "invalid" as const : result.rankedEligible === false ? "unverified" as const : "verified" as const,
      createdAt: result.createdAt,
    }));

    if (!cachedStats) {
      // No cache yet - return empty stats with whatever results exist
      return {
        totalTests: 0,
        averageWpm: 0,
        bestWpm: 0,
        averageAccuracy: 0,
        totalTimeTyped: 0,
        totalWordsTyped: 0,
        totalCharactersTyped: 0,
        allResults: publicResults,
      };
    }

    // Calculate derived stats from cache
    const totalTests = cachedStats.totalTests;
    const averageWpm = totalTests > 0 ? Math.round(cachedStats.totalWpm / totalTests) : 0;
    const bestWpm = cachedStats.bestWpm;
    const averageAccuracy = totalTests > 0 ? Math.round((cachedStats.totalAccuracy / totalTests) * 10) / 10 : 0;
    const totalTimeTyped = cachedStats.totalTimeTyped;
    const totalWordsTyped = cachedStats.totalWordsTyped;
    const totalCharactersTyped = totalWordsTyped * 5;

    return {
      totalTests,
      averageWpm,
      bestWpm,
      averageAccuracy,
      totalTimeTyped,
      totalWordsTyped,
      totalCharactersTyped,
      allResults: publicResults,
    };
  },
});

// Get leaderboard data for top WPM scores
// Computes directly from the descending result score index.
// Convex reactively caches this — reads only re-run when data changes.
export const getLeaderboard = query({
  args: {
    timeRange: v.union(
      v.literal("all-time"),
      v.literal("week"),
      v.literal("today")
    ),
    limit: v.optional(v.number()),
    periodStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 20), 100));

    let timeCutoff = 0;
    if (args.timeRange === "today") {
      timeCutoff = Math.max(getStartOfDayUTC(0), args.periodStart ?? 0);
    } else if (args.timeRange === "week") {
      timeCutoff = Math.max(getStartOfDayUTC(0), args.periodStart ?? 0) - 7 * 86_400_000;
    }

    const leaderboard: Array<{
      userId: Id<"users">; username: string; avatarUrl: string | null;
      wpm: number; createdAt: number;
    }> = [];
    if (args.timeRange === "all-time") {
      const seen = new Set<string>();
      for await (const result of ctx.db.query("testResults").withIndex("by_wpm").order("desc")) {
        if (result.wpm <= 0 || seen.has(result.userId) || !isLeaderboardEligible(result)) continue;
        const user = await ctx.db.get(result.userId);
        if (!user) continue;
        seen.add(user._id);
        leaderboard.push({ userId: user._id, username: user.username, avatarUrl: user.avatarUrl ?? null, wpm: result.wpm, createdAt: result.createdAt });
        if (leaderboard.length >= limit) break;
      }
    } else {
      // The date index avoids walking older scores on a quiet day/week.
      const bestByUser = new Map<Id<"users">, { wpm: number; createdAt: number }>();
      for await (const result of ctx.db.query("testResults")
        .withIndex("by_created_at", (q) => q.gte("createdAt", timeCutoff).lt("createdAt", getStartOfDayUTC(0) + 86_400_000))) {
        if (result.wpm <= 0 || !isLeaderboardEligible(result)) continue;
        const previous = bestByUser.get(result.userId);
        if (!previous || result.wpm > previous.wpm ||
            (result.wpm === previous.wpm && result.createdAt > previous.createdAt)) {
          bestByUser.set(result.userId, { wpm: result.wpm, createdAt: result.createdAt });
        }
      }
      const ranked = [...bestByUser.entries()].sort((a, b) => b[1].wpm - a[1].wpm || b[1].createdAt - a[1].createdAt);
      for (const [userId, score] of ranked) {
        const user = await ctx.db.get(userId);
        if (!user) continue;
        leaderboard.push({ userId, username: user.username, avatarUrl: user.avatarUrl ?? null, ...score });
        if (leaderboard.length >= limit) break;
      }
    }

    return leaderboard.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
  },
});
