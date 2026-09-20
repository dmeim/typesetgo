import { describe, expect, it } from "vitest";
import { getAchievementPresentation } from "@/components/auth/achievement-presentation";
import { TIER_COLORS, type AchievementTier } from "@/lib/achievement-definitions";
import { contrastRatio, deriveThemeUI, parseThemeColor } from "@/lib/colors";
import { getDefaultTheme } from "@/lib/themes";

const theme = getDefaultTheme();
const light = {
  ...theme.dark,
  bg: { ...theme.dark.bg, base: "#ffffff", surface: "#f5f7fb", elevated: "#ffffff" },
  text: { ...theme.dark.text, primary: "#172032", secondary: "#596276" },
};
const saturated = {
  ...theme.dark,
  bg: { ...theme.dark.bg, base: "#9304c5", surface: "#a32888", elevated: "#e850a6" },
};
const palettes = [theme.dark, light, saturated];
const tiers = Object.keys(TIER_COLORS) as AchievementTier[];

describe("achievement tier presentation", () => {
  it.each(tiers)("keeps %s labels, badges, and artwork readable in both earned states", (tier) => {
    for (const colors of palettes) {
      const ui = deriveThemeUI(colors);
      for (const earned of [true, false]) {
        const presentation = getAchievementPresentation(tier, earned, ui);
        for (const [foreground, background] of [
          [presentation.foreground, presentation.surface],
          [presentation.muted, presentation.surface],
          [presentation.badgeForeground, presentation.badge],
          [presentation.icon, presentation.medallion],
        ]) {
          expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrastRatio(presentation.accent, presentation.surface)).toBeGreaterThanOrEqual(3);
        if (tier !== "silver") {
          const [r, g, b] = parseThemeColor(presentation.medallion);
          expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(10);
        }
      }
      expect(getAchievementPresentation(tier, true, ui).medallion).not.toBe(getAchievementPresentation(tier, false, ui).medallion);
    }
  });

  it("uses a readable theme accent for categories without an earned tier", () => {
    for (const colors of palettes) {
      const presentation = getAchievementPresentation(null, false, deriveThemeUI(colors));
      expect(contrastRatio(presentation.foreground, presentation.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(presentation.icon, presentation.medallion)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
