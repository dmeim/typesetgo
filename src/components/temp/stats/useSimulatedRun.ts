import { useEffect, useState } from "react";

export type SimulatedMode = "time" | "words" | "zen";

export interface SimulatedRun {
  wpm: number;
  accuracy: number;
  elapsedMs: number;
  timeRemaining: number;
  wordsTyped: number;
  wordTarget: number;
  duration: number;
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

/** Fake live typing numbers for /temp demos; loops forever. */
export function useSimulatedRun(mode: SimulatedMode, seed: number): SimulatedRun {
  const [cycleMs, setCycleMs] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => setCycleMs((performance.now() - startedAt) % (limitMs(mode) + RESTART_PAUSE_MS)), TICK_MS);
    return () => {
      window.clearInterval(timer);
      setCycleMs(0);
    };
  }, [mode, seed]);

  const runMs = Math.min(cycleMs, limitMs(mode));
  const seconds = runMs / 1000;
  const warmup = Math.min(1, seconds / 2.5);

  return {
    wpm: Math.max(0, warmup * (46 + 9 * Math.sin(seconds / 2.7 + seed) + 4 * Math.sin(seconds * 1.9))),
    accuracy: Math.min(100, 95 + 3 * Math.sin(seconds / 3.1 + seed * 2) + (seconds < 1 ? 5 : 0)),
    elapsedMs: runMs,
    timeRemaining: Math.max(0, DURATION_SECONDS - Math.floor(seconds)),
    wordsTyped: Math.min(mode === "words" ? WORD_TARGET : Infinity, Math.floor(seconds * WORDS_PER_SECOND)),
    wordTarget: WORD_TARGET,
    duration: DURATION_SECONDS,
  };
}
