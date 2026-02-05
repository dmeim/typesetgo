import type {
  ThemeCategory,
  ThemeDefinition,
  ThemeManifest,
  ThemeColors,
  GroupedThemes,
  CategoryConfig,
} from "@/types/theme";

// Re-export types for convenience
export type { ThemeCategory, ThemeDefinition, ThemeManifest, ThemeColors, GroupedThemes };

// Category display order and names
export const CATEGORY_CONFIG: Record<ThemeCategory, CategoryConfig> = {
  // Featured
  default: { displayName: "Featured", order: 0 },
  // Technical/Developer
  editor: { displayName: "Editor/IDE", order: 1 },
  brand: { displayName: "Brand", order: 2 },
  // Productivity/Utility
  productivity: { displayName: "Productivity", order: 3 },
  utility: { displayName: "Utility", order: 4 },
  // Design/Visual
  aesthetic: { displayName: "Aesthetic", order: 5 },
  "color-theory": { displayName: "Color Theory", order: 6 },
  // Animals
  animals: { displayName: "Animals", order: 7 },
  // Nature/Environment
  nature: { displayName: "Nature", order: 8 },
  weather: { displayName: "Weather", order: 9 },
  space: { displayName: "Space", order: 10 },
  time: { displayName: "Time of Day", order: 11 },
  // Era/Culture
  retro: { displayName: "Retro/Tech", order: 12 },
  cultural: { displayName: "Cultural", order: 13 },
  // Entertainment/Media
  gaming: { displayName: "Gaming", order: 14 },
  movies: { displayName: "Movies", order: 15 },
  "tv-shows": { displayName: "TV Shows", order: 16 },
  anime: { displayName: "Anime", order: 17 },
  // Lifestyle
  music: { displayName: "Music", order: 18 },
  sports: { displayName: "Sports", order: 19 },
  food: { displayName: "Food", order: 20 },
  fun: { displayName: "Fun", order: 21 },
  holiday: { displayName: "Holiday", order: 22 },
};

// Cache for loaded data
let cachedManifest: ThemeManifest | null = null;
const themeCache: Record<string, ThemeDefinition> = {};

// Display name overrides for themes that need special capitalization
const THEME_DISPLAY_NAMES: Record<string, string> = {
  // Brand/product names with specific capitalization
  "typesetgo": "TypeSetGo",
  "github": "GitHub",
  "gitlab": "GitLab",
  "solarized": "Solarized",
  "vim": "Vim",
  "youtube": "YouTube",
  "webstorm": "WebStorm",
  "jetbrains-darcula": "JetBrains Darcula",
  "bioshock": "BioShock",
  "linkedin": "LinkedIn",
  "playstation": "PlayStation",
  "stackoverflow": "Stack Overflow",
  
  // All-caps acronyms
  "aws": "AWS",
  "dos": "DOS",
  "tron": "TRON",
  "y2k": "Y2K",
  "ibm": "IBM",
  "html": "HTML",
  "css": "CSS",
  
  // Roman numerals
  "apple-ii": "Apple II",
  
  // Version numbers/letters that should be uppercase
  "windows-xp": "Windows XP",
  
  // Hyphenated style
  "lo-fi": "Lo-Fi",
  
  // Special characters (accent)
  "pokemon": "Pokémon",
  "rose-pine": "Rosé Pine",
  
  // Apostrophes and special formatting
  "st-patricks": "St. Patrick's",
  "new-years": "New Year's",
  "valentines": "Valentine's",
  "day-of-dead": "Day of the Dead",
  
  // Title case with lowercase articles/prepositions
  "league-of-legends": "League of Legends",
  "fourth-of-july": "Fourth of July",
  "cinco-de-mayo": "Cinco de Mayo",
  "shades-of-purple": "Shades of Purple",
  
  // TV Shows
  "game-of-thrones": "Game of Thrones",
  "the-office": "The Office",
  "squid-game": "Squid Game",
  "the-mandalorian": "The Mandalorian",
  "peaky-blinders": "Peaky Blinders",
  
  // Movies
  "lord-of-the-rings": "Lord of the Rings",
  "harry-potter": "Harry Potter",
  
  // Retro
  "nuclear-fallout": "Nuclear Fallout",
  
  // Anime
  "attack-on-titan": "Attack on Titan",
  "demon-slayer": "Demon Slayer",
  "one-piece": "One Piece",
  "my-hero-academia": "My Hero Academia",
  "sailor-moon": "Sailor Moon",
  "death-note": "Death Note",
  "solo-leveling": "Solo Leveling",
  "jujutsu-kaisen": "Jujutsu Kaisen",

  // Gaming
  "crash-bandicoot": "Crash Bandicoot",
  "rainbow-six-siege": "Rainbow Six Siege",
  "nba2k": "NBA 2K",
  "super-smash-bros": "Super Smash Bros.",
  "plants-vs-zombies": "Plants vs. Zombies",
  "ratchet-and-clank": "Ratchet & Clank",
  "lego": "LEGO",

  // Movies (new)
  "wall-e": "WALL\u00B7E",
  "spider-man": "Spider-Man",
  "guardians-of-the-galaxy": "Guardians of the Galaxy",
  "back-to-the-future": "Back to the Future",
  "the-wizard-of-oz": "The Wizard of Oz",
  "how-to-train-your-dragon": "How to Train Your Dragon",

  // TV Shows (new)
  "avatar-the-last-airbender": "Avatar: The Last Airbender",
  "spongebob": "SpongeBob",
  "phineas-and-ferb": "Phineas and Ferb",

  // Anime (new)
  "spy-x-family": "SPY x FAMILY",
  "haikyuu": "Haikyu!!",
  "cardcaptor-sakura": "Cardcaptor Sakura",
  "mob-psycho-100": "Mob Psycho 100",
  "fullmetal-alchemist": "Fullmetal Alchemist",

  // Food (new)
  "smores": "S'mores",
  "bubble-tea": "Bubble Tea",

  // Music (new)
  "r-and-b": "R&B",
  "k-pop": "K-Pop",
  "bossa-nova": "Bossa Nova",

  // Retro (new)
  "mid-autumn": "Mid-Autumn",
  "wabi-sabi": "Wabi-Sabi",
  "tie-dye": "Tie-Dye",
};

// Format theme name for display (capitalize first letter of each word)
const formatThemeName = (name: string): string => {
  // Check for override first
  if (THEME_DISPLAY_NAMES[name]) {
    return THEME_DISPLAY_NAMES[name];
  }
  
  // Default: capitalize first letter of each word
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
    
    const data = await res.json();
    
    // Parse the new theme format
    const theme: ThemeDefinition = {
      id: key,
      name: formatThemeName(key),
      category: data.category || "default",
      dark: data.dark,
      light: data.light || null,
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
    weather: [],
    space: [],
    time: [],
    // Era/Culture
    retro: [],
    cultural: [],
    // Entertainment/Media
    gaming: [],
    movies: [],
    "tv-shows": [],
    anime: [],
    // Lifestyle
    music: [],
    sports: [],
    food: [],
    fun: [],
    holiday: [],
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

// Default theme definition (TypeSetGo)
export function getDefaultTheme(): ThemeDefinition {
  return {
    id: "typesetgo",
    name: "TypeSetGo",
    category: "default",
    dark: {
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
    },
    light: null,
  };
}
