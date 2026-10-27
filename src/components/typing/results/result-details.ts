import { useRef, useState } from "react";
import { CheckIcon, TextAaIcon, TimerIcon, XIcon, type Icon } from "@phosphor-icons/react";

export type ChipId = "correct" | "mistakes" | "characters" | "test";

/** Everything the detail chips and their panels show. */
export interface ResultDetailsData {
  correctWords: string[];
  incorrectWords: { typed: string; expected: string }[];
  stats: { correct: number; incorrect: number; missed: number; extra: number };
  /** Settings summary, such as "time · 30s · beginner". */
  testLabel: string;
  /** Duration in seconds with one decimal, or null when unknown. */
  seconds: string | null;
}

export interface ResultChip {
  id: ChipId;
  title: string;
  value: string;
  label: string;
  ariaLabel: string;
  Icon: Icon;
  tone: string;
  /** Icon tile colours for the tile variant. */
  tile: string;
}

export function resultChips({ correctWords, incorrectWords, stats, seconds }: ResultDetailsData): ResultChip[] {
  const characters = `${stats.correct}/${stats.incorrect}/${stats.missed}/${stats.extra}`;
  const mistakes = incorrectWords.length === 1 ? "mistake" : "mistakes";
  const testValue = seconds === null ? "" : `${seconds}s`;
  return [
    {
      id: "correct", title: "Correct words", value: String(correctWords.length), label: "correct", ariaLabel: `${correctWords.length} correct`,
      Icon: CheckIcon, tone: "text-success", tile: "bg-success text-background",
    },
    {
      id: "mistakes", title: "Mistakes", value: String(incorrectWords.length), label: mistakes, ariaLabel: `${incorrectWords.length} ${mistakes}`,
      Icon: XIcon, tone: "text-destructive", tile: "bg-destructive text-background",
    },
    {
      id: "characters", title: "Characters", value: characters, label: "characters",
      ariaLabel: `${characters} characters: ${stats.correct} correct, ${stats.incorrect} wrong, ${stats.missed} missed, ${stats.extra} extra`,
      Icon: TextAaIcon, tone: "text-foreground", tile: "bg-(--accent-emphasis) text-background",
    },
    {
      id: "test", title: "Test", value: testValue, label: "test", ariaLabel: `${testValue} test`.trim(),
      Icon: TimerIcon, tone: "text-foreground", tile: "bg-muted-foreground text-background",
    },
  ];
}

/** Which detail chip is open; closing hands focus back to its chip. */
export function useResultDetail() {
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

export type ResultDetail = ReturnType<typeof useResultDetail>;
