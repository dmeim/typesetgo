// convex/participants.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Default emoji for race participants who don't choose one
const DEFAULT_EMOJIS = [
  "🏎️", "🚀", "⚡", "🔥", "💨", "🎯", "🏃", "🐆", "🦅", "🐎",
];

function getRandomEmoji(): string {
  return DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)];
}

export const join = mutation({
  args: {
    roomCode: v.string(),
    sessionId: v.string(),
    name: v.string(),
    emoji: v.optional(v.string()),
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
      const now = Date.now();
      // Check if within rejoin window (30 seconds)
      const rejoinWindow = 30 * 1000;
      const canRejoin =
        !existing.disconnectedAt ||
        now - existing.disconnectedAt < rejoinWindow;

      await ctx.db.patch(existing._id, {
        isConnected: true,
        lastSeen: now,
        disconnectedAt: undefined,
      });
      return {
        participantId: existing._id,
        isReconnect: true,
        room,
        canRejoin,
        typedProgress: existing.typedProgress,
      };
    }

    const now = Date.now();
    const isRace = room.gameMode === "race";

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
      // Race-specific fields
      isReady: false,
      emoji: isRace ? args.emoji || getRandomEmoji() : undefined,
      typedProgress: 0,
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
    const now = Date.now();
    const participant = await ctx.db.get(args.participantId);

    await ctx.db.patch(args.participantId, {
      isConnected: false,
      lastSeen: now,
      disconnectedAt: now,
    });

    // Also update room's readyParticipants if they were ready
    if (participant) {
      const room = await ctx.db.get(participant.roomId);
      if (room && room.readyParticipants) {
        const newReadyList = room.readyParticipants.filter(
          (id) => id !== participant.sessionId
        );
        await ctx.db.patch(participant.roomId, {
          readyParticipants: newReadyList,
        });
      }
    }
  },
});

// Set participant as ready
export const setReady = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    await ctx.db.patch(args.participantId, { isReady: true });

    // Update room's readyParticipants array
    const room = await ctx.db.get(participant.roomId);
    if (room) {
      const readyList = room.readyParticipants || [];
      if (!readyList.includes(participant.sessionId)) {
        await ctx.db.patch(participant.roomId, {
          readyParticipants: [...readyList, participant.sessionId],
        });
      }
    }
  },
});

// Set participant as not ready
export const setNotReady = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    await ctx.db.patch(args.participantId, { isReady: false });

    // Update room's readyParticipants array
    const room = await ctx.db.get(participant.roomId);
    if (room && room.readyParticipants) {
      const newReadyList = room.readyParticipants.filter(
        (id) => id !== participant.sessionId
      );
      await ctx.db.patch(participant.roomId, {
        readyParticipants: newReadyList,
      });
    }
  },
});

// Set participant's emoji avatar
export const setEmoji = mutation({
  args: {
    participantId: v.id("participants"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, { emoji: args.emoji });
  },
});

// Update participant's name
export const setName = mutation({
  args: {
    participantId: v.id("participants"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, { name: args.name });
  },
});

// Record race finish
export const recordFinish = mutation({
  args: {
    participantId: v.id("participants"),
    finishTime: v.number(), // ms from race start
    position: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, {
      finishTime: args.finishTime,
      position: args.position,
      stats: {
        ...(await ctx.db.get(args.participantId))!.stats,
        isFinished: true,
      },
    });
  },
});

// Update typed progress (for reconnection support)
export const updateProgress = mutation({
  args: {
    participantId: v.id("participants"),
    typedProgress: v.number(),
    stats: v.object({
      wpm: v.number(),
      accuracy: v.number(),
      progress: v.number(),
      wordsTyped: v.number(),
      timeElapsed: v.number(),
      isFinished: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, {
      typedProgress: args.typedProgress,
      stats: args.stats,
      lastSeen: Date.now(),
    });
  },
});

// Get participant by session ID in a specific room
export const getBySession = query({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return participants.find((p) => p.sessionId === args.sessionId) || null;
  },
});
