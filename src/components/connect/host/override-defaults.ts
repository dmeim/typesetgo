import type { ConnectOverrides } from "@/lib/connect-types";
import { DEFAULT_TYPING_FONT } from "@/lib/typing-fonts";

export type OverrideGroups = Required<ConnectOverrides>;

/** Starting values for a group the host has never configured. */
export const OVERRIDE_DEFAULTS: OverrideGroups = {
  theme: { enabled: false, themeId: "typesetgo", mode: "dark" },
  typography: { enabled: false, typingFontFamily: DEFAULT_TYPING_FONT, typingFontSize: 3.25, textAlign: "center" },
  ghost: { enabled: false, ghostWriterEnabled: true, ghostWriterSpeed: 40 },
  sound: { enabled: false, soundEnabled: true, typingSound: "creamy", warningSound: "clock" },
  keyboard: { enabled: false, showOnScreenKeyboard: true, keyboardLayout: "qwerty" },
};
