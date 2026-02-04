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
  | "time"
  | "retro"
  | "aesthetic"
  | "utility"
  | "fun"
  | "color-theory"
  | "cultural"
  | "brand"
  | "weather"
  | "productivity"
  | "gaming"
  | "music"
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
  cursor: string;
  defaultText: string;
  upcomingText: string;
  correctText: string;
  incorrectText: string;
  buttonUnselected: string;
  buttonSelected: string;
  backgroundColor: string;
  surfaceColor: string;
  ghostCursor: string;
  category?: ThemeCategory;
};

/**
 * Convert new ThemeColors to legacy Theme format.
 * Use this during the migration period for backward compatibility.
 */
export function toLegacyTheme(colors: ThemeColors): LegacyTheme {
  return {
    cursor: colors.typing.cursor,
    defaultText: colors.typing.default,
    upcomingText: colors.typing.upcoming,
    correctText: colors.typing.correct,
    incorrectText: colors.typing.incorrect,
    buttonUnselected: colors.interactive.primary.DEFAULT,
    buttonSelected: colors.interactive.secondary.DEFAULT,
    backgroundColor: colors.bg.base,
    surfaceColor: colors.bg.surface,
    ghostCursor: colors.typing.cursorGhost,
  };
}
