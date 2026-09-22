import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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
