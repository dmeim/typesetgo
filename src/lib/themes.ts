import { CATEGORY_CONFIG, formatThemeName } from "@/lib/theme-catalog";
export { CATEGORY_CONFIG } from "@/lib/theme-catalog";
import { deriveThemeUI, parseThemeColor } from "@/lib/colors";
import type {
  ThemeCategory,
  ThemeDefinition,
  ThemeVariantDefinition,
  ThemeManifest,
  ThemeColors,
  GroupedThemes,
  ThemeCatalogResult,
  ThemeCatalogIndex,
  ThemeCatalogEntry,
} from "@/types/theme";

// Re-export types for convenience
export type { ThemeCategory, ThemeDefinition, ThemeManifest, ThemeColors, GroupedThemes };

// Cache for loaded data
let cachedManifest: ThemeManifest | null = null;
const themeCache = new Map<string, ThemeDefinition>();
let manifestRequest: Promise<ThemeManifest | null> | null = null;
let cachedCatalogIndex: ThemeCatalogIndex | null = null;
let catalogIndexRequest: Promise<ThemeCatalogIndex | null> | null = null;
const themeRequests = new Map<string, Promise<ThemeDefinition | null>>();
const THEME_CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 15_000;
let activeRequests = 0;
type ThemeRequestPriority = "foreground" | "background";
const foregroundQueue = new Map<string, () => void>();
const backgroundQueue = new Map<string, () => void>();

function promoteThemeRequest(key: string): void {
  const start = backgroundQueue.get(key);
  if (!start) return;
  backgroundQueue.delete(key);
  foregroundQueue.set(key, start);
}

async function withThemeSlot<T>(key: string, priority: ThemeRequestPriority, load: () => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => {
    const start = () => { activeRequests++; resolve(); };
    if (activeRequests < THEME_CONCURRENCY) start();
    else (priority === "foreground" ? foregroundQueue : backgroundQueue).set(key, start);
  });
  try {
    return await load();
  } finally {
    activeRequests--;
    const queue = foregroundQueue.size ? foregroundQueue : backgroundQueue;
    const next = queue.entries().next().value;
    if (next) {
      queue.delete(next[0]);
      next[1]();
    }
  }
}

async function fetchJSON(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Theme request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThemeId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function validateColors(value: unknown): ThemeColors {
  function validate(actual: unknown, expected: unknown): void {
    if (typeof expected === "string") {
      if (typeof actual !== "string") throw new Error("Missing palette color");
      parseThemeColor(actual);
    } else if (isRecord(expected)) {
      if (!isRecord(actual)) throw new Error("Missing palette group");
      for (const [key, nested] of Object.entries(expected)) validate(actual[key], nested);
    }
  }
  validate(value, getDefaultTheme().dark);
  const colors = value as ThemeColors;
  deriveThemeUI(colors);
  return colors;
}

// Only successful loads are cached. Failures remain retryable, including manifests.
async function loadThemeManifest(): Promise<ThemeManifest | null> {
  if (cachedManifest) return cachedManifest;
  if (manifestRequest) return manifestRequest;
  manifestRequest = (async () => {
    try {
      const data = await fetchJSON("/themes/manifest.json");
      if (!isRecord(data) || !Array.isArray(data.themes) || !data.themes.every(isThemeId)
        || !isThemeId(data.default)) throw new Error("Invalid theme manifest");
      cachedManifest = { themes: [...new Set(data.themes)], default: data.default };
      return cachedManifest;
    } catch {
      return null;
    } finally {
      manifestRequest = null;
    }
  })();
  return manifestRequest;
}

export async function fetchThemeManifest(): Promise<ThemeManifest> {
  return await loadThemeManifest() ?? { themes: [], default: "typesetgo" };
}

export function getThemeManifestFromCache(): ThemeManifest | null {
  return cachedManifest;
}

/** A single retryable metadata request, independent of startup and full palette loading. */
export async function fetchThemeCatalogIndex(): Promise<ThemeCatalogIndex | null> {
  if (cachedCatalogIndex) return cachedCatalogIndex;
  if (catalogIndexRequest) return catalogIndexRequest;
  catalogIndexRequest = (async () => {
    try {
      const data = await fetchJSON("/themes/catalog.json");
      if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.themes)) throw new Error("Invalid theme index");
      const ids = new Set<string>();
      const themes: ThemeCatalogEntry[] = data.themes.map((entry: unknown) => {
        if (!isRecord(entry) || !isThemeId(entry.id) || ids.has(entry.id)
          || typeof entry.name !== "string" || !entry.name
          || typeof entry.category !== "string" || !Object.hasOwn(CATEGORY_CONFIG, entry.category)
          || typeof entry.defaultVariantId !== "string" || !Array.isArray(entry.variants) || !entry.variants.length) {
          throw new Error("Invalid theme metadata");
        }
        ids.add(entry.id);
        const variantIds = new Set<string>();
        for (const variant of entry.variants) {
          if (!isRecord(variant) || typeof variant.id !== "string" || variantIds.has(variant.id)
            || typeof variant.label !== "string" || typeof variant.light !== "boolean"
            || !Array.isArray(variant.swatches) || variant.swatches.length !== 4) throw new Error("Invalid variant metadata");
          variantIds.add(variant.id);
          for (const color of variant.swatches) {
            if (typeof color !== "string") throw new Error("Invalid theme swatch");
            parseThemeColor(color);
          }
        }
        if (!variantIds.has(entry.defaultVariantId)) throw new Error("Invalid default variant metadata");
        return entry as ThemeCatalogEntry;
      });
      cachedCatalogIndex = { version: 1, themes };
      return cachedCatalogIndex;
    } catch {
      return null;
    } finally {
      catalogIndexRequest = null;
    }
  })();
  return catalogIndexRequest;
}

// Selection starts at the next free slot, ahead of queued catalog work.
export async function fetchTheme(themeName: string): Promise<ThemeDefinition | null> {
  return loadTheme(themeName, "foreground");
}

/** Intent previews share caching and limits, while selections retain queue priority. */
export async function fetchThemeForPreview(themeName: string): Promise<ThemeDefinition | null> {
  return loadTheme(themeName, "background");
}

// One promise per ID, shared by selection, catalog loaders, and concurrent mounts.
async function loadTheme(themeName: string, priority: ThemeRequestPriority): Promise<ThemeDefinition | null> {
  const key = themeName.toLowerCase();
  if (!isThemeId(key)) return null;
  const cached = themeCache.get(key);
  if (cached) return cached;
  const pending = themeRequests.get(key);
  if (pending) {
    if (priority === "foreground") promoteThemeRequest(key);
    return pending;
  }

  const request = withThemeSlot(key, priority, async () => {
    try {
      const data = await fetchJSON(`/themes/${key}.json`);
      if (!isRecord(data)) throw new Error("Invalid theme");
      let variants: ThemeVariantDefinition[];
      if (isRecord(data.variants)) {
        variants = Object.entries(data.variants).map(([id, value]) => {
          if (!isRecord(value)) throw new Error("Invalid theme variant");
          return {
            id,
            label: typeof value.label === "string" ? value.label : formatThemeName(id),
            dark: validateColors(value.dark),
            light: value.light == null ? null : validateColors(value.light),
          };
        });
      } else {
        variants = [{
          id: "default",
          label: "Default",
          dark: validateColors(data.dark),
          light: data.light == null ? null : validateColors(data.light),
        }];
      }
      const defaultVariant = variants.find((v) => v.id === data.defaultVariant) ?? variants[0];
      if (!defaultVariant) throw new Error("Theme has no variants");
      const theme: ThemeDefinition = {
        id: key,
        name: formatThemeName(key),
        category: typeof data.category === "string" && Object.hasOwn(CATEGORY_CONFIG, data.category)
          ? data.category as ThemeCategory : "default",
        dark: defaultVariant.dark,
        light: defaultVariant.light,
        defaultVariantId: defaultVariant.id,
        variants,
      };
      themeCache.set(key, theme);
      return theme;
    } catch {
      return null;
    }
  }).finally(() => themeRequests.delete(key));
  themeRequests.set(key, request);
  return request;
}

function sortThemes(themes: ThemeDefinition[]): ThemeDefinition[] {
  return themes.sort((a, b) => {
    if (a.id === b.id) return 0;
    if (a.id === "typesetgo") return -1;
    if (b.id === "typesetgo") return 1;
    return a.name.localeCompare(b.name);
  });
}

/** Full palettes for legacy callers. The practice picker uses the separate browsing index. */
export async function fetchThemeCatalog(
  options: { themeIds?: readonly string[] } = {},
): Promise<ThemeCatalogResult> {
  const manifest = options.themeIds ? null : await loadThemeManifest();
  const manifestError = !options.themeIds && manifest === null;
  const requestedThemeIds = [...new Set((options.themeIds ?? manifest?.themes ?? []).map((id) => id.toLowerCase()))];
  const results = await Promise.all(requestedThemeIds.map((id) => loadTheme(id, "background")));
  const failedThemeIds = requestedThemeIds.filter((_, index) => results[index] === null);
  return {
    themes: sortThemes(results.filter((theme): theme is ThemeDefinition => theme !== null)),
    requestedThemeIds,
    failedThemeIds,
    manifestError,
    complete: !manifestError && failedThemeIds.length === 0,
  };
}

/** Retry only failed IDs and merge recovered themes into the previous result. */
export async function retryThemeCatalog(previous: ThemeCatalogResult): Promise<ThemeCatalogResult> {
  if (previous.manifestError) return fetchThemeCatalog();
  const retried = await fetchThemeCatalog({ themeIds: previous.failedThemeIds });
  const themes = new Map(previous.themes.map((theme) => [theme.id, theme]));
  for (const theme of retried.themes) themes.set(theme.id, theme);
  return {
    ...retried,
    themes: sortThemes([...themes.values()]),
    requestedThemeIds: previous.requestedThemeIds,
  };
}

/** Legacy callers receive successful themes; use fetchThemeCatalog for recovery UI. */
export async function fetchAllThemes(): Promise<ThemeDefinition[]> {
  return (await fetchThemeCatalog()).themes;
}

// Group themes by category
export function groupThemesByCategory<T extends Pick<ThemeDefinition, "id" | "name" | "category">>(themes: T[]): { category: ThemeCategory; displayName: string; themes: T[] }[] {
  const groups: Record<ThemeCategory, T[]> = {
    // Featured
    default: [],
    // Technical/Developer
    editor: [],
    brand: [],
    // Productivity/Utility
    productivity: [],
    utility: [],
    // Design/Visual
    aesthetic: [],
    "color-theory": [],
    // Animals
    animals: [],
    // Nature/Environment
    nature: [],
    seasons: [],
    biomes: [],
    plants: [],
    weather: [],
    space: [],
    time: [],
    // Era/Culture
    retro: [],
    cultural: [],
    books: [],
    mythology: [],
    cities: [],
    subject: [],
    // Entertainment/Media
    gaming: [],
    movies: [],
    "tv-shows": [],
    anime: [],
    // Lifestyle
    music: [],
    "music-bands": [],
    "music-artists": [],
    sports: [],
    "sports-teams": [],
    "sports-teams-football": [],
    "sports-teams-basketball": [],
    "sports-teams-baseball": [],
    "sports-teams-soccer": [],
    "sports-teams-hockey": [],
    "sports-teams-college-football": [],
    "sports-teams-college-basketball": [],
    "sports-teams-college-baseball": [],
    "sports-teams-college-soccer": [],
    "sports-teams-college-hockey": [],
    food: [],
    fun: [],
    holiday: [],
    // Collections/Misc
    zodiac: [],
    gemstones: [],
    instruments: [],
    dance: [],
    vehicles: [],
    comics: [],
    "historical-era": [],
    emotions: [],
    textiles: [],
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
  const result: { category: ThemeCategory; displayName: string; themes: T[] }[] = [];
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
  return themeCache.get(themeName.toLowerCase()) ?? null;
}

// Default theme definition (TypeSetGo)
export function getDefaultTheme(): ThemeDefinition {
  const darkColors: ThemeColors = {
    bg: {
      base: "#323437",
      surface: "#2c2e31",
      elevated: "#37383b",
      overlay: "rgba(0, 0, 0, 0.5)",
    },
    text: {
      primary: "#d1d5db",
      secondary: "#4b5563",
      muted: "rgba(75, 85, 99, 0.6)",
      inverse: "#ffffff",
    },
    interactive: {
      primary: {
        DEFAULT: "#3cb5ee",
        muted: "rgba(60, 181, 238, 0.3)",
        subtle: "rgba(60, 181, 238, 0.1)",
      },
      secondary: {
        DEFAULT: "#0097b2",
        muted: "rgba(0, 151, 178, 0.3)",
        subtle: "rgba(0, 151, 178, 0.1)",
      },
      accent: {
        DEFAULT: "#a855f7",
        muted: "rgba(168, 85, 247, 0.3)",
        subtle: "rgba(168, 85, 247, 0.1)",
      },
    },
    status: {
      success: {
        DEFAULT: "#22c55e",
        muted: "rgba(34, 197, 94, 0.3)",
        subtle: "rgba(34, 197, 94, 0.1)",
      },
      error: {
        DEFAULT: "#ef4444",
        muted: "rgba(239, 68, 68, 0.3)",
        subtle: "rgba(239, 68, 68, 0.1)",
      },
      warning: {
        DEFAULT: "#f59e0b",
        muted: "rgba(245, 158, 11, 0.3)",
        subtle: "rgba(245, 158, 11, 0.1)",
      },
    },
    border: {
      default: "rgba(75, 85, 99, 0.3)",
      subtle: "rgba(75, 85, 99, 0.15)",
      focus: "#3cb5ee",
    },
    typing: {
      cursor: "#3cb5ee",
      cursorGhost: "#a855f7",
      correct: "#d1d5db",
      incorrect: "#ef4444",
      upcoming: "#4b5563",
      default: "#4b5563",
    },
  };

  return {
    id: "typesetgo",
    name: "TypeSetGo",
    category: "default",
    dark: darkColors,
    light: null,
    defaultVariantId: "default",
    variants: [{
      id: "default",
      label: "Default",
      dark: darkColors,
      light: null,
    }],
  };
}
