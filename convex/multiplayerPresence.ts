import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { checkParticipant, checkRoomHost, disconnectMember, PRESENCE_TIMEOUT_MS, ROOM_RETENTION_MS, REJOIN_RETENTION_MS, reclaimPracticeMemberships } from "./lib/multiplayer";

export const heartbeat = mutation({
  args: { credential: v.string(), roomId: v.id("rooms"), participantId: v.optional(v.id("participants")) },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room no longer exists");
    if (args.participantId) {
      const participant = await ctx.db.get(args.participantId);
      await checkParticipant(ctx, participant, args.credential);
      if (!participant || participant.roomId !== args.roomId || !participant.isConnected) throw new Error("Rejoin this room");
      await ctx.db.patch(participant._id, { lastSeen: Date.now() });
    } else {
      await checkRoomHost(room, args.credential);
    }
    await ctx.db.patch(room._id, { expiresAt: Date.now() + ROOM_RETENTION_MS });
  },
});

async function reclaimDisconnectedPage(ctx: MutationCtx, cursor: string | null, cutoff: number) {
  const page = await ctx.db.query("participants")
    .withIndex("by_presence", (q) => q.eq("isConnected", false).lt("lastSeen", cutoff))
    .paginate({ cursor, numItems: 100 });
  for (const participant of page.page) {
    const room = await ctx.db.get(participant.roomId);
    if (room) await reclaimPracticeMemberships(ctx, room, [participant], cutoff + REJOIN_RETENTION_MS);
  }
  // Advance past preserved race/fresh reservations rather than starving later rows.
  if (!page.isDone) await ctx.scheduler.runAfter(0, internal.multiplayerPresence.reclaimDisconnected, {
    cursor: page.continueCursor, cutoff,
  });
}

export const reclaimDisconnected = internalMutation({
  args: { cursor: v.string(), cutoff: v.number() },
  handler: async (ctx, args) => reclaimDisconnectedPage(ctx, args.cursor, args.cutoff),
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db.query("participants").withIndex("by_presence", (q) => q.eq("isConnected", true).lt("lastSeen", now - PRESENCE_TIMEOUT_MS)).take(100);
    for (const participant of stale) {
      const room = await ctx.db.get(participant.roomId);
      await disconnectMember(ctx, participant, (room?.gameMode ?? "practice") === "practice"
        ? participant.lastSeen + PRESENCE_TIMEOUT_MS : now);
    }
    await reclaimDisconnectedPage(ctx, null, now - REJOIN_RETENTION_MS);
    const expired = await ctx.db.query("rooms").withIndex("by_expires", (q) => q.lt("expiresAt", now)).take(10);
    for (const room of expired) {
      const participants = await ctx.db.query("participants").withIndex("by_room", (q) => q.eq("roomId", room._id)).take(100);
      for (const participant of participants) await ctx.db.delete(participant._id);
      if (participants.length === 100) continue;
      const results = await ctx.db.query("raceResults").withIndex("by_race", (q) => q.eq("raceId", room._id)).take(100);
      for (const result of results) await ctx.db.delete(result._id);
      if (results.length < 100) await ctx.db.delete(room._id);
    }
  },
});
