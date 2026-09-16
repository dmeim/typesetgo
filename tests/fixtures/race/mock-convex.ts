import { useSyncExternalStore } from "react";
import { getFunctionName } from "convex/server";
import { raceFixture } from "../../unit/fixtures/race-state";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { RaceParticipant } from "../../unit/fixtures/race-state";

const fixture = raceFixture();
const mode = new URLSearchParams(window.location.search).get("fixture");
let room: Doc<"rooms"> | null | undefined = fixture.room;
let participant = fixture.participant;
let results: Doc<"raceResults"> | null = fixture.results;
if (mode === "loading") room = undefined;
if (mode === "missing") room = null;
if (mode === "active" || mode === "legacy") {
  room = {
    ...fixture.room,
    status: "active",
    raceStartTime: Date.now() - 10000,
    targetText: "hello world racing",
  };
  participant = {
    ...participant,
    typedText: mode === "legacy" ? undefined : "helxo ",
    typedProgress: 3,
    stats: { ...participant.stats, progress: 18, timeElapsed: 4000 },
  };
}
if (mode === "results" || mode === "spectator" || mode === "no-results")
  room = {
    ...fixture.room,
    status: "active",
    raceStartTime: 1,
    raceEndTime: 2,
  };
if (mode === "spectator")
  results = {
    ...fixture.results,
    rankings: fixture.results.rankings.filter(
      (ranking) => ranking.sessionId !== "self",
    ),
  };
if (mode === "no-results") results = null;
let state = {
  room,
  participant,
  participants: [
    participant,
    ...Array.from({ length: mode === "active" ? 2 : 6 }, (_, index) => ({
      ...participant,
      _id: `other-${index}` as RaceParticipant["_id"],
      sessionId: `other-${index}`,
      name: `AnExceptionallyLongUnbrokenRacerName${index}`,
      typedText: "",
      stats: { ...participant.stats, progress: index === 0 ? 0 : 100 },
      isReady: true,
    })),
  ],
  results,
};
const listeners = new Set<() => void>();
const mutations = new Map<
  string,
  (args: Record<string, unknown>) => Promise<unknown>
>();
const calls: { name: string; args: Record<string, unknown> }[] = [];
const failures = new Set<string>();
let delay = 0;
function publish() {
  state = { ...state };
  listeners.forEach((listener) => listener());
}
function updateParticipant(patch: Partial<RaceParticipant>) {
  state.participant = { ...state.participant, ...patch };
  state.participants = state.participants.map((racer) =>
    racer.sessionId === "self" ? state.participant : racer,
  );
  publish();
}
const controller = {
  calls,
  fail: (name: string, enabled = true) =>
    enabled ? failures.add(name) : failures.delete(name),
  setDelay: (ms: number) => {
    delay = ms;
  },
  echo: () => updateParticipant({ lastSeen: Date.now() }),
  reset: () =>
    updateParticipant({
      resetVersion: (state.participant.resetVersion ?? 0) + 1,
      typedText: "",
      typedProgress: 0,
      stats: fixture.participant.stats,
    }),
  snapshot: () => state,
};
declare global {
  interface Window {
    __raceFixture: typeof controller;
  }
}
Object.assign(window, { __raceFixture: controller });

export function useQuery(
  ref: Parameters<typeof getFunctionName>[0],
  args: unknown,
) {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
  );
  if (args === "skip") return undefined;
  switch (getFunctionName(ref)) {
    case "rooms:getById":
      return snapshot.room;
    case "participants:getBySession":
      return snapshot.participant;
    case "participants:listByRoom":
      return snapshot.participants;
    case "raceResults:getResults":
      return snapshot.results;
    default:
      throw new Error(`Unmocked query ${getFunctionName(ref)}`);
  }
}

export function useMutation(ref: Parameters<typeof getFunctionName>[0]) {
  const name = getFunctionName(ref);
  if (!mutations.has(name))
    mutations.set(name, async (args) => {
      calls.push({ name, args });
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (failures.has(name)) throw new Error("Fixture mutation rejected");
      switch (name) {
        case "participants:disconnect":
          updateParticipant({ isConnected: false });
          break;
        case "participants:setReady":
          updateParticipant({ isReady: true });
          break;
        case "participants:setNotReady":
          updateParticipant({ isReady: false });
          break;
        case "participants:setEmoji":
          updateParticipant({ emoji: args.emoji as string });
          break;
        case "participants:setName":
          updateParticipant({ name: args.name as string });
          break;
        case "participants:updateProgress":
          updateParticipant({
            typedText: args.typedText as string,
            typedProgress: args.typedProgress as number,
            stats: args.stats as RaceParticipant["stats"],
          });
          break;
        case "participants:resetStats":
          controller.reset();
          break;
        case "participants:recordFinish":
          updateParticipant({
            typedText: args.typedText as string,
            stats: args.stats as RaceParticipant["stats"],
            finishTime: args.finishTime as number,
            position: 1,
          });
          break;
        case "rooms:startRace":
          state.room = {
            ...state.room!,
            status: "active",
            raceStartTime: Date.now() + 5000,
            targetText: "hello world racing",
          };
          publish();
          break;
        case "rooms:updateSettings":
          state.room = {
            ...state.room!,
            settings: { ...state.room!.settings, ...(args.settings as object) },
          };
          publish();
          break;
        case "rooms:resetForNewRace":
          state.room = { ...fixture.room };
          publish();
          break;
        case "rooms:endRace":
          state.room = { ...state.room!, raceEndTime: Date.now() };
          publish();
          break;
        case "raceResults:saveResults":
          state.results = fixture.results;
          publish();
          break;
        case "rooms:create":
          return { roomId: fixture.room._id, code: fixture.room.code };
        case "participants:join":
          return { room: fixture.room, participantId: fixture.participant._id };
        default:
          throw new Error(`Unmocked mutation ${name}`);
      }
    });
  return mutations.get(name)!;
}
