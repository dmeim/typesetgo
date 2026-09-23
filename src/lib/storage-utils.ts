import { persistablePracticeSettings } from "./practice-preferences";
import type { SettingsState } from "@/lib/typing-constants";
import { normalizePracticeSettings } from "@/lib/typing-constants";
import { DEFAULT_TYPING_FONT } from "@/lib/typing-fonts";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: "typesetgo_settings",
  LAYOUT: "typesetgo_layout",
} as const;

export interface LayoutSettings {
  linePreview: number;
  maxWordsPerLine: number;
}

const DEFAULT_LAYOUT: LayoutSettings = {
  linePreview: 3,
  maxWordsPerLine: 7,
};

// Default settings (matching TypingPractice initial state)
export const DEFAULT_SETTINGS: Omit<
  SettingsState,
  "presetText" | "plan" | "planIndex" | "theme"
> = {
  mode: "zen",
  duration: 30,
  wordTarget: 25,
  punctuation: false,
  numbers: false,
  capitalization: false,
  typingFontSize: 3.25,
  typingFontFamily: DEFAULT_TYPING_FONT,
  iconFontSize: 1,
  helpFontSize: 1,
  difficulty: "beginner",
  quoteLength: "all",
  textAlign: "center",
  ghostWriterSpeed: 40,
  ghostWriterEnabled: false,
  soundEnabled: true,
  typingSound: "creamy",
  warningSound: "clock",
  presetModeType: "finish",
  showOnScreenKeyboard: true,
  keyboardLayout: "qwerty" as KeyboardLayoutId,
};

/**
 * Save settings to localStorage
 * Excludes session-only data like presetText, plan, planIndex
 */
export function saveSettings(settings: SettingsState): void {

  try {
    const persistableSettings = persistablePracticeSettings(settings);

    window.localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify(persistableSettings)
    );
  } catch (error) {
    // Silently handle quota exceeded or other errors
    console.warn("Failed to save settings to localStorage:", error);
  }
}

/**
 * Load settings from localStorage and merge with defaults
 * Returns null if nothing is stored or parsing fails
 */
export function loadSettings(): Partial<SettingsState> | null {

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate it's an object
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    // Merge with defaults to handle schema changes
    return normalizePracticeSettings({
      ...DEFAULT_SETTINGS,
      presetText: "",
      ...persistablePracticeSettings(parsed),
    });
  } catch (error) {
    console.warn("Failed to load settings from localStorage:", error);
    return null;
  }
}

export function saveLayoutSettings(layout: LayoutSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(layout));
  } catch {
    // Silently handle errors
  }
}

export function loadLayoutSettings(): LayoutSettings | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.LAYOUT);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      linePreview: Number.isFinite(parsed.linePreview) ? Math.max(1, Math.min(6, Math.round(parsed.linePreview))) : DEFAULT_LAYOUT.linePreview,
      maxWordsPerLine: Number.isFinite(parsed.maxWordsPerLine) ? Math.max(1, Math.min(10, Math.round(parsed.maxWordsPerLine))) : DEFAULT_LAYOUT.maxWordsPerLine,
    };
  } catch {
    return null;
  }
}
