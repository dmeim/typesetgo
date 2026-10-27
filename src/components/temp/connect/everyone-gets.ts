// The host's "Everyone gets" choices: each group replaces the students' own setting only while it is on.
import { GhostIcon, KeyboardIcon, PaletteIcon, SpeakerHighIcon, TextAaIcon, type Icon } from "@phosphor-icons/react";
import { INITIAL_LAB_SETTINGS, type LabSettings } from "@/components/temp/settings/lab-settings";
import type { LabTheme } from "@/components/temp/settings/useLabSettings";

export type GroupId = "theme" | "text" | "ghost" | "sound" | "keyboard";

export interface EveryoneGets {
  on: Record<GroupId, boolean>;
  /** Values are kept while a group is off, so turning it back on restores them. */
  settings: LabSettings;
  theme: LabTheme;
}

export const INITIAL_EVERYONE: EveryoneGets = {
  on: { theme: true, text: false, ghost: false, sound: true, keyboard: false },
  settings: { ...INITIAL_LAB_SETTINGS, showOnScreenKeyboard: true, ghostWriterEnabled: true, ghostWriterSpeed: 40, soundEnabled: true },
  theme: { themeId: "a-short-hike", variantId: "default", mode: "dark" },
};

export const GROUPS: { id: GroupId; label: string; on: string; Icon: Icon }[] = [
  { id: "theme", label: "Theme", on: "Everyone sees the room's colours.", Icon: PaletteIcon },
  { id: "text", label: "Text", on: "Everyone uses this font, size and alignment.", Icon: TextAaIcon },
  { id: "ghost", label: "Ghost racer", on: "A pacing cursor shows the target speed.", Icon: GhostIcon },
  { id: "sound", label: "Sounds", on: "Everyone hears the same typing sounds.", Icon: SpeakerHighIcon },
  { id: "keyboard", label: "On-screen keyboard", on: "The keyboard follows the room's setting.", Icon: KeyboardIcon },
];
