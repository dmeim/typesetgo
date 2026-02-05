// convex/rooms.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateRaceText } from "./lib/raceWords";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export const create = mutation({
  args: {
    hostName: v.string(),
    hostSessionId: v.string(),
    gameMode: v.optional(
      v.union(v.literal("practice"), v.literal("race"), v.literal("lesson"))
    ),
  },
  handler: async (ctx, args) => {
    const code = generateRoomCode();
    const now = Date.now();
    const gameMode = args.gameMode || "practice";

    const roomId = await ctx.db.insert("rooms", {
      code,
      hostId: args.hostSessionId,
      hostName: args.hostName,
      status: "waiting",
      gameMode,
      settings: {
        mode: "time",
        duration: 30,
        wordTarget: gameMode === "race" ? 10 : 25,
        difficulty: gameMode === "race" ? "beginner" : "medium",
        punctuation: false,
        numbers: false,
        capitalization: false,
        quoteLength: "all",
        ghostWriterEnabled: false,
        ghostWriterSpeed: 60,
        soundEnabled: false,
        typingFontSize: 3.5,
        textAlign: "left",
      },
      readyParticipants: [],
      createdAt: now,
      expiresAt: now + 15 * 60 * 1000,
    });

    return { roomId, code };
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

export const updateSettings = mutation({
  args: {
    roomId: v.id("rooms"),
    settings: v.any(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    await ctx.db.patch(args.roomId, {
      settings: { ...room.settings, ...args.settings },
    });
  },
});

export const setStatus = mutation({
  args: {
    roomId: v.id("rooms"),
    status: v.union(v.literal("waiting"), v.literal("active")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { status: args.status });
  },
});

export const deleteRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Delete all participants first
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.roomId);
  },
});

// Get room by ID
export const getById = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

// Generate and set race text for a room
export const setRaceText = mutation({
  args: {
    roomId: v.id("rooms"),
    difficulty: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    customText: v.optional(v.string()), // Allow passing custom text from client
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Use custom text if provided, otherwise generate
    const targetText =
      args.customText ||
      generateRaceText(
        args.difficulty || room.settings.difficulty,
        args.wordCount || room.settings.wordTarget
      );

    await ctx.db.patch(args.roomId, { targetText });
    return targetText;
  },
});

// Start the race countdown and set start time
export const startRace = mutation({
  args: {
    roomId: v.id("rooms"),
    countdownSeconds: v.optional(v.number()), // Default 5 seconds
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.gameMode !== "race") throw new Error("Room is not a race");

    // Verify all participants are ready
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const connectedParticipants = participants.filter((p) => p.isConnected);
    if (connectedParticipants.length < 1) {
      throw new Error("Not enough participants");
    }

    const allReady = connectedParticipants.every((p) => p.isReady);
    if (!allReady) {
      throw new Error("Not all participants are ready");
    }

    // Generate race text if not already set
    if (!room.targetText) {
      const targetText = generateRaceText(
        room.settings.difficulty,
        room.settings.wordTarget
      );
      await ctx.db.patch(args.roomId, { targetText });
    }

    const countdownMs = (args.countdownSeconds || 5) * 1000;
    const raceStartTime = Date.now() + countdownMs;

    await ctx.db.patch(args.roomId, {
      status: "active",
      raceStartTime,
    });

    return { raceStartTime };
  },
});

// End the race and set end time
export const endRace = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    await ctx.db.patch(args.roomId, {
      raceEndTime: Date.now(),
    });
  },
});

// Reset room for another race (return to lobby)
export const resetForNewRace = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Reset room state
    await ctx.db.patch(args.roomId, {
      status: "waiting",
      readyParticipants: [],
      raceStartTime: undefined,
      raceEndTime: undefined,
      targetText: undefined, // Generate new text for next race
    });

    // Reset all participant stats
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const p of participants) {
      await ctx.db.patch(p._id, {
        isReady: false,
        stats: {
          wpm: 0,
          accuracy: 0,
          progress: 0,
          wordsTyped: 0,
          timeElapsed: 0,
          isFinished: false,
        },
        finishTime: undefined,
        position: undefined,
        typedProgress: undefined,
        typedText: undefined,
      });
    }
  },
});
