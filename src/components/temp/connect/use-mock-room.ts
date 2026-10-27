// A pretend Connect room for the mockup: a timer moves everyone's typing along while the room runs.
// A popped-out board in another tab mirrors this tab's room over a BroadcastChannel.
import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { connectTestLabels } from "@/lib/connect-settings";
import { CONNECT_MAX_TESTS, type ConnectTest } from "@/lib/connect-types";
import type { LabSettings } from "@/components/temp/settings/lab-settings";
import type { LabTheme } from "@/components/temp/settings/useLabSettings";
import {
  DEFAULT_YOU, LATE_NAMES, MOCK_TESTS, RESULTS_TICKS, ROOM, SELF_PACED_REST_TICKS, TICK_MS, freshKid, newKid, randomCode, seedKids, typeOneTick, youKid,
  type Kid, type Pacing, type RoomStatus,
} from "./connect-mock";
import { INITIAL_EVERYONE, type EveryoneGets, type GroupId } from "./everyone-gets";

export interface RoomState {
  code: string;
  name: string;
  host: string;
  /** The host ended the room; it can be reopened with a new code. */
  ended: boolean;
  status: RoomStatus;
  pacing: Pacing;
  tests: ConnectTest[];
  /** Host-led: the test everyone is on. */
  index: number;
  stepTicks: number;
  /** Host-led: ticks the results have been showing, or null while the test runs. */
  resultsTicks: number | null;
  /** Bumps whenever a test (re)starts, so late arrivals join the next one. */
  runVersion: number;
  kids: Kid[];
  /** The host removed you; the student view shows the removed screen. */
  youRemoved: boolean;
  /** How you last joined, so "Join again" comes back the same way. */
  you: { name: string; signedIn: boolean };
  everyone: EveryoneGets;
}

const CHANNEL = "typesetgo-temp-connect";

const isLate = (state: Pick<RoomState, "pacing" | "status" | "runVersion">, kid: Kid) =>
  state.pacing === "host" && (state.status === "running" || state.status === "paused") && kid.lateForRun === state.runVersion;

function startStep(state: RoomState, index: number): RoomState {
  const runVersion = state.runVersion + 1;
  if (index >= state.tests.length) return { ...state, status: "complete", index: state.tests.length, resultsTicks: null, runVersion };
  return { ...state, index, stepTicks: 0, resultsTicks: null, runVersion, kids: state.kids.map((kid) => ({ ...freshKid(kid), step: index, lateForRun: undefined })) };
}

function hostTick(state: RoomState): RoomState {
  const test = state.tests[state.index];
  if (!test) return { ...state, status: "complete" };
  if (test.mode === "break") {
    const stepTicks = state.stepTicks + 1;
    return stepTicks >= test.duration ? startStep(state, state.index + 1) : { ...state, stepTicks };
  }
  if (state.resultsTicks !== null) {
    const resultsTicks = state.resultsTicks + 1;
    return resultsTicks >= RESULTS_TICKS ? startStep(state, state.index + 1) : { ...state, resultsTicks };
  }
  const stepTicks = state.stepTicks + 1;
  const kids = state.kids.map((kid) => isLate(state, kid) ? kid : typeOneTick(kid, test, stepTicks));
  const taking = kids.filter((kid) => kid.online && !isLate(state, kid));
  const allDone = taking.length > 0 && taking.every((kid) => kid.finished);
  return { ...state, stepTicks, kids, resultsTicks: allDone ? 0 : null };
}

const nextKidStep = (kid: Kid): Kid => ({ ...freshKid(kid), step: kid.step + 1 });

function selfPacedTick(state: RoomState): RoomState {
  const kids = state.kids.map((kid) => {
    const test = state.tests[kid.step];
    if (!kid.online || !test) return kid;
    const stepTicks = kid.stepTicks + 1;
    if (test.mode === "break") return stepTicks >= test.duration ? nextKidStep(kid) : { ...kid, stepTicks };
    if (kid.finished) return kid.restTicks + 1 >= SELF_PACED_REST_TICKS ? nextKidStep(kid) : { ...kid, restTicks: kid.restTicks + 1 };
    return typeOneTick({ ...kid, stepTicks }, test, stepTicks);
  });
  const everyoneDone = kids.every((kid) => !kid.online || kid.step >= state.tests.length);
  return { ...state, kids, status: everyoneDone ? "complete" : state.status };
}

function initial(): RoomState {
  return {
    code: ROOM.code, name: ROOM.name, host: ROOM.host, ended: false, status: "lobby", pacing: "host", tests: MOCK_TESTS,
    index: 0, stepTicks: 0, resultsTicks: null, runVersion: 0, kids: seedKids(DEFAULT_YOU), youRemoved: false, you: { name: DEFAULT_YOU, signedIn: false }, everyone: INITIAL_EVERYONE,
  };
}

/** Back to the lobby with everyone's results cleared; players stay. */
const toLobby = (state: RoomState): RoomState => ({
  ...state, status: "lobby", index: 0, stepTicks: 0, resultsTicks: null, runVersion: state.runVersion + 1,
  kids: state.kids.map((kid) => ({ ...freshKid(kid), results: [], lateForRun: undefined })),
});

/** Someone arriving now: host-led rooms make them wait for the next test; self-paced rooms start them at test 1. */
const arriving = (state: RoomState, kid: Kid): Kid => (state.pacing === "host" && (state.status === "running" || state.status === "paused")
  ? { ...kid, step: state.index, lateForRun: state.runVersion }
  : kid);

function joinAs(state: RoomState, name: string, signedIn: boolean): RoomState {
  const you = { name, signedIn };
  if (state.youRemoved || !state.kids.some((kid) => kid.isYou)) {
    return { ...state, you, youRemoved: false, kids: [...state.kids, arriving(state, youKid(name, { signedIn }))] };
  }
  return { ...state, you, kids: state.kids.map((kid) => kid.isYou ? { ...kid, name, signedIn } : kid) };
}

export function useMockRoom({ mirror = false }: { mirror?: boolean } = {}) {
  const [state, setState] = useState(initial);
  const [synced, setSynced] = useState(!mirror);
  const running = state.status === "running" && !mirror;
  const channel = useRef<BroadcastChannel | null>(null);
  const latest = useRef(state);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setState((current) => current.status !== "running" ? current : current.pacing === "host" ? hostTick(current) : selfPacedTick(current));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bus = new BroadcastChannel(CHANNEL);
    channel.current = bus;
    bus.onmessage = (event: MessageEvent<{ type: string; state?: RoomState }>) => {
      if (mirror && event.data.type === "state" && event.data.state) {
        setState(event.data.state);
        setSynced(true);
      }
      if (!mirror && event.data.type === "hello") bus.postMessage({ type: "state", state: latest.current });
    };
    if (mirror) bus.postMessage({ type: "hello" });
    return () => { bus.close(); channel.current = null; };
  }, [mirror]);

  useEffect(() => {
    if (!mirror) channel.current?.postMessage({ type: "state", state });
  }, [state, mirror]);

  const update = useCallback((change: (current: RoomState) => RoomState) => setState(change), []);

  const actions = useMemo(() => ({
    start: () => update((current) => current.status === "paused"
      ? { ...current, status: "running" }
      : startStep({ ...current, status: "running", kids: current.kids.map((kid) => ({ ...kid, results: [] })) }, 0)),
    pause: () => update((current) => current.status === "running" ? { ...current, status: "paused" } : current),
    goTo: (index: number) => update((current) => startStep(current, Math.max(0, index))),
    restartTest: () => update((current) => current.pacing === "host"
      ? startStep(current, current.index)
      : { ...current, kids: current.kids.map((kid) => ({ ...freshKid(kid), step: kid.step, results: kid.results })) }),
    reset: () => update(toLobby),
    setPacing: (pacing: Pacing) => update((current) => current.status === "lobby" ? { ...current, pacing } : current),
    rename: (name: string) => update((current) => ({ ...current, name })),
    create: (host: string, name: string) => update(() => ({ ...initial(), code: randomCode(ROOM.code), host, name: name || `${host}'s room` })),
    end: () => update((current) => ({ ...toLobby(current), ended: true })),
    reopen: () => update((current) => ({ ...toLobby(current), ended: false, code: randomCode(current.code), kids: seedKids(DEFAULT_YOU), youRemoved: false })),
    saveTest: (test: ConnectTest) => update((current) => current.tests.some((item) => item.id === test.id)
      ? { ...current, tests: current.tests.map((item) => item.id === test.id ? test : item) }
      : current.tests.length >= CONNECT_MAX_TESTS ? current : { ...current, tests: [...current.tests, test] }),
    addTest: (test: Omit<ConnectTest, "id">) => update((current) => current.tests.length >= CONNECT_MAX_TESTS ? current
      : { ...current, tests: [...current.tests, { ...test, id: crypto.randomUUID() }] }),
    duplicateTest: (id: string) => update((current) => {
      const index = current.tests.findIndex((item) => item.id === id);
      if (index < 0 || current.tests.length >= CONNECT_MAX_TESTS) return current;
      const copy = { ...current.tests[index], id: crypto.randomUUID() };
      return { ...current, tests: [...current.tests.slice(0, index + 1), copy, ...current.tests.slice(index + 1)] };
    }),
    setTests: (tests: ConnectTest[]) => update((current) => ({ ...current, tests })),
    removeTest: (id: string) => update((current) => current.tests.length <= 1 ? current : { ...current, tests: current.tests.filter((item) => item.id !== id) }),
    removeKid: (id: string) => update((current) => ({ ...current, kids: current.kids.filter((kid) => kid.id !== id), youRemoved: current.youRemoved || id === "you" })),
    /** Restarts their attempt, or lets a late arrival start the current test now. */
    resetKid: (id: string) => update((current) => ({
      ...current,
      kids: current.kids.map((kid) => kid.id === id ? { ...freshKid(kid), step: current.pacing === "host" ? current.index : kid.step, results: kid.results, lateForRun: undefined } : kid),
    })),
    someoneJoins: () => update((current) => {
      const name = LATE_NAMES.find((candidate) => !current.kids.some((kid) => kid.name === candidate));
      if (!name) return current;
      const kid = newKid(`late-${name}`, name, 25 + Math.round(Math.random() * 40), 88 + Math.round(Math.random() * 10), { signedIn: Math.random() < 0.5 });
      return { ...current, kids: [...current.kids, arriving(current, kid)] };
    }),
    /** Drops the most recent online student offline, or brings an offline one back. */
    wifiBlip: () => update((current) => {
      const away = current.kids.find((kid) => !kid.online && !kid.isYou);
      const target = away ?? [...current.kids].reverse().find((kid) => kid.online && !kid.isYou);
      return target ? { ...current, kids: current.kids.map((kid) => kid.id === target.id ? { ...kid, online: !kid.online } : kid) } : current;
    }),
    /** Joins as you: signed in uses your account name and picture; a guest uses the name they typed. */
    join: (name: string, signedIn: boolean) => update((current) => joinAs(current, name, signedIn)),
    rejoin: () => update((current) => joinAs(current, current.you.name, current.you.signedIn)),
    /** Self-paced: skip the rest of your results and go to the next test. */
    advanceYou: () => update((current) => ({ ...current, kids: current.kids.map((kid) => kid.isYou && kid.finished ? nextKidStep(kid) : kid) })),
    setGroup: (group: GroupId, on: boolean) => update((current) => ({ ...current, everyone: { ...current.everyone, on: { ...current.everyone.on, [group]: on } } })),
    updateEveryone: (changes: Partial<LabSettings>) => update((current) => ({ ...current, everyone: { ...current.everyone, settings: { ...current.everyone.settings, ...changes } } })),
    setEveryoneTheme: (theme: SetStateAction<LabTheme>) => update((current) => ({
      ...current, everyone: { ...current.everyone, theme: typeof theme === "function" ? theme(current.everyone.theme) : theme },
    })),
  }), [update]);

  /** The test a player is on: the room's in host-led rooms, their own when self-paced. */
  const stepOf = useCallback((kid: Kid) => state.pacing === "host" ? state.index : kid.step, [state.pacing, state.index]);
  const late = useCallback((kid: Kid) => isLate(state, kid), [state]);
  const labels = useMemo(() => connectTestLabels(state.tests), [state.tests]);

  return { ...state, actions, stepOf, late, labels, synced };
}

export type MockRoom = ReturnType<typeof useMockRoom>;
