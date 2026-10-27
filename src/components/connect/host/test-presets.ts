import { CoffeeIcon, FileTextIcon, QuotesIcon, TextAaIcon, TimerIcon, type Icon } from "@phosphor-icons/react";
import { DEFAULT_CONNECT_BREAK, DEFAULT_CONNECT_TEST, type ConnectTest, type ConnectTestMode } from "@/lib/connect-types";

/** Preset lengths, in seconds, offered for timed tests and breaks. */
export const DURATIONS = [15, 30, 60, 120, 300];
export const BREAKS = [10, 30, 60, 120, 300];

export const MODE_ICONS: Record<ConnectTestMode, Icon> = { time: TimerIcon, words: TextAaIcon, quote: QuotesIcon, preset: FileTextIcon, break: CoffeeIcon };

/** One-tap additions for the host's test list. */
export const QUICK_ADD: { label: string; test: Omit<ConnectTest, "id"> }[] = [
  { label: "Time · 30s", test: { ...DEFAULT_CONNECT_TEST, mode: "time", duration: 30 } },
  { label: "Time · 60s", test: { ...DEFAULT_CONNECT_TEST, mode: "time", duration: 60 } },
  { label: "25 words", test: { ...DEFAULT_CONNECT_TEST, mode: "words", wordTarget: 25 } },
  { label: "50 words", test: { ...DEFAULT_CONNECT_TEST, mode: "words", wordTarget: 50 } },
  { label: "Short quote", test: { ...DEFAULT_CONNECT_TEST, mode: "quote", quoteLength: "short" } },
  { label: "Break · 30s", test: { ...DEFAULT_CONNECT_BREAK } },
];
