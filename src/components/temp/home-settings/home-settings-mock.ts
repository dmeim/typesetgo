// Shared state for the Home quick-settings concepts on /temp. Local state only: nothing is saved.
import type { RefObject } from "react";
import type { ProfileSettings, ProfileSettingsUpdate } from "@/components/profile/profile-settings";
import type { ThemeSelection } from "@/components/profile/theme-catalog";
import { DEFAULT_SETTINGS } from "@/lib/storage-utils";
import type { ThemeCatalogEntry } from "@/types/theme";

export type Device = "desktop" | "phone";
/** Which Home button opened the surface. */
export type SurfaceTarget = "settings" | "theme" | "sound";

export interface HomeLook {
  settings: ProfileSettings;
  theme: ThemeSelection;
}

export const INITIAL_LOOK: HomeLook = {
  settings: { ...DEFAULT_SETTINGS, mode: "time", presetText: "", linePreview: 3, maxWordsPerLine: 7 },
  theme: { themeId: "typesetgo", variantId: "default", mode: "dark" },
};

/** Hand-picked themes for the quick surfaces; the full catalogue stays on the profile page. */
export const FEATURED_THEME_IDS = [
  "typesetgo", "dracula", "nord", "catppuccin", "tokyo-night", "rose-pine", "gruvbox", "solarized", "github", "80s-neon", "ocean", "forest",
];

export function featuredThemes(themes: ThemeCatalogEntry[] | null, count = FEATURED_THEME_IDS.length) {
  if (!themes) return [];
  const byId = new Map(themes.map((theme) => [theme.id, theme]));
  return FEATURED_THEME_IDS.slice(0, count).map((id) => byId.get(id)).filter((theme): theme is ThemeCatalogEntry => Boolean(theme));
}

/** What every concept gets from the showcase. */
export interface ConceptProps {
  device: Device;
  open: boolean;
  target: SurfaceTarget;
  /** The look being edited: a draft while the Studio is open, otherwise the live settings. */
  look: HomeLook;
  /** What Home shows right now (the saved look while comparing in the Studio). */
  shown: HomeLook;
  update: ProfileSettingsUpdate;
  setTheme: (theme: ThemeSelection) => void;
  themes: ThemeCatalogEntry[] | null;
  /** Closes the surface; the Studio passes `false` to throw its draft away. */
  close: (keep?: boolean) => void;
  setComparing: (comparing: boolean) => void;
  stageRef: RefObject<HTMLDivElement | null>;
}

export const SAMPLE_TEXT = "the little robot found a bright green leaf near the garden gate and carried it home to show its friends who were waiting by the window with warm cocoa tonight while the stars came out one by one over the quiet town";
export const SAMPLE_TYPED = "the little robto found a bri";

export const ALIGN_LABELS = { left: "Left", center: "Centre", right: "Right", justify: "Justify" } as const;
