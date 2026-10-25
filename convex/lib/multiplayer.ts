import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const emptyParticipantStats = () => ({
  wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false,
});

export const ROOM_RETENTION_MS = 15 * 60_000;
export const PRESENCE_TIMEOUT_MS = 75_000; // 45s heartbeat timeout plus 30s reconnect grace.
export const REJOIN_RETENTION_MS = 30_000;

export async function credentialHash(credential: string) {
  if (typeof credential !== "string" || !/^[a-f0-9]{64}$/.test(credential)) {
    throw new Error("A private multiplayer credential is required");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(credential));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function requireLiveRoom(room: Doc<"rooms"> | null): asserts room is Doc<"rooms"> {
  if (!room || !room.hostCredentialHash || room.expiresAt <= Date.now()) {
    throw new Error("This room has expired. Create a new room.");
  }
}

export async function checkRoomHost(room: Doc<"rooms">, credential: string) {
  requireLiveRoom(room);
  if (room.hostCredentialHash !== await credentialHash(credential)) {
    throw new Error("Only the room host can change this room");
  }
}

export async function checkParticipant(ctx: MutationCtx, participant: Doc<"participants"> | null, credential: string, allowHost = false) {
  if (!participant) throw new Error("Participant not found");
  const room = await ctx.db.get(participant.roomId);
  requireLiveRoom(room);
  const hash = await credentialHash(credential);
  if (participant.credentialHash !== hash && !(allowHost && room.hostCredentialHash === hash)) {
    throw new Error("This participant belongs to another player");
  }
  return room;
}

export async function checkRoomMember(ctx: MutationCtx, room: Doc<"rooms">, credential: string) {
  requireLiveRoom(room);
  const hash = await credentialHash(credential);
  if (room.hostCredentialHash === hash) return;
  const members = await ctx.db.query("participants").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect();
  if (!members.some((member) => member.credentialHash === hash && member.isConnected)) {
    throw new Error("Join this room before changing it");
  }
}

export function publicRoom(room: Doc<"rooms"> | null) {
  if (!room || !room.hostCredentialHash || room.expiresAt <= Date.now()) return null;
  const { hostCredentialHash: secret, ...result } = room;
  void secret;
  return result;
}

export function publicParticipant(participant: Doc<"participants">) {
  const { credentialHash: secret, ...result } = participant;
  void secret;
  return result;
}

/** Server-observed finish time, then stable membership order for same-millisecond ties. */
export function compareRaceFinish(a: Doc<"participants">, b: Doc<"participants">) {
  return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity) ||
    a.joinedAt - b.joinedAt || a._id.localeCompare(b._id);
}

export async function finishRaceIfReady(ctx: MutationCtx, room: Doc<"rooms">) {
  if (room.gameMode !== "race" || room.raceStartTime === undefined || room.raceEndTime !== undefined || Date.now() < room.raceStartTime) return false;
  const members = await ctx.db.query("participants").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect();
  const connected = members.filter((member) => member.isConnected);
  const finishes = members.flatMap((member) => member.finishTime === undefined ? [] : [member.finishTime]).sort((a, b) => a - b);
  if (!connected.every((member) => member.stats.isFinished) && !(finishes.length >= 3 && Date.now() >= room.raceStartTime + finishes[2] + 10_000)) return false;
  await ctx.db.patch(room._id, { raceEndTime: Date.now() });
  await saveRaceSnapshot(ctx, room);
  return true;
}

export async function disconnectMember(ctx: MutationCtx, participant: Doc<"participants">, disconnectedAt = Date.now()) {
  if (!participant.isConnected) return;
  const now = Date.now();
  await ctx.db.patch(participant._id, { isConnected: false, isReady: false, disconnectedAt });
  const room = await ctx.db.get(participant.roomId);
  if (!room) return;
  const members = await ctx.db.query("participants").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect();
  const successor = members.filter((member) => member._id !== participant._id && member.isConnected && member.lastSeen > now - PRESENCE_TIMEOUT_MS && member.credentialHash)
    .sort((a, b) => a.joinedAt - b.joinedAt || a._id.localeCompare(b._id))[0];
  await ctx.db.patch(room._id, {
    readyParticipants: (room.readyParticipants ?? []).filter((id) => id !== participant.sessionId),
    ...(room.gameMode === "race" && room.hostId === participant.sessionId && successor
      ? { hostId: successor.sessionId, hostName: successor.name, hostCredentialHash: successor.credentialHash } : {}),
  });
  await finishRaceIfReady(ctx, room);
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
    if (a.stats.isFinished) return compareRaceFinish(a, b);
    return b.stats.progress - a.stats.progress || a.joinedAt - b.joinedAt || a._id.localeCompare(b._id);
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

export type AttemptVersion = { resetVersion?: number; raceStartTime?: number };

/** Guards delayed race emissions after reset, departure, or another race. */
export function acceptsAttempt(
  room: Doc<"rooms"> | null,
  participant: Doc<"participants">,
  version: AttemptVersion,
) {
  if (!room || room.status !== "active" || !participant.isConnected) return false;
  if (room.gameMode !== "race" || (participant.resetVersion ?? 0) !== (version.resetVersion ?? 0)) return false;
  return room.raceEndTime === undefined && room.raceStartTime !== undefined &&
    room.raceStartTime <= Date.now() && version.raceStartTime === room.raceStartTime;
}

export function validateParticipantStats(stats: Doc<"participants">["stats"]) {
  for (const value of [stats.wpm, stats.accuracy, stats.progress, stats.wordsTyped, stats.timeElapsed]) {
    if (!Number.isFinite(value) || value < 0) throw new Error("Invalid participant progress");
  }
  if (stats.accuracy > 100 || stats.progress > 100) throw new Error("Invalid participant progress");
}

export async function resetParticipantAttempt(ctx: MutationCtx, participant: Doc<"participants">) {
  await ctx.db.patch(participant._id, {
    resetVersion: (participant.resetVersion ?? 0) + 1,
    stats: emptyParticipantStats(),
    typedText: undefined,
    targetText: undefined,
    typedProgress: undefined,
    finishTime: undefined,
    position: undefined,
  });
}
