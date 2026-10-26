import { useEffect, useState } from "react";

export type SimulatedMode = "time" | "words" | "zen";

export interface SimulatedRun {
  mode: SimulatedMode;
  wpm: number;
  accuracy: number;
  elapsedMs: number;
  timeRemaining: number;
  wordsTyped: number;
  wordTarget: number;
  duration: number;
  /** 0-1 for time and words; zen has no end. */
  progress: number;
  /** 0-1 through the simulated loop, including zen. */
  cycleProgress: number;
  /** One WPM sample per elapsed second. */
  history: number[];
  finished: boolean;
}

const DURATION_SECONDS = 30;
const WORD_TARGET = 25;
const ZEN_LOOP_SECONDS = 45;
const WORDS_PER_SECOND = 0.75;
const TICK_MS = 100;
const RESTART_PAUSE_MS = 1800;

function limitMs(mode: SimulatedMode) {
  if (mode === "time") return DURATION_SECONDS * 1000;
  if (mode === "zen") return ZEN_LOOP_SECONDS * 1000;
  return (WORD_TARGET / WORDS_PER_SECOND) * 1000;
}

function sampleWpm(seconds: number, seed: number) {
  const warmup = Math.min(1, seconds / 2.5);
  return Math.max(0, warmup * (46 + 9 * Math.sin(seconds / 2.7 + seed) + 4 * Math.sin(seconds * 1.9)));
}

/** Fake live typing numbers for /temp stats mockups; loops forever. */
export function useSimulatedRun(mode: SimulatedMode, seed: number): SimulatedRun {
  const [clock, setClock] = useState({ cycleMs: 0, history: [] as number[] });

  useEffect(() => {
    const startedAt = performance.now();
    const limit = limitMs(mode);
    const timer = window.setInterval(() => {
      const cycleMs = (performance.now() - startedAt) % (limit + RESTART_PAUSE_MS);
      setClock((previous) => {
        const second = Math.floor(Math.min(cycleMs, limit) / 1000);
        if (cycleMs < previous.cycleMs) return { cycleMs, history: [] };
        const history = previous.history.length < second ? [...previous.history, Math.round(sampleWpm(second, seed))] : previous.history;
        return { cycleMs, history };
      });
    }, TICK_MS);
    return () => {
      window.clearInterval(timer);
      setClock({ cycleMs: 0, history: [] });
    };
  }, [mode, seed]);

  const limit = limitMs(mode);
  const runMs = Math.min(clock.cycleMs, limit);
  const seconds = runMs / 1000;
  const wordsTyped = Math.min(mode === "words" ? WORD_TARGET : Infinity, Math.floor(seconds * WORDS_PER_SECOND));
  // Readouts refresh twice a second so rolling digits can finish their motion.
  const readoutSeconds = Math.floor(seconds * 2) / 2;

  return {
    mode,
    wpm: sampleWpm(readoutSeconds, seed),
    accuracy: Math.min(100, 95 + 3 * Math.sin(readoutSeconds / 3.1 + seed * 2) + (readoutSeconds < 1 ? 5 : 0)),
    elapsedMs: runMs,
    timeRemaining: Math.max(0, DURATION_SECONDS - Math.floor(seconds)),
    wordsTyped,
    wordTarget: WORD_TARGET,
    duration: DURATION_SECONDS,
    progress: mode === "time" ? runMs / limit : mode === "words" ? wordsTyped / WORD_TARGET : 0,
    cycleProgress: runMs / limit,
    history: clock.history,
    finished: runMs >= limit,
  };
}

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** The mode-specific headline: countdown, word count, or elapsed zen time. */
export function primaryReadout(run: SimulatedRun) {
  if (run.mode === "time") return formatClock(run.timeRemaining);
  if (run.mode === "words") return `${run.wordsTyped}/${run.wordTarget}`;
  return formatClock(run.elapsedMs / 1000);
}

export function primaryLabel(run: SimulatedRun) {
  if (run.mode === "time") return "left";
  if (run.mode === "words") return "words";
  return "elapsed";
}

export function isUrgent(run: SimulatedRun) {
  return run.mode === "time" && run.timeRemaining < 10 && !run.finished;
}
