/**
 * Migrates all theme JSON files from the flat { category, dark, light }
 * format to the variant-based { category, defaultVariant, variants } format.
 *
 * For themes without a light palette, one is generated from the dark palette.
 *
 * Run with: bun run scripts/migrate-themes-to-variants.ts
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const THEMES_DIR = join(import.meta.dir, "../public/themes");

// --- Light palette generation from dark palette ---

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

function invertLightness(hex: string, targetL?: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(...rgb);
  const newL = targetL !== undefined ? targetL : 1 - l;
  const [r, g, b] = hslToRgb(h, s, Math.max(0, Math.min(1, newL)));
  return rgbToHex(r, g, b);
}

function darkenForLight(hex: string, amount = 0.15): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(...rgb);
  const [r, g, b] = hslToRgb(h, Math.min(1, s * 1.1), Math.max(0, l - amount));
  return rgbToHex(r, g, b);
}

function parseRgba(str: string): { r: number; g: number; b: number; a: number } | null {
  const m = str.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
}

function makeRgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

interface ColorScale {
  DEFAULT: string;
  muted: string;
  subtle: string;
}

function makeColorScale(base: string, muted: number, subtle: number): ColorScale {
  const rgb = hexToRgb(base);
  if (!rgb) return { DEFAULT: base, muted: base, subtle: base };
  return {
    DEFAULT: base,
    muted: makeRgba(...rgb, muted),
    subtle: makeRgba(...rgb, subtle),
  };
}

function darkenColorScale(scale: ColorScale): ColorScale {
  const darkened = darkenForLight(scale.DEFAULT, 0.15);
  return makeColorScale(darkened, 0.2, 0.08);
}

function generateLightFromDark(dark: any): any {
  const textPrimaryRgb = hexToRgb(dark.text.primary);
  const textSecondaryRgb = hexToRgb(dark.text.secondary);
  const bgBaseRgb = hexToRgb(dark.bg.base);

  const lightTextPrimary = bgBaseRgb
    ? invertLightness(dark.bg.base, 0.15)
    : "#1a1a2e";
  const lightTextSecondary = textSecondaryRgb
    ? invertLightness(dark.text.secondary)
    : "#808080";
  const lightTextSecondaryRgb = hexToRgb(lightTextSecondary);

  const lightBgBase = textPrimaryRgb
    ? invertLightness(dark.text.primary, 0.96)
    : "#f5f5f5";

  return {
    bg: {
      base: lightBgBase,
      surface: "#ffffff",
      elevated: invertLightness(dark.bg.elevated, 0.92),
      overlay: "rgba(0, 0, 0, 0.3)",
    },
    text: {
      primary: lightTextPrimary,
      secondary: lightTextSecondary,
      muted: lightTextSecondaryRgb
        ? makeRgba(...lightTextSecondaryRgb, 0.6)
        : "rgba(128, 128, 128, 0.6)",
      inverse: "#000000",
    },
    interactive: {
      primary: darkenColorScale(dark.interactive.primary),
      secondary: darkenColorScale(dark.interactive.secondary),
      accent: darkenColorScale(dark.interactive.accent),
    },
    status: {
      success: makeColorScale("#17823e", 0.2, 0.08),
      error: makeColorScale("#ed2c2c", 0.2, 0.08),
      warning: makeColorScale("#ab6e07", 0.2, 0.08),
    },
    border: {
      default: lightTextSecondaryRgb
        ? makeRgba(...lightTextSecondaryRgb, 0.2)
        : "rgba(128, 128, 128, 0.2)",
      subtle: lightTextSecondaryRgb
        ? makeRgba(...lightTextSecondaryRgb, 0.1)
        : "rgba(128, 128, 128, 0.1)",
      focus: darkenForLight(dark.border.focus, 0.1),
    },
    typing: {
      cursor: darkenForLight(dark.typing.cursor, 0.1),
      cursorGhost: darkenForLight(dark.typing.cursorGhost, 0.1),
      correct: lightTextPrimary,
      incorrect: "#ed2c2c",
      upcoming: lightTextSecondary,
      default: lightTextSecondary,
    },
  };
}

// --- Migration ---

function migrateTheme(filePath: string): { migrated: boolean; generated: boolean; error?: string } {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    if (data.variants) {
      return { migrated: false, generated: false };
    }

    if (!data.dark) {
      return { migrated: false, generated: false, error: "no dark palette" };
    }

    const hasLight = data.light && typeof data.light === "object" && Object.keys(data.light).length > 0;
    const light = hasLight ? data.light : generateLightFromDark(data.dark);

    const newFormat = {
      category: data.category || "default",
      defaultVariant: "default",
      variants: {
        default: {
          label: "Default",
          dark: data.dark,
          light,
        },
      },
    };

    writeFileSync(filePath, JSON.stringify(newFormat, null, 2) + "\n", "utf-8");
    return { migrated: true, generated: !hasLight };
  } catch (e) {
    return { migrated: false, generated: false, error: String(e) };
  }
}

function main() {
  console.log("Migrating themes to variant format...\n");

  const files = readdirSync(THEMES_DIR)
    .filter(f => f.endsWith(".json") && f !== "manifest.json")
    .sort();

  let migrated = 0;
  let skipped = 0;
  let generated = 0;
  let errors = 0;

  for (const file of files) {
    const result = migrateTheme(join(THEMES_DIR, file));
    if (result.error) {
      console.log(`  ERROR ${file}: ${result.error}`);
      errors++;
    } else if (result.migrated) {
      migrated++;
      if (result.generated) {
        generated++;
        console.log(`  GENERATED light mode: ${file}`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\nDone.`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Light generated: ${generated}`);
  console.log(`  Skipped (already migrated): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total files: ${files.length}`);
}

main();
