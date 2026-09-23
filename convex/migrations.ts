import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

interface UserIdsBatch {
  userIds: Id<"users">[];
  nextCursor: string | null;
}

/** Native insertion-order cursor; IDs are not lexicographic creation cursors. */
export const getUserIdsBatch = internalQuery({
  args: { cursor: v.optional(v.string()), batchSize: v.optional(v.number()) },
  handler: async (ctx, args): Promise<UserIdsBatch> => {
    const batchSize = Math.max(1, Math.min(Math.floor(args.batchSize ?? 50), 200));
    const result = await ctx.db.query("users").paginate({
      cursor: args.cursor ?? null, numItems: batchSize,
    });
    return { userIds: result.page.map((user) => user._id), nextCursor: result.isDone ? null : result.continueCursor };
  },
});

/** Explicit maintenance only. Returns the cursor and failed IDs for resumption. */
export const backfillAllCaches = internalAction({
  args: { cursor: v.optional(v.string()), maxBatches: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let cursor: string | null = args.cursor ?? null;
    let userStatsRebuildsStarted = 0;
    let userStatsRebuildsCompleted = 0;
    const failedUserIds: Id<"users">[] = [];
    const maxBatches = Math.max(1, Math.min(Math.floor(args.maxBatches ?? 20), 100));
    for (let count = 0; count < maxBatches; count++) {
      const batch: UserIdsBatch = await ctx.runQuery(internal.migrations.getUserIdsBatch, {
        cursor: cursor ?? undefined, batchSize: 50,
      });
      for (const userId of batch.userIds) {
        try {
          const result = await ctx.runMutation(internal.statsCache.rebuildUserStatsCacheForUser, { userId });
          userStatsRebuildsStarted++;
          if (!result.pending) userStatsRebuildsCompleted++;
        } catch {
          failedUserIds.push(userId);
        }
      }
      cursor = batch.nextCursor;
      if (!cursor) break;
    }
    return {
      userStatsRebuildsStarted,
      userStatsRebuildsCompleted,
      userStatsRebuildsPending: userStatsRebuildsStarted - userStatsRebuildsCompleted,
      failedUserIds,
      nextCursor: cursor,
    };
  },
});
