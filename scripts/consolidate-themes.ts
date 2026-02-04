/**
 * Script to consolidate paired light/dark theme files into unified themes.
 * 
 * This script merges:
 * - github-dark.json + github-light.json → github.json
 * - solarized-dark.json + solarized-light.json → solarized.json
 * - vim-dark.json + vim-light.json → vim.json
 * 
 * Run with: bun run scripts/consolidate-themes.ts
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

const THEMES_DIR = join(import.meta.dir, "../public/themes");

// Theme pairs to merge: [baseName, darkFile, lightFile]
const THEME_PAIRS: [string, string, string][] = [
  ["github", "github-dark.json", "github-light.json"],
  ["solarized", "solarized-dark.json", "solarized-light.json"],
  ["vim", "vim-dark.json", "vim-light.json"],
];

function consolidateThemes() {
  console.log("Starting theme consolidation...\n");

  for (const [baseName, darkFile, lightFile] of THEME_PAIRS) {
    const darkPath = join(THEMES_DIR, darkFile);
    const lightPath = join(THEMES_DIR, lightFile);
    const outputPath = join(THEMES_DIR, `${baseName}.json`);

    // Check if source files exist
    if (!existsSync(darkPath)) {
      console.log(`⚠️  Skipping ${baseName}: ${darkFile} not found`);
      continue;
    }
    if (!existsSync(lightPath)) {
      console.log(`⚠️  Skipping ${baseName}: ${lightFile} not found`);
      continue;
    }

    // Read source files
    const darkTheme = JSON.parse(readFileSync(darkPath, "utf-8"));
    const lightTheme = JSON.parse(readFileSync(lightPath, "utf-8"));

    // Create merged theme
    // The dark theme's "dark" property contains the dark colors
    // The light theme's "dark" property actually contains light colors (legacy naming)
    const mergedTheme = {
      category: darkTheme.category || "editor",
      dark: darkTheme.dark,
      light: lightTheme.dark, // Light colors are in the "dark" property of the light file
    };

    // Write merged theme
    writeFileSync(outputPath, JSON.stringify(mergedTheme, null, 2) + "\n");
    console.log(`✅ Created ${baseName}.json (merged ${darkFile} + ${lightFile})`);

    // Delete old files
    unlinkSync(darkPath);
    console.log(`   Deleted ${darkFile}`);
    unlinkSync(lightPath);
    console.log(`   Deleted ${lightFile}`);
  }

  console.log("\n✅ Theme consolidation complete!");
  console.log("\nNext steps:");
  console.log("1. Update THEME_DISPLAY_NAMES in src/lib/themes.ts");
  console.log("2. Rebuild the theme manifest by running the dev server");
}

consolidateThemes();
