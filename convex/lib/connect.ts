import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  CONNECT_CODE_ALPHABET,
  CONNECT_CODE_LENGTH,
  CONNECT_LIVE_IDLE_MS,
  CONNECT_MAX_TESTS,
  CONNECT_NAME_MAX,
  CONNECT_ROOM_NAME_MAX,
  emptyConnectStats,
  isBreakTest,
  validateConnectTest,
  type ConnectResult,
  type ConnectStats,
  type ConnectTest,
} from "../../src/lib/connect-types";
import { credentialHash } from "./multiplayer";

export const MAX_CONNECT_TEXT_LENGTH = 20_000;
export const CONNECT_PARTICIPANT_BATCH = 200;

export const connectTestValidator = v.object({
  id: v.string(),
  mode: v.union(v.literal("time"), v.literal("words"), v.literal("quote"), v.literal("preset"), v.literal("break")),
  duration: v.number(),
  wordTarget: v.number(),
  difficulty: v.union(v.literal("beginner"), v.literal("easy"), v.literal("medium"), v.literal("hard"), v.literal("expert")),
  punctuation: v.boolean(),
  numbers: v.boolean(),
  capitalization: v.boolean(),
  quoteLength: v.union(v.literal("all"), v.literal("short"), v.literal("medium"), v.literal("long"), v.literal("xl")),
  presetText: v.optional(v.string()),
  presetModeType: v.optional(v.union(v.literal("time"), v.literal("finish"))),
  title: v.optional(v.string()),
});

export const connectOverridesValidator = v.object({
  theme: v.optional(v.object({
    enabled: v.boolean(), themeId: v.string(), mode: v.union(v.literal("dark"), v.literal("light")),
  })),
  typography: v.optional(v.object({
    enabled: v.boolean(), typingFontFamily: v.string(), typingFontSize: v.number(),
    textAlign: v.union(v.literal("left"), v.literal("center"), v.literal("right"), v.literal("justify")),
  })),
  ghost: v.optional(v.object({ enabled: v.boolean(), ghostWriterEnabled: v.boolean(), ghostWriterSpeed: v.number() })),
  sound: v.optional(v.object({
    enabled: v.boolean(), soundEnabled: v.boolean(), typingSound: v.string(), warningSound: v.string(),
  })),
  keyboard: v.optional(v.object({
    enabled: v.boolean(), showOnScreenKeyboard: v.boolean(),
    keyboardLayout: v.union(v.literal("qwerty"), v.literal("dvorak"), v.literal("colemak")),
  })),
});

export const connectPacingValidator = v.union(v.literal("host"), v.literal("participant"));
export const connectStatusValidator = v.union(v.literal("lobby"), v.literal("running"), v.literal("paused"), v.literal("complete"));

export const connectStatsValidator = v.object({
  wpm: v.number(), accuracy: v.number(), progress: v.number(),
  wordsTyped: v.number(), timeElapsed: v.number(), isFinished: v.boolean(),
});

export const connectResultValidator = v.object({
  stepIndex: v.number(), testId: v.string(), wpm: v.number(), accuracy: v.number(),
  progress: v.number(), wordsTyped: v.number(), timeElapsed: v.number(), finished: v.boolean(),
});

type Ctx = QueryCtx | MutationCtx;
type Room = Doc<"connectRooms">;
type Participant = Doc<"connectParticipants">;
export type ConnectErrorCode = "missing" | "forbidden" | "ended" | "not_found" | "full" | "not_member" | "removed";

export function connectError(code: ConnectErrorCode, message: string) {
  return new ConvexError({ code, message });
}

/** Query-safe hash: malformed credentials are treated as "not the host" rather than a crash. */
export async function tryCredentialHash(credential: string) {
  try {
    return await credentialHash(credential);
  } catch {
    return null;
  }
}

export const isLiveRoom = (room: Room, now = Date.now()) => room.endedAt === undefined && room.expiresAt > now;
export const liveActivity = (now: number) => ({ lastActiveAt: now, expiresAt: now + CONNECT_LIVE_IDLE_MS });

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function isConnectCode(code: string) {
  return code.length === CONNECT_CODE_LENGTH && [...code].every((char) => CONNECT_CODE_ALPHABET.includes(char));
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CONNECT_CODE_LENGTH));
  return Array.from(bytes, (byte) => CONNECT_CODE_ALPHABET[byte % CONNECT_CODE_ALPHABET.length]).join("");
}

/** Codes stay on a room until it is ended, so any row holding a code blocks reuse. */
export async function allocateCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = randomCode();
    const taken = await ctx.db.query("connectRooms").withIndex("by_code", (q) => q.eq("code", code)).first();
    if (!taken) return code;
  }
  throw new Error("Could not allocate a room code. Try again.");
}

export function cleanName(name: string, max = CONNECT_NAME_MAX, label = "name") {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > max) throw new Error(`Enter a ${label} from 1 to ${max} characters`);
  return trimmed;
}

export const cleanRoomName = (name: string) => cleanName(name, CONNECT_ROOM_NAME_MAX, "room name");

/** Host mutations: verifies the credential, requires a live room, and records host activity. */
export async function requireHost(ctx: MutationCtx, roomId: Id<"connectRooms">, credential: string) {
  const room = await ctx.db.get(roomId);
  if (!room) throw connectError("missing", "This room no longer exists");
  if (room.hostCredentialHash !== await credentialHash(credential)) {
    throw connectError("forbidden", "Only the room host can change this room");
  }
  const now = Date.now();
  if (!isLiveRoom(room, now)) throw connectError("ended", "This room has ended");
  await ctx.db.patch(room._id, liveActivity(now));
  return room;
}

export async function requireRoomParticipant(ctx: MutationCtx, room: Room, participantId: Id<"connectParticipants">) {
  const participant = await ctx.db.get(participantId);
  if (!participant || participant.roomId !== room._id) throw connectError("missing", "Participant not found");
  return participant;
}

/** Participant mutations: the caller must own the membership. */
export async function requireParticipant(ctx: MutationCtx, participantId: Id<"connectParticipants">, credential: string) {
  const participant = await ctx.db.get(participantId);
  if (!participant) throw connectError("missing", "Participant not found");
  if (participant.credentialHash !== await credentialHash(credential)) {
    throw connectError("forbidden", "This participant belongs to another player");
  }
  const room = await ctx.db.get(participant.roomId);
  if (!room) throw connectError("missing", "This room no longer exists");
  return { participant, room };
}

export function listParticipants(ctx: Ctx, roomId: Id<"connectRooms">) {
  return ctx.db.query("connectParticipants").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect();
}

export function publicRoom(room: Room) {
  const { hostCredentialHash, ownerClerkId, ...rest } = room;
  void hostCredentialHash; void ownerClerkId;
  return rest;
}

export function publicParticipant(participant: Participant) {
  const { credentialHash: secret, sessionId, typedText, targetText, ...rest } = participant;
  void secret; void sessionId; void typedText; void targetText;
  return rest;
}

export function participantRoom(room: Room) {
  return {
    _id: room._id, code: room.code, name: room.name, hostName: room.hostName, status: room.status,
    pacing: room.pacing, currentIndex: room.currentIndex, runVersion: room.runVersion,
    tests: room.tests, overrides: room.overrides, stepStartedAt: room.stepStartedAt, pausedAt: room.pausedAt,
  };
}

export function participantSelf(participant: Participant) {
  return {
    _id: participant._id, name: participant.name, isConnected: participant.isConnected,
    stepIndex: participant.stepIndex, attempt: participant.attempt, stats: participant.stats,
    typedText: participant.typedText, targetText: participant.targetText,
    results: participant.results, completedAt: participant.completedAt, stepStartedAt: participant.stepStartedAt,
  };
}

export const effectiveStep = (room: Room, participant: Participant) =>
  room.pacing === "host" ? room.currentIndex : participant.stepIndex;

// Every (re)start of a step restarts its clock, which self-paced breaks count down from.
export const clearedAttempt = () => ({ stats: emptyConnectStats(), typedText: undefined, targetText: undefined, stepStartedAt: Date.now() });

export const clearedRun = (stepIndex = 0) => ({
  ...clearedAttempt(), results: [] as ConnectResult[], stepIndex, completedAt: undefined,
});

export const hasActivity = (stats: ConnectStats) => stats.timeElapsed > 0 || stats.progress > 0;

/** One result per step: repeating a step overwrites the earlier result. */
export function withResult(results: ConnectResult[], stepIndex: number, testId: string, stats: ConnectStats) {
  const result: ConnectResult = {
    stepIndex, testId, wpm: stats.wpm, accuracy: stats.accuracy, progress: stats.progress,
    wordsTyped: stats.wordsTyped, timeElapsed: stats.timeElapsed, finished: stats.isFinished,
  };
  return [...results.filter((entry) => entry.stepIndex !== stepIndex), result].sort((a, b) => a.stepIndex - b.stepIndex);
}

export function validateTests(tests: ConnectTest[]) {
  if (tests.length < 1 || tests.length > CONNECT_MAX_TESTS) throw new Error(`Add from 1 to ${CONNECT_MAX_TESTS} tests`);
  const ids = new Set<string>();
  tests.forEach((test, index) => {
    validateConnectTest(test, index);
    if (ids.has(test.id)) throw new Error(`Test ${index + 1} duplicates another test's id`);
    ids.add(test.id);
  });
  if (tests.every(isBreakTest)) throw new Error("Add at least one typing test");
}

const TEST_KEYS: (keyof ConnectTest)[] = [
  "id", "mode", "duration", "wordTarget", "difficulty", "punctuation", "numbers",
  "capitalization", "quoteLength", "presetText", "presetModeType", "title",
];
const sameTest = (a: ConnectTest, b: ConnectTest) => TEST_KEYS.every((key) => a[key] === b[key]);

/** Highest test index already reached; those tests are frozen while the room is not in the lobby. */
export async function lockedThrough(ctx: Ctx, room: Room) {
  if (room.status === "lobby") return -1;
  if (room.pacing === "host") return room.currentIndex;
  const participants = await listParticipants(ctx, room._id);
  return participants.reduce((max, p) => (p.removedAt === undefined ? Math.max(max, p.stepIndex) : max), -1);
}

export function assertLockedPrefix(previous: ConnectTest[], next: ConnectTest[], locked: number) {
  for (let index = 0; index <= locked && index < previous.length; index++) {
    if (!next[index] || !sameTest(previous[index], next[index])) {
      throw new Error("Tests already reached can't be changed while the room is running");
    }
  }
}

export function validateStats(stats: ConnectStats) {
  for (const value of [stats.wpm, stats.accuracy, stats.progress, stats.wordsTyped, stats.timeElapsed]) {
    if (!Number.isFinite(value) || value < 0) throw new Error("Invalid progress report");
  }
  if (stats.accuracy > 100 || stats.progress > 100) throw new Error("Invalid progress report");
}

export function validateSnapshotText(text: string | undefined) {
  if (text !== undefined && text.length > MAX_CONNECT_TEXT_LENGTH) throw new Error("Typed text is too long");
}

/** Deletes one batch of a room's participants; returns true when more remain. */
export async function deleteParticipantBatch(ctx: MutationCtx, roomId: Id<"connectRooms">) {
  const batch = await ctx.db.query("connectParticipants")
    .withIndex("by_room", (q) => q.eq("roomId", roomId)).take(CONNECT_PARTICIPANT_BATCH);
  for (const participant of batch) await ctx.db.delete(participant._id);
  return batch.length === CONNECT_PARTICIPANT_BATCH;
}

/** Ends a room in place so it can be listed and reopened; returns true when participants remain to delete. */
export async function endRoomData(ctx: MutationCtx, room: Room, now = Date.now()) {
  await ctx.db.patch(room._id, { endedAt: now, code: undefined, status: "lobby" });
  return await deleteParticipantBatch(ctx, room._id);
}
