import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import type { FunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  CONNECT_ARCHIVE_MS,
  CONNECT_CODE_ALPHABET,
  CONNECT_LIVE_IDLE_MS,
  CONNECT_MAX_PARTICIPANTS,
  CONNECT_OFFLINE_AFTER_MS,
  DEFAULT_CONNECT_TEST,
  emptyConnectStats,
  type ConnectStats,
  type ConnectTest,
} from "../../src/lib/connect-types";

const modules = import.meta.glob("../../convex/**/*.ts");
const host = "a".repeat(64);
const guest = "b".repeat(64);
const second = "c".repeat(64);
const attacker = "d".repeat(64);
const codePattern = new RegExp(`^[${CONNECT_CODE_ALPHABET}]{4}$`);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

type T = ReturnType<typeof convexTest>;

async function setup() {
  const t = convexTest(schema, modules);
  const { roomId, code } = await t.mutation(api.connect.createRoom, { hostName: "Ms. Host", credential: host });
  return { t, roomId, code, hostArgs: { roomId, credential: host } };
}

async function join(t: T, code: string, sessionId = "guest", credential = guest, name = "Guest") {
  return await t.mutation(api.connect.join, { code, name, sessionId, credential });
}

async function hostView(t: T, roomId: Id<"connectRooms">, credential = host) {
  const view = await t.query(api.connect.hostView, { roomId, credential });
  if (view.state !== "ok") throw new Error(`Expected host view, got ${view.state}`);
  return view;
}

async function participantRow(t: T, participantId: Id<"connectParticipants">) {
  return await t.run(async (ctx) => await ctx.db.get(participantId));
}

const test = (id: string, overrides: Partial<ConnectTest> = {}): ConnectTest => ({ ...DEFAULT_CONNECT_TEST, id, ...overrides });
const stats = (overrides: Partial<ConnectStats> = {}): ConnectStats => ({ ...emptyConnectStats(), ...overrides });
const rejectsCode = (promise: Promise<unknown>, code: string) => expect(promise).rejects.toMatchObject({ data: { code } });

describe("Connect rooms", () => {
  it("creates a default lobby room that hides host secrets", async () => {
    const { t, roomId, code } = await setup();
    expect(code).toMatch(codePattern);
    const view = await hostView(t, roomId);
    expect(view.room).toMatchObject({
      name: "Ms. Host's room", hostName: "Ms. Host", code, pacing: "host", overrides: {},
      status: "lobby", currentIndex: 0, runVersion: 0,
    });
    expect(view.room.tests).toHaveLength(1);
    expect(view.room.tests[0]).toMatchObject(DEFAULT_CONNECT_TEST);
    expect(view.room).not.toHaveProperty("hostCredentialHash");
    expect(view.room).not.toHaveProperty("ownerClerkId");
    expect(view.participants).toEqual([]);

    expect(await t.query(api.connect.lookupCode, { code: ` ${code.toLowerCase()} ` })).toEqual({ name: "Ms. Host's room", hostName: "Ms. Host" });
    expect(await t.query(api.connect.lookupCode, { code: "0000" })).toBeNull();
    expect(await t.query(api.connect.hostView, { roomId, credential: guest })).toEqual({ state: "forbidden" });
    expect(await t.query(api.connect.hostView, { roomId, credential: "not-a-credential" })).toEqual({ state: "forbidden" });
    expect(await t.query(api.connect.hostView, { roomId: "nonsense", credential: host })).toEqual({ state: "missing" });

    const named = await t.withIdentity({ subject: "owner" }).mutation(api.connect.createRoom, { hostName: " Pat ", credential: host, name: " Period 3 " });
    const row = await t.run(async (ctx) => await ctx.db.get(named.roomId));
    expect(row).toMatchObject({ name: "Period 3", hostName: "Pat", ownerClerkId: "owner" });
    await expect(t.mutation(api.connect.createRoom, { hostName: "   ", credential: host })).rejects.toThrow(/name/);
    await expect(t.mutation(api.connect.createRoom, { hostName: "Host", credential: "short" })).rejects.toThrow();
  });

  it("allocates codes that are unique among live rooms and frees them when a room ends", async () => {
    const t = convexTest(schema, modules);
    const forceBytes = (...sets: number[][]) => {
      const spy = vi.spyOn(globalThis.crypto, "getRandomValues");
      for (const bytes of sets) {
        spy.mockImplementationOnce(<A extends ArrayBufferView | null>(array: A) => {
          (array as unknown as Uint8Array).set(bytes);
          return array;
        });
      }
    };
    forceBytes([0, 1, 2, 3]);
    const first = await t.mutation(api.connect.createRoom, { hostName: "One", credential: host });
    expect(first.code).toBe("ABCD");
    forceBytes([0, 1, 2, 3], [4, 5, 6, 7]);
    const next = await t.mutation(api.connect.createRoom, { hostName: "Two", credential: host });
    expect(next.code).toBe("EFGH");
    await t.mutation(api.connect.endRoom, { roomId: first.roomId, credential: host });
    forceBytes([0, 1, 2, 3]);
    expect((await t.mutation(api.connect.createRoom, { hostName: "Three", credential: host })).code).toBe("ABCD");
    vi.restoreAllMocks();

    const codes = new Set<string>();
    for (let index = 0; index < 25; index++) {
      codes.add((await t.mutation(api.connect.createRoom, { hostName: `Host ${index}`, credential: host })).code);
    }
    expect(codes.size).toBe(25);
  });

  it("rejects missing and forged credentials on every host mutation", async () => {
    const { t, roomId, code } = await setup();
    const { participantId } = await join(t, code);
    const calls: [FunctionReference<"mutation">, Record<string, unknown>][] = [
      [api.connect.updateRoom, { roomId, name: "Mine" }],
      [api.connect.setTests, { roomId, tests: [test("x")] }],
      [api.connect.start, { roomId }], [api.connect.pause, { roomId }],
      [api.connect.restartTest, { roomId }], [api.connect.goToTest, { roomId, index: 0 }],
      [api.connect.resetRoom, { roomId }], [api.connect.resetParticipant, { roomId, participantId }],
      [api.connect.removeParticipant, { roomId, participantId }], [api.connect.endRoom, { roomId }],
      [api.connect.reopenRoom, { roomId }],
    ];
    for (const [reference, args] of calls) {
      await expect(t.mutation(reference, args)).rejects.toThrow();
      await rejectsCode(t.mutation(reference, { ...args, credential: attacker }), "forbidden");
      await expect(t.mutation(reference, { ...args, credential: guest })).rejects.toThrow();
    }
    expect(await t.mutation(api.connect.hostHeartbeat, { roomId, credential: attacker })).toEqual({ state: "forbidden" });
    expect(await t.mutation(api.connect.hostHeartbeat, { roomId: "nonsense", credential: host })).toEqual({ state: "missing" });
    expect(await t.mutation(api.connect.hostHeartbeat, { roomId, credential: host })).toEqual({ state: "ok" });
    expect((await hostView(t, roomId)).room).toMatchObject({ status: "lobby", name: "Ms. Host's room" });
    expect((await participantRow(t, participantId))?.removedAt).toBeUndefined();
  });
});

describe("Connect participants", () => {
  it("joins, renames on rejoin, validates names, and refuses a full room", async () => {
    const { t, roomId, code } = await setup();
    const joined = await join(t, code.toLowerCase(), "guest", guest, "  Ana  ");
    expect(joined.roomId).toBe(roomId);
    const again = await join(t, code, "guest", guest, "Ana B");
    expect(again.participantId).toBe(joined.participantId);
    const view = await hostView(t, roomId);
    expect(view.participants).toHaveLength(1);
    expect(view.participants[0]).toMatchObject({ name: "Ana B", isConnected: true, stepIndex: 0, attempt: 0, results: [] });
    for (const hidden of ["credentialHash", "sessionId", "typedText", "targetText"]) expect(view.participants[0]).not.toHaveProperty(hidden);

    await rejectsCode(join(t, code, "guest", attacker, "Thief"), "forbidden");
    await expect(join(t, code, "blank", second, "   ")).rejects.toThrow(/name/);
    await expect(join(t, code, "long", second, "x".repeat(33))).rejects.toThrow(/name/);
    await rejectsCode(join(t, "ZZZZ", "new", second), "not_found");

    await t.run(async (ctx) => {
      for (let index = 1; index < CONNECT_MAX_PARTICIPANTS; index++) {
        await ctx.db.insert("connectParticipants", {
          roomId, sessionId: `filler-${index}`, credentialHash: "x", name: `Filler ${index}`, isConnected: true,
          lastSeen: Date.now(), joinedAt: Date.now(), stepIndex: 0, attempt: 0, stats: emptyConnectStats(), results: [],
        });
      }
    });
    await rejectsCode(join(t, code, "late", second, "Late"), "full");
    expect((await join(t, code, "guest", guest, "Ana")).participantId).toBe(joined.participantId);
  });

  it("keeps removed participants out until they explicitly join again", async () => {
    const { t, roomId, code, hostArgs } = await setup();
    const { participantId } = await join(t, code);
    const self = { roomId, participantId, credential: guest };
    await t.mutation(api.connect.removeParticipant, { ...hostArgs, participantId });
    expect((await hostView(t, roomId)).participants).toEqual([]);
    expect(await t.query(api.connect.participantView, self)).toEqual({ state: "removed" });
    expect(await t.mutation(api.connect.participantHeartbeat, { participantId, credential: guest })).toEqual({ state: "removed" });
    await rejectsCode(t.mutation(api.connect.rejoin, { roomId, sessionId: "guest", credential: guest }), "removed");
    expect((await participantRow(t, participantId))?.removedAt).toBeDefined();

    expect((await join(t, code)).participantId).toBe(participantId);
    expect((await participantRow(t, participantId))?.removedAt).toBeUndefined();
    expect((await hostView(t, roomId)).participants).toHaveLength(1);
    expect((await t.query(api.connect.participantView, self)).state).toBe("ok");
  });

  it("handles leave, rejoin, heartbeat, and view states", async () => {
    const { t, roomId, code, hostArgs } = await setup();
    const { participantId } = await join(t, code);
    const beat = () => t.mutation(api.connect.participantHeartbeat, { participantId, credential: guest });
    expect(await beat()).toEqual({ state: "ok" });
    expect(await t.mutation(api.connect.participantHeartbeat, { participantId, credential: attacker })).toEqual({ state: "missing" });
    expect(await t.mutation(api.connect.participantHeartbeat, { participantId: "nonsense", credential: guest })).toEqual({ state: "missing" });
    expect(await t.query(api.connect.participantView, { roomId, participantId, credential: attacker })).toEqual({ state: "forbidden" });
    expect(await t.query(api.connect.participantView, { roomId: "nonsense", participantId, credential: guest })).toEqual({ state: "missing" });

    const view = await t.query(api.connect.participantView, { roomId, participantId, credential: guest });
    expect(view).toMatchObject({ state: "ok", room: { code, status: "lobby", pacing: "host" }, participant: { name: "Guest" } });
    if (view.state === "ok") expect(view.room).not.toHaveProperty("hostCredentialHash");

    await t.mutation(api.connect.leave, { participantId, credential: guest });
    expect((await hostView(t, roomId)).participants[0]).toMatchObject({ isConnected: false });
    expect(await beat()).toEqual({ state: "offline" });
    await rejectsCode(t.mutation(api.connect.rejoin, { roomId, sessionId: "nobody", credential: guest }), "not_member");
    await rejectsCode(t.mutation(api.connect.rejoin, { roomId, sessionId: "guest", credential: attacker }), "not_member");
    await rejectsCode(t.mutation(api.connect.rejoin, { roomId: "nonsense", sessionId: "guest", credential: guest }), "missing");
    expect(await t.mutation(api.connect.rejoin, { roomId, sessionId: "guest", credential: guest })).toEqual({ participantId });
    expect(await beat()).toEqual({ state: "ok" });
    const rejoined = await participantRow(t, participantId);
    expect(rejoined?.isConnected).toBe(true);
    expect(rejoined).not.toHaveProperty("leftAt");

    await t.mutation(api.connect.endRoom, hostArgs);
    expect(await t.query(api.connect.participantView, { roomId, participantId, credential: guest })).toEqual({ state: "ended" });
    await rejectsCode(t.mutation(api.connect.rejoin, { roomId, sessionId: "guest", credential: guest }), "ended");
    // Ending deletes memberships, so the heartbeat can only report the row as gone.
    expect(await beat()).toEqual({ state: "missing" });
  });
});

describe("Connect runs", () => {
  async function running(pacing: "host" | "participant" = "host", tests = [test("t1"), test("t2"), test("t3")]) {
    const ctx = await setup();
    await ctx.t.mutation(api.connect.setTests, { ...ctx.hostArgs, tests });
    if (pacing === "participant") await ctx.t.mutation(api.connect.updateRoom, { ...ctx.hostArgs, pacing });
    const { participantId } = await join(ctx.t, ctx.code);
    await ctx.t.mutation(api.connect.start, ctx.hostArgs);
    const report = (overrides: Partial<{ runVersion: number; stepIndex: number; attempt: number; stats: ConnectStats; typedText: string; credential: string }> = {}) =>
      ctx.t.mutation(api.connect.reportProgress, {
        participantId, credential: guest, runVersion: 1, stepIndex: 0, attempt: 0,
        stats: stats({ progress: 10, timeElapsed: 1000, wpm: 40, accuracy: 95 }), ...overrides,
      });
    return { ...ctx, participantId, report };
  }

  it("accepts progress only for the current run, step, and attempt", async () => {
    const { t, roomId, hostArgs, participantId, report } = await running();
    expect((await hostView(t, roomId)).room).toMatchObject({ status: "running", runVersion: 1, currentIndex: 0 });
    expect(await report({ typedText: "the" })).toEqual({ accepted: true });
    expect((await participantRow(t, participantId))).toMatchObject({ typedText: "the", stats: { progress: 10 } });
    expect(await report({ runVersion: 0 })).toEqual({ accepted: false });
    expect(await report({ stepIndex: 1 })).toEqual({ accepted: false });
    expect(await report({ attempt: 1 })).toEqual({ accepted: false });
    await expect(report({ stats: stats({ accuracy: 101 }) })).rejects.toThrow(/Invalid progress/);
    await expect(report({ stats: stats({ wpm: -1 }) })).rejects.toThrow(/Invalid progress/);
    await expect(report({ typedText: "x".repeat(20_001) })).rejects.toThrow(/too long/);
    await rejectsCode(report({ credential: attacker }), "forbidden");

    await t.mutation(api.connect.pause, hostArgs);
    expect(await report()).toEqual({ accepted: false });
    await t.mutation(api.connect.start, hostArgs);
    expect(await report({ stats: stats({ progress: 100, timeElapsed: 2000, isFinished: true }) })).toEqual({ accepted: true });
    expect(await report({ stats: stats({ progress: 20 }) })).toEqual({ accepted: false });
    expect((await participantRow(t, participantId))?.stats).toMatchObject({ progress: 100, isFinished: true });

    await t.mutation(api.connect.removeParticipant, { ...hostArgs, participantId });
    await t.mutation(api.connect.restartTest, hostArgs);
    expect(await report({ runVersion: 2 })).toEqual({ accepted: false });
  });

  it("rejects progress in the lobby", async () => {
    const { t, code } = await setup();
    const { participantId } = await join(t, code);
    expect(await t.mutation(api.connect.reportProgress, {
      participantId, credential: guest, runVersion: 0, stepIndex: 0, attempt: 0, stats: stats({ progress: 5 }),
    })).toEqual({ accepted: false });
  });

  it("pauses without changing the run and resumes in place", async () => {
    const { t, roomId, hostArgs, participantId, report } = await running();
    await report();
    await t.mutation(api.connect.pause, hostArgs);
    expect((await hostView(t, roomId)).room).toMatchObject({ status: "paused", runVersion: 1 });
    await t.mutation(api.connect.start, hostArgs);
    expect((await hostView(t, roomId)).room).toMatchObject({ status: "running", runVersion: 1, currentIndex: 0 });
    expect((await participantRow(t, participantId))?.stats.progress).toBe(10);
    await t.mutation(api.connect.resetRoom, hostArgs);
    await expect(t.mutation(api.connect.pause, hostArgs)).rejects.toThrow(/running/);
  });

  it("advances everyone under host pacing, archiving results until complete", async () => {
    const { t, roomId, hostArgs, participantId, report, code } = await running();
    await report({ stats: stats({ progress: 50, timeElapsed: 3000, wpm: 55, accuracy: 97 }) });
    await t.mutation(api.connect.goToTest, { ...hostArgs, index: 1 });
    expect((await hostView(t, roomId)).room).toMatchObject({ currentIndex: 1, runVersion: 2, status: "running" });
    const row = await participantRow(t, participantId);
    expect(row?.stats).toEqual(emptyConnectStats());
    expect(row?.stepIndex).toBe(1);
    expect(row?.results).toEqual([{ stepIndex: 0, testId: "t1", wpm: 55, accuracy: 97, progress: 50, wordsTyped: 0, timeElapsed: 3000, finished: false }]);
    expect(await report()).toEqual({ accepted: false });
    expect(await report({ runVersion: 2, stepIndex: 1 })).toEqual({ accepted: true });

    const late = await join(t, code, "late", second, "Late");
    expect((await participantRow(t, late.participantId))?.stepIndex).toBe(1);

    await t.mutation(api.connect.goToTest, { ...hostArgs, index: 3 });
    expect((await hostView(t, roomId)).room).toMatchObject({ currentIndex: 3, status: "complete", runVersion: 3 });
    expect((await participantRow(t, participantId))?.results.map((r) => r.stepIndex)).toEqual([0, 1]);
    expect((await participantRow(t, late.participantId))?.results).toEqual([]);
    await expect(t.mutation(api.connect.goToTest, { ...hostArgs, index: 4 })).rejects.toThrow();
    await expect(t.mutation(api.connect.goToTest, { ...hostArgs, index: -1 })).rejects.toThrow();

    await t.mutation(api.connect.start, hostArgs);
    expect((await hostView(t, roomId)).room).toMatchObject({ status: "running", currentIndex: 0, runVersion: 4 });
    expect((await participantRow(t, participantId))).toMatchObject({ results: [], stepIndex: 0 });
    await t.mutation(api.connect.resetRoom, hostArgs);
    await expect(t.mutation(api.connect.goToTest, { ...hostArgs, index: 1 })).rejects.toThrow(/Start/);
  });

  it("lets participants advance at their own pace and records completion", async () => {
    const { t, roomId, hostArgs, participantId, report } = await running("participant", [test("t1"), test("t2")]);
    const advance = (stepIndex: number, runVersion = 1) =>
      t.mutation(api.connect.advance, { participantId, credential: guest, runVersion, stepIndex });
    await expect(t.mutation(api.connect.goToTest, { ...hostArgs, index: 1 })).rejects.toThrow(/themselves/);
    await expect(t.mutation(api.connect.updateRoom, { ...hostArgs, pacing: "host" })).rejects.toThrow(/Pacing/);

    await report();
    expect(await advance(0)).toEqual({ accepted: false, stepIndex: 0, completed: false });
    await report({ stats: stats({ progress: 100, timeElapsed: 2000, wpm: 60, accuracy: 99, isFinished: true }) });
    expect(await advance(0, 0)).toMatchObject({ accepted: false });
    expect(await advance(0)).toEqual({ accepted: true, stepIndex: 1, completed: false });
    expect(await advance(0)).toEqual({ accepted: false, stepIndex: 1, completed: false });
    let row = await participantRow(t, participantId);
    expect(row).toMatchObject({ stepIndex: 1, stats: emptyConnectStats() });
    expect(row).not.toHaveProperty("completedAt");
    expect(row?.results).toMatchObject([{ stepIndex: 0, testId: "t1", finished: true, wpm: 60 }]);
    expect((await hostView(t, roomId)).room.currentIndex).toBe(0);

    expect(await report({ stepIndex: 0 })).toEqual({ accepted: false });
    await report({ stepIndex: 1, stats: stats({ progress: 100, timeElapsed: 1000, isFinished: true }) });
    expect(await advance(1)).toEqual({ accepted: true, stepIndex: 2, completed: true });
    row = await participantRow(t, participantId);
    expect(row?.completedAt).toBeTypeOf("number");
    expect(row?.results.map((r) => r.testId)).toEqual(["t1", "t2"]);
    expect(await report({ stepIndex: 2 })).toEqual({ accepted: false });

    // Appending a test after everyone finished lets finished participants continue.
    await t.mutation(api.connect.setTests, { ...hostArgs, tests: [test("t1"), test("t2"), test("t3")] });
    expect((await participantRow(t, participantId))?.completedAt).toBeUndefined();
    expect(await report({ stepIndex: 2 })).toEqual({ accepted: true });

    const hostPaced = await running("host");
    await expect(hostPaced.t.mutation(api.connect.advance, {
      participantId: hostPaced.participantId, credential: guest, runVersion: 1, stepIndex: 0,
    })).rejects.toThrow(/host moves/);
  });

  it("restarts the current test, resets the room, and resets one participant", async () => {
    const { t, roomId, hostArgs, participantId, report } = await running();
    await report();
    await t.mutation(api.connect.goToTest, { ...hostArgs, index: 1 });
    await report({ runVersion: 2, stepIndex: 1, typedText: "abc" });
    await t.mutation(api.connect.pause, hostArgs);
    await t.mutation(api.connect.restartTest, hostArgs);
    expect((await hostView(t, roomId)).room).toMatchObject({ status: "running", runVersion: 3, currentIndex: 1 });
    let row = await participantRow(t, participantId);
    expect(row).toMatchObject({ stats: emptyConnectStats(), stepIndex: 1 });
    expect(row).not.toHaveProperty("typedText");
    expect(row?.results).toHaveLength(1);

    await report({ runVersion: 3, stepIndex: 1 });
    await t.mutation(api.connect.resetParticipant, { ...hostArgs, participantId });
    row = await participantRow(t, participantId);
    expect(row).toMatchObject({ attempt: 1, stats: emptyConnectStats() });
    expect(row?.results).toHaveLength(1);
    expect(await report({ runVersion: 3, stepIndex: 1, attempt: 0 })).toEqual({ accepted: false });
    expect(await report({ runVersion: 3, stepIndex: 1, attempt: 1 })).toEqual({ accepted: true });

    await t.mutation(api.connect.resetRoom, hostArgs);
    expect((await hostView(t, roomId)).room).toMatchObject({ status: "lobby", runVersion: 4, currentIndex: 0 });
    row = await participantRow(t, participantId);
    expect(row).toMatchObject({ results: [], stepIndex: 0, stats: emptyConnectStats() });
    expect(row).not.toHaveProperty("completedAt");
    await expect(t.mutation(api.connect.restartTest, hostArgs)).rejects.toThrow(/Start/);
  });

  it("locks tests that have been reached while the room is running", async () => {
    const { t, roomId, hostArgs } = await running("host", [test("t1"), test("t2"), test("t3")]);
    const setTests = (tests: ConnectTest[]) => t.mutation(api.connect.setTests, { ...hostArgs, tests });
    await t.mutation(api.connect.goToTest, { ...hostArgs, index: 1 });
    const locked = /already reached/;
    await expect(setTests([test("t1", { duration: 60 }), test("t2"), test("t3")])).rejects.toThrow(locked);
    await expect(setTests([test("t1"), test("t2", { mode: "words" }), test("t3")])).rejects.toThrow(locked);
    await expect(setTests([test("t2"), test("t1"), test("t3")])).rejects.toThrow(locked);
    await expect(setTests([test("t1")])).rejects.toThrow(locked);
    await setTests([test("t1"), test("t2"), test("t3", { mode: "words", wordTarget: 10 })]);
    await setTests([test("t1"), test("t2"), test("t3"), test("t4")]);
    await setTests([test("t1"), test("t2")]);
    expect((await hostView(t, roomId)).room.tests.map((item) => item.id)).toEqual(["t1", "t2"]);

    await expect(setTests([test("t1"), test("t1")])).rejects.toThrow(/duplicates/);
    await expect(setTests([])).rejects.toThrow(/from 1 to 50/);
    await expect(setTests(Array.from({ length: 51 }, (_, index) => test(`n${index}`)))).rejects.toThrow(/from 1 to 50/);
    await expect(setTests([test("t1"), test("t2"), test("bad", { duration: 0 })])).rejects.toThrow(/duration/);

    await t.mutation(api.connect.resetRoom, hostArgs);
    await setTests([test("fresh", { duration: 15 })]);

    const paced = await running("participant", [test("p1"), test("p2"), test("p3")]);
    await paced.report({ stats: stats({ progress: 100, isFinished: true }) });
    await paced.t.mutation(api.connect.advance, { participantId: paced.participantId, credential: guest, runVersion: 1, stepIndex: 0 });
    const setPaced = (tests: ConnectTest[]) => paced.t.mutation(api.connect.setTests, { ...paced.hostArgs, tests });
    await expect(setPaced([test("p1"), test("p2", { duration: 45 }), test("p3")])).rejects.toThrow(locked);
    await setPaced([test("p1"), test("p2"), test("p3", { duration: 45 })]);
  });

  it("changes pacing and overrides through updateRoom", async () => {
    const { t, roomId, hostArgs } = await setup();
    await t.mutation(api.connect.updateRoom, {
      ...hostArgs, name: "Room 12", hostName: "Mr. B", pacing: "participant",
      overrides: { theme: { enabled: true, themeId: "nord", mode: "dark" }, ghost: { enabled: false, ghostWriterEnabled: true, ghostWriterSpeed: 50 } },
    });
    expect((await hostView(t, roomId)).room).toMatchObject({
      name: "Room 12", hostName: "Mr. B", pacing: "participant",
      overrides: { theme: { enabled: true, themeId: "nord", mode: "dark" }, ghost: { enabled: false } },
    });
    await expect(t.mutation(api.connect.updateRoom, {
      ...hostArgs, overrides: { ghost: { enabled: true, ghostWriterEnabled: true, ghostWriterSpeed: 999 } },
    })).rejects.toThrow(/ghost speed/);
    await expect(t.mutation(api.connect.updateRoom, { ...hostArgs, name: " " })).rejects.toThrow(/room name/);
    await t.mutation(api.connect.start, hostArgs);
    await t.mutation(api.connect.updateRoom, { ...hostArgs, overrides: {} });
    await t.mutation(api.connect.updateRoom, { ...hostArgs, pacing: "participant" });
    await expect(t.mutation(api.connect.updateRoom, { ...hostArgs, pacing: "host" })).rejects.toThrow(/Pacing/);
  });
});

describe("Connect lifecycle", () => {
  it("ends a room by deleting members and releasing its code", async () => {
    const { t, roomId, code, hostArgs } = await setup();
    await join(t, code);
    await join(t, code, "second", second, "Second");
    await t.mutation(api.connect.endRoom, hostArgs);
    const room = await t.run(async (ctx) => await ctx.db.get(roomId));
    expect(room).toMatchObject({ status: "lobby" });
    expect(room).not.toHaveProperty("code");
    expect(room?.endedAt).toBeTypeOf("number");
    const left = await t.run(async (ctx) => await ctx.db.query("connectParticipants").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect());
    expect(left).toEqual([]);
    expect(await t.query(api.connect.hostView, hostArgs)).toEqual({ state: "ended", room: { _id: roomId, name: "Ms. Host's room" } });
    expect(await t.query(api.connect.lookupCode, { code })).toBeNull();
    expect(await t.mutation(api.connect.hostHeartbeat, hostArgs)).toEqual({ state: "ended" });
    await rejectsCode(t.mutation(api.connect.start, hostArgs), "ended");
    await rejectsCode(join(t, code, "new", attacker, "New"), "not_found");
  });

  it("lists recent rooms for this browser and for the signed-in owner", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    vi.setSystemTime(start);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner" });
    const older = await owner.mutation(api.connect.createRoom, { hostName: "Owner", credential: host, name: "Older" });
    await t.mutation(api.connect.endRoom, { roomId: older.roomId, credential: host });
    vi.setSystemTime(start + 1000);
    const newer = await t.mutation(api.connect.createRoom, { hostName: "Anon", credential: host, name: "Newer" });
    await t.mutation(api.connect.createRoom, { hostName: "Else", credential: attacker, name: "Someone else" });

    const mine = await t.query(api.connect.recentRooms, { credential: host });
    expect(mine.map((room) => room.name)).toEqual(["Newer", "Older"]);
    expect(mine[0]).toMatchObject({ _id: newer.roomId, live: true, code: newer.code, hostName: "Anon", testCount: 1 });
    expect(mine[1]).toMatchObject({ _id: older.roomId, live: false });
    expect(mine[1]).not.toHaveProperty("code");
    expect(mine[1].endedAt).toBeTypeOf("number");

    expect((await owner.query(api.connect.recentRooms, { credential: second })).map((room) => room.name)).toEqual(["Older"]);
    expect(await t.query(api.connect.recentRooms, { credential: second })).toEqual([]);
    expect(await t.withIdentity({ subject: "stranger" }).query(api.connect.recentRooms, { credential: second })).toEqual([]);
    expect(await t.query(api.connect.recentRooms, { credential: "bad" })).toEqual([]);

    // Idle expiry counts as the end time even before cleanup runs.
    const idleAt = start + 1000 + CONNECT_LIVE_IDLE_MS;
    vi.setSystemTime(idleAt + 1);
    const expired = (await t.query(api.connect.recentRooms, { credential: host }))[0];
    expect(expired).toMatchObject({ name: "Newer", live: false, endedAt: idleAt });
    expect(expired).not.toHaveProperty("code");
    vi.setSystemTime(idleAt + CONNECT_ARCHIVE_MS + 1);
    expect((await t.query(api.connect.recentRooms, { credential: host })).map((room) => room.name)).toEqual([]);
  });

  it("reopens with a fresh code and credential, including for the owner on another device", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner" });
    const created = await owner.mutation(api.connect.createRoom, { hostName: "Owner", credential: host });
    const { roomId } = created;
    const { participantId } = await join(t, created.code);
    await t.mutation(api.connect.start, { roomId, credential: host });

    expect(await t.mutation(api.connect.reopenRoom, { roomId, credential: host })).toEqual({ roomId, code: created.code });
    expect((await hostView(t, roomId)).room).toMatchObject({ status: "running", runVersion: 1 });

    await t.mutation(api.connect.endRoom, { roomId, credential: host });
    await rejectsCode(t.withIdentity({ subject: "stranger" }).mutation(api.connect.reopenRoom, { roomId, credential: attacker }), "forbidden");
    await rejectsCode(t.mutation(api.connect.reopenRoom, { roomId, credential: second }), "forbidden");

    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementationOnce(<A extends ArrayBufferView | null>(array: A) => {
      (array as unknown as Uint8Array).set(created.code === "ABCD" ? [4, 5, 6, 7] : [0, 1, 2, 3]);
      return array;
    });
    const reopened = await owner.mutation(api.connect.reopenRoom, { roomId, credential: second });
    expect(reopened.roomId).toBe(roomId);
    expect(reopened.code).toMatch(codePattern);
    expect(reopened.code).not.toBe(created.code);
    expect(await t.query(api.connect.hostView, { roomId, credential: host })).toEqual({ state: "forbidden" });
    const view = await hostView(t, roomId, second);
    expect(view.room).toMatchObject({ status: "lobby", currentIndex: 0, runVersion: 2, code: reopened.code });
    expect(view.room.endedAt).toBeUndefined();
    expect(view.participants).toEqual([]);
    expect(await participantRow(t, participantId)).toBeNull();
    expect(await t.query(api.connect.lookupCode, { code: reopened.code })).not.toBeNull();

    await t.mutation(api.connect.endRoom, { roomId, credential: second });
    expect((await t.mutation(api.connect.reopenRoom, { roomId, credential: second })).code).toMatch(codePattern);

    // A signed-in owner can take over hosting a live room from another device without changing its code.
    const current = await hostView(t, roomId, second);
    expect(await owner.mutation(api.connect.reopenRoom, { roomId, credential: host })).toEqual({ roomId, code: current.room.code });
    expect((await t.query(api.connect.hostView, { roomId, credential: second })).state).toBe("forbidden");
  });

  it("refuses to reopen rooms outside the archive window", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    vi.setSystemTime(start);
    const { t, roomId, hostArgs } = await setup();
    await t.mutation(api.connect.endRoom, hostArgs);
    vi.setSystemTime(start + CONNECT_ARCHIVE_MS + 1);
    await rejectsCode(t.mutation(api.connect.reopenRoom, hostArgs), "ended");
    expect(await t.run(async (ctx) => await ctx.db.get(roomId))).not.toBeNull();
  });

  it("cleans up presence, idle rooms, and archived rooms", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    vi.setSystemTime(start);
    const { t, roomId, code, hostArgs } = await setup();
    const quiet = await join(t, code);
    const active = await join(t, code, "second", second, "Second");
    const cleanup = () => t.mutation(internal.connectCleanup.cleanup, {});

    vi.setSystemTime(start + CONNECT_OFFLINE_AFTER_MS - 1);
    await cleanup();
    expect((await participantRow(t, quiet.participantId))?.isConnected).toBe(true);
    await t.mutation(api.connect.participantHeartbeat, { participantId: active.participantId, credential: second });
    vi.setSystemTime(start + CONNECT_OFFLINE_AFTER_MS + 1);
    await cleanup();
    expect((await participantRow(t, quiet.participantId))?.isConnected).toBe(false);
    expect((await participantRow(t, active.participantId))?.isConnected).toBe(true);
    expect((await hostView(t, roomId)).participants).toHaveLength(2);
    expect(await t.mutation(api.connect.participantHeartbeat, { participantId: quiet.participantId, credential: guest })).toEqual({ state: "ok" });
    expect((await participantRow(t, quiet.participantId))?.isConnected).toBe(true);

    const keptAlive = start + CONNECT_LIVE_IDLE_MS / 2;
    vi.setSystemTime(keptAlive);
    await t.mutation(api.connect.hostHeartbeat, hostArgs);
    vi.setSystemTime(start + CONNECT_LIVE_IDLE_MS + 1);
    await cleanup();
    expect((await t.run(async (ctx) => await ctx.db.get(roomId)))?.endedAt).toBeUndefined();

    const idleAt = keptAlive + CONNECT_LIVE_IDLE_MS + 1;
    vi.setSystemTime(idleAt);
    expect(await t.query(api.connect.lookupCode, { code })).toBeNull();
    await cleanup();
    const ended = await t.run(async (ctx) => await ctx.db.get(roomId));
    expect(ended).toMatchObject({ endedAt: idleAt });
    expect(ended).not.toHaveProperty("code");
    expect(await participantRow(t, quiet.participantId)).toBeNull();

    vi.setSystemTime(idleAt + CONNECT_ARCHIVE_MS - 1);
    await cleanup();
    expect(await t.run(async (ctx) => await ctx.db.get(roomId))).not.toBeNull();
    vi.setSystemTime(idleAt + CONNECT_ARCHIVE_MS + 1);
    await cleanup();
    expect(await t.run(async (ctx) => await ctx.db.get(roomId))).toBeNull();
    expect(await t.query(api.connect.hostView, hostArgs)).toEqual({ state: "missing" });
  });
});
