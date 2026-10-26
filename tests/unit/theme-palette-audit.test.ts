import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { colorDistance, contrastRatio, deriveThemeTyping, deriveThemeUI, ROLE_DISTANCE } from "@/lib/colors";
import { auditPalette } from "@/lib/theme-audit";
import type { ThemeColors } from "@/types/theme";

// Palettes whose source colors leave no room for a guarantee. Each needs a JSON fix; remove the
// entry once the palette passes so the audit keeps catching regressions.
const KNOWN_RESIDUALS: Record<string, string[]> = {
  "brutalist/default/dark": ["muted~card", "secondary~card", "accent~card", "status~card", "destructive~primary"],
  "windows-95/default/dark": ["destructive~primary", "incorrect<4.5"],
  "windows-xp/default/dark": ["destructive~primary", "incorrect<4.5"],
  "one-piece/shanks/dark": ["incorrect~text"],
  "tokyo-ghoul/eto-yoshimura/dark": ["incorrect<4.5"],
};

describe("theme palette audit", () => {
  it("separates every layer and keeps every confusable role distinct across the catalog", () => {
    const directory = resolve("public/themes");
    const found: Record<string, string[]> = {};
    let count = 0;
    for (const name of readdirSync(directory).filter((file) => file.endsWith(".json") && !["manifest.json", "catalog.json"].includes(file))) {
      const data = JSON.parse(readFileSync(resolve(directory, name), "utf8"));
      const variants = (data.variants ?? { default: data }) as Record<string, { dark: ThemeColors; light?: ThemeColors | null }>;
      for (const [variant, modes] of Object.entries(variants)) {
        for (const mode of ["dark", "light"] as const) {
          const colors = modes[mode];
          if (!colors) continue;
          count++;
          const failures = auditPalette(colors);
          if (failures.length) found[`${name.replace(/\.json$/, "")}/${variant}/${mode}`] = failures;
        }
      }
    }
    expect(count).toBeGreaterThan(9_000);
    expect(found).toEqual(KNOWN_RESIDUALS);
  }, 180_000);

  it("keeps the brand hue when a mid-tone palette forces a lightness change", () => {
    const colors = JSON.parse(readFileSync(resolve("public/themes/windows-95.json"), "utf8")).variants.default.dark as ThemeColors;
    const ui = deriveThemeUI(colors);
    const typing = deriveThemeTyping(colors, ui);
    // The old white/black mix collapsed these roles into the same near-white.
    expect(colorDistance(typing.incorrect, typing.correct)).toBeGreaterThanOrEqual(ROLE_DISTANCE.incorrect);
    expect(contrastRatio(typing.incorrect, ui.background)).toBeGreaterThanOrEqual(3);
    expect(colorDistance(ui.primary, ui.mutedForeground)).toBeGreaterThan(0.02);
  });
});
