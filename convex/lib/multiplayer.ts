import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const emptyParticipantStats = () => ({
  wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false,
});

// Compatibility check for session-owned room controls. This is not authentication.
export function checkRoomHost(room: Doc<"rooms">, hostSessionId?: string) {
  if (hostSessionId !== undefined && room.hostId !== hostSessionId) {
    throw new Error("Only the room host can change this room");
  }
}

/** Persist the current race snapshot in the same transaction that ends the race. */
export async function saveRaceSnapshot(ctx: MutationCtx, room: Doc<"rooms">) {
  const existing = await ctx.db.query("raceResults")
    .withIndex("by_race", (q) => q.eq("raceId", room._id)).first();
  if (existing) return existing._id;
  const participants = await ctx.db.query("participants")
    .withIndex("by_room", (q) => q.eq("roomId", room._id)).collect();
  const sorted = [...participants].sort((a, b) => {
    if (a.stats.isFinished !== b.stats.isFinished) return a.stats.isFinished ? -1 : 1;
    if (a.stats.isFinished) return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
    return b.stats.progress - a.stats.progress;
  });
  return await ctx.db.insert("raceResults", {
    raceId: room._id,
    rankings: sorted.map((p, index) => ({
      sessionId: p.sessionId, name: p.name, emoji: p.emoji, position: index + 1,
      wpm: p.stats.wpm, accuracy: p.stats.accuracy, finishTime: p.finishTime,
      didFinish: p.stats.isFinished,
    })),
    targetText: room.targetText ?? "",
    totalRacers: participants.length,
    createdAt: Date.now(),
  });
}
