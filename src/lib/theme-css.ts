import type { ThemeColors } from "@/types/theme";
import { deriveThemeTyping, deriveThemeUI } from "@/lib/colors";

const cssName = (role: string) => role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * Every CSS variable a theme sets: derived UI roles, the raw palette, and typing roles. Shared by the
 * page theme and scoped themes (a Connect room) so both style components identically.
 */
export function themeCSSVariables(colors: ThemeColors): Record<string, string> {
  const ui = deriveThemeUI(colors);
  const typing = deriveThemeTyping(colors, ui);
  const { bg, text, interactive, status, border } = colors;
  return {
    ...Object.fromEntries(Object.entries(ui).map(([role, value]) => [`--${cssName(role)}`, value])),
    "--theme-bg-base": bg.base,
    "--theme-bg-surface": bg.surface,
    "--theme-bg-elevated": bg.elevated,
    "--theme-bg-overlay": bg.overlay,
    "--theme-text-primary": text.primary,
    "--theme-text-secondary": text.secondary,
    "--theme-text-muted": text.muted,
    "--theme-text-inverse": text.inverse,
    "--theme-interactive-primary": interactive.primary.DEFAULT,
    "--theme-interactive-primary-muted": interactive.primary.muted,
    "--theme-interactive-primary-subtle": interactive.primary.subtle,
    "--theme-interactive-secondary": interactive.secondary.DEFAULT,
    "--theme-interactive-secondary-muted": interactive.secondary.muted,
    "--theme-interactive-secondary-subtle": interactive.secondary.subtle,
    "--theme-interactive-accent": interactive.accent.DEFAULT,
    "--theme-interactive-accent-muted": interactive.accent.muted,
    "--theme-interactive-accent-subtle": interactive.accent.subtle,
    "--theme-status-success": status.success.DEFAULT,
    "--theme-status-success-muted": status.success.muted,
    "--theme-status-success-subtle": status.success.subtle,
    "--theme-status-error": status.error.DEFAULT,
    "--theme-status-error-muted": status.error.muted,
    "--theme-status-error-subtle": status.error.subtle,
    "--theme-status-warning": status.warning.DEFAULT,
    "--theme-status-warning-muted": status.warning.muted,
    "--theme-status-warning-subtle": status.warning.subtle,
    "--theme-border-default": border.default,
    "--theme-border-subtle": border.subtle,
    "--theme-border-focus": border.focus,
    ...Object.fromEntries(Object.entries(typing).map(([role, value]) => [`--theme-typing-${cssName(role)}`, value])),
  };
}
