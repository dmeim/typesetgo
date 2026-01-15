import { GLOBAL_COLORS } from "@/lib/colors";
import type { Plan } from "@/types/plan";

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
  typingFontSize: number;
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
