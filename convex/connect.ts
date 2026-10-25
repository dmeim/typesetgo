import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  CONNECT_ARCHIVE_MS,
  CONNECT_MAX_PARTICIPANTS,
  DEFAULT_CONNECT_TEST,
  emptyConnectStats,
  validateConnectOverrides,
} from "../src/lib/connect-types";
import { credentialHash } from "./lib/multiplayer";
import {
  allocateCode,
  assertLockedPrefix,
  cleanName,
  cleanRoomName,
  clearedAttempt,
  clearedRun,
  connectError,
  connectOverridesValidator,
  connectPacingValidator,
  connectStatsValidator,
  connectTestValidator,
  effectiveStep,
  endRoomData,
  hasActivity,
  isConnectCode,
  isLiveRoom,
  listParticipants,
  liveActivity,
  lockedThrough,
  normalizeCode,
  participantRoom,
  participantSelf,
  publicParticipant,
  publicRoom,
  requireHost,
  requireParticipant,
  requireRoomParticipant,
  tryCredentialHash,
  validateSnapshotText,
  validateStats,
  validateTests,
  withResult,
} from "./lib/connect";

type Room = Doc<"connectRooms">;
type Participant = Doc<"connectParticipants">;

const hostArgs = { roomId: v.id("connectRooms"), credential: v.string() };
const participantArgs = { participantId: v.id("connectParticipants"), credential: v.string() };

async function patchParticipants(ctx: MutationCtx, roomId: Id<"connectRooms">, patch: (p: Participant) => Partial<Participant>) {
  for (const participant of await listParticipants(ctx, roomId)) await ctx.db.patch(participant._id, patch(participant));
}

async function scheduleParticipantCleanup(ctx: MutationCtx, roomId: Id<"connectRooms">, more: boolean) {
  if (more) await ctx.scheduler.runAfter(0, internal.connectCleanup.deleteParticipants, { roomId });
}

// An idle-expired room counts as ended at its expiry even before cleanup records endedAt.
const endedAtOf = (room: Room) => room.endedAt ?? room.expiresAt;

// ---------------------------------------------------------------------------
// Queries

export const hostView = query({
  args: { roomId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("connectRooms", args.roomId);
    const room = id ? await ctx.db.get(id) : null;
    if (!room) return { state: "missing" as const };
    if (room.hostCredentialHash !== await tryCredentialHash(args.credential)) return { state: "forbidden" as const };
    if (!isLiveRoom(room)) return { state: "ended" as const, room: { _id: room._id, name: room.name } };
    const participants = (await listParticipants(ctx, room._id))
      .filter((p) => p.removedAt === undefined)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map(publicParticipant);
    return { state: "ok" as const, room: publicRoom(room), participants };
  },
});

export const participantView = query({
  args: { roomId: v.string(), participantId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const roomId = ctx.db.normalizeId("connectRooms", args.roomId);
    const room = roomId ? await ctx.db.get(roomId) : null;
    if (!room) return { state: "missing" as const };
    if (!isLiveRoom(room)) return { state: "ended" as const };
    const participantId = ctx.db.normalizeId("connectParticipants", args.participantId);
    const participant = participantId ? await ctx.db.get(participantId) : null;
    if (!participant || participant.roomId !== room._id) return { state: "missing" as const };
    if (participant.credentialHash !== await tryCredentialHash(args.credential)) return { state: "forbidden" as const };
    if (participant.removedAt !== undefined) return { state: "removed" as const };
    return { state: "ok" as const, room: participantRoom(room), participant: participantSelf(participant) };
  },
});

export const recentRooms = query({
  args: { credential: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const hash = await tryCredentialHash(args.credential);
    const identity = await ctx.auth.getUserIdentity();
    const byHash = hash
      ? await ctx.db.query("connectRooms").withIndex("by_host_hash", (q) => q.eq("hostCredentialHash", hash)).order("desc").take(50)
      : [];
    const byOwner = identity
      ? await ctx.db.query("connectRooms").withIndex("by_owner", (q) => q.eq("ownerClerkId", identity.subject)).order("desc").take(50)
      : [];
    const rooms = new Map<string, Room>();
    for (const room of [...byHash, ...byOwner]) {
      if (isLiveRoom(room, now) || endedAtOf(room) >= now - CONNECT_ARCHIVE_MS) rooms.set(room._id, room);
    }
    return [...rooms.values()]
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
      .slice(0, 20)
      .map((room) => {
        const live = isLiveRoom(room, now);
        return {
          _id: room._id, name: room.name, hostName: room.hostName, code: live ? room.code : undefined,
          live, endedAt: live ? undefined : endedAtOf(room), createdAt: room.createdAt, lastActiveAt: room.lastActiveAt,
          testCount: room.tests.length,
        };
      });
  },
});

export const lookupCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeCode(args.code);
    if (!isConnectCode(code)) return null;
    const room = await ctx.db.query("connectRooms").withIndex("by_code", (q) => q.eq("code", code)).first();
    if (!room || !isLiveRoom(room)) return null;
    return { name: room.name, hostName: room.hostName };
  },
});

// ---------------------------------------------------------------------------
// Host mutations

export const createRoom = mutation({
  args: { hostName: v.string(), credential: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const hostName = cleanName(args.hostName);
    const name = args.name?.trim() ? cleanRoomName(args.name) : cleanRoomName(`${hostName}'s room`);
    const hostCredentialHash = await credentialHash(args.credential);
    const identity = await ctx.auth.getUserIdentity();
    const code = await allocateCode(ctx);
    const now = Date.now();
    const roomId = await ctx.db.insert("connectRooms", {
      code, name, hostName, hostCredentialHash, ownerClerkId: identity?.subject,
      tests: [{ ...DEFAULT_CONNECT_TEST, id: crypto.randomUUID() }],
      pacing: "host", overrides: {}, status: "lobby", currentIndex: 0, runVersion: 0,
      createdAt: now, ...liveActivity(now),
    });
    return { roomId, code };
  },
});

export const hostHeartbeat = mutation({
  args: { roomId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("connectRooms", args.roomId);
    const room = id ? await ctx.db.get(id) : null;
    if (!room) return { state: "missing" as const };
    if (room.hostCredentialHash !== await tryCredentialHash(args.credential)) return { state: "forbidden" as const };
    const now = Date.now();
    if (!isLiveRoom(room, now)) return { state: "ended" as const };
    await ctx.db.patch(room._id, liveActivity(now));
    return { state: "ok" as const };
  },
});

export const updateRoom = mutation({
  args: {
    ...hostArgs,
    name: v.optional(v.string()),
    hostName: v.optional(v.string()),
    pacing: v.optional(connectPacingValidator),
    overrides: v.optional(connectOverridesValidator),
  },
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    const patch: Partial<Room> = {};
    if (args.name !== undefined) patch.name = cleanRoomName(args.name);
    if (args.hostName !== undefined) patch.hostName = cleanName(args.hostName);
    if (args.pacing !== undefined && args.pacing !== room.pacing) {
      if (room.status !== "lobby") throw new Error("Pacing can only change before the room starts");
      patch.pacing = args.pacing;
    }
    if (args.overrides !== undefined) {
      validateConnectOverrides(args.overrides);
      patch.overrides = args.overrides;
    }
    await ctx.db.patch(room._id, patch);
  },
});

export const setTests = mutation({
  args: { ...hostArgs, tests: v.array(connectTestValidator) },
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    validateTests(args.tests);
    assertLockedPrefix(room.tests, args.tests, await lockedThrough(ctx, room));
    await ctx.db.patch(room._id, { tests: args.tests });
    if (room.pacing !== "participant") return;
    // Appending tests lets participants who had finished the old list continue.
    await patchParticipants(ctx, room._id, (p) =>
      p.completedAt !== undefined && p.stepIndex < args.tests.length ? { completedAt: undefined } : {});
  },
});

export const start = mutation({
  args: hostArgs,
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    if (room.status === "running") return;
    if (room.status === "paused") {
      await ctx.db.patch(room._id, { status: "running" });
      return;
    }
    await patchParticipants(ctx, room._id, () => clearedRun(0));
    await ctx.db.patch(room._id, { status: "running", currentIndex: 0, runVersion: room.runVersion + 1 });
  },
});

export const pause = mutation({
  args: hostArgs,
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    if (room.status === "paused") return;
    if (room.status !== "running") throw new Error("Only a running room can be paused");
    await ctx.db.patch(room._id, { status: "paused" });
  },
});

export const restartTest = mutation({
  args: hostArgs,
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    if (room.status !== "running" && room.status !== "paused") throw new Error("Start the room before restarting a test");
    await patchParticipants(ctx, room._id, clearedAttempt);
    await ctx.db.patch(room._id, { status: "running", runVersion: room.runVersion + 1 });
  },
});

export const goToTest = mutation({
  args: { ...hostArgs, index: v.number() },
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    if (room.pacing !== "host") throw new Error("Participants move through the tests themselves in this room");
    if (room.status === "lobby") throw new Error("Start the room before changing tests");
    if (!Number.isInteger(args.index) || args.index < 0 || args.index > room.tests.length) throw new Error("Choose a test from the list");
    const previous = room.tests[room.currentIndex];
    await patchParticipants(ctx, room._id, (p) => ({
      ...clearedAttempt(),
      stepIndex: args.index,
      results: previous && hasActivity(p.stats) ? withResult(p.results, room.currentIndex, previous.id, p.stats) : p.results,
    }));
    await ctx.db.patch(room._id, {
      currentIndex: args.index, runVersion: room.runVersion + 1,
      status: args.index === room.tests.length ? "complete" : "running",
    });
  },
});

export const resetRoom = mutation({
  args: hostArgs,
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    await patchParticipants(ctx, room._id, () => clearedRun(0));
    await ctx.db.patch(room._id, { status: "lobby", currentIndex: 0, runVersion: room.runVersion + 1 });
  },
});

export const resetParticipant = mutation({
  args: { ...hostArgs, participantId: v.id("connectParticipants") },
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    const participant = await requireRoomParticipant(ctx, room, args.participantId);
    await ctx.db.patch(participant._id, { ...clearedAttempt(), attempt: participant.attempt + 1 });
  },
});

export const removeParticipant = mutation({
  args: { ...hostArgs, participantId: v.id("connectParticipants") },
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    const participant = await requireRoomParticipant(ctx, room, args.participantId);
    await ctx.db.patch(participant._id, { removedAt: Date.now(), isConnected: false });
  },
});

export const endRoom = mutation({
  args: hostArgs,
  handler: async (ctx, args) => {
    const room = await requireHost(ctx, args.roomId, args.credential);
    await scheduleParticipantCleanup(ctx, room._id, await endRoomData(ctx, room));
  },
});

export const reopenRoom = mutation({
  args: hostArgs,
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw connectError("missing", "This room no longer exists");
    const hash = await credentialHash(args.credential);
    const identity = await ctx.auth.getUserIdentity();
    const isOwner = identity !== null && room.ownerClerkId !== undefined && room.ownerClerkId === identity.subject;
    if (!isOwner && room.hostCredentialHash !== hash) throw connectError("forbidden", "Only the room host can reopen this room");
    const now = Date.now();
    if (isLiveRoom(room, now) && room.code) {
      // Resume keeps the code and run; a signed-in owner on another device takes over hosting.
      await ctx.db.patch(room._id, { hostCredentialHash: hash, ...liveActivity(now) });
      return { roomId: room._id, code: room.code };
    }
    if (endedAtOf(room) < now - CONNECT_ARCHIVE_MS) {
      throw connectError("ended", "This room is too old to reopen");
    }
    // An idle-expired room the cron has not ended yet still has members and a code to release.
    if (room.endedAt === undefined && await endRoomData(ctx, room, now)) {
      throw new Error("This room is still closing. Try again in a moment.");
    }
    const code = await allocateCode(ctx);
    await ctx.db.patch(room._id, {
      code, hostCredentialHash: hash, endedAt: undefined, status: "lobby",
      currentIndex: 0, runVersion: room.runVersion + 1, ...liveActivity(now),
    });
    return { roomId: room._id, code };
  },
});

// ---------------------------------------------------------------------------
// Participant mutations

async function countActive(ctx: MutationCtx, roomId: Id<"connectRooms">) {
  return (await listParticipants(ctx, roomId)).filter((p) => p.removedAt === undefined).length;
}

export const join = mutation({
  args: { code: v.string(), name: v.string(), sessionId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const name = cleanName(args.name);
    const hash = await credentialHash(args.credential);
    if (!args.sessionId || args.sessionId.length > 128) throw new Error("A session id is required");
    const code = normalizeCode(args.code);
    const room = isConnectCode(code)
      ? await ctx.db.query("connectRooms").withIndex("by_code", (q) => q.eq("code", code)).first()
      : null;
    const now = Date.now();
    if (!room || !isLiveRoom(room, now)) throw connectError("not_found", "No open room uses that code");
    const existing = await ctx.db.query("connectParticipants")
      .withIndex("by_room_session", (q) => q.eq("roomId", room._id).eq("sessionId", args.sessionId)).first();
    if (existing) {
      if (existing.credentialHash !== hash) throw connectError("forbidden", "This seat belongs to another player");
      if (existing.removedAt !== undefined && await countActive(ctx, room._id) >= CONNECT_MAX_PARTICIPANTS) {
        throw connectError("full", "This room is full");
      }
      await ctx.db.patch(existing._id, { name, isConnected: true, lastSeen: now, removedAt: undefined, leftAt: undefined });
      return { roomId: room._id, participantId: existing._id };
    }
    if (await countActive(ctx, room._id) >= CONNECT_MAX_PARTICIPANTS) throw connectError("full", "This room is full");
    const participantId = await ctx.db.insert("connectParticipants", {
      roomId: room._id, sessionId: args.sessionId, credentialHash: hash, name,
      isConnected: true, lastSeen: now, joinedAt: now,
      stepIndex: room.pacing === "host" ? room.currentIndex : 0,
      attempt: 0, stats: emptyConnectStats(), results: [],
    });
    return { roomId: room._id, participantId };
  },
});

export const rejoin = mutation({
  args: { roomId: v.string(), sessionId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const hash = await credentialHash(args.credential);
    const id = ctx.db.normalizeId("connectRooms", args.roomId);
    const room = id ? await ctx.db.get(id) : null;
    if (!room) throw connectError("missing", "This room no longer exists");
    const now = Date.now();
    if (!isLiveRoom(room, now)) throw connectError("ended", "This room has ended");
    const participant = await ctx.db.query("connectParticipants")
      .withIndex("by_room_session", (q) => q.eq("roomId", room._id).eq("sessionId", args.sessionId)).first();
    if (!participant || participant.credentialHash !== hash) throw connectError("not_member", "Join this room first");
    if (participant.removedAt !== undefined) throw connectError("removed", "The host removed you from this room");
    await ctx.db.patch(participant._id, { isConnected: true, lastSeen: now, leftAt: undefined });
    return { participantId: participant._id };
  },
});

export const participantHeartbeat = mutation({
  args: { participantId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("connectParticipants", args.participantId);
    const participant = id ? await ctx.db.get(id) : null;
    if (!participant || participant.credentialHash !== await tryCredentialHash(args.credential)) return { state: "missing" as const };
    const room = await ctx.db.get(participant.roomId);
    const now = Date.now();
    if (!room || !isLiveRoom(room, now)) return { state: "ended" as const };
    if (participant.removedAt !== undefined) return { state: "removed" as const };
    if (participant.leftAt !== undefined) return { state: "offline" as const };
    await ctx.db.patch(participant._id, { isConnected: true, lastSeen: now });
    return { state: "ok" as const };
  },
});

function acceptsProgress(room: Room, participant: Participant, args: { runVersion: number; stepIndex: number; attempt: number }) {
  return isLiveRoom(room) && room.status === "running" && room.runVersion === args.runVersion &&
    participant.removedAt === undefined && participant.leftAt === undefined &&
    participant.completedAt === undefined && participant.attempt === args.attempt &&
    effectiveStep(room, participant) === args.stepIndex && args.stepIndex < room.tests.length &&
    !participant.stats.isFinished;
}

export const reportProgress = mutation({
  args: {
    ...participantArgs,
    runVersion: v.number(),
    stepIndex: v.number(),
    attempt: v.number(),
    stats: connectStatsValidator,
    typedText: v.optional(v.string()),
    targetText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateStats(args.stats);
    validateSnapshotText(args.typedText);
    validateSnapshotText(args.targetText);
    const { participant, room } = await requireParticipant(ctx, args.participantId, args.credential);
    if (!acceptsProgress(room, participant, args)) return { accepted: false };
    await ctx.db.patch(participant._id, {
      stats: args.stats, typedText: args.typedText, targetText: args.targetText,
      isConnected: true, lastSeen: Date.now(),
    });
    return { accepted: true };
  },
});

export const advance = mutation({
  args: { ...participantArgs, runVersion: v.number(), stepIndex: v.number() },
  handler: async (ctx, args) => {
    const { participant, room } = await requireParticipant(ctx, args.participantId, args.credential);
    if (room.pacing !== "participant") throw new Error("The host moves everyone to the next test in this room");
    const test = room.tests[participant.stepIndex];
    const ok = isLiveRoom(room) && room.status === "running" && room.runVersion === args.runVersion &&
      participant.removedAt === undefined && participant.stepIndex === args.stepIndex &&
      participant.completedAt === undefined && participant.stats.isFinished && test !== undefined;
    if (!ok) return { accepted: false, stepIndex: participant.stepIndex, completed: participant.completedAt !== undefined };
    const stepIndex = participant.stepIndex + 1;
    const completed = stepIndex >= room.tests.length;
    await ctx.db.patch(participant._id, {
      ...clearedAttempt(),
      results: withResult(participant.results, participant.stepIndex, test.id, participant.stats),
      stepIndex,
      completedAt: completed ? Date.now() : undefined,
    });
    return { accepted: true, stepIndex, completed };
  },
});

export const leave = mutation({
  args: participantArgs,
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) return;
    if (participant.credentialHash !== await credentialHash(args.credential)) {
      throw connectError("forbidden", "This participant belongs to another player");
    }
    await ctx.db.patch(participant._id, { leftAt: Date.now(), isConnected: false });
  },
});
