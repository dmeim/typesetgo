// Shared data and state for the one-screen results layouts on /temp.
import { useEffect, useRef, useState } from "react";
import { CheckIcon, TextAaIcon, TimerIcon, XIcon, type Icon } from "@phosphor-icons/react";
import type { ChipId } from "@/components/typing/ResultChips";
import { MOCK_COMPARISON, MOCK_STATS, MOCK_TIMELINE, MOCK_WORD_RESULTS } from "./mock-results";

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

export type StatKind = "wpm" | "accuracy";

export const STATS: Record<StatKind, { label: string; short: string; value: number; suffix: string; average: number; best: number; floor: number; ceiling: number; tone: string; fill: string }> = {
  wpm: {
    label: "Words per minute", short: "wpm", value: RESULT.wpm, suffix: "", average: Math.round(MOCK_COMPARISON.averageWpm), best: MOCK_COMPARISON.bestWpm,
    floor: 0, ceiling: 80, tone: "text-primary", fill: "bg-primary",
  },
  accuracy: {
    label: "Accuracy", short: "acc", value: RESULT.accuracy, suffix: "%", average: Math.round(MOCK_COMPARISON.averageAccuracy), best: MOCK_COMPARISON.bestAccuracy,
    floor: 80, ceiling: 100, tone: "text-(--accent-emphasis)", fill: "bg-(--accent-emphasis)",
  },
};

const { correct, incorrect, missed, extra } = MOCK_STATS;

export const CHIPS: { id: ChipId; title: string; value: string; label: string; Icon: Icon; tone: string; tile: string }[] = [
  { id: "correct", title: "Correct words", value: String(MOCK_WORD_RESULTS.correctWords.length), label: "correct", Icon: CheckIcon, tone: "text-success", tile: "bg-success text-background" },
  { id: "mistakes", title: "Mistakes", value: String(MOCK_WORD_RESULTS.incorrectWords.length), label: "mistakes", Icon: XIcon, tone: "text-destructive", tile: "bg-destructive text-background" },
  { id: "characters", title: "Characters", value: `${correct}/${incorrect}/${missed}/${extra}`, label: "characters", Icon: TextAaIcon, tone: "text-foreground", tile: "bg-(--accent-emphasis) text-background" },
  { id: "test", title: "Test", value: `${RESULT.seconds}s`, label: "test", Icon: TimerIcon, tone: "text-foreground", tile: "bg-muted-foreground text-background" },
];

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

/** Which detail chip is open; closing hands focus back to its chip. */
export function useDetail() {
  const [open, setOpen] = useState<ChipId | null>(null);
  const chips = useRef<Partial<Record<ChipId, HTMLElement | null>>>({});
  const close = () => {
    const last = open;
    setOpen(null);
    if (last) requestAnimationFrame(() => chips.current[last]?.focus({ preventScroll: true }));
  };
  return {
    open,
    close,
    toggle: (id: ChipId) => (open === id ? close() : setOpen(id)),
    chipRef: (id: ChipId) => (element: HTMLElement | null) => { chips.current[id] = element; },
  };
}

export type Detail = ReturnType<typeof useDetail>;

export interface ResultsLayoutProps {
  save: SaveDemo;
  replay: () => void;
}
