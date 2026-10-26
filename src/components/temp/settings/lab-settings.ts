// Shared state shape and section metadata for the /temp-settings mockups. Nothing here is persisted.
import { KeyboardIcon, LightningIcon, PaletteIcon, SpeakerHighIcon, TextAaIcon, type Icon } from "@phosphor-icons/react";
import { DEFAULT_SETTINGS } from "@/lib/storage-utils";
import type { SettingsState } from "@/lib/typing-constants";

export type LabSettings = SettingsState & { linePreview: number; maxWordsPerLine: number };

export const INITIAL_LAB_SETTINGS: LabSettings = {
  ...DEFAULT_SETTINGS,
  presetText: "",
  linePreview: 3,
  maxWordsPerLine: 8,
};

export type SectionId = "theme" | "text" | "typing" | "sound" | "keyboard";

export interface SectionMeta {
  id: SectionId;
  title: string;
  description: string;
  Icon: Icon;
  /** Solid tile colour for iOS-style icons; theme tokens so every theme stays legible. */
  tile: string;
}

export const SECTIONS: SectionMeta[] = [
  { id: "theme", title: "Theme", description: "Colours for the whole site, with light and dark versions.", Icon: PaletteIcon, tile: "bg-(--accent-emphasis) text-background" },
  { id: "text", title: "Text", description: "The font, size and alignment of the words you type.", Icon: TextAaIcon, tile: "bg-primary text-primary-foreground" },
  { id: "typing", title: "Typing", description: "How many lines you see, and a ghost racer to chase.", Icon: LightningIcon, tile: "bg-warning text-background" },
  { id: "sound", title: "Sound", description: "Clicks while you type and a warning before time runs out.", Icon: SpeakerHighIcon, tile: "bg-success text-background" },
  { id: "keyboard", title: "Keyboard", description: "An on-screen keyboard that shows the next key to press.", Icon: KeyboardIcon, tile: "bg-destructive text-background" },
];

export const LAB_SPRING = { type: "spring", stiffness: 460, damping: 38, mass: 0.85 } as const;

/** Plain-language searchable settings, so younger players can find things by what they want. */
export const SETTING_INDEX: { id: string; section: SectionId; label: string; keywords: string }[] = [
  { id: "theme", section: "theme", label: "Theme", keywords: "colour color look style palette" },
  { id: "mode", section: "theme", label: "Light or dark", keywords: "dark mode light mode night bright" },
  { id: "font", section: "text", label: "Font", keywords: "typeface letters style mono" },
  { id: "size", section: "text", label: "Text size", keywords: "bigger smaller zoom large" },
  { id: "align", section: "text", label: "Alignment", keywords: "left center centre right justify" },
  { id: "lines", section: "typing", label: "Lines shown", keywords: "preview rows lines ahead" },
  { id: "words", section: "typing", label: "Words per line", keywords: "width line length" },
  { id: "ghost", section: "typing", label: "Ghost racer", keywords: "ghost writer pace race target speed" },
  { id: "sound", section: "sound", label: "Sound", keywords: "audio mute quiet volume" },
  { id: "typing-sound", section: "sound", label: "Typing sound", keywords: "click clack keys audio" },
  { id: "warning-sound", section: "sound", label: "Warning sound", keywords: "timer alarm beep" },
  { id: "keyboard", section: "keyboard", label: "On-screen keyboard", keywords: "keys guide hands" },
  { id: "layout", section: "keyboard", label: "Keyboard layout", keywords: "qwerty dvorak colemak" },
];

/** Typing fonts grouped the way typing-fonts.ts orders them. */
export const FONT_GROUPS: { title: string; values: string[] }[] = [
  { title: "Monospace", values: [
    "jetbrains-mono", "roboto-mono", "source-code-pro", "fira-code", "fira-mono", "ibm-plex-mono", "inconsolata", "space-mono",
    "noto-sans-mono", "red-hat-mono", "dm-mono", "overpass-mono", "geist-mono", "victor-mono", "martian-mono", "anonymous-pro",
    "pt-mono", "courier-prime", "courier-new",
  ] },
  { title: "Sans-serif", values: [
    "arial", "roboto", "open-sans", "noto-sans", "lato", "inter", "nunito", "nunito-sans", "montserrat", "poppins", "raleway",
    "rubik", "work-sans", "fira-sans", "source-sans-3", "ibm-plex-sans", "pt-sans", "dm-sans", "quicksand", "mulish", "barlow",
    "manrope", "karla", "outfit", "plus-jakarta-sans", "figtree", "geist", "verdana", "trebuchet-ms", "comic-sans",
  ] },
  { title: "Serif", values: [
    "georgia", "merriweather", "lora", "noto-serif", "pt-serif", "source-serif-4", "literata", "bitter", "libre-baskerville",
    "eb-garamond", "crimson-pro", "playfair-display", "times-new-roman",
  ] },
  { title: "Easy to read", values: [
    "lexend", "readex-pro", "atkinson-hyperlegible", "atkinson-hyperlegible-next", "atkinson-hyperlegible-mono", "andika",
    "playpen-sans", "comic-neue", "fredoka", "opendyslexic",
  ] },
];
