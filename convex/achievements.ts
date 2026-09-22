import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAuthedUser, requireIdentity } from "./lib/identity";
import { advanceAchievementState, emptyAchievementState, type AchievementState } from "./lib/achievementEvaluator";

const REBUILD_BATCH_SIZE = 100;

async function progressFor(ctx: MutationCtx, userId: Id<"users">) {
  return ctx.db.query("achievementProgress").withIndex("by_user", (q) => q.eq("userId", userId)).first();
}

async function publish(ctx: MutationCtx, userId: Id<"users">, state: AchievementState) {
  const existing = await ctx.db.query("userAchievements").withIndex("by_user", (q) => q.eq("userId", userId)).first();
  const previous = existing?.achievements ?? {};
  const addedAchievements = Object.keys(state.awards).filter((id) => !previous[id]);
  const removedAchievements = Object.keys(previous).filter((id) => !state.awards[id]);
  const achievements = Object.fromEntries(Object.entries(state.awards).map(([id, earnedAt]) => [id, previous[id] ?? earnedAt]));
  if (existing) await ctx.db.patch(existing._id, { achievements, updatedAt: Date.now() });
  else await ctx.db.insert("userAchievements", { userId, achievements, updatedAt: Date.now() });
  // Deletion and invalidation replay the same UTC streak facts too.
  const streak = await ctx.db.query("userStreaks").withIndex("by_user", (q) => q.eq("userId", userId)).first();
  const streakData = { userId, currentStreak: state.activityStreak, longestStreak: state.longestStreak, lastActivityDate: state.activityDate, updatedAt: Date.now() };
  if (!state.activityDate) {
    if (streak) await ctx.db.delete(streak._id);
  } else if (streak) {
    await ctx.db.patch(streak._id, streakData);
  } else {
    await ctx.db.insert("userStreaks", streakData);
  }
  return { addedAchievements, removedAchievements, pending: false };
}

async function replayBatch(ctx: MutationCtx, progress: Doc<"achievementProgress">) {
  const batch = await ctx.db.query("testResults")
    .withIndex("by_user_and_date", (q) => q.eq("userId", progress.userId))
    .paginate({ cursor: progress.cursor, numItems: REBUILD_BATCH_SIZE });
  const state = progress.state;
  for (const result of batch.page) advanceAchievementState(state, result);
  await ctx.db.patch(progress._id, { state, cursor: batch.isDone ? null : batch.continueCursor, pending: !batch.isDone });
  if (batch.isDone) return publish(ctx, progress.userId, state);
  await ctx.scheduler.runAfter(0, internal.achievements.continueRebuild, { userId: progress.userId, generation: progress.generation });
  return { addedAchievements: [] as string[], removedAchievements: [] as string[], pending: true };
}

/** Restarting increments the generation, so scheduled stale pages cannot publish. */
async function rebuild(ctx: MutationCtx, userId: Id<"users">) {
  const previous = await progressFor(ctx, userId);
  const data = { userId, generation: (previous?.generation ?? 0) + 1, pending: true, cursor: null, state: emptyAchievementState() };
  const id = previous?._id ?? await ctx.db.insert("achievementProgress", data);
  if (previous) await ctx.db.patch(id, data);
  const progress = await ctx.db.get(id);
  if (!progress) throw new Error("Achievement rebuild state missing.");
  return replayBatch(ctx, progress);
}

export const continueRebuild = internalMutation({
  args: { userId: v.id("users"), generation: v.number() },
  handler: async (ctx, args) => {
    const progress = await progressFor(ctx, args.userId);
    if (!progress?.pending || progress.generation !== args.generation) return null;
    return replayBatch(ctx, progress);
  },
});

/** Normal saves read one state row and one result, independent of history size. */
export const checkAndAwardAchievements = internalMutation({
  args: { userId: v.id("users"), resultId: v.id("testResults") },
  handler: async (ctx, args): Promise<{ newAchievements: string[]; totalAchievements: number }> => {
    const result = await ctx.db.get(args.resultId);
    if (!result || result.userId !== args.userId) throw new Error("Result does not belong to user.");
    const progress = await progressFor(ctx, args.userId);
    if (!progress) {
      const refreshed = await rebuild(ctx, args.userId);
      const current = await progressFor(ctx, args.userId);
      return { newAchievements: refreshed.addedAchievements, totalAchievements: Object.keys(current?.state.awards ?? {}).length };
    }
    // Inserts during replay are consumed by its remaining creation-date pages.
    if (progress.pending || result.isValid === false) {
      return { newAchievements: [], totalAchievements: Object.keys(progress.state.awards).length };
    }
    advanceAchievementState(progress.state, result);
    await ctx.db.patch(progress._id, { state: progress.state });
    const updated = await publish(ctx, args.userId, progress.state);
    return { newAchievements: updated.addedAchievements, totalAchievements: Object.keys(progress.state.awards).length };
  },
});

export const getUserAchievements = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args): Promise<Record<string, number>> => {
    await requireIdentity(ctx, args.clerkId);
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId)).first();
    if (!user) return {};
    const record = await ctx.db.query("userAchievements").withIndex("by_user", (q) => q.eq("userId", user._id)).first();
    return record?.achievements ?? {};
  },
});

export const getUserAchievementsByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Record<string, number>> => {
    const record = await ctx.db.query("userAchievements").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    return record?.achievements ?? {};
  },
});

export const recheckAchievementsAfterDeletion = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => rebuild(ctx, args.userId),
});

export const recheckAllAchievements = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthedUser(ctx, args.clerkId);
    return rebuild(ctx, user._id);
  },
});
