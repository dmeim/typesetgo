import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compositeThemeColor, contrastRatio, deriveThemeUI, parseThemeColor } from "@/lib/colors";
import { getDefaultTheme } from "@/lib/themes";
import type { ThemeColors } from "@/types/theme";

// Independent reference calculation for the opaque semantic colors under test.
function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const linear = [1, 3, 5].map((offset) => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("semantic theme colors", () => {
  it("keeps default typing text subdued while making UI labels readable", () => {
    const colors = getDefaultTheme().dark;
    const before = structuredClone(colors);
    const ui = deriveThemeUI(colors);
    expect(colors).toEqual(before);
    expect(ui.background).toBe(colors.bg.base);
    expect(ui.primary).toBe(colors.interactive.primary.DEFAULT);
    expect(colors.typing.upcoming).toBe("#4b5563");
    expect(contrastRatio(colors.typing.upcoming, ui.background)).toBeLessThan(2);
    expect(contrast(ui.mutedForeground, ui.background)).toBeGreaterThanOrEqual(4.5);
    expect(ui.primaryForeground).not.toBe(colors.text.inverse);
  });

  it("composites alpha colors and rejects invalid palette values", () => {
    expect(compositeThemeColor("rgba(255, 0, 0, 0.5)", "#000000")).toBe("#800000");
    expect(compositeThemeColor("#fff8", "#000000")).toBe("#888888");
    expect(parseThemeColor("#333")).toEqual([51, 51, 51, 1]);
    expect(() => parseThemeColor("#4430888")).toThrow();
    expect(() => parseThemeColor("rgba(999, 0, 0, 1)")).toThrow();
  });

  it("keeps every catalog palette readable without mutating its identity or typing roles", () => {
    const directory = resolve("public/themes");
    const failures: string[] = [];
    let count = 0;
    for (const name of readdirSync(directory).filter((name) => name.endsWith(".json") && name !== "manifest.json")) {
      const data = JSON.parse(readFileSync(resolve(directory, name), "utf8"));
      const variants = (data.variants ?? { default: data }) as Record<string, { dark: ThemeColors; light?: ThemeColors | null }>;
      for (const [variant, modes] of Object.entries(variants)) {
        for (const mode of ["dark", "light"] as const) {
          const colors = modes[mode];
          if (!colors) continue;
          count++;
          const identity = JSON.stringify(colors);
          try {
            const ui = deriveThemeUI(colors);
            const surfaces = [ui.background, ui.card, ui.popover, ui.muted, ui.secondary, ui.accent];
            const pairs: Array<[string, string, number]> = [
              [ui.cardForeground, ui.card, 4.5], [ui.popoverForeground, ui.popover, 4.5],
              [ui.primaryForeground, ui.primary, 4.5], [ui.secondaryForeground, ui.secondary, 4.5],
              [ui.accentForeground, ui.accent, 4.5], [ui.destructiveForeground, ui.destructive, 4.5],
              ...surfaces.flatMap((surface): Array<[string, string, number]> => [
                [ui.foreground, surface, 4.5], [ui.mutedForeground, surface, 4.5],
                [ui.primary, surface, 4.5], [ui.destructive, surface, 4.5],
                [ui.input, surface, 3], [ui.ring, surface, 3],
              ]),
            ];
            if (pairs.some(([fg, bg, minimum]) => contrast(fg, bg) < minimum)) failures.push(`${name}/${variant}/${mode}: contrast`);
            if (Object.values(ui).some((color) => !/^#[\da-f]{6}$/.test(color))) failures.push(`${name}/${variant}/${mode}: opacity`);
            if (JSON.stringify(colors) !== identity) failures.push(`${name}/${variant}/${mode}: mutation`);
            if (ui.background !== compositeThemeColor(colors.bg.base, "#ffffff")) failures.push(`${name}/${variant}/${mode}: background identity`);
          } catch (error) {
            failures.push(`${name}/${variant}/${mode}: ${String(error)}`);
          }
        }
      }
    }
    expect(count).toBeGreaterThan(9_000);
    expect(failures).toEqual([]);
  }, 30_000);
});
