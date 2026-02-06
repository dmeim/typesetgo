import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const TIMEZONE = "America/New_York";

// Helper to get timezone offset in milliseconds (positive = timezone behind UTC)
function getTimezoneOffset(date: Date): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: TIMEZONE }));
  return utcDate.getTime() - tzDate.getTime();
}

// Get start of day (midnight) in ET, optionally daysAgo
function getStartOfDayET(daysAgo: number = 0): number {
  const now = new Date();

  // Get today's date in ET
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")!.value);
  const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1;
  const day = parseInt(parts.find((p) => p.type === "day")!.value) - daysAgo;

  // Midnight UTC for the target date
  const midnightUTC = Date.UTC(year, month, day, 0, 0, 0, 0);

  // Get timezone offset at that time
  const offset = getTimezoneOffset(new Date(midnightUTC));

  // Midnight in ET as UTC timestamp
  return midnightUTC + offset;
}

// Save a test result
export const saveResult = mutation({
  args: {
    clerkId: v.string(),
    wpm: v.number(),
    accuracy: v.number(),
    mode: v.string(),
    duration: v.number(),
    wordCount: v.number(),
    difficulty: v.string(),
    punctuation: v.boolean(),
    numbers: v.boolean(),
    capitalization: v.optional(v.boolean()),
    // Additional stats
    wordsCorrect: v.number(),
    wordsIncorrect: v.number(),
    charsMissed: v.number(),
    charsExtra: v.number(),
    // For streak and achievement tracking
    localDate: v.string(), // "YYYY-MM-DD" in user's local time
    localHour: v.number(), // 0-23, user's local hour
    isWeekend: v.boolean(), // Whether it's Saturday or Sunday
    // New time-based fields for achievements
    dayOfWeek: v.number(), // 0-6 (Sunday-Saturday)
    month: v.number(), // 0-11
    day: v.number(), // 1-31
  },
  handler: async (ctx, args): Promise<{ resultId: Id<"testResults">; newAchievements: string[] }> => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found. Please sign in first.");
    }

    const createdAt = Date.now();

    // Insert the test result
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
      createdAt,
    });

    // Update streak (runs in same transaction)
    await ctx.runMutation(internal.streaks.updateStreak, {
      userId: user._id,
      localDate: args.localDate,
      duration: args.duration,
      wordsCorrect: args.wordsCorrect,
    });

    // Check and award achievements (runs in same transaction)
    const achievementResult: { newAchievements: string[]; totalAchievements: number } = await ctx.runMutation(
      internal.achievements.checkAndAwardAchievements,
      {
        userId: user._id,
        testResult: {
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
          createdAt,
        },
        localHour: args.localHour,
        isWeekend: args.isWeekend,
        dayOfWeek: args.dayOfWeek,
        month: args.month,
        day: args.day,
      }
    );

    // Update user stats cache (always, for valid results)
    await ctx.runMutation(internal.statsCache.updateUserStatsCache, {
      userId: user._id,
      wpm: args.wpm,
      accuracy: args.accuracy,
      duration: args.duration,
      wordCount: args.wordCount,
      isValid: true, // New results are valid by default
    });

    // Update leaderboard cache (only if accuracy >= 90%)
    if (args.accuracy >= 90) {
      await ctx.runMutation(internal.statsCache.updateLeaderboardCache, {
        userId: user._id,
        wpm: args.wpm,
        createdAt,
        username: user.username,
        avatarUrl: user.avatarUrl,
      });
    }

    return {
      resultId,
      newAchievements: achievementResult.newAchievements,
    };
  },
});

// Delete a test result
export const deleteResult = mutation({
  args: {
    resultId: v.id("testResults"),
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; removedAchievements: string[] }> => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found. Please sign in first.");
    }

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
      wasValid: result.isValid !== false,
      wasBestWpm,
    });

    // Update leaderboard cache if the deleted result was eligible
    await ctx.runMutation(internal.statsCache.updateLeaderboardCacheAfterDeletion, {
      userId: user._id,
      deletedWpm: result.wpm,
      deletedAccuracy: result.accuracy,
      deletedCreatedAt: result.createdAt,
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

// Get leaderboard data for top WPM scores
// Computes directly from testResults using per-user index reads.
// Convex reactively caches this — reads only re-run when data changes.
export const getLeaderboard = query({
  args: {
    timeRange: v.union(
      v.literal("all-time"),
      v.literal("week"),
      v.literal("today")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let timeCutoff = 0;
    if (args.timeRange === "today") {
      timeCutoff = getStartOfDayET(0);
    } else if (args.timeRange === "week") {
      timeCutoff = getStartOfDayET(7);
    }

    const users = await ctx.db.query("users").collect();
    const leaderboard: Array<{
      username: string;
      avatarUrl: string | null;
      wpm: number;
      createdAt: number;
    }> = [];

    for (const user of users) {
      // For week/today, use date index to skip old results
      const results =
        args.timeRange !== "all-time"
          ? await ctx.db
              .query("testResults")
              .withIndex("by_user_and_date", (q) =>
                q.eq("userId", user._id).gte("createdAt", timeCutoff)
              )
              .collect()
          : await ctx.db
              .query("testResults")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .collect();

      // Find best eligible result (accuracy >= 90%, valid)
      let bestWpm = 0;
      let bestCreatedAt = 0;
      for (const r of results) {
        if (r.accuracy >= 90 && r.isValid !== false && r.wpm > bestWpm) {
          bestWpm = r.wpm;
          bestCreatedAt = r.createdAt;
        }
      }

      if (bestWpm > 0) {
        leaderboard.push({
          username: user.username,
          avatarUrl: user.avatarUrl ?? null,
          wpm: bestWpm,
          createdAt: bestCreatedAt,
        });
      }
    }

    leaderboard.sort((a, b) => b.wpm - a.wpm);

    return leaderboard.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
  },
});
