import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { CONNECT_ARCHIVE_MS, CONNECT_OFFLINE_AFTER_MS } from "../src/lib/connect-types";
import { CONNECT_PARTICIPANT_BATCH, deleteParticipantBatch, endRoomData } from "./lib/connect";

const ROOM_BATCH = 20;

async function markOffline(ctx: MutationCtx, now: number) {
  const stale = await ctx.db.query("connectParticipants")
    .withIndex("by_presence", (q) => q.eq("isConnected", true).lt("lastSeen", now - CONNECT_OFFLINE_AFTER_MS))
    .take(CONNECT_PARTICIPANT_BATCH);
  for (const participant of stale) await ctx.db.patch(participant._id, { isConnected: false });
  return stale.length === CONNECT_PARTICIPANT_BATCH;
}

async function endIdleRooms(ctx: MutationCtx, now: number) {
  const expired = await ctx.db.query("connectRooms")
    .withIndex("by_ended_expires", (q) => q.eq("endedAt", undefined).lt("expiresAt", now))
    .take(ROOM_BATCH);
  for (const room of expired) {
    if (await endRoomData(ctx, room, now)) {
      await ctx.scheduler.runAfter(0, internal.connectCleanup.deleteParticipants, { roomId: room._id });
    }
  }
  return expired.length === ROOM_BATCH;
}

async function purgeArchivedRooms(ctx: MutationCtx, now: number) {
  const archived = await ctx.db.query("connectRooms")
    .withIndex("by_ended_expires", (q) => q.gte("endedAt", 0).lt("endedAt", now - CONNECT_ARCHIVE_MS))
    .take(ROOM_BATCH);
  for (const room of archived) {
    // Keep the room until its last participant batch is gone so a later run can find the rest.
    if (!await deleteParticipantBatch(ctx, room._id)) await ctx.db.delete(room._id);
  }
  return archived.length === ROOM_BATCH;
}

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const moreOffline = await markOffline(ctx, now);
    const moreIdle = await endIdleRooms(ctx, now);
    const moreArchived = await purgeArchivedRooms(ctx, now);
    if (moreOffline || moreIdle || moreArchived) await ctx.scheduler.runAfter(0, internal.connectCleanup.cleanup, {});
  },
});

/** Continues deleting an ended room's participants; stops if the room was reopened meanwhile. */
export const deleteParticipants = internalMutation({
  args: { roomId: v.id("connectRooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (room && room.endedAt === undefined) return;
    if (await deleteParticipantBatch(ctx, args.roomId)) {
      await ctx.scheduler.runAfter(0, internal.connectCleanup.deleteParticipants, { roomId: args.roomId });
    }
  },
});
