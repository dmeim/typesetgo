// A pretend Connect room for the mockup: a timer moves everyone's typing along while the room runs.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_YOU, MOCK_TESTS, RESULTS_TICKS, TICK_MS, freshKid, seedKids, typeOneTick,
  type Kid, type MockTest, type Pacing, type RoomStatus,
} from "./connect-mock";

interface RoomState {
  status: RoomStatus;
  pacing: Pacing;
  tests: MockTest[];
  /** Host-led: the test everyone is on. */
  index: number;
  stepTicks: number;
  /** Host-led: ticks the results have been showing, or null while the test runs. */
  resultsTicks: number | null;
  kids: Kid[];
}

const SELF_PACED_REST_TICKS = 2;

function startStep(state: RoomState, index: number): RoomState {
  if (index >= state.tests.length) return { ...state, status: "complete", index: state.tests.length, resultsTicks: null };
  return { ...state, index, stepTicks: 0, resultsTicks: null, kids: state.kids.map((kid) => ({ ...freshKid(kid), step: index })) };
}

function hostTick(state: RoomState): RoomState {
  const test = state.tests[state.index];
  if (!test) return { ...state, status: "complete" };
  if (test.mode === "break") {
    const stepTicks = state.stepTicks + 1;
    return stepTicks >= (test.seconds ?? 10) ? startStep(state, state.index + 1) : { ...state, stepTicks };
  }
  if (state.resultsTicks !== null) {
    const resultsTicks = state.resultsTicks + 1;
    return resultsTicks >= RESULTS_TICKS ? startStep(state, state.index + 1) : { ...state, resultsTicks };
  }
  const stepTicks = state.stepTicks + 1;
  const kids = state.kids.map((kid) => typeOneTick(kid, test, stepTicks));
  const allDone = kids.every((kid) => !kid.online || kid.finished);
  return { ...state, stepTicks, kids, resultsTicks: allDone ? 0 : null };
}

function nextKidStep(kid: Kid): Kid {
  return { ...freshKid(kid), step: kid.step + 1 };
}

function selfPacedTick(state: RoomState): RoomState {
  const kids = state.kids.map((kid) => {
    const test = state.tests[kid.step];
    if (!kid.online || !test) return kid;
    const stepTicks = kid.stepTicks + 1;
    if (test.mode === "break") return stepTicks >= (test.seconds ?? 10) ? nextKidStep(kid) : { ...kid, stepTicks };
    if (kid.finished) return kid.restTicks + 1 >= SELF_PACED_REST_TICKS ? nextKidStep(kid) : { ...kid, restTicks: kid.restTicks + 1 };
    return typeOneTick({ ...kid, stepTicks }, test, stepTicks);
  });
  const everyoneDone = kids.every((kid) => !kid.online || kid.step >= state.tests.length);
  return { ...state, kids, status: everyoneDone ? "complete" : state.status };
}

function initial(you: string): RoomState {
  return { status: "lobby", pacing: "host", tests: MOCK_TESTS, index: 0, stepTicks: 0, resultsTicks: null, kids: seedKids(you) };
}

export function useMockRoom() {
  const [state, setState] = useState(() => initial(DEFAULT_YOU));
  const running = state.status === "running";

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setState((current) => current.status !== "running" ? current : current.pacing === "host" ? hostTick(current) : selfPacedTick(current));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  const update = useCallback((change: (current: RoomState) => RoomState) => setState(change), []);

  const actions = useMemo(() => ({
    start: () => update((current) => current.status === "paused"
      ? { ...current, status: "running" }
      : startStep({ ...current, status: "running", kids: current.kids.map((kid) => ({ ...kid, results: [] })) }, 0)),
    pause: () => update((current) => current.status === "running" ? { ...current, status: "paused" } : current),
    goTo: (index: number) => update((current) => startStep(current, Math.max(0, index))),
    restartTest: () => update((current) => current.pacing === "host"
      ? startStep(current, current.index)
      : { ...current, kids: current.kids.map((kid) => ({ ...freshKid(kid), step: kid.step })) }),
    reset: () => update((current) => ({ ...startStep(current, 0), status: "lobby", kids: current.kids.map((kid) => ({ ...freshKid(kid), results: [] })) })),
    setPacing: (pacing: Pacing) => update((current) => current.status === "lobby" ? { ...current, pacing } : current),
    addTest: (test: Omit<MockTest, "id">) => update((current) => ({ ...current, tests: [...current.tests, { ...test, id: crypto.randomUUID() }] })),
    removeTest: (id: string) => update((current) => ({ ...current, tests: current.tests.filter((test) => test.id !== id) })),
    removeKid: (id: string) => update((current) => ({ ...current, kids: current.kids.filter((kid) => kid.id !== id || kid.isYou) })),
    resetKid: (id: string) => update((current) => ({ ...current, kids: current.kids.map((kid) => kid.id === id ? { ...freshKid(kid), step: kid.step, results: kid.results } : kid) })),
    setYourName: (name: string) => update((current) => ({ ...current, kids: current.kids.map((kid) => kid.isYou ? { ...kid, name } : kid) })),
  }), [update]);

  /** The test a player is on: the room's in host-led rooms, their own when self-paced. */
  const stepOf = useCallback((kid: Kid) => state.pacing === "host" ? state.index : kid.step, [state.pacing, state.index]);

  return { ...state, actions, stepOf };
}

export type MockRoom = ReturnType<typeof useMockRoom>;
