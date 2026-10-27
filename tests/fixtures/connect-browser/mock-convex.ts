import { useCallback, useSyncExternalStore } from "react";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import {
  DEFAULT_CONNECT_TEST,
  emptyConnectStats,
  type ConnectOverrides,
  type ConnectPacing,
  type ConnectResult,
  type ConnectRoomStatus,
  type ConnectStats,
  type ConnectTest,
} from "@/lib/connect-types";
import { SELF_SESSION } from "./identity";

// In-memory stand-in for `convex/connect.ts`. Views mirror the server's
// projections; mutations apply the same state transitions the fixture needs.
// Anything unmocked throws so it cannot fall through to a real service.

type Reference = Parameters<typeof getFunctionName>[0];
type Args = Record<string, unknown>;

type Room = {
  _id: string;
  _creationTime: number;
  code?: string;
  name: string;
  hostName: string;
  tests: ConnectTest[];
  pacing: ConnectPacing;
  overrides: ConnectOverrides;
  status: ConnectRoomStatus;
  currentIndex: number;
  runVersion: number;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  endedAt?: number;
  /** Fixture-only: hosted from this browser, so it appears in recent rooms and host views. */
  hosted: boolean;
};

type Participant = {
  _id: string;
  _creationTime: number;
  roomId: string;
  sessionId: string;
  name: string;
  avatarUrl?: string;
  signedIn?: boolean;
  isConnected: boolean;
  lastSeen: number;
  joinedAt: number;
  leftAt?: number;
  removedAt?: number;
  stepIndex: number;
  attempt: number;
  stats: ConnectStats;
  typedText?: string;
  targetText?: string;
  results: ConnectResult[];
  completedAt?: number;
};

const now = Date.now();
const test = (patch: Partial<ConnectTest> & { id: string }): ConnectTest => ({ ...DEFAULT_CONNECT_TEST, ...patch });

export const FIXTURE_TESTS = {
  warmUp: test({ id: "t1", mode: "preset", presetText: "the cat sat", presetModeType: "finish", title: "Warm up" }),
  timed: test({ id: "t2", mode: "time", duration: 30 }),
  sprint: test({ id: "t3", mode: "preset", presetText: "a dog ran", presetModeType: "finish", title: "Sprint" }),
  words: test({ id: "t4", mode: "words", wordTarget: 25 }),
};
const fourTests = [FIXTURE_TESTS.warmUp, FIXTURE_TESTS.timed, FIXTURE_TESTS.sprint, FIXTURE_TESTS.words];

function makeRoom(patch: Partial<Room> & { _id: string }): Room {
  return {
    _creationTime: now - 3_600_000, code: "ABCD", name: "Period 3", hostName: "Ms. Rivera",
    tests: fourTests, pacing: "host", overrides: {}, status: "lobby", currentIndex: 0, runVersion: 1,
    createdAt: now - 3_600_000, lastActiveAt: now - 60_000, expiresAt: now + 3_600_000, hosted: true, ...patch,
  };
}

let joinSeq = 0;
function makeParticipant(name: string, patch: Partial<Omit<Participant, "stats">> & { stats?: Partial<ConnectStats> } = {}): Participant {
  joinSeq += 1;
  const { stats, ...rest } = patch;
  return {
    _id: `p-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, _creationTime: now, roomId: "room-live",
    sessionId: `session-${name}`, name, isConnected: true, lastSeen: now, joinedAt: now - 1000 + joinSeq,
    stepIndex: 0, attempt: 0, results: [], ...rest, stats: { ...emptyConnectStats(), ...stats },
  };
}

// A local picture, so the board shows an account avatar without any network request.
const FIXTURE_AVATAR = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='#7c5cff'/></svg>")}`;

/** Local stand-ins for account pictures: a coloured backdrop with a head-and-shoulders shape. */
const portrait = (from: string, to: string, skin: string) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x2='1' y2='1'><stop stop-color='${from}'/><stop offset='1' stop-color='${to}'/></linearGradient></defs><rect width='64' height='64' fill='url(#g)'/><circle cx='32' cy='26' r='12' fill='${skin}'/><path d='M10 64c2-14 11-20 22-20s20 6 22 20z' fill='${skin}' opacity='.9'/></svg>`,
)}`;

const result = (stepIndex: number, testId: string, wpm: number, accuracy: number): ConnectResult => ({
  stepIndex, testId, wpm, accuracy, progress: 100, wordsTyped: 10, timeElapsed: 30_000, finished: true,
});

/** Seeds one scenario per page load: `?fixture=<name>`. */
function seed(name: string): { rooms: Room[]; participants: Participant[] } {
  const endedRoom = makeRoom({
    _id: "room-ended", code: undefined, name: "Period 2", status: "lobby", tests: [FIXTURE_TESTS.timed],
    endedAt: now - 2 * 3_600_000, lastActiveAt: now - 2 * 3_600_000,
  });
  const self = (patch: Parameters<typeof makeParticipant>[1] = {}) =>
    makeParticipant("Alex", { _id: "p-self", sessionId: SELF_SESSION, ...patch });
  switch (name) {
    case "landing":
      return { rooms: [makeRoom({ _id: "room-live", status: "running" }), endedRoom], participants: [] };
    case "host":
      return {
        rooms: [makeRoom({ _id: "room-live", status: "running", currentIndex: 1 })],
        participants: [
          makeParticipant("Bea", { stepIndex: 1, signedIn: true, avatarUrl: FIXTURE_AVATAR, stats: { wpm: 52, accuracy: 97, progress: 40, timeElapsed: 12_000, wordsTyped: 10 }, results: [result(0, "t1", 48, 96)] }),
          makeParticipant("Cam", { stepIndex: 1, stats: { wpm: 31, accuracy: 90, progress: 20, timeElapsed: 12_000, wordsTyped: 5 } }),
          makeParticipant("Dev", { stepIndex: 1, isConnected: false }),
        ],
      };
    // A busy classroom for screenshots (scripts/capture-changelog-shots.mjs): accounts with pictures and guests with letters.
    case "showcase": {
      const live = (name: string, wpm: number, accuracy: number, progress: number, patch: Parameters<typeof makeParticipant>[1] = {}) =>
        makeParticipant(name, { stepIndex: 1, results: [result(0, "t1", wpm - 4, accuracy - 1)], stats: { wpm, accuracy, progress, timeElapsed: 30_000 * progress / 100, wordsTyped: Math.round(wpm * progress / 200) }, ...patch });
      return {
        rooms: [makeRoom({ _id: "room-live", status: "running", currentIndex: 1 })],
        participants: [
          live("Maya", 64, 98, 62, { signedIn: true, avatarUrl: portrait("#f59e0b", "#ef4444", "#fde7d0") }),
          live("Jonah", 48, 95, 55),
          live("Priya", 71, 99, 64, { signedIn: true, avatarUrl: portrait("#06b6d4", "#6366f1", "#8d5a3b") }),
          live("Leo", 39, 91, 48),
          live("Sofia", 57, 97, 60, { signedIn: true, avatarUrl: portrait("#22c55e", "#0ea5e9", "#c68a5e") }),
          live("Theo", 33, 88, 41),
          live("Ava", 52, 96, 57, { signedIn: true, avatarUrl: portrait("#ec4899", "#8b5cf6", "#f1c7a5") }),
          live("Sam", 44, 93, 52),
        ],
      };
    }
    case "host-lobby":
      return { rooms: [makeRoom({ _id: "room-live" })], participants: [makeParticipant("Bea")] };
    case "board-self":
      return {
        rooms: [makeRoom({ _id: "room-live", status: "running", pacing: "participant" })],
        participants: [
          makeParticipant("Bea", { stepIndex: 2, stats: { wpm: 60, accuracy: 98, progress: 50, timeElapsed: 5000, wordsTyped: 2 }, results: [result(0, "t1", 55, 97), result(1, "t2", 58, 96)] }),
          makeParticipant("Cam", { stepIndex: 0, stats: { wpm: 20, accuracy: 85, progress: 30, timeElapsed: 4000, wordsTyped: 1 } }),
          makeParticipant("Dev", { stepIndex: 4, completedAt: now - 1000, results: [result(0, "t1", 40, 92), result(1, "t2", 42, 93), result(2, "t3", 44, 94), result(3, "t4", 46, 95)] }),
        ],
      };
    case "room-lobby":
      return { rooms: [makeRoom({ _id: "room-live" })], participants: [self()] };
    case "room-host":
      return { rooms: [makeRoom({ _id: "room-live", status: "running" })], participants: [self()] };
    case "room-self":
      return {
        rooms: [makeRoom({ _id: "room-live", status: "running", pacing: "participant", tests: [FIXTURE_TESTS.warmUp, FIXTURE_TESTS.sprint] })],
        participants: [self()],
      };
    case "room-removed":
      return { rooms: [makeRoom({ _id: "room-live", status: "running" })], participants: [self({ removedAt: now - 1000, isConnected: false })] };
    default:
      throw new Error(`Unknown Connect fixture ${name}`);
  }
}

const scenario = new URLSearchParams(window.location.search).get("fixture") ?? "landing";
let state = seed(scenario);
const listeners = new Set<() => void>();
const calls: { name: string; args: Args }[] = [];
const failures = new Set<string>();

function publish() {
  state = { rooms: [...state.rooms], participants: [...state.participants] };
  listeners.forEach((listener) => listener());
}

const roomById = (id: unknown) => state.rooms.find((room) => room._id === id);
const isLive = (room: Room) => room.endedAt === undefined && room.expiresAt > Date.now();
const connectError = (code: string, message: string) => new ConvexError({ code, message });

function patchRoom(id: string, patch: Partial<Room>) {
  state.rooms = state.rooms.map((room) => (room._id === id ? { ...room, ...patch } : room));
  publish();
}

function patchParticipant(id: string, patch: Partial<Participant>) {
  state.participants = state.participants.map((p) => (p._id === id ? { ...p, ...patch } : p));
  publish();
}

function requireHost(args: Args) {
  const room = roomById(args.roomId);
  if (!room) throw connectError("missing", "This room no longer exists");
  if (!room.hosted) throw connectError("forbidden", "Only the room host can do that");
  return room;
}

const membersOf = (roomId: string) => state.participants.filter((p) => p.roomId === roomId);

function publicRoom(room: Room) {
  const { hosted, ...rest } = room;
  void hosted;
  return rest;
}

function publicParticipant(participant: Participant) {
  const { sessionId, typedText, targetText, ...rest } = participant;
  void sessionId; void typedText; void targetText;
  // The server always reports whether a seat belongs to an account.
  return { ...rest, signedIn: rest.signedIn === true };
}

function hostView(args: Args) {
  const room = roomById(args.roomId);
  if (!room) return { state: "missing" as const };
  if (!room.hosted) return { state: "forbidden" as const };
  if (!isLive(room)) return { state: "ended" as const, room: { _id: room._id, name: room.name } };
  const participants = membersOf(room._id)
    .filter((p) => p.removedAt === undefined)
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map(publicParticipant);
  return { state: "ok" as const, room: publicRoom(room), participants };
}

function participantView(args: Args) {
  const room = roomById(args.roomId);
  if (!room) return { state: "missing" as const };
  if (!isLive(room)) return { state: "ended" as const };
  const participant = state.participants.find((p) => p._id === args.participantId && p.roomId === room._id);
  if (!participant) return { state: "missing" as const };
  if (participant.removedAt !== undefined) return { state: "removed" as const };
  const { _id, code, name, hostName, status, pacing, currentIndex, runVersion, tests, overrides } = room;
  const { sessionId, roomId, ...self } = participant;
  void sessionId; void roomId;
  return {
    state: "ok" as const,
    room: { _id, code, name, hostName, status, pacing, currentIndex, runVersion, tests, overrides },
    participant: { ...self, signedIn: self.signedIn === true },
  };
}

function recentRooms() {
  return state.rooms
    .filter((room) => room.hosted)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    .map((room) => {
      const live = isLive(room);
      return {
        _id: room._id, name: room.name, hostName: room.hostName, code: live ? room.code : undefined, live,
        endedAt: live ? undefined : room.endedAt, createdAt: room.createdAt, lastActiveAt: room.lastActiveAt,
        testCount: room.tests.length,
      };
    });
}

function lookupCode(args: Args) {
  const room = state.rooms.find((candidate) => candidate.code === args.code && isLive(candidate));
  return room ? { name: room.name, hostName: room.hostName } : null;
}

const effectiveStep = (room: Room, participant: Participant) => (room.pacing === "host" ? room.currentIndex : participant.stepIndex);

function withResult(results: ConnectResult[], stepIndex: number, testId: string, stats: ConnectStats) {
  const entry: ConnectResult = {
    stepIndex, testId, wpm: stats.wpm, accuracy: stats.accuracy, progress: stats.progress,
    wordsTyped: stats.wordsTyped, timeElapsed: stats.timeElapsed, finished: stats.isFinished,
  };
  return [...results.filter((item) => item.stepIndex !== stepIndex), entry].sort((a, b) => a.stepIndex - b.stepIndex);
}

const clearedAttempt = () => ({ stats: emptyConnectStats(), typedText: undefined, targetText: undefined });

function participantFor(args: Args) {
  const participant = state.participants.find((p) => p._id === args.participantId);
  const room = participant && roomById(participant.roomId);
  if (!participant || !room) throw connectError("missing", "This room no longer exists");
  return { participant, room };
}

const mutations: Record<string, (args: Args) => unknown> = {
  "connect:hostHeartbeat": (args) => ({ state: hostView(args).state }),
  "connect:participantHeartbeat": (args) => {
    const { participant, room } = participantFor(args);
    if (!isLive(room)) return { state: "ended" };
    if (participant.removedAt !== undefined) return { state: "removed" };
    return { state: "ok" };
  },
  "connect:createRoom": (args) => {
    const room = makeRoom({ _id: "room-new", code: "WXYZ", hostName: String(args.hostName), name: String(args.name ?? `${String(args.hostName)}'s room`), tests: [FIXTURE_TESTS.timed] });
    state.rooms = [...state.rooms, room];
    publish();
    return { roomId: room._id, code: room.code };
  },
  "connect:reopenRoom": (args) => {
    const room = requireHost(args);
    if (isLive(room)) return { roomId: room._id, code: room.code };
    patchRoom(room._id, { code: "QRST", endedAt: undefined, status: "lobby", currentIndex: 0, runVersion: room.runVersion + 1, lastActiveAt: Date.now(), expiresAt: Date.now() + 3_600_000 });
    return { roomId: room._id, code: "QRST" };
  },
  "connect:updateRoom": (args) => {
    const room = requireHost(args);
    const patch: Partial<Room> = {};
    if (typeof args.name === "string") patch.name = args.name;
    if (args.pacing !== undefined && args.pacing !== room.pacing) {
      if (room.status !== "lobby") throw new Error("Pacing can only change before the room starts");
      patch.pacing = args.pacing as ConnectPacing;
    }
    if (args.overrides !== undefined) patch.overrides = args.overrides as ConnectOverrides;
    patchRoom(room._id, patch);
    return null;
  },
  "connect:setTests": (args) => {
    const room = requireHost(args);
    patchRoom(room._id, { tests: args.tests as ConnectTest[] });
    return null;
  },
  "connect:start": (args) => {
    const room = requireHost(args);
    if (room.status === "paused") patchRoom(room._id, { status: "running" });
    else if (room.status !== "running") patchRoom(room._id, { status: "running", currentIndex: 0, runVersion: room.runVersion + 1 });
    return null;
  },
  "connect:pause": (args) => {
    const room = requireHost(args);
    patchRoom(room._id, { status: "paused" });
    return null;
  },
  "connect:goToTest": (args) => {
    const room = requireHost(args);
    const index = Number(args.index);
    for (const p of membersOf(room._id)) patchParticipant(p._id, { ...clearedAttempt(), stepIndex: index });
    patchRoom(room._id, { currentIndex: index, runVersion: room.runVersion + 1, status: index === room.tests.length ? "complete" : "running" });
    return null;
  },
  "connect:endRoom": (args) => {
    const room = requireHost(args);
    patchRoom(room._id, { endedAt: Date.now(), code: undefined });
    return null;
  },
  "connect:removeParticipant": (args) => {
    requireHost(args);
    patchParticipant(String(args.participantId), { removedAt: Date.now(), isConnected: false });
    return null;
  },
  "connect:rejoin": (args) => {
    const room = roomById(args.roomId);
    if (!room) throw connectError("missing", "This room no longer exists");
    if (!isLive(room)) throw connectError("ended", "This room has ended");
    const participant = membersOf(room._id).find((p) => p.sessionId === args.sessionId);
    if (!participant) throw connectError("not_member", "Join this room first");
    if (participant.removedAt !== undefined) throw connectError("removed", "The host removed you from this room");
    patchParticipant(participant._id, { isConnected: true, lastSeen: Date.now(), leftAt: undefined });
    return { participantId: participant._id };
  },
  "connect:join": (args) => {
    const room = state.rooms.find((candidate) => candidate.code === args.code && isLive(candidate));
    if (!room) throw connectError("not_found", "No open room uses that code");
    const existing = membersOf(room._id).find((p) => p.sessionId === args.sessionId);
    if (existing) return { roomId: room._id, participantId: existing._id };
    const participant = makeParticipant(String(args.name), { _id: "p-self", roomId: room._id, sessionId: String(args.sessionId), stepIndex: room.pacing === "host" ? room.currentIndex : 0 });
    state.participants = [...state.participants, participant];
    publish();
    return { roomId: room._id, participantId: participant._id };
  },
  "connect:reportProgress": (args) => {
    const { participant, room } = participantFor(args);
    const accepted = isLive(room) && room.status === "running" && room.runVersion === args.runVersion &&
      participant.removedAt === undefined && participant.completedAt === undefined && participant.attempt === args.attempt &&
      effectiveStep(room, participant) === args.stepIndex && !participant.stats.isFinished;
    if (!accepted) return { accepted: false };
    patchParticipant(participant._id, {
      stats: args.stats as ConnectStats, typedText: args.typedText as string | undefined,
      targetText: args.targetText as string | undefined, isConnected: true, lastSeen: Date.now(),
    });
    return { accepted: true };
  },
  "connect:advance": (args) => {
    const { participant, room } = participantFor(args);
    if (room.pacing !== "participant") throw new Error("The host moves everyone to the next test in this room");
    const current = room.tests[participant.stepIndex];
    const ok = room.status === "running" && room.runVersion === args.runVersion && participant.stepIndex === args.stepIndex &&
      participant.completedAt === undefined && participant.stats.isFinished && current !== undefined;
    if (!ok) return { accepted: false, stepIndex: participant.stepIndex, completed: participant.completedAt !== undefined };
    const stepIndex = participant.stepIndex + 1;
    const completed = stepIndex >= room.tests.length;
    patchParticipant(participant._id, {
      ...clearedAttempt(), results: withResult(participant.results, participant.stepIndex, current.id, participant.stats),
      stepIndex, completedAt: completed ? Date.now() : undefined,
    });
    return { accepted: true, stepIndex, completed };
  },
  "connect:leave": (args) => {
    patchParticipant(String(args.participantId), { leftAt: Date.now(), isConnected: false });
    return null;
  },
};

const queries: Record<string, (args: Args) => unknown> = {
  "connect:hostView": hostView,
  "connect:participantView": participantView,
  "connect:recentRooms": recentRooms,
  "connect:lookupCode": lookupCode,
};

/** Test-side handle: inspect calls, simulate host actions from "another tab", force failures. */
const controller = {
  calls,
  snapshot: () => state,
  fail: (name: string, enabled = true) => (enabled ? failures.add(name) : failures.delete(name)),
  host: (name: string, args: Args = {}) => mutations[`connect:${name}`]({ roomId: "room-live", credential: "host", ...args }),
};
declare global {
  interface Window {
    __connectFixture: typeof controller;
  }
}
Object.assign(window, { __connectFixture: controller });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

// Snapshots are cached per store revision so useSyncExternalStore sees stable values.
const cache = new WeakMap<object, Map<string, unknown>>();
function read(name: string, args: Args) {
  let entries = cache.get(state);
  if (!entries) cache.set(state, (entries = new Map()));
  const key = `${name}:${JSON.stringify(args)}`;
  if (!entries.has(key)) entries.set(key, queries[name](args));
  return entries.get(key);
}

export function useQuery(reference: Reference, args?: unknown) {
  const name = getFunctionName(reference);
  const snapshot = useSyncExternalStore(subscribe, () => (args === "skip" ? undefined : state));
  if (args === "skip" || !snapshot) return undefined;
  if (!queries[name]) throw new Error(`Unmocked query ${name}`);
  return read(name, (args ?? {}) as Args);
}

export function useMutation(reference: Reference) {
  const name = getFunctionName(reference);
  return useCallback(async (args: Args) => {
    calls.push({ name, args });
    const run = mutations[name];
    if (!run) throw new Error(`Fixture blocked unmocked mutation ${name}`);
    await Promise.resolve();
    if (failures.has(name)) throw new Error("Fixture mutation rejected");
    return run(args);
  }, [name]);
}

export const useConvexAuth = () => ({ isLoading: false, isAuthenticated: false });
