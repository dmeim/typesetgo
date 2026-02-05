// convex/raceResults.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save race results when race ends
export const saveResults = mutation({
  args: {
    raceId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.raceId);
    if (!room) throw new Error("Room not found");
    if (room.gameMode !== "race") throw new Error("Room is not a race");

    // Get all participants
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.raceId))
      .collect();

    // Sort by position (finishers first, then by progress)
    const sortedParticipants = [...participants].sort((a, b) => {
      // Finished participants come first
      if (a.stats.isFinished && !b.stats.isFinished) return -1;
      if (!a.stats.isFinished && b.stats.isFinished) return 1;

      // Among finished, sort by finish time
      if (a.stats.isFinished && b.stats.isFinished) {
        return (a.finishTime || Infinity) - (b.finishTime || Infinity);
      }

      // Among unfinished, sort by progress
      return b.stats.progress - a.stats.progress;
    });

    // Build rankings array
    const rankings = sortedParticipants.map((p, index) => ({
      sessionId: p.sessionId,
      name: p.name,
      emoji: p.emoji,
      position: index + 1,
      wpm: p.stats.wpm,
      accuracy: p.stats.accuracy,
      finishTime: p.finishTime,
      didFinish: p.stats.isFinished,
    }));

    // Check if results already exist for this race
    const existingResults = await ctx.db
      .query("raceResults")
      .withIndex("by_race", (q) => q.eq("raceId", args.raceId))
      .first();

    if (existingResults) {
      // Update existing results
      await ctx.db.patch(existingResults._id, {
        rankings,
        totalRacers: participants.length,
      });
      return existingResults._id;
    }

    // Create new results
    const resultsId = await ctx.db.insert("raceResults", {
      raceId: args.raceId,
      rankings,
      targetText: room.targetText || "",
      totalRacers: participants.length,
      createdAt: Date.now(),
    });

    return resultsId;
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
