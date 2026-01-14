import type { SettingsState, Theme } from "@/lib/typing-constants";
import { DEFAULT_THEME } from "@/lib/typing-constants";

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: "typesetgo_settings",
  THEME: "typesetgo_theme",
  THEME_NAME: "typesetgo_theme_name",
} as const;

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
  typingFontSize: 3.25,
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
  errorSound: "",
  presetModeType: "finish",
};

/**
 * Check if localStorage is available (handles SSR and private browsing)
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save settings to localStorage
 * Excludes session-only data like presetText, plan, planIndex
 */
export function saveSettings(settings: SettingsState): void {
  if (!isLocalStorageAvailable()) return;

  try {
    // Create a copy without session-only fields
    const persistableSettings: Partial<SettingsState> = {
      mode: settings.mode,
      duration: settings.duration,
      wordTarget: settings.wordTarget,
      quoteLength: settings.quoteLength,
      punctuation: settings.punctuation,
      numbers: settings.numbers,
      typingFontSize: settings.typingFontSize,
      iconFontSize: settings.iconFontSize,
      helpFontSize: settings.helpFontSize,
      difficulty: settings.difficulty,
      textAlign: settings.textAlign,
      ghostWriterSpeed: settings.ghostWriterSpeed,
      ghostWriterEnabled: settings.ghostWriterEnabled,
      soundEnabled: settings.soundEnabled,
      typingSound: settings.typingSound,
      warningSound: settings.warningSound,
      errorSound: settings.errorSound,
      presetModeType: settings.presetModeType,
    };

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
  if (!isLocalStorageAvailable()) return null;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate it's an object
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    // Merge with defaults to handle schema changes
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.warn("Failed to load settings from localStorage:", error);
    return null;
  }
}

/**
 * Save theme colors to localStorage
 */
export function saveTheme(theme: Theme): void {
  if (!isLocalStorageAvailable()) return;

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
  if (!isLocalStorageAvailable()) return null;

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
  if (!isLocalStorageAvailable()) return;

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
  if (!isLocalStorageAvailable()) return null;

  try {
    return window.localStorage.getItem(STORAGE_KEYS.THEME_NAME);
  } catch (error) {
    console.warn("Failed to load theme name from localStorage:", error);
    return null;
  }
}

/**
 * Clear all typesetgo settings from localStorage
 */
export function clearAllSettings(): void {
  if (!isLocalStorageAvailable()) return;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    window.localStorage.removeItem(STORAGE_KEYS.THEME);
    window.localStorage.removeItem(STORAGE_KEYS.THEME_NAME);
  } catch (error) {
    console.warn("Failed to clear settings from localStorage:", error);
  }
}
