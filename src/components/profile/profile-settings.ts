// The practice settings the Profile page edits. They live in the same localStorage keys Home reads
// (storage-utils) and map to the same account preferences (practice-preferences), so an edit here is
// what Home starts with next time, on this device and after a sign-in sync.
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { fromAccountPreferences } from "@/lib/practice-preferences";
import {
  DEFAULT_SETTINGS, loadLayoutSettings, loadSettings, saveLayoutSettings, saveSettings, type LayoutSettings,
} from "@/lib/storage-utils";
import { normalizePracticeSettings, type SettingsState } from "@/lib/typing-constants";

export type ProfileSettings = SettingsState & LayoutSettings;
export type ProfileSettingsUpdate = (changes: Partial<ProfileSettings>) => void;
export type StoredAccountPreferences = NonNullable<FunctionReturnType<typeof api.preferences.getPreferences>>;

/** Same fallbacks Home uses when nothing is stored yet. */
export const DEFAULT_LAYOUT: LayoutSettings = { linePreview: 3, maxWordsPerLine: 7 };

const LAYOUT_LIMITS: Record<keyof LayoutSettings, [number, number]> = { linePreview: [1, 6], maxWordsPerLine: [1, 10] };

function clampLayout(key: keyof LayoutSettings, value: number) {
  const [min, max] = LAYOUT_LIMITS[key];
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : DEFAULT_LAYOUT[key];
}

function splitSettings({ linePreview, maxWordsPerLine, ...practice }: ProfileSettings): [SettingsState, LayoutSettings] {
  return [practice, { linePreview, maxWordsPerLine }];
}

/** What Home would start with right now. */
export function readProfileSettings(): ProfileSettings {
  const practice = normalizePracticeSettings({ ...DEFAULT_SETTINGS, presetText: "", ...loadSettings() });
  const layout = loadLayoutSettings() ?? DEFAULT_LAYOUT;
  return { ...practice, ...layout };
}

/** Applies an edit with the same limits Home enforces, so nothing out of range is ever stored. */
export function mergeProfileSettings(current: ProfileSettings, changes: Partial<ProfileSettings>): ProfileSettings {
  const [practice, layout] = splitSettings({ ...current, ...changes });
  return {
    ...normalizePracticeSettings(practice),
    linePreview: clampLayout("linePreview", layout.linePreview),
    maxWordsPerLine: clampLayout("maxWordsPerLine", layout.maxWordsPerLine),
  };
}

export function persistProfileSettings(settings: ProfileSettings) {
  const [practice, layout] = splitSettings(settings);
  saveSettings(practice);
  saveLayoutSettings(layout);
}

/** Account defaults win, except for settings edited on this page before they arrived. */
export function hydrateProfileSettings(current: ProfileSettings, preferences: StoredAccountPreferences, editedKeys: ReadonlySet<string>): ProfileSettings {
  const [practice, layout] = splitSettings(current);
  const restored: ProfileSettings = {
    ...fromAccountPreferences(practice, preferences),
    linePreview: typeof preferences.linePreview === "number" ? clampLayout("linePreview", preferences.linePreview) : layout.linePreview,
    maxWordsPerLine: typeof preferences.maxWordsPerLine === "number" ? clampLayout("maxWordsPerLine", preferences.maxWordsPerLine) : layout.maxWordsPerLine,
  };
  for (const key of editedKeys) {
    if (key in current) Object.assign(restored, { [key]: current[key as keyof ProfileSettings] });
  }
  return restored;
}

export { splitSettings as splitProfileSettings };
