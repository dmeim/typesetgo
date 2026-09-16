import { GLOBAL_COLORS } from "@/lib/colors";
import type { Plan } from "@/types/plan";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";

export type Mode = "time" | "words" | "quote" | "zen" | "preset" | "plan";
export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "expert";

export type Quote = {
  quote: string;
  author: string;
  source: string;
  context: string;
  date: string;
};

export type QuoteLength = "all" | "short" | "medium" | "long" | "xl";

export type Theme = {
  cursor: string;
  defaultText: string;
  upcomingText: string;
  correctText: string;
  incorrectText: string;
  buttonUnselected: string;
  buttonSelected: string;
  backgroundColor: string;
  surfaceColor: string;
  ghostCursor: string;
};

export type SettingsState = {
  mode: Mode;
  duration: number;
  wordTarget: number;
  quoteLength: QuoteLength;
  punctuation: boolean;
  numbers: boolean;
  capitalization: boolean;
  typingFontSize: number;
  typingFontFamily: string;
  iconFontSize: number;
  helpFontSize: number;
  difficulty: Difficulty;
  textAlign: "left" | "center" | "right" | "justify";
  ghostWriterSpeed: number;
  ghostWriterEnabled: boolean;
  soundEnabled: boolean;
  typingSound: string;
  warningSound: string;
  errorSound: string;
  presetText: string;
  presetModeType: "time" | "finish";
  showOnScreenKeyboard: boolean;
  keyboardLayout: KeyboardLayoutId;
  theme?: Theme;
  plan?: Plan;
  planIndex?: number;
};

export const DEFAULT_THEME: Theme = {
  cursor: GLOBAL_COLORS.brand.primary, // Sky Blue
  defaultText: GLOBAL_COLORS.text.secondary, // Muted Gray
  upcomingText: GLOBAL_COLORS.text.secondary, // Muted Gray
  correctText: GLOBAL_COLORS.text.primary, // Light Gray
  incorrectText: GLOBAL_COLORS.text.error, // Vibrant Red
  buttonUnselected: GLOBAL_COLORS.brand.primary, // Sky Blue
  buttonSelected: GLOBAL_COLORS.brand.secondary, // Teal
  backgroundColor: GLOBAL_COLORS.background, // Deep Charcoal
  surfaceColor: GLOBAL_COLORS.surface, // Darker Charcoal - Cards, Modals
  ghostCursor: GLOBAL_COLORS.brand.accent, // Purple
};

export const TEXT_SIZE_MIN = 1;
export const TEXT_SIZE_MAX = 6;
export const MAX_DURATION_SECONDS = 6 * 3600 + 59 * 60 + 59;

export function normalizePracticeSettings(settings: SettingsState): SettingsState {
  const clamp = (value: number, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  return { ...settings,
    typingFontSize: clamp(settings.typingFontSize, TEXT_SIZE_MIN, TEXT_SIZE_MAX, 3.25),
    duration: Math.round(clamp(settings.duration, 1, MAX_DURATION_SECONDS, 30)),
    wordTarget: Math.round(clamp(settings.wordTarget, 1, 9999, 25)),
    ghostWriterSpeed: clamp(settings.ghostWriterSpeed, 1, 200, 40),
  };
}
