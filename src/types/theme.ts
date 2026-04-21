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
  | "seasons"
  | "biomes"
  | "plants"
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
  | "anime"
  | "zodiac"
  | "instruments"
  | "dance"
  | "gemstones"
  | "vehicles"
  | "comics"
  | "historical-era"
  | "emotions"
  | "textiles";

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

// A single variant within a theme (e.g., "default", "meteora", "hybrid-theory")
export type ThemeVariantDefinition = {
  id: string;
  label: string;
  dark: ThemeColors;
  light: ThemeColors | null;
};

// Atomic selection of theme + variant + mode
export type ThemeSelection = {
  themeId: string;
  variantId: string;
  mode: ThemeMode;
};

// Theme definition with variant support
export type ThemeDefinition = {
  id: string;
  name: string;
  category: ThemeCategory;
  dark: ThemeColors;
  light: ThemeColors | null;
  defaultVariantId: string;
  variants: ThemeVariantDefinition[];
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

