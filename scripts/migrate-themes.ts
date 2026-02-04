/**
 * Theme Migration Script
 *
 * Converts legacy flat theme JSON files to the new nested structure.
 *
 * Usage: bun run scripts/migrate-themes.ts
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

// Legacy theme structure
type LegacyTheme = {
  category?: string;
  backgroundColor: string;
  surfaceColor: string;
  cursor: string;
  ghostCursor: string;
  defaultText: string;
  upcomingText: string;
  correctText: string;
  incorrectText: string;
  buttonUnselected: string;
  buttonSelected: string;
};

// New theme structure
type ColorScale = {
  DEFAULT: string;
  muted: string;
  subtle: string;
};

type ThemeColors = {
  bg: {
    base: string;
    surface: string;
    elevated: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  interactive: {
    primary: ColorScale;
    secondary: ColorScale;
    accent: ColorScale;
  };
  status: {
    success: ColorScale;
    error: ColorScale;
    warning: ColorScale;
  };
  border: {
    default: string;
    subtle: string;
    focus: string;
  };
  typing: {
    cursor: string;
    cursorGhost: string;
    correct: string;
    incorrect: string;
    upcoming: string;
    default: string;
  };
};

type NewTheme = {
  category: string;
  dark: ThemeColors;
  light: null;
};

// Helper: Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Helper: RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

// Helper: Get luminance of a color
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

// Helper: Lighten a color
function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount
  );
}

// Helper: Create rgba string
function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// Helper: Create a ColorScale from a base color
function createColorScale(baseColor: string): ColorScale {
  return {
    DEFAULT: baseColor,
    muted: hexToRgba(baseColor, 0.3),
    subtle: hexToRgba(baseColor, 0.1),
  };
}

// Helper: Get contrasting text color (for inverse)
function getContrastingColor(bgColor: string): string {
  const luminance = getLuminance(bgColor);
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

// Convert legacy theme to new structure
function migrateTheme(legacy: LegacyTheme): NewTheme {
  // Create the dark theme colors
  const dark: ThemeColors = {
    bg: {
      base: legacy.backgroundColor,
      surface: legacy.surfaceColor,
      elevated: lightenColor(legacy.surfaceColor, 0.05), // Slightly lighter
      overlay: "rgba(0, 0, 0, 0.5)",
    },
    text: {
      primary: legacy.correctText,
      secondary: legacy.defaultText,
      muted: hexToRgba(legacy.defaultText, 0.6),
      inverse: getContrastingColor(legacy.backgroundColor),
    },
    interactive: {
      primary: createColorScale(legacy.buttonUnselected),
      secondary: createColorScale(legacy.buttonSelected),
      accent: createColorScale(legacy.ghostCursor),
    },
    status: {
      success: createColorScale("#22c55e"), // Standard success green
      error: createColorScale(legacy.incorrectText),
      warning: createColorScale("#f59e0b"), // Standard warning amber
    },
    border: {
      default: hexToRgba(legacy.defaultText, 0.3),
      subtle: hexToRgba(legacy.defaultText, 0.15),
      focus: legacy.buttonUnselected,
    },
    typing: {
      cursor: legacy.cursor,
      cursorGhost: legacy.ghostCursor,
      correct: legacy.correctText,
      incorrect: legacy.incorrectText,
      upcoming: legacy.upcomingText,
      default: legacy.defaultText,
    },
  };

  return {
    category: legacy.category || "default",
    dark,
    light: null,
  };
}

// Check if a theme is already in new format
function isNewFormat(data: Record<string, unknown>): boolean {
  return "dark" in data && typeof data.dark === "object";
}

// Main migration function
async function migrateThemes() {
  const themesDir = join(process.cwd(), "public", "themes");

  console.log("Starting theme migration...");
  console.log(`Themes directory: ${themesDir}`);

  // Read all files in themes directory
  const files = await readdir(themesDir);
  const jsonFiles = files.filter(
    (f) => f.endsWith(".json") && f !== "manifest.json"
  );

  console.log(`Found ${jsonFiles.length} theme files to process`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of jsonFiles) {
    const filePath = join(themesDir, file);

    try {
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      // Skip if already in new format
      if (isNewFormat(data)) {
        console.log(`⏭️  Skipping ${file} (already migrated)`);
        skipped++;
        continue;
      }

      // Migrate to new format
      const newTheme = migrateTheme(data as LegacyTheme);

      // Write back to file
      await writeFile(filePath, JSON.stringify(newTheme, null, 2) + "\n");
      console.log(`✅ Migrated ${file}`);
      migrated++;
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
      errors++;
    }
  }

  console.log("\n--- Migration Complete ---");
  console.log(`✅ Migrated: ${migrated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
}

// Run migration
migrateThemes().catch(console.error);
