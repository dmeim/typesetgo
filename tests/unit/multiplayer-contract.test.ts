import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { getFunctionName, type FunctionReference } from "convex/server";

const modules = import.meta.glob("../../convex/**/*.ts");
const host = "a".repeat(64);
const guest = "b".repeat(64);
const attacker = "c".repeat(64);
afterEach(() => vi.useRealTimers());
async function setup(gameMode: "practice" | "race" = "race") {
  const t = convexTest(schema, modules);
  const room = await t.mutation(api.rooms.create, { hostSessionId: "host", hostName: "Host", gameMode, credential: host });
  const member = await t.mutation(api.participants.join, { roomCode: room.code, sessionId: "host", name: "Host", credential: host });
  const other = await t.mutation(api.participants.join, { roomCode: room.code, sessionId: "guest", name: "Guest", credential: guest });
  return { t, room, member, other };
}

describe("multiplayer credentials through registered Convex validators/schema", () => {
  it("allows anonymous ownership, hides credentials, and rejects impersonating a visible session", async () => {
    const { t, room, member } = await setup();
    const unjoinedRoom = await t.mutation(api.rooms.create, { hostSessionId: "not-joined", hostName: "New host", gameMode: "race", credential: host });
    await expect(t.mutation(api.participants.join, { roomCode: unjoinedRoom.code, sessionId: "not-joined", name: "Squatter", credential: attacker })).rejects.toThrow("Only the room host");
    const publicRoom = await t.query(api.rooms.getByCode, { code: room.code });
    const publicMember = await t.query(api.participants.getBySession, { roomId: room.roomId, sessionId: "host" });
    expect(publicRoom).not.toHaveProperty("hostCredentialHash");
    expect(publicMember).not.toHaveProperty("credentialHash");
    expect(member.room).not.toHaveProperty("hostCredentialHash");
    for (const participant of await t.query(api.participants.listByRoom, { roomId: room.roomId })) expect(participant).not.toHaveProperty("credentialHash");
    await expect(t.mutation(api.participants.join, { roomCode: room.code, sessionId: "host", name: "Stolen", credential: attacker })).rejects.toThrow();
    await expect(t.withIdentity({ subject: "other-account" }).mutation(api.rooms.deleteRoom, { roomId: room.roomId, credential: attacker })).rejects.toThrow();
    await t.mutation(api.participants.setName, { participantId: member.participantId, credential: host, name: "Renamed" });
    expect((await t.query(api.participants.getBySession, { roomId: room.roomId, sessionId: "host" }))?.name).toBe("Renamed");
  });

  it("rejects missing and forged credentials across every state-changing entrypoint", async () => {
    const { t, room, member } = await setup();
    const roomId = room.roomId;
    const participantId = member.participantId;
    const stats = { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false };
    const calls: [FunctionReference<"mutation">, Record<string, unknown>][] = [
      [api.rooms.create, { hostName: "Fake", hostSessionId: "host" }],
      [api.participants.join, { roomCode: room.code, sessionId: "host", name: "Fake" }],
      [api.rooms.resume, { roomId }], [api.rooms.deleteRoom, { roomId }],
      [api.rooms.updateSettings, { roomId, settings: {} }], [api.rooms.setStatus, { roomId, status: "active" }],
      [api.rooms.resetPractice, { roomId }], [api.rooms.setRaceText, { roomId }], [api.rooms.startRace, { roomId }],
      [api.rooms.endRace, { roomId }], [api.rooms.resetForNewRace, { roomId }],
      [api.participants.updateStats, { participantId, stats }], [api.participants.updateProgress, { participantId, stats, typedProgress: 0 }],
      [api.participants.recordFinish, { participantId, finishTime: 0 }], [api.participants.kick, { participantId }],
      [api.participants.resetStats, { participantId }], [api.participants.disconnect, { participantId }],
      [api.participants.setReady, { participantId }], [api.participants.setNotReady, { participantId }],
      [api.participants.setEmoji, { participantId, emoji: "x" }], [api.participants.setName, { participantId, name: "Fake" }],
      [api.raceResults.saveResults, { raceId: roomId }], [api.multiplayerPresence.heartbeat, { roomId, participantId }],
    ];
    for (const [reference, args] of calls) {
      await expect(t.mutation(reference, args)).rejects.toThrow();
      if (getFunctionName(reference) !== "rooms:create") await expect(t.mutation(reference, { ...args, credential: attacker })).rejects.toThrow();
    }
    await expect(t.mutation(api.participants.kick, { participantId, credential: guest })).rejects.toThrow();
  });

  it("denies legacy rooms, expired rooms and cross-room heartbeat ownership", async () => {
    const { t, room, member } = await setup();
    const second = await t.mutation(api.rooms.create, { hostSessionId: "other", hostName: "Other", credential: guest });
    await expect(t.mutation(api.multiplayerPresence.heartbeat, { roomId: second.roomId, participantId: member.participantId, credential: host })).rejects.toThrow();
    await t.run(async (ctx) => { await ctx.db.patch(room.roomId, { hostCredentialHash: undefined }); });
    await expect(t.mutation(api.rooms.resume, { roomId: room.roomId, credential: host })).rejects.toThrow("expired");
    expect(await t.query(api.rooms.getById, { roomId: room.roomId })).toBeNull();
    await t.run(async (ctx) => { await ctx.db.patch(second.roomId, { expiresAt: Date.now() - 1 }); });
    await expect(t.mutation(api.participants.join, { roomCode: second.code, sessionId: "new", name: "New", credential: attacker })).rejects.toThrow("expired");
  });

  it("transfers a vanished host after grace and preserves only the successor's authority", async () => {
    const { t, room, member, other } = await setup();
    const now = Date.now();
    vi.useFakeTimers(); vi.setSystemTime(now + 74_000);
    await t.mutation(api.multiplayerPresence.heartbeat, { roomId: room.roomId, participantId: other.participantId, credential: guest });
    await t.mutation(internal.multiplayerPresence.cleanup, {});
    expect((await t.query(api.rooms.getById, { roomId: room.roomId }))?.hostId).toBe("host");
    vi.setSystemTime(now + 76_000);
    await t.mutation(internal.multiplayerPresence.cleanup, {});
    const departed = await t.query(api.participants.getBySession, { roomId: room.roomId, sessionId: "host" });
    expect(departed?.isConnected).toBe(false);
    expect((await t.query(api.rooms.getById, { roomId: room.roomId }))?.hostId).toBe("guest");
    await expect(t.mutation(api.rooms.updateSettings, { roomId: room.roomId, settings: {}, credential: host })).rejects.toThrow();
    await t.mutation(api.rooms.updateSettings, { roomId: room.roomId, settings: { wordTarget: 25 }, credential: guest });
    expect(member.participantId).toBeTruthy();
  });

  it("lets a later joiner recover a waiting room after its lone host disconnects", async () => {
    const t = convexTest(schema, modules);
    const room = await t.mutation(api.rooms.create, { hostSessionId: "host", hostName: "Host", gameMode: "race", credential: host });
    const first = await t.mutation(api.participants.join, { roomCode: room.code, sessionId: "host", name: "Host", credential: host });
    await t.mutation(api.participants.disconnect, { participantId: first.participantId, credential: host });
    expect((await t.query(api.rooms.getById, { roomId: room.roomId }))?.hostId).toBe("host");
    await t.mutation(api.participants.join, { roomCode: room.code, sessionId: "guest", name: "Guest", credential: guest });
    expect((await t.query(api.rooms.getById, { roomId: room.roomId }))?.hostId).toBe("guest");
    await t.mutation(api.participants.join, { roomCode: room.code, sessionId: "host", name: "Host", credential: host });
    expect((await t.query(api.rooms.getById, { roomId: room.roomId }))?.hostId).toBe("guest");
    await expect(t.mutation(api.rooms.startRace, { roomId: room.roomId, credential: host })).rejects.toThrow("Only the room host");
  });

  it("rejects incomplete and impossible finishes, acknowledges early retries, and keeps live and final ties aligned", async () => {
    const { t, room, member, other } = await setup();
    const now = Date.now();
    vi.useFakeTimers(); vi.setSystemTime(now);
    await t.run(async (ctx) => {
      await ctx.db.patch(room.roomId, { status: "active", raceStartTime: now + 1000, targetText: "cat dog" });
    });
    const finish = { credential: guest, participantId: other.participantId, raceStartTime: now + 1000,
      typedText: "cat dog", typedProgress: 7 };
    expect(await t.mutation(api.participants.recordFinish, finish)).toMatchObject({ accepted: false, reason: "not_started", retryAfterMs: 1000 });
    vi.setSystemTime(now + 1000);
    await expect(t.mutation(api.participants.recordFinish, { ...finish, typedText: "cat" })).rejects.toThrow("target is not complete");
    expect(await t.mutation(api.participants.recordFinish, finish)).toMatchObject({ accepted: false, reason: "not_started", retryAfterMs: 280 });
    vi.setSystemTime(now + 1280);
    expect(await t.mutation(api.participants.recordFinish, { ...finish, finishTime: 100_000 })).toEqual({ accepted: true, position: 1 });
    expect(await t.mutation(api.participants.recordFinish, finish)).toEqual({ accepted: true, position: 1 });
    expect(await t.mutation(api.participants.recordFinish, { ...finish, credential: host, participantId: member.participantId })).toEqual({ accepted: true, position: 1 });
    const live = await t.query(api.participants.listByRoom, { roomId: room.roomId });
    expect(live.map((p) => [p.sessionId, p.position])).toEqual([["host", 1], ["guest", 2]]);
    await t.mutation(api.rooms.endRace, { roomId: room.roomId, credential: host, raceStartTime: now + 1000 });
    const snapshot = await t.query(api.raceResults.getResults, { raceId: room.roomId });
    expect(snapshot?.rankings.map((p) => [p.sessionId, p.position])).toEqual([["host", 1], ["guest", 2]]);
  });

  it("finishes a two-player race when the unfinished racer vanishes and prunes expired rooms", async () => {
    const { t, room, member, other } = await setup();
    await t.mutation(api.participants.setReady, { participantId: member.participantId, credential: host });
    await t.mutation(api.participants.setReady, { participantId: other.participantId, credential: guest });
    const { raceStartTime } = await t.mutation(api.rooms.startRace, { roomId: room.roomId, credential: host, countdownSeconds: 0 });
    await expect(t.mutation(api.rooms.endRace, { roomId: room.roomId, credential: host, raceStartTime })).rejects.toThrow("still racing");
    const raceRoom = await t.query(api.rooms.getById, { roomId: room.roomId });
    const targetText = raceRoom!.targetText!;
    vi.useFakeTimers(); vi.setSystemTime(raceStartTime + targetText.length * 40);
    await t.mutation(api.participants.recordFinish, { participantId: member.participantId, credential: host, typedText: targetText, typedProgress: targetText.length, raceStartTime });
    const now = Date.now(); vi.setSystemTime(now + 76_000);
    await t.mutation(api.multiplayerPresence.heartbeat, { roomId: room.roomId, participantId: member.participantId, credential: host });
    await t.mutation(internal.multiplayerPresence.cleanup, {});
    expect((await t.query(api.raceResults.getResults, { raceId: room.roomId }))?.rankings).toHaveLength(2);
    vi.setSystemTime(now + 16 * 60_000 + 76_000);
    await t.mutation(internal.multiplayerPresence.cleanup, {});
    expect(await t.query(api.rooms.getById, { roomId: room.roomId })).toBeNull();
    expect(await t.query(api.participants.listByRoom, { roomId: room.roomId })).toEqual([]);
    expect(await t.query(api.raceResults.getResults, { raceId: room.roomId })).toBeNull();
  });
});
