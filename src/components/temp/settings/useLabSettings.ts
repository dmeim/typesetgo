import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { fetchSoundManifest, getSoundPacks, type SoundManifest } from "@/lib/sounds";
import { CATEGORY_CONFIG, fetchThemeCatalogIndex, fetchThemeForPreview, type ThemeDefinition } from "@/lib/themes";
import type { ThemeCatalogEntry, ThemeCategory, ThemeColors, ThemeMode } from "@/types/theme";
import { INITIAL_LAB_SETTINGS, type LabSettings } from "./lab-settings";

export interface LabTheme {
  themeId: string;
  variantId: string;
  mode: ThemeMode;
}

/** Local copy of every setting, starting from the site's current theme. Never saves. */
export function useLabSettings() {
  const current = useTheme();
  const [settings, setSettings] = useState<LabSettings>(INITIAL_LAB_SETTINGS);
  const [theme, setTheme] = useState<LabTheme>({ themeId: current.themeId, variantId: current.variantId, mode: current.mode });
  const update = useCallback((changes: Partial<LabSettings>) => setSettings((previous) => ({ ...previous, ...changes })), []);
  return { settings, update, theme, setTheme };
}

export type LabState = ReturnType<typeof useLabSettings>;

/** The full theme catalogue (names, categories and four swatches per variant). */
export function useThemeCatalog() {
  const [themes, setThemes] = useState<ThemeCatalogEntry[] | null>(null);
  useEffect(() => {
    let active = true;
    void fetchThemeCatalogIndex().then((catalog) => { if (active) setThemes(catalog?.themes ?? []); });
    return () => { active = false; };
  }, []);
  return themes;
}

/** Loads one theme's full palette for the preview window; keeps the last palette while the next one loads. */
export function useThemeColors(theme: LabTheme | null) {
  const [loaded, setLoaded] = useState<{ id: string; definition: ThemeDefinition | null } | null>(null);
  const themeId = theme?.themeId ?? null;
  useEffect(() => {
    if (!themeId) return;
    let active = true;
    void fetchThemeForPreview(themeId).then((definition) => { if (active) setLoaded({ id: themeId, definition }); });
    return () => { active = false; };
  }, [themeId]);
  return useMemo<ThemeColors | null>(() => {
    const definition = loaded?.definition;
    if (!definition || !theme) return null;
    const variant = definition.variants.find((candidate) => candidate.id === theme.variantId) ?? definition.variants[0];
    return (theme.mode === "light" ? variant.light : null) ?? variant.dark;
  }, [loaded, theme]);
}

export function useSoundPacks() {
  const [manifest, setManifest] = useState<SoundManifest | null>(null);
  useEffect(() => {
    let active = true;
    void fetchSoundManifest().then((value) => { if (active) setManifest(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return { typing: getSoundPacks(manifest, "typing"), warning: getSoundPacks(manifest, "warning") };
}

export function findVariant(entry: ThemeCatalogEntry | undefined, variantId: string) {
  return entry?.variants.find((variant) => variant.id === variantId) ?? entry?.variants[0];
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Themes matching a search and category, featured first, capped so huge categories stay quick. */
export function useFilteredThemes(themes: ThemeCatalogEntry[] | null, query: string, category: ThemeCategory | "all", limit = 60) {
  return useMemo(() => {
    if (!themes) return { results: [], total: 0 };
    const needle = normalize(query.trim());
    const matching = themes.filter((theme) =>
      (category === "all" || theme.category === category)
      && (!needle || normalize(theme.name).includes(needle) || normalize(CATEGORY_CONFIG[theme.category].displayName).includes(needle)));
    return { results: matching.slice(0, limit), total: matching.length };
  }, [themes, query, category, limit]);
}

/** Categories in catalogue order with how many themes each holds. */
export function useThemeCategories(themes: ThemeCatalogEntry[] | null) {
  return useMemo(() => {
    const counts = new Map<ThemeCategory, number>();
    for (const theme of themes ?? []) counts.set(theme.category, (counts.get(theme.category) ?? 0) + 1);
    return [...counts.entries()]
      .sort(([a], [b]) => CATEGORY_CONFIG[a].order - CATEGORY_CONFIG[b].order)
      .map(([id, count]) => ({ id, name: CATEGORY_CONFIG[id].displayName, count }));
  }, [themes]);
}
