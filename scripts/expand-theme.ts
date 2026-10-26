/**
 * Expand a compact theme spec into the full theme JSON format.
 *
 * The full format repeats derivable values (opacity tiers, borders, typing copies). Authoring the
 * compact spec keeps those conventions exact; run scripts/check-theme.ts on the output afterwards.
 *
 * Spec shape:
 * {
 *   "category": "iphone",
 *   "defaultVariant": "15-pro-natural-titanium",
 *   "variants": {
 *     "15-pro-natural-titanium": {
 *       "label": "15 Pro — Natural Titanium",
 *       "dark":  { ...mode },
 *       "light": { ...mode }
 *     }
 *   }
 * }
 * Each mode lists opaque #rrggbb colors:
 *   bg, surface, elevated        page, cards/panels, menus/popovers
 *   text, textSecondary          main text (also typed text), labels/hints
 *   primary, secondary, accent   buttons/links, selected states/stats, highlights
 *   success, warning, error      status colors (error is also used for mistakes unless `incorrect` is set)
 *   cursor, cursorGhost          typing caret and pace caret
 *   upcoming                     untyped exercise text
 *   incorrect (optional)         mistyped characters; defaults to `error`
 *   border (optional)            border base color; defaults to `textSecondary`
 *
 * Run with: bun scripts/expand-theme.ts <spec.json> public/themes/<id>.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseThemeColor } from "@/lib/colors";
import type { ThemeColors } from "@/types/theme";

const REQUIRED = ["bg", "surface", "elevated", "text", "textSecondary", "primary", "secondary", "accent",
  "success", "warning", "error", "cursor", "cursorGhost", "upcoming"] as const;
const OPTIONAL = ["incorrect", "border"] as const;
const HEX = /^#[\da-f]{6}$/i;

type Mode = "dark" | "light";
type CompactMode = Record<(typeof REQUIRED)[number], string> & Partial<Record<(typeof OPTIONAL)[number], string>>;

// Catalog conventions, matching existing themes such as public/themes/1984.json.
const ALPHA = {
  dark: { muted: 0.3, subtle: 0.1, border: 0.3, borderSubtle: 0.15, overlay: 0.5, inverse: "#ffffff" },
  light: { muted: 0.2, subtle: 0.08, border: 0.2, borderSubtle: 0.1, overlay: 0.3, inverse: "#000000" },
} as const;

const rgba = (color: string, alpha: number) => {
  const [r, g, b] = parseThemeColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function validateMode(value: unknown, path: string): CompactMode {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected an object`);
  const mode = value as Record<string, unknown>;
  for (const key of REQUIRED) {
    if (typeof mode[key] !== "string" || !HEX.test(mode[key] as string)) throw new Error(`${path}.${key}: expected #rrggbb`);
  }
  for (const key of OPTIONAL) {
    if (mode[key] !== undefined && (typeof mode[key] !== "string" || !HEX.test(mode[key] as string))) {
      throw new Error(`${path}.${key}: expected #rrggbb`);
    }
  }
  for (const key of Object.keys(mode)) {
    if (![...REQUIRED, ...OPTIONAL].includes(key as never)) throw new Error(`${path}.${key}: unknown key`);
  }
  return Object.fromEntries(Object.entries(mode).map(([key, color]) => [key, (color as string).toLowerCase()])) as CompactMode;
}

export function expandMode(spec: CompactMode, mode: Mode): ThemeColors {
  const tier = ALPHA[mode];
  const scale = (color: string) => ({ DEFAULT: color, muted: rgba(color, tier.muted), subtle: rgba(color, tier.subtle) });
  const border = spec.border ?? spec.textSecondary;
  return {
    bg: { base: spec.bg, surface: spec.surface, elevated: spec.elevated, overlay: `rgba(0, 0, 0, ${tier.overlay})` },
    text: { primary: spec.text, secondary: spec.textSecondary, muted: rgba(spec.textSecondary, 0.6), inverse: tier.inverse },
    interactive: { primary: scale(spec.primary), secondary: scale(spec.secondary), accent: scale(spec.accent) },
    status: { success: scale(spec.success), error: scale(spec.error), warning: scale(spec.warning) },
    border: { default: rgba(border, tier.border), subtle: rgba(border, tier.borderSubtle), focus: spec.primary },
    typing: {
      cursor: spec.cursor,
      cursorGhost: spec.cursorGhost,
      correct: spec.text,
      incorrect: spec.incorrect ?? spec.error,
      upcoming: spec.upcoming,
      default: spec.upcoming,
    },
  };
}

export function expandTheme(source: unknown): Record<string, unknown> {
  if (!source || typeof source !== "object") throw new Error("spec: expected an object");
  const spec = source as Record<string, unknown>;
  const variants = spec.variants as Record<string, Record<string, unknown>> | undefined;
  if (!variants || typeof variants !== "object") throw new Error("spec.variants: expected an object");
  return {
    category: spec.category,
    defaultVariant: spec.defaultVariant,
    variants: Object.fromEntries(Object.entries(variants).map(([id, variant]) => {
      if (typeof variant.label !== "string") throw new Error(`variants.${id}.label: expected a string`);
      return [id, {
        label: variant.label,
        dark: expandMode(validateMode(variant.dark, `variants.${id}.dark`), "dark"),
        light: expandMode(validateMode(variant.light, `variants.${id}.light`), "light"),
      }];
    })),
  };
}

if (import.meta.main) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Usage: bun scripts/expand-theme.ts <spec.json> public/themes/<id>.json");
    process.exit(2);
  }
  try {
    const theme = expandTheme(JSON.parse(readFileSync(input, "utf8")));
    writeFileSync(output, JSON.stringify(theme, null, 2) + "\n");
    console.log(`Wrote ${output} (${Object.keys(theme.variants as object).length} variants)`);
  } catch (error) {
    console.error(`Spec error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
