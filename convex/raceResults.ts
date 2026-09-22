// convex/raceResults.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkRoomMember, saveRaceSnapshot } from "./lib/multiplayer";

// Retained for older callers; endRace now persists this snapshot atomically.
export const saveResults = mutation({
  args: { raceId: v.id("rooms"), raceStartTime: v.optional(v.number()), credential: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.raceId);
    if (!room) throw new Error("Room not found");
    await checkRoomMember(ctx, room, args.credential);
    if (room.gameMode !== "race") throw new Error("Room is not a race");
    if (args.raceStartTime !== undefined && args.raceStartTime !== room.raceStartTime) return null;
    if (room.raceEndTime === undefined) throw new Error("Race has not ended");
    return await saveRaceSnapshot(ctx, room);
  },
});

// Get race results by race ID
export const getResults = query({
  args: { raceId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("raceResults")
      .withIndex("by_race", (q) => q.eq("raceId", args.raceId))
      .first();
  },
});

// Get race results by results ID
export const getById = query({
  args: { resultsId: v.id("raceResults") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.resultsId);
  },
});
