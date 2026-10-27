import { useCallback, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeSelection } from "@/components/profile/theme-catalog";
import { INITIAL_LAB_SETTINGS, type LabSettings } from "./lab-settings";

// The catalogue hooks are the real Profile page's; the mockups only keep their own unsaved state.
export {
  findVariant, useFilteredThemes, useSoundPacks, useThemeCatalog, useThemeCategories, useThemeColors,
} from "@/components/profile/theme-catalog";

export type LabTheme = ThemeSelection;

/** Local copy of every setting, starting from the site's current theme. Never saves. */
export function useLabSettings() {
  const current = useTheme();
  const [settings, setSettings] = useState<LabSettings>(INITIAL_LAB_SETTINGS);
  const [theme, setTheme] = useState<LabTheme>({ themeId: current.themeId, variantId: current.variantId, mode: current.mode });
  const update = useCallback((changes: Partial<LabSettings>) => setSettings((previous) => ({ ...previous, ...changes })), []);
  return { settings, update, theme, setTheme };
}

export type LabState = ReturnType<typeof useLabSettings>;
