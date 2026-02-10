/**
 * Theme System Types
 *
 * Comprehensive theme structure with semantic color groupings,
 * light/dark mode support, and CSS variable integration.
 */

// Theme categories for organization
export type ThemeCategory =
  | "default"
  | "editor"
  | "holiday"
  | "nature"
  | "animals"
  | "time"
  | "retro"
  | "aesthetic"
  | "utility"
  | "fun"
  | "color-theory"
  | "cultural"
  | "books"
  | "mythology"
  | "cities"
  | "subject"
  | "brand"
  | "weather"
  | "productivity"
  | "gaming"
  | "music"
  | "music-bands"
  | "music-artists"
  | "food"
  | "space"
  | "sports"
  | "tv-shows"
  | "movies"
  | "anime";

// Color scale with opacity variants (all manually specified in JSON)
export type ColorScale = {
  DEFAULT: string; // Base color
  muted: string; // ~30% opacity variant
  subtle: string; // ~10% opacity variant
};

// Full theme color structure
export type ThemeColors = {
  // Surfaces
  bg: {
    base: string; // Main app background
    surface: string; // Cards, modals, panels
    elevated: string; // Dropdowns, tooltips
    overlay: string; // Modal backdrops (with opacity)
  };

  // Text
  text: {
    primary: string; // Main content, correct text
    secondary: string; // Muted, upcoming text
    muted: string; // Hints, placeholders
    inverse: string; // Text on accent backgrounds
  };

  // Interactive elements
  interactive: {
    primary: ColorScale; // Primary buttons, links
    secondary: ColorScale; // Selected states
    accent: ColorScale; // Highlights, focus rings
  };

  // Status indicators
  status: {
    success: ColorScale;
    error: ColorScale;
    warning: ColorScale;
  };

  // Borders and dividers
  border: {
    default: string;
    subtle: string;
    focus: string;
  };

  // Typing-specific (core feature)
  typing: {
    cursor: string;
    cursorGhost: string;
    correct: string;
    incorrect: string;
    upcoming: string;
    default: string;
  };
};

// Theme definition with optional light mode
export type ThemeDefinition = {
  id: string;
  name: string;
  category: ThemeCategory;
  dark: ThemeColors;
  light: ThemeColors | null; // Optional - can be added manually per theme
};

// Theme manifest structure
export type ThemeManifest = {
  themes: string[];
  default: string;
};

// Grouped themes for UI display
export type GroupedThemes = {
  category: ThemeCategory;
  displayName: string;
  themes: ThemeDefinition[];
};

// Theme mode
export type ThemeMode = "light" | "dark";

// Category display configuration
export type CategoryConfig = {
  displayName: string;
  order: number;
};

// Legacy theme type (for backward compatibility during migration)
export type LegacyTheme = {
  // Typing-specific colors (keep for typing UI)
  cursor: string;
  defaultText: string;
  upcomingText: string;
  correctText: string;
  incorrectText: string;
  ghostCursor: string;

  // Interactive colors
  buttonUnselected: string;
  buttonSelected: string;
  accentColor: string;
  accentMuted: string;
  accentSubtle: string;

  // Background colors
  backgroundColor: string;
  surfaceColor: string;
  elevatedColor: string;
  overlayColor: string;

  // General UI text (use these for non-typing UI)
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders
  borderDefault: string;
  borderSubtle: string;
  borderFocus: string;

  // Status colors
  statusSuccess: string;
  statusSuccessMuted: string;
  statusError: string;
  statusErrorMuted: string;
  statusWarning: string;
  statusWarningMuted: string;

  category?: ThemeCategory;
};

/**
 * Convert new ThemeColors to legacy Theme format.
 * Use this during the migration period for backward compatibility.
 */
export function toLegacyTheme(colors: ThemeColors): LegacyTheme {
  return {
    // Typing-specific colors
    cursor: colors.typing.cursor,
    defaultText: colors.typing.default,
    upcomingText: colors.typing.upcoming,
    correctText: colors.typing.correct,
    incorrectText: colors.typing.incorrect,
    ghostCursor: colors.typing.cursorGhost,

    // Interactive colors
    buttonUnselected: colors.interactive.primary.DEFAULT,
    buttonSelected: colors.interactive.secondary.DEFAULT,
    accentColor: colors.interactive.accent.DEFAULT,
    accentMuted: colors.interactive.accent.muted,
    accentSubtle: colors.interactive.accent.subtle,

    // Background colors
    backgroundColor: colors.bg.base,
    surfaceColor: colors.bg.surface,
    elevatedColor: colors.bg.elevated,
    overlayColor: colors.bg.overlay,

    // General UI text
    textPrimary: colors.text.primary,
    textSecondary: colors.text.secondary,
    textMuted: colors.text.muted,
    textInverse: colors.text.inverse,

    // Borders
    borderDefault: colors.border.default,
    borderSubtle: colors.border.subtle,
    borderFocus: colors.border.focus,

    // Status colors
    statusSuccess: colors.status.success.DEFAULT,
    statusSuccessMuted: colors.status.success.muted,
    statusError: colors.status.error.DEFAULT,
    statusErrorMuted: colors.status.error.muted,
    statusWarning: colors.status.warning.DEFAULT,
    statusWarningMuted: colors.status.warning.muted,
  };
}
