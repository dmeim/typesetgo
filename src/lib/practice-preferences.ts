import type { FunctionArgs } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { normalizePracticeSettings, type SettingsState } from "./typing-constants";
import { DEFAULT_TYPING_FONT } from "./typing-fonts";
import type { LayoutSettings } from "./storage-utils";

type AccountPreferences = FunctionArgs<typeof api.preferences.savePreferences>["preferences"];

/** One field mapping for local persistence and account defaults. Session content is excluded. */
const fields = {
  defaultMode: "mode", defaultDuration: "duration", defaultWordTarget: "wordTarget",
  defaultQuoteLength: "quoteLength", defaultDifficulty: "difficulty", defaultPunctuation: "punctuation",
  defaultNumbers: "numbers", defaultCapitalization: "capitalization", defaultPresetModeType: "presetModeType",
  soundEnabled: "soundEnabled", typingSound: "typingSound", warningSound: "warningSound",
  ghostWriterEnabled: "ghostWriterEnabled", ghostWriterSpeed: "ghostWriterSpeed",
  typingFontSize: "typingFontSize", typingFontFamily: "typingFontFamily", iconFontSize: "iconFontSize",
  helpFontSize: "helpFontSize", textAlign: "textAlign", showOnScreenKeyboard: "showOnScreenKeyboard",
  keyboardLayout: "keyboardLayout",
} as const satisfies Record<string, keyof SettingsState>;

export function persistablePracticeSettings(settings: Partial<SettingsState>): Partial<SettingsState> {
  return Object.fromEntries(Object.values(fields).filter((key) => settings[key] !== undefined).map((key) => [key, settings[key]]));
}

export function toAccountPreferences(settings: SettingsState, layout: LayoutSettings,
  theme: Pick<AccountPreferences, "themeId" | "themeVariantId" | "themeMode">): AccountPreferences {
  return { ...theme,
    defaultMode: settings.mode,
    defaultDuration: settings.duration,
    defaultWordTarget: settings.wordTarget,
    defaultQuoteLength: settings.quoteLength,
    defaultDifficulty: settings.difficulty,
    defaultPunctuation: settings.punctuation,
    defaultNumbers: settings.numbers,
    defaultCapitalization: settings.capitalization,
    defaultPresetModeType: settings.presetModeType,
    soundEnabled: settings.soundEnabled,
    typingSound: settings.typingSound,
    warningSound: settings.warningSound,
    ghostWriterEnabled: settings.ghostWriterEnabled,
    ghostWriterSpeed: settings.ghostWriterSpeed,
    typingFontSize: settings.typingFontSize,
    typingFontFamily: settings.typingFontFamily,
    iconFontSize: settings.iconFontSize,
    helpFontSize: settings.helpFontSize,
    textAlign: settings.textAlign,
    showOnScreenKeyboard: settings.showOnScreenKeyboard,
    keyboardLayout: settings.keyboardLayout,
    linePreview: Math.max(1, Math.min(6, Math.round(layout.linePreview))),
    maxWordsPerLine: Math.max(1, Math.min(10, Math.round(layout.maxWordsPerLine))),
  };
}

export function fromAccountPreferences(previous: SettingsState, preferences: AccountPreferences): SettingsState {
  const settings = { ...previous };
  for (const [key, setting] of Object.entries(fields)) {
    const value = preferences[key as keyof typeof fields];
    if (value !== undefined) Object.assign(settings, { [setting]: value });
  }
  if (settings.mode === "plan") settings.mode = "zen";
  settings.capitalization = preferences.defaultCapitalization ?? false;
  settings.typingFontFamily = preferences.typingFontFamily ?? DEFAULT_TYPING_FONT;
  return normalizePracticeSettings(settings);
}
