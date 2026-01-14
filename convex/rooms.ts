// convex/rooms.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export const create = mutation({
  args: {
    hostName: v.string(),
    hostSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const code = generateRoomCode();
    const now = Date.now();

    const roomId = await ctx.db.insert("rooms", {
      code,
      hostId: args.hostSessionId,
      hostName: args.hostName,
      status: "waiting",
      settings: {
        mode: "time",
        duration: 30,
        wordTarget: 25,
        difficulty: "medium",
        punctuation: false,
        numbers: false,
        quoteLength: "all",
        ghostWriterEnabled: false,
        ghostWriterSpeed: 60,
        soundEnabled: false,
        typingFontSize: 3.5,
        textAlign: "left",
      },
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
