import { describe, expect, it } from "vitest";
import { join, disconnect, setReady } from "../../convex/participants";
import { startRace, endRace, resetForNewRace } from "../../convex/rooms";
import { saveResults } from "../../convex/raceResults";
import type { Id } from "../../convex/_generated/dataModel";
import { multiplayerDb } from "./fixtures/multiplayer-db";

const roomId = "rooms:one" as Id<"rooms">;
const participantId = "participants:one" as Id<"participants">;
const stats = { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false };
const room = { _id: roomId, code: "ABCDE", hostId: "host", hostName: "Host", gameMode: "race", status: "waiting", readyParticipants: ["host", "guest"] };
const participant = { _id: participantId, roomId, sessionId: "host", name: "Host", isConnected: true, isReady: true, stats, joinedAt: 1 };

describe("multiplayer membership lifecycle (isolated handlers)", () => {
  it("reconnects the session in the requested room even when another room was joined first", async () => {
    const db = multiplayerDb({ rooms: [room], participants: [
      { ...participant, _id: "participants:other", roomId: "rooms:other" }, participant,
    ] });
    const result = await join._handler(db.ctx, { roomCode: "ABCDE", sessionId: "host", name: "Host" });
    expect(result.participantId).toBe(participantId);
    expect(db.rows("participants")).toHaveLength(2);
  });

  it("disconnects readiness and transfers host ownership to the earliest connected racer", async () => {
    const db = multiplayerDb({ rooms: [room], participants: [participant,
      { ...participant, _id: "participants:guest", sessionId: "guest", name: "Guest", joinedAt: 2 },
    ] });
    await disconnect._handler(db.ctx, { participantId });
    expect(db.get(participantId)).toMatchObject({ isConnected: false, isReady: false });
    expect(db.get(roomId)).toMatchObject({ hostId: "guest", hostName: "Guest", readyParticipants: ["guest"] });
    await disconnect._handler(db.ctx, { participantId });
    expect(db.get(roomId)?.hostId).toBe("guest");
  });

  it("does not make a disconnected participant ready", async () => {
    const db = multiplayerDb({ rooms: [room], participants: [{ ...participant, isConnected: false }] });
    await expect(setReady._handler(db.ctx, { participantId })).rejects.toThrow();
  });
});


describe("race room transitions", () => {
  const raceRoom = { ...room, settings: { difficulty: "beginner", wordTarget: 10 }, targetText: "cat dog" };

  it("validates room type before joining and refuses new racers after start", async () => {
    const db = multiplayerDb({ rooms: [{ ...raceRoom, status: "active", raceStartTime: 1 }], participants: [participant] });
    await expect(join._handler(db.ctx, { roomCode: "ABCDE", sessionId: "new", name: "New", gameMode: "practice" })).rejects.toThrow("different game mode");
    await expect(join._handler(db.ctx, { roomCode: "ABCDE", sessionId: "new", name: "New", gameMode: "race" })).rejects.toThrow("already started");
    expect(db.rows("participants")).toHaveLength(1);
  });

  it("starts once despite duplicate host requests and accepts a zero countdown", async () => {
    const db = multiplayerDb({ rooms: [raceRoom], participants: [participant] });
    await expect(startRace._handler(db.ctx, { roomId, hostSessionId: "intruder" })).rejects.toThrow("Only the room host");
    const first = await startRace._handler(db.ctx, { roomId, countdownSeconds: 0, hostSessionId: "host" });
    const second = await startRace._handler(db.ctx, { roomId, countdownSeconds: 20, hostSessionId: "host" });
    expect(second).toEqual(first);
    expect(first.raceStartTime).toBeLessThanOrEqual(Date.now());
  });

  it("atomically saves a stable snapshot when ending and ignores a stale end", async () => {
    const db = multiplayerDb({ rooms: [{ ...raceRoom, status: "active", raceStartTime: 123 }], participants: [participant] });
    await endRace._handler(db.ctx, { roomId, raceStartTime: 12 });
    expect(db.rows("raceResults")).toHaveLength(0);
    await endRace._handler(db.ctx, { roomId, raceStartTime: 123 });
    expect(db.rows("raceResults")).toHaveLength(1);
    const result = db.rows("raceResults")[0];
    await db.ctx.db.patch(participantId, { stats: { ...stats, wpm: 999 } });
    await endRace._handler(db.ctx, { roomId, raceStartTime: 123 });
    await saveResults._handler(db.ctx, { raceId: roomId, raceStartTime: 123 });
    expect(db.rows("raceResults")).toEqual([result]);
    await resetForNewRace._handler(db.ctx, { roomId, hostSessionId: "host" });
    expect(db.rows("raceResults")).toHaveLength(0);
    expect(db.get(roomId)).toMatchObject({ status: "waiting", readyParticipants: [] });
  });
});
