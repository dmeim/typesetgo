// Shared state shape for the /temp-settings mockups. Nothing here is persisted.
// Section metadata now comes from the real Profile page (components/profile/profile-sections.ts).
import { SETTING_INDEX as PROFILE_SETTING_INDEX, type SettingIndexEntry } from "@/components/profile/profile-sections";
import { DEFAULT_SETTINGS } from "@/lib/storage-utils";
import type { SettingsState } from "@/lib/typing-constants";
import type { KeyboardStyle } from "@/components/temp/keyboard/keyboard-mock";

export type LabSettings = SettingsState & {
  linePreview: number;
  maxWordsPerLine: number;
  /** How the on-screen keyboard looks; Kids mode has its own pick. */
  keyboardStyle: KeyboardStyle;
  kidsKeyboardStyle: KeyboardStyle;
};

export const INITIAL_LAB_SETTINGS: LabSettings = {
  ...DEFAULT_SETTINGS,
  presetText: "",
  linePreview: 3,
  maxWordsPerLine: 8,
  keyboardStyle: "spotlight",
  kidsKeyboardStyle: "finger",
};

export {
  ACCOUNT_SECTIONS, FONT_GROUPS, PROFILE_SPRING as LAB_SPRING, SECTIONS,
  type AccountSectionId, type PaneId, type SectionId, type SectionMeta,
} from "@/components/profile/profile-sections";

/** The real search index plus the mockups' Kids mode keyboard. */
export const SETTING_INDEX: SettingIndexEntry[] = PROFILE_SETTING_INDEX.flatMap((entry) => entry.id === "keyboard-style"
  ? [entry, { id: "kids-keyboard", section: "keyboard" as const, label: "Kids mode keyboard", keywords: "children young learner fingers hands" }]
  : [entry]);
