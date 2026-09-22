import { persistablePracticeSettings } from "./practice-preferences";
import type { SettingsState, Theme } from "@/lib/typing-constants";
import { DEFAULT_THEME, normalizePracticeSettings } from "@/lib/typing-constants";
import { DEFAULT_TYPING_FONT } from "@/lib/typing-fonts";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: "typesetgo_settings",
  LAYOUT: "typesetgo_layout",
  THEME: "typesetgo_theme",
  THEME_NAME: "typesetgo_theme_name",
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

/**
 * Save theme colors to localStorage
 */
export function saveTheme(theme: Theme): void {

  try {
    window.localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
  } catch (error) {
    console.warn("Failed to save theme to localStorage:", error);
  }
}

/**
 * Load theme from localStorage
 * Returns null if nothing stored or parsing fails
 */
export function loadTheme(): Theme | null {

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.THEME);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate it has the expected shape
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    // Merge with defaults to handle schema changes
    return {
      ...DEFAULT_THEME,
      ...parsed,
    };
  } catch (error) {
    console.warn("Failed to load theme from localStorage:", error);
    return null;
  }
}

/**
 * Save selected theme name to localStorage
 */
export function saveThemeName(themeName: string): void {

  try {
    window.localStorage.setItem(STORAGE_KEYS.THEME_NAME, themeName);
  } catch (error) {
    console.warn("Failed to save theme name to localStorage:", error);
  }
}

/**
 * Load theme name from localStorage
 * Returns null if nothing stored
 */
export function loadThemeName(): string | null {

  try {
    return window.localStorage.getItem(STORAGE_KEYS.THEME_NAME);
  } catch (error) {
    console.warn("Failed to load theme name from localStorage:", error);
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

/**
 * Clear all typesetgo settings from localStorage
 */
export function clearAllSettings(): void {

  try {
    window.localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    window.localStorage.removeItem(STORAGE_KEYS.LAYOUT);
    window.localStorage.removeItem(STORAGE_KEYS.THEME);
    window.localStorage.removeItem(STORAGE_KEYS.THEME_NAME);
  } catch (error) {
    console.warn("Failed to clear settings from localStorage:", error);
  }
}
