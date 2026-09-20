import { useMemo, type CSSProperties } from "react";
import { useTheme } from "@/hooks/useTheme";
import { TIER_COLORS, type AchievementTier } from "@/lib/achievement-definitions";
import { compositeThemeColor, deriveThemeUI, ensureContrast, parseThemeColor } from "@/lib/colors";
import type { ThemeUIColors } from "@/types/theme";

export interface AchievementPresentation {
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  medallion: string;
  icon: string;
  badge: string;
  badgeForeground: string;
  accent: string;
  track: string;
}

function tint(color: string, background: string, strength: number): string {
  const [r, g, b] = parseThemeColor(color);
  return compositeThemeColor(`rgba(${r}, ${g}, ${b}, ${strength})`, background);
}

/** Keep the tier hue while deriving readable ink for each actual tinted surface. */
export function getAchievementPresentation(
  tier: AchievementTier | null,
  earned: boolean,
  ui: ThemeUIColors,
): AchievementPresentation {
  const color = tier ? TIER_COLORS[tier].bg : ui.primary;
  const ink = tier ? TIER_COLORS[tier].border : ui.primary;
  const surface = tint(color, ui.card, earned ? 0.16 : 0.07);
  const medallion = tint(color, ui.card, earned ? 0.9 : 0.3);
  const badge = tint(color, surface, earned ? 0.22 : 0.13);
  return {
    surface,
    foreground: ensureContrast(ui.cardForeground, [surface]),
    muted: ensureContrast(ui.mutedForeground, [surface]),
    border: tint(color, ui.card, earned ? 0.65 : 0.4),
    medallion,
    icon: ensureContrast(ink, [medallion]),
    badge,
    badgeForeground: ensureContrast(ink, [badge]),
    accent: ensureContrast(color, [surface], 3),
    track: tint(color, surface, 0.18),
  };
}

export function achievementStyle(presentation: AchievementPresentation): CSSProperties {
  return Object.fromEntries(Object.entries(presentation).map(([name, color]) => [
    `--achievement-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
    color,
  ])) as CSSProperties;
}

export function useAchievementPalette() {
  const { colors } = useTheme();
  return useMemo(() => {
    const ui = deriveThemeUI(colors);
    const tiers = Object.keys(TIER_COLORS) as AchievementTier[];
    const palette = (earned: boolean) => Object.fromEntries(tiers.map((tier) => [
      tier, getAchievementPresentation(tier, earned, ui),
    ])) as Record<AchievementTier, AchievementPresentation>;
    return {
      earned: palette(true),
      unearned: palette(false),
      empty: getAchievementPresentation(null, false, ui),
    };
  }, [colors]);
}
