import type { Theme } from "@/lib/typing-constants";

export type ThemeCategory =
  | "default"
  | "editor"
  | "holiday"
  | "nature"
  | "time"
  | "retro"
  | "aesthetic"
  | "utility"
  | "fun";

export type ThemeDefinition = Theme & {
  name: string;
  category?: ThemeCategory;
};

export type ThemeManifest = {
  themes: string[];
  default: string;
};

export type GroupedThemes = {
  category: ThemeCategory;
  displayName: string;
  themes: ThemeDefinition[];
};

// Category display order and names
export const CATEGORY_CONFIG: Record<ThemeCategory, { displayName: string; order: number }> = {
  default: { displayName: "TypeSetGo", order: 0 },
  editor: { displayName: "Editor/IDE", order: 1 },
  holiday: { displayName: "Holiday", order: 2 },
  nature: { displayName: "Nature", order: 3 },
  time: { displayName: "Time of Day", order: 4 },
  retro: { displayName: "Retro/Tech", order: 5 },
  aesthetic: { displayName: "Aesthetic", order: 6 },
  utility: { displayName: "Utility", order: 7 },
  fun: { displayName: "Fun", order: 8 },
};

// Cache for loaded data
let cachedManifest: ThemeManifest | null = null;
const themeCache: Record<string, ThemeDefinition> = {};

// Format theme name for display (capitalize first letter of each word)
const formatThemeName = (name: string): string => {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Fetch theme manifest from /public/themes/manifest.json
export async function fetchThemeManifest(): Promise<ThemeManifest> {
  if (cachedManifest) {
    return cachedManifest;
  }

  try {
    const res = await fetch("/themes/manifest.json");
    if (!res.ok) {
      console.error("Failed to load theme manifest");
      return { themes: [], default: "typesetgo" };
    }
    cachedManifest = await res.json();
    return cachedManifest!;
  } catch (e) {
    console.error("Failed to load theme manifest:", e);
    return { themes: [], default: "typesetgo" };
  }
}

// Get manifest from cache
export function getThemeManifestFromCache(): ThemeManifest | null {
  return cachedManifest;
}

// Fetch a single theme by name from /public/themes/
export async function fetchTheme(themeName: string): Promise<ThemeDefinition | null> {
  const key = themeName.toLowerCase();
  
  // Return from cache if available
  if (themeCache[key]) {
    return themeCache[key];
  }

  try {
    const res = await fetch(`/themes/${key}.json`);
    if (!res.ok) return null;
    
    const colors = await res.json();
    const theme: ThemeDefinition = {
      name: formatThemeName(key),
      ...colors,
    };
    
    // Cache the loaded theme
    themeCache[key] = theme;
    return theme;
  } catch (e) {
    console.error(`Failed to load theme: ${themeName}`, e);
    return null;
  }
}

// Fetch all available themes from /public/themes/
export async function fetchAllThemes(): Promise<ThemeDefinition[]> {
  const manifest = await fetchThemeManifest();
  
  const themes = await Promise.all(
    manifest.themes.map((name) => fetchTheme(name))
  );
  
  // Filter out any failed loads and sort (TypeSetGo first, then alphabetically)
  return themes
    .filter((t): t is ThemeDefinition => t !== null)
    .sort((a, b) => {
      if (a.name.toLowerCase() === "typesetgo") return -1;
      if (b.name.toLowerCase() === "typesetgo") return 1;
      return a.name.localeCompare(b.name);
    });
}

// Group themes by category
export function groupThemesByCategory(themes: ThemeDefinition[]): GroupedThemes[] {
  const groups: Record<ThemeCategory, ThemeDefinition[]> = {
    default: [],
    editor: [],
    holiday: [],
    nature: [],
    time: [],
    retro: [],
    aesthetic: [],
    utility: [],
    fun: [],
  };

  // Group themes
  for (const theme of themes) {
    const category = theme.category || "default";
    if (groups[category]) {
      groups[category].push(theme);
    } else {
      groups.default.push(theme);
    }
  }

  // Sort themes within each category alphabetically
  for (const category of Object.keys(groups) as ThemeCategory[]) {
    groups[category].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Build sorted grouped array
  const result: GroupedThemes[] = [];
  const sortedCategories = (Object.keys(CATEGORY_CONFIG) as ThemeCategory[]).sort(
    (a, b) => CATEGORY_CONFIG[a].order - CATEGORY_CONFIG[b].order
  );

  for (const category of sortedCategories) {
    if (groups[category].length > 0) {
      result.push({
        category,
        displayName: CATEGORY_CONFIG[category].displayName,
        themes: groups[category],
      });
    }
  }

  return result;
}

// Get a theme synchronously from cache (returns null if not loaded yet)
export function getThemeFromCache(themeName: string): ThemeDefinition | null {
  return themeCache[themeName.toLowerCase()] || null;
}
