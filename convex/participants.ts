// convex/participants.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
  args: {
    roomCode: v.string(),
    sessionId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .first();

    if (!room) throw new Error("Room not found");

    // Check for existing participant with same session (reconnect)
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing && existing.roomId === room._id) {
      await ctx.db.patch(existing._id, {
        isConnected: true,
        lastSeen: Date.now(),
      });
      return { participantId: existing._id, isReconnect: true, room };
    }

    const now = Date.now();
    const participantId = await ctx.db.insert("participants", {
      roomId: room._id,
      sessionId: args.sessionId,
      name: args.name,
      isConnected: true,
      stats: {
        wpm: 0,
        accuracy: 0,
        progress: 0,
        wordsTyped: 0,
        timeElapsed: 0,
        isFinished: false,
      },
      joinedAt: now,
      lastSeen: now,
    });

    return { participantId, isReconnect: false, room };
  },
});

export const updateStats = mutation({
  args: {
    participantId: v.id("participants"),
    stats: v.object({
      wpm: v.number(),
      accuracy: v.number(),
      progress: v.number(),
      wordsTyped: v.number(),
      timeElapsed: v.number(),
      isFinished: v.boolean(),
    }),
    typedText: v.optional(v.string()),
    targetText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, {
      stats: args.stats,
      typedText: args.typedText,
      targetText: args.targetText,
      lastSeen: Date.now(),
    });
  },
});

export const listByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const kick = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.participantId);
  },
});

export const resetStats = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, {
      stats: {
        wpm: 0,
        accuracy: 0,
        progress: 0,
        wordsTyped: 0,
        timeElapsed: 0,
        isFinished: false,
      },
      typedText: undefined,
      targetText: undefined,
    });
  },
});

export const disconnect = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, {
      isConnected: false,
      lastSeen: Date.now(),
    });
  },
});
