// convex/participants.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { acceptsAttempt, checkParticipant, checkRoomHost, credentialHash, disconnectMember, publicParticipant, publicRoom, requireLiveRoom, resetParticipantAttempt, validateParticipantStats } from "./lib/multiplayer";

const statsValidator = v.object({
  wpm: v.number(), accuracy: v.number(), progress: v.number(),
  wordsTyped: v.number(), timeElapsed: v.number(), isFinished: v.boolean(),
});

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
    credential: v.string(),
    name: v.string(),
    emoji: v.optional(v.string()),
    gameMode: v.optional(v.union(v.literal("practice"), v.literal("race"), v.literal("lesson"))),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode.trim().toUpperCase()))
      .first();

    requireLiveRoom(room);

    if (args.gameMode && (room.gameMode ?? "practice") !== args.gameMode) {
      throw new Error("This room uses a different game mode");
    }
    const hash = await credentialHash(args.credential);
    if (args.sessionId === room.hostId && room.hostCredentialHash !== hash) {
      throw new Error("Only the room host can claim this player identity");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Enter a name to join");
    if (name.length > 40) throw new Error("Names must be 40 characters or fewer");

    // Session ids may occur in multiple rooms. Reconnect only within this room.
    const members = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const existing = members.find((p) => p.sessionId === args.sessionId);

    if (existing && existing.roomId === room._id) {
      await checkParticipant(ctx, existing, args.credential);
      const now = Date.now();
      // Check if within rejoin window (30 seconds)
      const rejoinWindow = 30 * 1000;
      const canRejoin =
        !existing.disconnectedAt ||
        now - existing.disconnectedAt < rejoinWindow;

      if (room.gameMode === "race" && room.status === "active" && !canRejoin) {
        throw new Error("The rejoin window has ended. Join the next race.");
      }
      await ctx.db.patch(existing._id, {
        isConnected: true,
        lastSeen: now,
        disconnectedAt: undefined,
      });
      return {
        participantId: existing._id,
        isReconnect: true,
        room: publicRoom(room),
        canRejoin,
        typedProgress: existing.typedProgress,
      };
    }

    const now = Date.now();
    const isRace = room.gameMode === "race";
    if (isRace && room.status === "active") {
      throw new Error("This race has already started. Join the next race.");
    }

    if (members.length >= 64) throw new Error("This room is full");
    const participantId = await ctx.db.insert("participants", {
      roomId: room._id,
      sessionId: args.sessionId,
      credentialHash: hash,
      name,
      isConnected: true,
      resetVersion: 0,
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

    return { participantId, isReconnect: false, room: publicRoom(room) };
  },
});

export const updateStats = mutation({
  args: {
    participantId: v.id("participants"),
    credential: v.string(),
    stats: statsValidator,
    runVersion: v.optional(v.number()),
    resetVersion: v.optional(v.number()),
    typedText: v.optional(v.string()),
    targetText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    await checkParticipant(ctx, participant, args.credential);
    if (!participant) return;
    const room = await ctx.db.get(participant.roomId);
    if (room?.gameMode === "race" || !acceptsAttempt(room, participant, args)) return;
    validateParticipantStats(args.stats);
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
    return (await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()).map(publicParticipant);
  },
});

export const kick = mutation({
  args: { participantId: v.id("participants"), credential: v.string() },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const room = await ctx.db.get(participant.roomId);
    requireLiveRoom(room);
    await checkRoomHost(room, args.credential);
    await disconnectMember(ctx, participant);
    await ctx.db.delete(args.participantId);
  },
});

export const resetStats = mutation({
  args: { participantId: v.id("participants"), credential: v.string() },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    await checkParticipant(ctx, participant, args.credential, true);
    if (!participant) throw new Error("Participant not found");
    const room = await ctx.db.get(participant.roomId);
    if (!room) throw new Error("Room not found");
    if (room.gameMode === "race" && (room.raceEndTime !== undefined || participant.finishTime !== undefined)) {
      throw new Error("A completed race attempt cannot be restarted");
    }
    await resetParticipantAttempt(ctx, participant);
  },
});

export const disconnect = mutation({
  args: { participantId: v.id("participants"), credential: v.string() },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    await checkParticipant(ctx, participant, args.credential);
    if (participant) await disconnectMember(ctx, participant);
  },
});

// Set participant as ready
export const setReady = mutation({
  args: { participantId: v.id("participants"), credential: v.string() },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    await checkParticipant(ctx, participant, args.credential);
    if (!participant) throw new Error("Participant not found");

    if (!participant.isConnected) throw new Error("Rejoin the room before getting ready");
    const room = await ctx.db.get(participant.roomId);
    if (!room || room.status !== "waiting") throw new Error("The race has already started");
    await ctx.db.patch(args.participantId, { isReady: true });

    // Keep the legacy ready list in sync with participant readiness.
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
  args: { participantId: v.id("participants"), credential: v.string() },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    await checkParticipant(ctx, participant, args.credential);
    if (!participant) throw new Error("Participant not found");

    const room = await ctx.db.get(participant.roomId);
    if (!room || room.status !== "waiting") throw new Error("The race has already started");
    await ctx.db.patch(args.participantId, { isReady: false });

    // Keep the legacy ready list in sync with participant readiness.
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
    credential: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    await checkParticipant(ctx, await ctx.db.get(args.participantId), args.credential);
    await ctx.db.patch(args.participantId, { emoji: args.emoji });
  },
});

// Update participant's name
export const setName = mutation({
  args: {
    participantId: v.id("participants"),
    credential: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name || name.length > 40) throw new Error("Enter a name between 1 and 40 characters");
    await checkParticipant(ctx, await ctx.db.get(args.participantId), args.credential);
    await ctx.db.patch(args.participantId, { name });
  },
});

// The final snapshot and rank are committed together, independently of throttled progress.
export const recordFinish = mutation({
  args: {
    participantId: v.id("participants"),
    credential: v.string(),
    finishTime: v.number(),
    typedProgress: v.optional(v.number()),
    typedText: v.optional(v.string()),
    stats: v.optional(statsValidator),
    raceStartTime: v.optional(v.number()),
    resetVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    await checkParticipant(ctx, participant, args.credential);
    if (!participant) throw new Error("Participant not found");
    const room = await ctx.db.get(participant.roomId);
    if (room?.gameMode !== "race" || !acceptsAttempt(room, participant, args)) return;
    if (participant.finishTime !== undefined) return { position: participant.position };
    const stats = args.stats ?? participant.stats;
    validateParticipantStats(stats);
    if (!Number.isFinite(args.finishTime) || args.finishTime < 0) throw new Error("Invalid finish time");
    const members = await ctx.db.query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", participant.roomId)).collect();
    const position = members.filter((p) => p.finishTime !== undefined).length + 1;
    await ctx.db.patch(args.participantId, {
      finishTime: args.finishTime,
      position,
      typedText: args.typedText ?? participant.typedText,
      typedProgress: args.typedProgress ?? participant.typedProgress,
      stats: { ...stats, isFinished: true },
      lastSeen: Date.now(),
    });
    return { position };
  },
});

export const updateProgress = mutation({
  args: {
    participantId: v.id("participants"),
    credential: v.string(),
    typedProgress: v.number(),
    typedText: v.optional(v.string()),
    stats: statsValidator,
    raceStartTime: v.optional(v.number()),
    resetVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    await checkParticipant(ctx, participant, args.credential);
    if (!participant) return;
    const room = await ctx.db.get(participant.roomId);
    if (room?.gameMode !== "race" || !acceptsAttempt(room, participant, args)) return;
    if (participant.finishTime !== undefined) return;
    validateParticipantStats(args.stats);
    await ctx.db.patch(args.participantId, {
      typedProgress: args.typedProgress,
      typedText: args.typedText ?? participant.typedText,
      // recordFinish is the sole owner of completion and position.
      stats: { ...args.stats, isFinished: false },
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

    const participant = participants.find((p) => p.sessionId === args.sessionId);
    return participant ? publicParticipant(participant) : null;
  },
});
