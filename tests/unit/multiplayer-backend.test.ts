import { credentialHash } from "../../convex/lib/multiplayer";
import { describe, expect, it } from "vitest";
import { join, disconnect, setReady, updateStats, updateProgress, recordFinish, resetStats } from "../../convex/participants";
import { startRace, endRace, resetForNewRace, getById, setStatus, resetPractice, updateSettings } from "../../convex/rooms";
import { saveResults } from "../../convex/raceResults";
import type { Id } from "../../convex/_generated/dataModel";
import { multiplayerDb } from "./fixtures/multiplayer-db";

const credential = "a".repeat(64);
const hash = await credentialHash(credential);
const roomId = "rooms:one" as Id<"rooms">;
const participantId = "participants:one" as Id<"participants">;
const stats = { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false };
const room = { hostCredentialHash: hash, expiresAt: Date.now() + 10000000, _id: roomId, code: "ABCDE", hostId: "host", hostName: "Host", gameMode: "race", status: "waiting", readyParticipants: ["host", "guest"] };
const participant = { credentialHash: hash, lastSeen: Date.now(), _id: participantId, roomId, sessionId: "host", name: "Host", isConnected: true, isReady: true, stats, joinedAt: 1 };

describe("multiplayer membership lifecycle (isolated handlers)", () => {
  it("reconnects the session in the requested room even when another room was joined first", async () => {
    const db = multiplayerDb({ rooms: [room], participants: [
      { ...participant, _id: "participants:other", roomId: "rooms:other" }, participant,
    ] });
    const result = await join._handler(db.ctx, { credential, roomCode: "ABCDE", sessionId: "host", name: "Host" });
    expect(result.participantId).toBe(participantId);
    expect(db.rows("participants")).toHaveLength(2);
  });

  it("disconnects readiness and transfers host ownership to the earliest connected racer", async () => {
    const db = multiplayerDb({ rooms: [room], participants: [participant,
      { ...participant, _id: "participants:guest", sessionId: "guest", name: "Guest", joinedAt: 2 },
    ] });
    await disconnect._handler(db.ctx, { credential, participantId });
    expect(db.get(participantId)).toMatchObject({ isConnected: false, isReady: false });
    expect(db.get(roomId)).toMatchObject({ hostId: "guest", hostName: "Guest", readyParticipants: ["guest"] });
    await disconnect._handler(db.ctx, { credential, participantId });
    expect(db.get(roomId)?.hostId).toBe("guest");
  });

  it("does not make a disconnected participant ready", async () => {
    const db = multiplayerDb({ rooms: [room], participants: [{ ...participant, isConnected: false }] });
    await expect(setReady._handler(db.ctx, { credential, participantId })).rejects.toThrow();
  });
});


describe("race room transitions", () => {
  it("returns missing for malformed and deleted room URLs", async () => {
    const db = multiplayerDb({ rooms: [room] });
    expect(await getById._handler(db.ctx, { roomId: "not-an-id" })).toBeNull();
    expect(await getById._handler(db.ctx, { roomId: "rooms:deleted" })).toBeNull();
    expect(await getById._handler(db.ctx, { roomId })).toMatchObject({ code: "ABCDE" });
  });
  const raceRoom = { ...room, settings: { difficulty: "beginner", wordTarget: 10 }, targetText: "cat dog" };

  it("validates room type before joining and refuses new racers after start", async () => {
    const db = multiplayerDb({ rooms: [{ ...raceRoom, status: "active", raceStartTime: 1 }], participants: [participant] });
    await expect(join._handler(db.ctx, { credential, roomCode: "ABCDE", sessionId: "new", name: "New", gameMode: "practice" })).rejects.toThrow("different game mode");
    await expect(join._handler(db.ctx, { credential, roomCode: "ABCDE", sessionId: "new", name: "New", gameMode: "race" })).rejects.toThrow("already started");
    expect(db.rows("participants")).toHaveLength(1);
  });

  it("starts once despite duplicate host requests and accepts a zero countdown", async () => {
    const db = multiplayerDb({ rooms: [raceRoom], participants: [participant] });
    await expect(startRace._handler(db.ctx, { credential: "b".repeat(64), roomId, hostSessionId: "intruder" })).rejects.toThrow("Only the room host");
    const first = await startRace._handler(db.ctx, { credential, roomId, countdownSeconds: 0, hostSessionId: "host" });
    const second = await startRace._handler(db.ctx, { credential, roomId, countdownSeconds: 20, hostSessionId: "host" });
    expect(second).toEqual(first);
    expect(first.raceStartTime).toBeLessThanOrEqual(Date.now());
  });

  it("atomically saves a stable snapshot when ending and ignores a stale end", async () => {
    const db = multiplayerDb({ rooms: [{ ...raceRoom, status: "active", raceStartTime: 123 }], participants: [{ ...participant, stats: { ...stats, isFinished: true } }] });
    await endRace._handler(db.ctx, { credential, roomId, raceStartTime: 12 });
    expect(db.rows("raceResults")).toHaveLength(0);
    await endRace._handler(db.ctx, { credential, roomId, raceStartTime: 123 });
    expect(db.rows("raceResults")).toHaveLength(1);
    const result = db.rows("raceResults")[0];
    await db.ctx.db.patch(participantId, { stats: { ...stats, wpm: 999 } });
    await endRace._handler(db.ctx, { credential, roomId, raceStartTime: 123 });
    await saveResults._handler(db.ctx, { credential, raceId: roomId, raceStartTime: 123 });
    expect(db.rows("raceResults")).toEqual([result]);
    await resetForNewRace._handler(db.ctx, { credential, roomId, hostSessionId: "host" });
    expect(db.rows("raceResults")).toHaveLength(0);
    expect(db.get(roomId)).toMatchObject({ status: "waiting", readyParticipants: [] });
  });
});


describe("attempt progress boundaries", () => {
  const report = { ...stats, wpm: 50, accuracy: 95, progress: 50, timeElapsed: 1000 };

  it("ignores Connect reports after stop, departure, or a run/participant reset", async () => {
    const seed = { ...room, gameMode: "practice", status: "active", runVersion: 2 };
    const db = multiplayerDb({ rooms: [seed], participants: [{ ...participant, resetVersion: 3 }] });
    const args = { credential, participantId, stats: report, typedText: "cat", runVersion: 2, resetVersion: 3 };
    await updateStats._handler(db.ctx, { credential, ...args, runVersion: 1 });
    await updateStats._handler(db.ctx, { credential, ...args, resetVersion: 2 });
    expect(db.get(participantId)?.stats).toEqual(stats);
    await updateStats._handler(db.ctx, args);
    expect(db.get(participantId)?.typedText).toBe("cat");
    await db.ctx.db.patch(roomId, { status: "waiting" });
    await updateStats._handler(db.ctx, { credential, ...args, typedText: "changed" });
    expect(db.get(participantId)?.typedText).toBe("cat");
    await db.ctx.db.patch(roomId, { status: "active" });
    await disconnect._handler(db.ctx, { credential, participantId });
    await updateStats._handler(db.ctx, { credential, ...args, typedText: "changed" });
    expect(db.get(participantId)?.typedText).toBe("cat");
  });

  it("persists exact race input, then atomically finishes without a late progress rollback", async () => {
    const db = multiplayerDb({ rooms: [{ ...room, status: "active", raceStartTime: Date.now() - 2000, targetText: "cat dog" }], participants: [participant] });
    const raceStartTime = db.get(roomId).raceStartTime as number;
    const args = { credential, participantId, typedProgress: 2, typedText: "cxt", stats: report, raceStartTime };
    await updateProgress._handler(db.ctx, { credential, ...args, raceStartTime: 2 });
    expect(db.get(participantId)?.typedText).toBeUndefined();
    await updateProgress._handler(db.ctx, args);
    expect(db.get(participantId)?.typedText).toBe("cxt");
    const final = { ...args, typedText: "cat dog", typedProgress: 7, stats: { ...report, progress: 100, isFinished: true } };
    expect(await recordFinish._handler(db.ctx, final)).toEqual({ accepted: true, position: 1 });
    await updateProgress._handler(db.ctx, args);
    expect(await recordFinish._handler(db.ctx, final)).toEqual({ accepted: true, position: 1 });
    expect(db.get(participantId)).toMatchObject({ typedText: "cat dog", finishTime: expect.any(Number), stats: { isFinished: true, progress: 100, accuracy: 100 } });
  });
});


describe("versioned host practice runs", () => {
  const config = { mode: "time", duration: 30, wordTarget: 25, difficulty: "medium", punctuation: false,
    numbers: false, quoteLength: "all", ghostWriterEnabled: false, ghostWriterSpeed: 60,
    soundEnabled: false, typingFontSize: 3.5, textAlign: "left" };
  const practiceRoom = { ...room, gameMode: "practice", settings: config };
  const report = { ...stats, wpm: 40, timeElapsed: 1000 };

  it("starts once, freezes on stop, and begins a fresh version on the next start", async () => {
    const db = multiplayerDb({ rooms: [practiceRoom], participants: [{ ...participant, typedText: "old" }] });
    await setStatus._handler(db.ctx, { credential, roomId, status: "active", hostSessionId: "host" });
    expect(db.get(roomId)?.runVersion).toBe(1);
    expect(db.get(participantId)).toMatchObject({ resetVersion: 1, stats });
    expect(db.get(participantId)?.typedText).toBeUndefined();
    await setStatus._handler(db.ctx, { credential, roomId, status: "active" });
    expect(db.get(roomId)?.runVersion).toBe(1);
    await updateStats._handler(db.ctx, { credential, participantId, stats: report, typedText: "cat", runVersion: 1, resetVersion: 1 });
    await setStatus._handler(db.ctx, { credential, roomId, status: "waiting" });
    expect(db.get(participantId)?.typedText).toBe("cat");
    await setStatus._handler(db.ctx, { credential, roomId, status: "active" });
    expect(db.get(roomId)?.runVersion).toBe(2);
    expect(db.get(participantId)?.typedText).toBeUndefined();
  });

  it("individual and room reset invalidate queued reports and atomically clear attempts", async () => {
    const db = multiplayerDb({ rooms: [{ ...practiceRoom, status: "active", runVersion: 1 }], participants: [{ ...participant, resetVersion: 2 }] });
    await resetStats._handler(db.ctx, { credential, participantId });
    expect(db.get(participantId)?.resetVersion).toBe(3);
    await updateStats._handler(db.ctx, { credential, participantId, stats: report, typedText: "stale", runVersion: 1, resetVersion: 2 });
    expect(db.get(participantId)?.stats).toEqual(stats);
    await resetPractice._handler(db.ctx, { credential, roomId, hostSessionId: "host" });
    expect(db.get(roomId)).toMatchObject({ status: "waiting", runVersion: 2 });
    expect(db.get(participantId)?.resetVersion).toBe(4);
  });

  it("retains the host sound pack contract and rejects an invalid plan start", async () => {
    const db = multiplayerDb({ rooms: [practiceRoom], participants: [] });
    const sound = { soundEnabled: true, typingSound: "creamy", warningSound: "clock" };
    await updateSettings._handler(db.ctx, { credential, roomId, settings: sound, hostSessionId: "host" });
    expect(db.get(roomId)?.settings).toMatchObject(sound);
    await updateSettings._handler(db.ctx, { credential, roomId, settings: { mode: "plan", plan: [], planIndex: 0 } });
    await expect(setStatus._handler(db.ctx, { credential, roomId, status: "active" })).rejects.toThrow("valid plan step");
    expect(db.get(roomId)?.status).toBe("waiting");
  });
});
