import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const REBUILD_BATCH_SIZE = 100;

async function rebuildProgress(ctx: MutationCtx, userId: Id<"users">) {
  return ctx.db.query("userStatsRebuild").withIndex("by_user", (q) => q.eq("userId", userId)).first();
}

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
    // A save may arrive after earlier pages were replayed. Restart so it is
    // included exactly once; the generation guard ignores queued stale pages.
    if ((await rebuildProgress(ctx, args.userId))?.pending) {
      return startRebuild(ctx, args.userId);
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

    if ((await rebuildProgress(ctx, args.userId))?.pending) {
      return startRebuild(ctx, args.userId);
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
      // Indexed combinations include current verified and legacy rows, never
      // an invalid or unverified client-only save.
      let newBestWpm = 0;
      for (const isValid of [true, undefined]) {
        for (const rankedEligible of [true, undefined]) {
          const best = await ctx.db.query("testResults")
            .withIndex("by_user_validity_ranked_wpm", (q) => q.eq("userId", args.userId)
              .eq("isValid", isValid).eq("rankedEligible", rankedEligible))
            .order("desc").first();
          newBestWpm = Math.max(newBestWpm, best?.wpm ?? 0);
        }
      }

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

async function replayBatch(ctx: MutationCtx, progress: Doc<"userStatsRebuild">) {
  const batch = await ctx.db.query("testResults")
    .withIndex("by_user", (q) => q.eq("userId", progress.userId))
    .paginate({ cursor: progress.cursor, numItems: REBUILD_BATCH_SIZE });
  const totals = {
    totalTests: progress.totalTests,
    totalWpm: progress.totalWpm,
    bestWpm: progress.bestWpm,
    totalAccuracy: progress.totalAccuracy,
    totalTimeTyped: progress.totalTimeTyped,
    totalWordsTyped: progress.totalWordsTyped,
  };
  for (const result of batch.page) {
    if (result.isValid === false || result.rankedEligible === false) continue;
    totals.totalTests++;
    totals.totalWpm += result.wpm;
    totals.bestWpm = Math.max(totals.bestWpm, result.wpm);
    totals.totalAccuracy += result.accuracy;
    totals.totalTimeTyped += result.duration;
    totals.totalWordsTyped += result.wordCount;
  }
  await ctx.db.patch(progress._id, { ...totals, cursor: batch.isDone ? null : batch.continueCursor, pending: !batch.isDone });
  if (!batch.isDone) {
    await ctx.scheduler.runAfter(0, internal.statsCache.continueUserStatsRebuild,
      { userId: progress.userId, generation: progress.generation });
    return { pending: true, totalTests: totals.totalTests };
  }
  const cache = await ctx.db.query("userStatsCache")
    .withIndex("by_user", (q) => q.eq("userId", progress.userId)).first();
  if (totals.totalTests === 0) {
    if (cache) await ctx.db.delete(cache._id);
    return { pending: false, totalTests: 0 };
  }
  if (cache) await ctx.db.patch(cache._id, { ...totals, updatedAt: Date.now() });
  else await ctx.db.insert("userStatsCache", { userId: progress.userId, ...totals, updatedAt: Date.now() });
  return { pending: false, totalTests: totals.totalTests };
}

async function startRebuild(ctx: MutationCtx, userId: Id<"users">) {
  const previous = await rebuildProgress(ctx, userId);
  const data = { userId, generation: (previous?.generation ?? 0) + 1, pending: true,
    cursor: null, totalTests: 0, totalWpm: 0, bestWpm: 0,
    totalAccuracy: 0, totalTimeTyped: 0, totalWordsTyped: 0 };
  const id = previous?._id ?? await ctx.db.insert("userStatsRebuild", data);
  if (previous) await ctx.db.patch(id, data);
  const progress = await ctx.db.get(id);
  if (!progress) throw new Error("Stats rebuild state missing.");
  return replayBatch(ctx, progress);
}

export const rebuildUserStatsCacheForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => startRebuild(ctx, args.userId),
});

export const continueUserStatsRebuild = internalMutation({
  args: { userId: v.id("users"), generation: v.number() },
  handler: async (ctx, args) => {
    const progress = await rebuildProgress(ctx, args.userId);
    if (!progress?.pending || progress.generation !== args.generation) return null;
    return replayBatch(ctx, progress);
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
