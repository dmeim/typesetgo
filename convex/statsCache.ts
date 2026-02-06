import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal mutation to update a user's stats cache after a new test result.
 * Called from testResults.saveResult.
 */
export const updateUserStatsCache = internalMutation({
  args: {
    userId: v.id("users"),
    wpm: v.number(),
    accuracy: v.number(),
    duration: v.number(),
    wordCount: v.number(),
    isValid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Only count valid results in the cache
    // isValid !== false means valid (includes undefined for legacy data)
    if (args.isValid === false) {
      return null;
    }

    const now = Date.now();

    // Get existing cache row for user
    const existingCache = await ctx.db
      .query("userStatsCache")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingCache) {
      // Create new cache entry
      await ctx.db.insert("userStatsCache", {
        userId: args.userId,
        totalTests: 1,
        totalWpm: args.wpm,
        bestWpm: args.wpm,
        totalAccuracy: args.accuracy,
        totalTimeTyped: args.duration,
        totalWordsTyped: args.wordCount,
        updatedAt: now,
      });
      return { created: true };
    }

    // Update existing cache
    await ctx.db.patch(existingCache._id, {
      totalTests: existingCache.totalTests + 1,
      totalWpm: existingCache.totalWpm + args.wpm,
      bestWpm: Math.max(existingCache.bestWpm, args.wpm),
      totalAccuracy: existingCache.totalAccuracy + args.accuracy,
      totalTimeTyped: existingCache.totalTimeTyped + args.duration,
      totalWordsTyped: existingCache.totalWordsTyped + args.wordCount,
      updatedAt: now,
    });

    return { updated: true };
  },
});

/**
 * Internal mutation to update the leaderboard cache after a new test result.
 * Only called if accuracy >= 90% (leaderboard requirement).
 * Called from testResults.saveResult.
 */
export const updateLeaderboardCache = internalMutation({
  args: {
    userId: v.id("users"),
    wpm: v.number(),
    createdAt: v.number(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeRanges = ["all-time", "week", "today"] as const;

    for (const timeRange of timeRanges) {
      const existing = await ctx.db
        .query("leaderboardCache")
        .withIndex("by_user_time_range", (q) =>
          q.eq("userId", args.userId).eq("timeRange", timeRange)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("leaderboardCache", {
          userId: args.userId,
          timeRange,
          bestWpm: args.wpm,
          bestWpmAt: args.createdAt,
          username: args.username,
          avatarUrl: args.avatarUrl,
          updatedAt: now,
        });
      } else if (args.wpm > existing.bestWpm) {
        await ctx.db.patch(existing._id, {
          bestWpm: args.wpm,
          bestWpmAt: args.createdAt,
          username: args.username,
          avatarUrl: args.avatarUrl,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Internal mutation to decrement user stats cache after deleting a result.
 * If the deleted result was the user's best WPM, we need to recalculate.
 */
export const decrementUserStatsCache = internalMutation({
  args: {
    userId: v.id("users"),
    wpm: v.number(),
    accuracy: v.number(),
    duration: v.number(),
    wordCount: v.number(),
    wasValid: v.boolean(),
    wasBestWpm: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Only affect cache if the deleted result was valid
    if (!args.wasValid) {
      return null;
    }

    const existingCache = await ctx.db
      .query("userStatsCache")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingCache) {
      return null;
    }

    const now = Date.now();
    const newTotalTests = Math.max(0, existingCache.totalTests - 1);

    if (newTotalTests === 0) {
      // No more tests - delete cache entry
      await ctx.db.delete(existingCache._id);
      return { deleted: true };
    }

    if (args.wasBestWpm) {
      // Need to recalculate best WPM from remaining results
      const allResults = await ctx.db
        .query("testResults")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      const validResults = allResults.filter((r) => r.isValid !== false);
      const newBestWpm =
        validResults.length > 0
          ? Math.max(...validResults.map((r) => r.wpm))
          : 0;

      await ctx.db.patch(existingCache._id, {
        totalTests: newTotalTests,
        totalWpm: Math.max(0, existingCache.totalWpm - args.wpm),
        bestWpm: newBestWpm,
        totalAccuracy: Math.max(0, existingCache.totalAccuracy - args.accuracy),
        totalTimeTyped: Math.max(0, existingCache.totalTimeTyped - args.duration),
        totalWordsTyped: Math.max(0, existingCache.totalWordsTyped - args.wordCount),
        updatedAt: now,
      });
    } else {
      // Simple decrement
      await ctx.db.patch(existingCache._id, {
        totalTests: newTotalTests,
        totalWpm: Math.max(0, existingCache.totalWpm - args.wpm),
        totalAccuracy: Math.max(0, existingCache.totalAccuracy - args.accuracy),
        totalTimeTyped: Math.max(0, existingCache.totalTimeTyped - args.duration),
        totalWordsTyped: Math.max(0, existingCache.totalWordsTyped - args.wordCount),
        updatedAt: now,
      });
    }

    return { updated: true };
  },
});

/**
 * Internal mutation to update leaderboard cache after deleting a result.
 * Only needed if the deleted result was on the leaderboard (accuracy >= 90%).
 */
export const updateLeaderboardCacheAfterDeletion = internalMutation({
  args: {
    userId: v.id("users"),
    deletedWpm: v.number(),
    deletedAccuracy: v.number(),
    deletedCreatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.deletedAccuracy < 90) {
      return null;
    }

    const now = Date.now();
    const timeRanges = ["all-time", "week", "today"] as const;
    const user = await ctx.db.get(args.userId);

    for (const timeRange of timeRanges) {
      const existing = await ctx.db
        .query("leaderboardCache")
        .withIndex("by_user_time_range", (q) =>
          q.eq("userId", args.userId).eq("timeRange", timeRange)
        )
        .first();

      if (!existing) continue;

      // Only recalculate if the deleted result was this entry's best
      if (
        existing.bestWpm === args.deletedWpm &&
        existing.bestWpmAt === args.deletedCreatedAt
      ) {
        let timeCutoff = 0;
        if (timeRange === "today") timeCutoff = getStartOfDayET(0);
        else if (timeRange === "week") timeCutoff = getStartOfDayET(7);

        const results = await ctx.db
          .query("testResults")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .collect();

        const eligible = results.filter(
          (r) =>
            r.accuracy >= 90 &&
            r.isValid !== false &&
            (timeRange === "all-time" || r.createdAt >= timeCutoff)
        );

        if (eligible.length === 0) {
          await ctx.db.delete(existing._id);
        } else {
          const best = eligible.reduce((a, b) => (a.wpm > b.wpm ? a : b));
          await ctx.db.patch(existing._id, {
            bestWpm: best.wpm,
            bestWpmAt: best.createdAt,
            username: user?.username ?? existing.username,
            avatarUrl: user?.avatarUrl ?? existing.avatarUrl,
            updatedAt: now,
          });
        }
      }
    }
  },
});

/**
 * Rebuild user stats cache for a single user.
 * Used during migration to backfill cache from existing data.
 */
export const rebuildUserStatsCacheForUser = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Delete existing cache entry if any
    const existingCache = await ctx.db
      .query("userStatsCache")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingCache) {
      await ctx.db.delete(existingCache._id);
    }

    // Get all results for this user
    const allResults = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter to valid results only
    const validResults = allResults.filter((r) => r.isValid !== false);

    if (validResults.length === 0) {
      return { skipped: true, reason: "no valid results" };
    }

    // Calculate aggregates
    const totalTests = validResults.length;
    const totalWpm = validResults.reduce((sum, r) => sum + r.wpm, 0);
    const bestWpm = Math.max(...validResults.map((r) => r.wpm));
    const totalAccuracy = validResults.reduce((sum, r) => sum + r.accuracy, 0);
    const totalTimeTyped = validResults.reduce((sum, r) => sum + r.duration, 0);
    const totalWordsTyped = validResults.reduce(
      (sum, r) => sum + r.wordCount,
      0
    );

    // Insert new cache entry
    await ctx.db.insert("userStatsCache", {
      userId: args.userId,
      totalTests,
      totalWpm,
      bestWpm,
      totalAccuracy,
      totalTimeTyped,
      totalWordsTyped,
      updatedAt: now,
    });

    return { created: true, totalTests };
  },
});

/**
 * Rebuild leaderboard cache for a single user.
 * Used during migration to backfill cache from existing data.
 */
export const rebuildLeaderboardCacheForUser = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeRanges = ["all-time", "week", "today"] as const;

    // Get user for username/avatar
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { skipped: true, reason: "user not found" };
    }

    // Delete ALL existing cache entries for this user (including duplicates)
    for (const timeRange of timeRanges) {
      const existingEntries = await ctx.db
        .query("leaderboardCache")
        .withIndex("by_user_time_range", (q) =>
          q.eq("userId", args.userId).eq("timeRange", timeRange)
        )
        .collect();

      for (const entry of existingEntries) {
        await ctx.db.delete(entry._id);
      }
    }

    // Get all results for this user
    const allResults = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const created: string[] = [];

    for (const timeRange of timeRanges) {
      // Filter by time range and accuracy
      let timeCutoff = 0;
      if (timeRange === "today") {
        timeCutoff = getStartOfDayET(0);
      } else if (timeRange === "week") {
        timeCutoff = getStartOfDayET(7);
      }

      const eligibleResults = allResults.filter((r) => {
        const meetsAccuracy = r.accuracy >= 90;
        const meetsTimeRange = timeRange === "all-time" || r.createdAt >= timeCutoff;
        const isValid = r.isValid !== false;
        return meetsAccuracy && meetsTimeRange && isValid;
      });

      if (eligibleResults.length === 0) {
        continue;
      }

      // Find best result
      const best = eligibleResults.reduce((a, b) => (a.wpm > b.wpm ? a : b));

      // Create cache entry
      await ctx.db.insert("leaderboardCache", {
        userId: args.userId,
        timeRange,
        bestWpm: best.wpm,
        bestWpmAt: best.createdAt,
        username: user.username,
        avatarUrl: user.avatarUrl,
        updatedAt: now,
      });

      created.push(timeRange);
    }

    return { created };
  },
});

/**
 * Query to get cached user stats (for internal use).
 */
export const getCachedUserStats = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userStatsCache")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Scheduled job to clean up stale leaderboard cache entries.
 * Deletes "today" and "week" entries whose best score aged out of the window.
 * Run daily at 5 AM ET via cron.
 * Note: The query computes directly from testResults, so this is just cleanup.
 */
export const pruneStaleLeaderboardEntries = internalMutation({
  args: {},
  handler: async (ctx) => {
    const todayCutoff = getStartOfDayET(0);
    const weekCutoff = getStartOfDayET(7);
    let deletedToday = 0;
    let deletedWeek = 0;

    const todayEntries = await ctx.db
      .query("leaderboardCache")
      .withIndex("by_time_range_wpm", (q) => q.eq("timeRange", "today"))
      .collect();

    for (const entry of todayEntries) {
      if (entry.bestWpmAt < todayCutoff) {
        await ctx.db.delete(entry._id);
        deletedToday++;
      }
    }

    const weekEntries = await ctx.db
      .query("leaderboardCache")
      .withIndex("by_time_range_wpm", (q) => q.eq("timeRange", "week"))
      .collect();

    for (const entry of weekEntries) {
      if (entry.bestWpmAt < weekCutoff) {
        await ctx.db.delete(entry._id);
        deletedWeek++;
      }
    }

    return { deletedToday, deletedWeek };
  },
});

/**
 * Diagnostic query to inspect the state of the leaderboard cache.
 * Run from the Convex dashboard to debug leaderboard issues.
 *
 * Reports:
 * - Total cache entries per time range
 * - Duplicate entries per time range
 * - Top 10 entries per time range (for comparison)
 * - Users where all-time best == week best (potential data issue)
 * - Test results age distribution (how many are >7 days old with acc >= 90%)
 */
export const diagnoseLeaderboard = internalQuery({
  args: {},
  handler: async (ctx) => {
    const timeRanges = ["all-time", "week", "today"] as const;
    const weekCutoff = getStartOfDayET(7);
    const todayCutoff = getStartOfDayET(0);

    // 1. Count cache entries per time range and check for duplicates
    const cacheStats: Record<string, { total: number; duplicateUsers: number }> = {};
    for (const timeRange of timeRanges) {
      const entries = await ctx.db
        .query("leaderboardCache")
        .withIndex("by_time_range_wpm", (q) => q.eq("timeRange", timeRange))
        .collect();

      // Check for duplicate user entries
      const userCounts = new Map<string, number>();
      for (const entry of entries) {
        userCounts.set(
          entry.userId,
          (userCounts.get(entry.userId) ?? 0) + 1
        );
      }
      const duplicateUsers = [...userCounts.values()].filter((c) => c > 1).length;

      cacheStats[timeRange] = { total: entries.length, duplicateUsers };
    }

    // 2. Get top 10 for each time range
    const topEntries: Record<string, Array<{ username: string; wpm: number; achievedAt: string; userId: string }>> = {};
    for (const timeRange of timeRanges) {
      const entries = await ctx.db
        .query("leaderboardCache")
        .withIndex("by_time_range_wpm", (q) => q.eq("timeRange", timeRange))
        .order("desc")
        .take(10);

      topEntries[timeRange] = entries.map((e) => ({
        username: e.username,
        wpm: e.bestWpm,
        achievedAt: new Date(e.bestWpmAt).toISOString(),
        userId: e.userId as string,
      }));
    }

    // 3. Find users where all-time best == week best (suspicious)
    const allTimeEntries = await ctx.db
      .query("leaderboardCache")
      .withIndex("by_time_range_wpm", (q) => q.eq("timeRange", "all-time"))
      .collect();

    const weekEntries = await ctx.db
      .query("leaderboardCache")
      .withIndex("by_time_range_wpm", (q) => q.eq("timeRange", "week"))
      .collect();

    const weekByUser = new Map(weekEntries.map((e) => [e.userId as string, e]));
    let matchingCount = 0;
    let totalCompared = 0;
    const suspiciousSamples: Array<{
      username: string;
      allTimeBest: number;
      allTimeBestAt: string;
      weekBest: number;
      weekBestAt: string;
    }> = [];

    for (const atEntry of allTimeEntries) {
      const wEntry = weekByUser.get(atEntry.userId as string);
      if (wEntry) {
        totalCompared++;
        if (atEntry.bestWpm === wEntry.bestWpm) {
          matchingCount++;
          if (suspiciousSamples.length < 5) {
            suspiciousSamples.push({
              username: atEntry.username,
              allTimeBest: atEntry.bestWpm,
              allTimeBestAt: new Date(atEntry.bestWpmAt).toISOString(),
              weekBest: wEntry.bestWpm,
              weekBestAt: new Date(wEntry.bestWpmAt).toISOString(),
            });
          }
        }
      }
    }

    // 4. Check actual testResults for older data
    // Sample a few users who appear on the all-time leaderboard to verify
    // their cache matches their actual best
    const verificationSamples: Array<{
      username: string;
      cachedAllTimeBest: number;
      actualAllTimeBest: number;
      actualAllTimeBestAt: string;
      totalResultsWithAcc90: number;
      resultsOlderThan7Days: number;
      match: boolean;
    }> = [];

    // Check up to 10 users from the all-time leaderboard
    const topAllTime = await ctx.db
      .query("leaderboardCache")
      .withIndex("by_time_range_wpm", (q) => q.eq("timeRange", "all-time"))
      .order("desc")
      .take(10);

    for (const cacheEntry of topAllTime) {
      const allResults = await ctx.db
        .query("testResults")
        .withIndex("by_user", (q) => q.eq("userId", cacheEntry.userId))
        .collect();

      const eligibleResults = allResults.filter(
        (r) => r.accuracy >= 90 && r.isValid !== false
      );
      const olderResults = eligibleResults.filter(
        (r) => r.createdAt < weekCutoff
      );

      const actualBest = eligibleResults.length > 0
        ? eligibleResults.reduce((a, b) => (a.wpm > b.wpm ? a : b))
        : null;

      verificationSamples.push({
        username: cacheEntry.username,
        cachedAllTimeBest: cacheEntry.bestWpm,
        actualAllTimeBest: actualBest?.wpm ?? 0,
        actualAllTimeBestAt: actualBest
          ? new Date(actualBest.createdAt).toISOString()
          : "N/A",
        totalResultsWithAcc90: eligibleResults.length,
        resultsOlderThan7Days: olderResults.length,
        match: cacheEntry.bestWpm === (actualBest?.wpm ?? 0),
      });
    }

    return {
      cacheStats,
      topEntries,
      allTimeVsWeek: {
        usersWithBothEntries: totalCompared,
        usersWhereAllTimeEqualsWeek: matchingCount,
        percentageMatching:
          totalCompared > 0
            ? Math.round((matchingCount / totalCompared) * 100)
            : 0,
        suspiciousSamples,
      },
      cacheVerification: {
        note: "Compares cached all-time best vs actual best from testResults for top 10 users",
        samples: verificationSamples,
      },
      timestamps: {
        weekCutoff: new Date(weekCutoff).toISOString(),
        todayCutoff: new Date(todayCutoff).toISOString(),
        now: new Date().toISOString(),
      },
    };
  },
});

// ==============================================================================
// Helper functions (copied from testResults.ts for timezone handling)
// ==============================================================================

const TIMEZONE = "America/New_York";

function getTimezoneOffset(date: Date): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: TIMEZONE }));
  return utcDate.getTime() - tzDate.getTime();
}

function getStartOfDayET(daysAgo: number = 0): number {
  const now = new Date();

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

  const midnightUTC = Date.UTC(year, month, day, 0, 0, 0, 0);
  const offset = getTimezoneOffset(new Date(midnightUTC));

  return midnightUTC + offset;
}
