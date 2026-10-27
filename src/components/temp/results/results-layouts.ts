// Shared data and state for the one-screen results layouts on /temp. The pieces are the real ones in
// `@/components/typing/results/`, fed with a fake finished test.
import { useEffect, useRef, useState } from "react";
import { resultChips, useResultDetail, type ResultDetailsData } from "@/components/typing/results/result-details";
import { buildResultStats } from "@/components/typing/results/result-stats";
import { MOCK_COMPARISON, MOCK_STATS, MOCK_TIMELINE, MOCK_WORD_RESULTS } from "./mock-results";

export type { StatKind } from "@/components/typing/results/result-stats";

export const RESULT = {
  wpm: 58,
  accuracy: 94,
  seconds: "30.0",
  testLabel: "time · 30s · beginner",
  stats: MOCK_STATS,
  words: MOCK_WORD_RESULTS,
  timeline: MOCK_TIMELINE,
  comparison: MOCK_COMPARISON,
};

export const DETAILS: ResultDetailsData = {
  correctWords: RESULT.words.correctWords,
  incorrectWords: RESULT.words.incorrectWords,
  stats: RESULT.stats,
  testLabel: RESULT.testLabel,
  seconds: RESULT.seconds,
};

export const STATS = buildResultStats(RESULT.wpm, RESULT.accuracy, MOCK_COMPARISON);

export const CHIPS = resultChips(DETAILS);

export const LAYOUTS: { name: string; summary: string }[] = [
  { name: "Side column", summary: "Speed and accuracy stacked on the left with the buttons under them. The graph fills the right, with the detail chips beneath it. Open a chip and its spot becomes a Graph pill; click that to bring the graph back." },
  { name: "Scoreboard", summary: "One slim strip across the top holds every number. The graph fills the middle and the buttons sit in a single row." },
  { name: "Graph first", summary: "One big card: speed and accuracy sit in the graph's corners above their own axes, with your average drawn as a line." },
  { name: "Bento", summary: "A grid of tiles: your two scores and the buttons on the left, a big graph, and a tile each for words, mistakes, letters and time." },
  { name: "Tabs", summary: "A score card with the buttons on the left. The right side switches between the graph and the word details instead of growing." },
];

export const SCREENS = [
  { id: "laptop", label: "Laptop", detail: "636px tall, like your screenshot", frame: "w-full", height: 636 },
  { id: "short", label: "Short laptop", detail: "540px tall, a zoomed-in or small screen", frame: "w-full", height: 540 },
  { id: "tablet", label: "Tablet", detail: "768px wide", frame: "max-w-[768px]", height: 900 },
  { id: "phone", label: "Phone", detail: "375px wide", frame: "max-w-[375px]", height: 700 },
] as const;

export type ScreenId = (typeof SCREENS)[number]["id"];

export type SaveState = "idle" | "saving" | "saved";

/** Saving only animates locally. */
export function useSaveDemo() {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    state,
    save: () => {
      if (state !== "idle") return;
      setState("saving");
      timer.current = window.setTimeout(() => setState("saved"), 900);
    },
    reset: () => {
      window.clearTimeout(timer.current);
      setState("idle");
    },
  };
}

export type SaveDemo = ReturnType<typeof useSaveDemo>;

export const useDetail = useResultDetail;

export type Detail = ReturnType<typeof useDetail>;

export interface ResultsLayoutProps {
  save: SaveDemo;
  replay: () => void;
}
