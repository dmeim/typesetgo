import type { ConnectOverrides } from "@/lib/connect-types";
import { DEFAULT_KEYBOARD_STYLE } from "@/lib/keyboard-model";
import { DEFAULT_TYPING_FONT } from "@/lib/typing-fonts";

/** Every group with every value filled in, except the theme look, which falls back to the theme's own default. */
export type OverrideGroups = {
  theme: NonNullable<ConnectOverrides["theme"]>;
  typography: Required<NonNullable<ConnectOverrides["typography"]>>;
  ghost: NonNullable<ConnectOverrides["ghost"]>;
  sound: NonNullable<ConnectOverrides["sound"]>;
  keyboard: Required<NonNullable<ConnectOverrides["keyboard"]>>;
};

/** Starting values for a group the host has never configured. */
export const OVERRIDE_DEFAULTS: OverrideGroups = {
  theme: { enabled: false, themeId: "typesetgo", mode: "dark" },
  typography: { enabled: false, typingFontFamily: DEFAULT_TYPING_FONT, typingFontSize: 3.25, textAlign: "center", linePreview: 3, maxWordsPerLine: 7 },
  ghost: { enabled: false, ghostWriterEnabled: true, ghostWriterSpeed: 40 },
  sound: { enabled: false, soundEnabled: true, typingSound: "creamy", warningSound: "clock" },
  keyboard: { enabled: false, showOnScreenKeyboard: true, keyboardLayout: "qwerty", keyboardStyle: DEFAULT_KEYBOARD_STYLE },
};

/** The look of solo Kids mode for a whole room: big text, short lines, the finger guide and no ghost. Tests stay as the host set them. */
export const KID_FRIENDLY = {
  typography: { enabled: true, typingFontSize: 5.5, linePreview: 2, maxWordsPerLine: 5 },
  ghost: { enabled: true, ghostWriterEnabled: false },
  keyboard: { enabled: true, showOnScreenKeyboard: true, keyboardStyle: "finger" },
} satisfies { [K in "typography" | "ghost" | "keyboard"]: Partial<OverrideGroups[K]> };
