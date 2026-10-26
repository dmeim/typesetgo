/**
 * Check theme JSON files before adding them to the catalog.
 *
 * Errors (exit 1): schema, palette conventions, light/dark mismatch, and any failed derivation
 * guarantee from `auditPalette` (layer separation, distinct roles, readable mistakes).
 * Warnings: authored colors the runtime contrast fixes had to move noticeably. Prefer authoring
 * the suggested color, unless matching the real-world color matters more.
 *
 * Run with: bun scripts/check-theme.ts public/themes/<id>.json [more files] [--category <id>]
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { colorDistance, compositeThemeColor, contrastRatio, deriveThemeTyping, deriveThemeUI, parseThemeColor } from "@/lib/colors";
import { auditPalette } from "@/lib/theme-audit";
import { CATEGORY_CONFIG } from "@/lib/theme-catalog";
import { getDefaultTheme } from "@/lib/themes";
import type { ThemeColors } from "@/types/theme";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Typical convention across the catalog: muted/subtle are DEFAULT at a fixed alpha per mode.
const SCALE_ALPHA = { dark: [0.3, 0.1], light: [0.2, 0.08] } as const;
// Moves smaller than this read as the authored color; larger ones are worth re-authoring.
const AUTHORING_DRIFT = 0.06;

type Report = { errors: string[]; warnings: string[] };

function checkShape(actual: unknown, expected: unknown, path: string, report: Report): void {
  if (typeof expected === "string") {
    if (typeof actual !== "string") return void report.errors.push(`${path}: missing color`);
    try {
      parseThemeColor(actual);
    } catch {
      report.errors.push(`${path}: unsupported color "${actual}" (use #rrggbb or rgba())`);
    }
    return;
  }
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return void report.errors.push(`${path}: missing group`);
  const record = actual as Record<string, unknown>;
  const template = expected as Record<string, unknown>;
  for (const key of Object.keys(template)) checkShape(record[key], template[key], `${path}.${key}`, report);
  for (const key of Object.keys(record)) if (!(key in template)) report.errors.push(`${path}.${key}: unknown key`);
}

function checkConventions(colors: ThemeColors, mode: "dark" | "light", path: string, report: Report): void {
  const [mutedAlpha, subtleAlpha] = SCALE_ALPHA[mode];
  const scales = { ...colors.interactive, ...colors.status } as Record<string, ThemeColors["interactive"]["primary"]>;
  for (const [name, scale] of Object.entries(scales)) {
    const [r, g, b] = parseThemeColor(scale.DEFAULT);
    for (const [tier, alpha] of [["muted", mutedAlpha], ["subtle", subtleAlpha]] as const) {
      const expected = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      if (scale[tier].replace(/\s+/g, "") !== expected.replace(/\s+/g, "")) {
        report.errors.push(`${path} ${name}.${tier}: expected "${expected}"`);
      }
    }
  }
  for (const [name, value] of Object.entries({ base: colors.bg.base, surface: colors.bg.surface, elevated: colors.bg.elevated })) {
    if (parseThemeColor(value)[3] < 1) report.errors.push(`${path} bg.${name}: must be opaque`);
  }
  if (colors.typing.correct !== colors.text.primary) report.errors.push(`${path} typing.correct must equal text.primary`);
  if (colors.typing.default !== colors.typing.upcoming) report.errors.push(`${path} typing.default must equal typing.upcoming`);
  // 0.18 relative luminance is where black and white text read equally well.
  const luminance = contrastRatio(colors.bg.base, "#000000") * 0.05 - 0.05;
  if (mode === "dark" && luminance > 0.18) report.errors.push(`${path}: dark palette has a light background`);
  if (mode === "light" && luminance < 0.18) report.errors.push(`${path}: light palette has a dark background`);
}

function checkDrift(colors: ThemeColors, path: string, report: Report): void {
  const ui = deriveThemeUI(colors);
  const typing = deriveThemeTyping(colors, ui);
  const roles: Array<[string, string, string]> = [
    ["interactive.primary", colors.interactive.primary.DEFAULT, ui.primary],
    ["interactive.secondary", colors.interactive.secondary.DEFAULT, ui.secondaryEmphasis],
    ["interactive.accent", colors.interactive.accent.DEFAULT, ui.accentEmphasis],
    ["text.primary", colors.text.primary, ui.foreground],
    ["text.secondary", colors.text.secondary, ui.mutedForeground],
    ["status.success", colors.status.success.DEFAULT, ui.success],
    ["status.warning", colors.status.warning.DEFAULT, ui.warning],
    ["status.error", colors.status.error.DEFAULT, ui.destructive],
    ["typing.cursor", colors.typing.cursor, typing.cursor],
    ["typing.incorrect", colors.typing.incorrect, typing.incorrect],
    ["typing.upcoming", colors.typing.upcoming, typing.upcoming],
  ];
  for (const [role, authored, derived] of roles) {
    const drift = colorDistance(compositeThemeColor(authored, ui.background), derived);
    if (drift > AUTHORING_DRIFT) {
      report.warnings.push(`${path} ${role}: ${authored} is shown as ${derived} (moved ${drift.toFixed(2)}); consider authoring ${derived}`);
    }
  }
}

export function checkTheme(file: string, category?: string): Report {
  const report: Report = { errors: [], warnings: [] };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    report.errors.push(`invalid JSON: ${String(error)}`);
    return report;
  }
  const id = basename(file, ".json");
  if (!ID.test(id)) report.errors.push(`file name "${id}" must be kebab-case`);
  if (typeof data.category !== "string" || !Object.hasOwn(CATEGORY_CONFIG, data.category)) {
    report.errors.push(`category "${String(data.category)}" is not registered in CATEGORY_CONFIG`);
  } else if (category && data.category !== category) {
    report.errors.push(`category is "${data.category}", expected "${category}"`);
  }
  for (const key of Object.keys(data)) {
    if (!["category", "defaultVariant", "variants"].includes(key)) report.errors.push(`unknown top-level key "${key}"`);
  }
  const variants = data.variants as Record<string, Record<string, unknown>> | undefined;
  if (!variants || typeof variants !== "object" || !Object.keys(variants).length) {
    report.errors.push("variants must be a non-empty object");
    return report;
  }
  if (typeof data.defaultVariant !== "string" || !variants[data.defaultVariant]) {
    report.errors.push(`defaultVariant "${String(data.defaultVariant)}" is not one of the variants`);
  }
  const template = getDefaultTheme().dark;
  const seen = new Map<string, string>();
  for (const [variantId, variant] of Object.entries(variants)) {
    if (!ID.test(variantId)) report.errors.push(`variant id "${variantId}" must be kebab-case`);
    if (typeof variant.label !== "string" || !variant.label.trim()) report.errors.push(`${variantId}: missing label`);
    for (const key of Object.keys(variant)) {
      if (!["label", "dark", "light"].includes(key)) report.errors.push(`${variantId}: unknown key "${key}"`);
    }
    for (const mode of ["dark", "light"] as const) {
      const path = `${variantId}/${mode}`;
      const before = report.errors.length;
      checkShape(variant[mode], template, path, report);
      if (report.errors.length > before) continue;
      const colors = variant[mode] as ThemeColors;
      checkConventions(colors, mode, path, report);
      for (const failure of auditPalette(colors)) report.errors.push(`${path}: derivation guarantee failed (${failure})`);
      checkDrift(colors, path, report);
    }
    const signature = JSON.stringify([variant.dark, variant.light]);
    const twin = seen.get(signature);
    if (twin) report.warnings.push(`${variantId}: palette is identical to ${twin}`);
    else seen.set(signature, variantId);
  }
  return report;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const categoryIndex = args.indexOf("--category");
  const category = categoryIndex >= 0 ? args[categoryIndex + 1] : undefined;
  const files = args.filter((arg, index) => !arg.startsWith("--") && !(categoryIndex >= 0 && index === categoryIndex + 1));
  if (!files.length) {
    console.error("Usage: bun scripts/check-theme.ts public/themes/<id>.json [--category <id>]");
    process.exit(2);
  }
  let failed = false;
  for (const file of files) {
    const { errors, warnings } = checkTheme(file, category);
    console.log(`${errors.length ? "FAIL" : "PASS"} ${file} (${errors.length} errors, ${warnings.length} warnings)`);
    for (const error of errors) console.log(`  error   ${error}`);
    for (const warning of warnings) console.log(`  warning ${warning}`);
    failed ||= errors.length > 0;
  }
  process.exit(failed ? 1 : 0);
}
