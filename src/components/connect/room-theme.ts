import type { CSSProperties } from "react";
import type { Theme } from "@/lib/typing-constants";
import type { ThemeColors } from "@/types/theme";
import { deriveThemeTyping, deriveThemeUI } from "@/lib/colors";

/** Room colors belong to this exercise, never the participant's saved theme. */
export function getRoomThemeStyle(theme: Theme | undefined, personalColors: ThemeColors): CSSProperties {
  if (!theme) return {};
  const colors: ThemeColors = {
    ...personalColors,
    bg: { ...personalColors.bg, base: theme.backgroundColor, surface: theme.surfaceColor, elevated: theme.surfaceColor },
    text: { ...personalColors.text, primary: theme.correctText, secondary: theme.defaultText },
    interactive: {
      ...personalColors.interactive,
      primary: { ...personalColors.interactive.primary, DEFAULT: theme.buttonUnselected },
      secondary: { ...personalColors.interactive.secondary, DEFAULT: theme.buttonSelected },
    },
    typing: {
      cursor: theme.cursor,
      cursorGhost: theme.ghostCursor,
      correct: theme.correctText,
      incorrect: theme.incorrectText,
      upcoming: theme.upcomingText,
      default: theme.defaultText,
    },
  };
  const ui = deriveThemeUI(colors);
  const typing = deriveThemeTyping(colors, ui);
  const cssName = (role: string) => role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return Object.fromEntries([
    ...Object.entries(ui).map(([role, value]) => [`--${cssName(role)}`, value]),
    ...Object.entries(typing).map(([role, value]) => [`--theme-typing-${cssName(role)}`, value]),
  ]) as CSSProperties;
}
