import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { credentialHash, PRESENCE_TIMEOUT_MS, REJOIN_RETENTION_MS } from "../../convex/lib/multiplayer";

const modules = import.meta.glob("../../convex/**/*.ts");
const host = "a".repeat(64);
const guest = "b".repeat(64);
const blank = { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false };
const finalStats = { wpm: 40, accuracy: 98, progress: 100, wordsTyped: 5, timeElapsed: 7500, isFinished: true };
afterEach(() => vi.useRealTimers());

async function setup(gameMode: "practice" | "race" = "practice") {
  const t = convexTest(schema, modules);
  const room = await t.mutation(api.rooms.create, { hostSessionId: "host", hostName: "Host", gameMode, credential: host });
  const member = await t.mutation(api.participants.join, { roomCode: room.code, sessionId: "guest", name: "Guest", credential: guest });
  const snapshot = () => t.query(api.participants.getBySession, { roomId: room.roomId, sessionId: "guest" });
  return { t, room, member, snapshot };
}

describe("completed Connect attempt and rejoin regressions", () => {
  it("keeps the first final snapshot through reconnect, late progress, and replacement finals", async () => {
    const { t, room, member, snapshot } = await setup();
    await t.mutation(api.rooms.setStatus, { roomId: room.roomId, status: "active", credential: host });
    const args = { participantId: member.participantId, credential: guest, runVersion: 1, resetVersion: 1 };
    await t.mutation(api.participants.updateStats, { ...args, stats: finalStats, typedText: "cat dog", targetText: "cat dog" });
    await t.mutation(api.participants.disconnect, { participantId: member.participantId, credential: guest });
    const rejoin = await t.mutation(api.participants.join, { roomCode: room.code, sessionId: "guest", name: "  New name  ", credential: guest });
    expect(rejoin.participantId).toBe(member.participantId);
    expect(rejoin.isReconnect).toBe(true);
    await t.mutation(api.participants.updateStats, { ...args, stats: blank, typedText: "", targetText: "different" });
    await t.mutation(api.participants.updateStats, { ...args, stats: { ...finalStats, wpm: 999 }, typedText: "replacement", targetText: "replacement" });
    expect(await snapshot()).toMatchObject({ name: "New name", stats: finalStats, typedText: "cat dog", targetText: "cat dog", resetVersion: 1 });
    await expect(t.mutation(api.participants.resetStats, { participantId: member.participantId, credential: guest })).rejects.toThrow("Only the room host");
    await t.mutation(api.participants.resetStats, { participantId: member.participantId, credential: host });
    await t.mutation(api.participants.updateStats, { ...args, stats: finalStats, typedText: "stale", targetText: "stale" });
    expect(await snapshot()).toMatchObject({ resetVersion: 2, stats: blank });
    expect(await snapshot()).not.toHaveProperty("typedText");
    expect(await snapshot()).not.toHaveProperty("targetText");
    await t.mutation(api.participants.updateStats, { ...args, resetVersion: 2, stats: blank, typedText: "new", targetText: "new target" });
    expect((await snapshot())?.typedText).toBe("new");
  });

  it("clears all saved attempt fields on explicit host reset and next run, rejecting old versions", async () => {
    const { t, room, member, snapshot } = await setup();
    await t.mutation(api.rooms.setStatus, { roomId: room.roomId, status: "active", credential: host });
    const args = { participantId: member.participantId, credential: guest, runVersion: 1, resetVersion: 1 };
    await t.mutation(api.participants.updateStats, { ...args, stats: finalStats, typedText: "cat", targetText: "cat" });
    await t.mutation(api.rooms.resetPractice, { roomId: room.roomId, credential: host });
    expect(await snapshot()).toMatchObject({ resetVersion: 2, stats: blank });
    expect(await snapshot()).not.toHaveProperty("targetText");
    await t.mutation(api.rooms.setStatus, { roomId: room.roomId, status: "active", credential: host });
    await t.mutation(api.participants.updateStats, { ...args, stats: finalStats, typedText: "stale", targetText: "stale" });
    expect(await snapshot()).toMatchObject({ resetVersion: 3, stats: blank });
    await t.mutation(api.participants.updateStats, { ...args, runVersion: 3, resetVersion: 3, stats: finalStats, typedText: "done", targetText: "done" });
    await t.mutation(api.rooms.setStatus, { roomId: room.roomId, status: "waiting", credential: host });
    expect((await snapshot())?.typedText).toBe("done");
    await t.mutation(api.rooms.setStatus, { roomId: room.roomId, status: "active", credential: host });
    const next = await snapshot();
    expect(next).toMatchObject({ resetVersion: 4, stats: blank });
    for (const field of ["typedText", "targetText", "typedProgress", "finishTime", "position"]) expect(next).not.toHaveProperty(field);
  });

  it("validates the submitted replacement name before modifying an existing membership", async () => {
    const { t, room, snapshot } = await setup();
    for (const name of [" ", "x".repeat(41)]) {
      await expect(t.mutation(api.participants.join, { roomCode: room.code, sessionId: "guest", name, credential: guest })).rejects.toThrow();
    }
    expect((await snapshot())?.name).toBe("Guest");
  });
});

describe("bounded practice membership reclamation", () => {
  async function fullRoom(gameMode: "practice" | "race" = "practice") {
    vi.useFakeTimers();
    const fixture = await setup(gameMode);
    const hash = await credentialHash(guest);
    const now = Date.now();
    const ids = await fixture.t.run(async (ctx) => {
      const ids = [];
      for (let index = 0; index < 63; index++) ids.push(await ctx.db.insert("participants", {
        roomId: fixture.room.roomId, sessionId: `slot-${index}`, credentialHash: hash, name: `Player ${index}`,
        stats: blank, isConnected: true, joinedAt: now, lastSeen: now, resetVersion: 0,
      }));
      return ids;
    });
    const newcomer = () => fixture.t.mutation(api.participants.join, { roomCode: fixture.room.code, sessionId: "new", name: "New", credential: guest });
    return { ...fixture, ids, newcomer, now };
  }

  it("reclaims departed practice slots only after retention, preserving active and fresh reservations", async () => {
    const { t, room, ids, newcomer, now } = await fullRoom();
    await expect(newcomer()).rejects.toThrow("full");
    await t.run(async (ctx) => {
      await ctx.db.patch(ids[0], { isConnected: false, disconnectedAt: now - REJOIN_RETENTION_MS + 1 });
      await ctx.db.patch(ids[1], { isConnected: false, disconnectedAt: now });
    });
    await expect(newcomer()).rejects.toThrow("full");
    await t.run(async (ctx) => { await ctx.db.patch(ids[0], { disconnectedAt: now - REJOIN_RETENTION_MS - 1 }); });
    await newcomer();
    expect(await t.run((ctx) => ctx.db.get(ids[0]))).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(ids[1]))).toMatchObject({ isConnected: false });
    expect(await t.query(api.participants.listByRoom, { roomId: room.roomId })).toHaveLength(64);
  });

  it("performs missed presence cleanup at the cap without stealing recent heartbeat slots", async () => {
    const { t, ids, newcomer, now } = await fullRoom();
    await t.run(async (ctx) => {
      await ctx.db.patch(ids[0], { lastSeen: now - PRESENCE_TIMEOUT_MS - REJOIN_RETENTION_MS - 1 });
      await ctx.db.patch(ids[1], { lastSeen: now - PRESENCE_TIMEOUT_MS + 1 });
    });
    await newcomer();
    expect(await t.run((ctx) => ctx.db.get(ids[0]))).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(ids[1]))).toMatchObject({ isConnected: true });
  });

  it("reserves recently disconnected data for legitimate reconnect even when the room is full", async () => {
    const { t, room, member, newcomer, snapshot } = await fullRoom();
    await t.run(async (ctx) => { await ctx.db.patch(member.participantId, { typedText: "cat", targetText: "cat dog", stats: finalStats }); });
    await t.mutation(api.participants.disconnect, { participantId: member.participantId, credential: guest });
    await expect(newcomer()).rejects.toThrow("full");
    const rejoin = await t.mutation(api.participants.join, { roomCode: room.code, sessionId: "guest", name: "New guest", credential: guest });
    expect(rejoin.participantId).toBe(member.participantId);
    expect(await snapshot()).toMatchObject({ typedText: "cat", targetText: "cat dog", stats: finalStats });
  });

  it("does not reclaim race memberships/results to make room", async () => {
    const { t, room, ids, newcomer, now } = await fullRoom("race");
    await t.run(async (ctx) => {
      await ctx.db.patch(ids[0], { isConnected: false, disconnectedAt: now - 60_000, lastSeen: now - 200_000, stats: finalStats, finishTime: 7500 });
      await ctx.db.insert("raceResults", { raceId: room.roomId, rankings: [], targetText: "cat", totalRacers: 64, createdAt: now });
    });
    await expect(newcomer()).rejects.toThrow("full");
    await t.mutation(internal.multiplayerPresence.cleanup, {});
    expect(await t.run((ctx) => ctx.db.get(ids[0]))).toMatchObject({ stats: finalStats, finishTime: 7500 });
    expect(await t.query(api.raceResults.getResults, { raceId: room.roomId })).not.toBeNull();
  });

  it("background cleanup pages past retained race rows and preserves fresh practice reservations", async () => {
    vi.useFakeTimers();
    const { t, room, member, snapshot } = await setup();
    const now = Date.now();
    const race = await t.mutation(api.rooms.create, { hostSessionId: "race-host", hostName: "Race host", gameMode: "race", credential: host });
    const hash = await credentialHash(guest);
    await t.run(async (ctx) => {
      for (let index = 0; index < 101; index++) await ctx.db.insert("participants", {
        roomId: race.roomId, sessionId: `race-${index}`, credentialHash: hash, name: "Racer", stats: finalStats,
        isConnected: false, disconnectedAt: now - 120_000, joinedAt: now - 300_000, lastSeen: now - 300_000,
      });
      await ctx.db.patch(member.participantId, { isConnected: false, lastSeen: now - 200_000, disconnectedAt: now - REJOIN_RETENTION_MS - 1 });
      await ctx.db.insert("participants", { roomId: room.roomId, sessionId: "fresh", credentialHash: hash, name: "Fresh", stats: blank,
        isConnected: false, joinedAt: now, lastSeen: now - 200_000, disconnectedAt: now });
      await ctx.db.insert("participants", { roomId: room.roomId, sessionId: "legacy", credentialHash: hash, name: "Legacy", stats: blank,
        isConnected: false, joinedAt: now - 200_000, lastSeen: now - 200_000 });
      await ctx.db.insert("participants", { roomId: room.roomId, sessionId: "reserved", credentialHash: hash, name: "Reserved", stats: blank,
        isConnected: false, joinedAt: now, lastSeen: now });
    });
    await t.mutation(internal.multiplayerPresence.cleanup, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await snapshot()).toBeNull();
    expect(await t.query(api.participants.listByRoom, { roomId: race.roomId })).toHaveLength(101);
    expect(await t.query(api.participants.listByRoom, { roomId: room.roomId })).toMatchObject([{ sessionId: "fresh" }, { sessionId: "reserved" }]);
  });
});
