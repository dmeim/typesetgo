import type { ThemeColors, ThemeUIColors } from "@/types/theme";

/** @deprecated Legacy raw palette; use tv.ui for UI and tv.typing for exercises.
 * Keep hex compatibility until consumers that append alpha suffixes are migrated.
 */
export const GLOBAL_COLORS = {
  background: "#323437", // Deep Charcoal - Main application background
  surface: "#2c2e31", // Darker Charcoal - Cards, Modals, Toolbars

  text: {
    primary: "#d1d5db", // Light Gray - Used for correct text and primary content
    secondary: "#4b5563", // Muted Gray - Used for upcoming text and less prominent elements
    error: "#ef4444", // Vibrant Red - Used for incorrect characters and error states
    success: "#22c55e", // Green - Used for completion states
    body: "#d1d0c5", // Bone White - Default body text color (from globals.css)
  },

  brand: {
    primary: "#3cb5ee", // Sky Blue - Primary brand color (Cursor, Unselected Buttons)
    secondary: "#0097b2", // Teal - Secondary brand color (Selected Buttons)
    accent: "#a855f7", // Purple - Accent color (Ghost Cursor)
  },
} as const;

type RGBA = [number, number, number, number];
type RGB = [number, number, number];

/** Parse the hex and rgb(a) formats used by the theme catalog. */
export function parseThemeColor(value: string): RGBA {
  const hex = value.trim().match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
      full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
    ];
  }
  const rgb = value.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    const channels: RGBA = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), Number(rgb[4] ?? 1)];
    if (channels.slice(0, 3).every((c) => c <= 255) && channels[3] <= 1) return channels;
  }
  throw new Error(`Unsupported theme color: ${value}`);
}

function toHex(rgb: RGB): string {
  return "#" + rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("");
}

/** Flatten translucent palette colors onto the surface where they are used. */
export function compositeThemeColor(color: string, background: string): string {
  const [r, g, b, alpha] = parseThemeColor(color);
  const backdrop = parseThemeColor(background);
  return toHex([r, g, b].map((channel, i) => channel * alpha + backdrop[i] * (1 - alpha)) as RGB);
}

function luminance(color: string): number {
  const [r, g, b] = parseThemeColor(color).slice(0, 3).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio; alpha foregrounds are composited over the background. */
export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = luminance(compositeThemeColor(foreground, background));
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

/** Keep the candidate hue, moving only as far toward black/white as needed. */
export function ensureContrast(color: string, backgrounds: string[], minimum = 4.5): string {
  const candidate = compositeThemeColor(color, backgrounds[0]);
  const passes = (value: string) => backgrounds.every((bg) => contrastRatio(value, bg) >= minimum);
  if (passes(candidate)) return candidate;

  const channels = parseThemeColor(candidate);
  const options = [0, 255].flatMap((endpoint) => {
    const mix = (amount: number) => toHex(channels.slice(0, 3).map((c) => c + (endpoint - c) * amount) as RGB);
    if (!passes(mix(1))) return [];
    let low = 0;
    let high = 1;
    for (let i = 0; i < 18; i++) {
      const middle = (low + high) / 2;
      if (passes(mix(middle))) high = middle;
      else low = middle;
    }
    return [{ color: mix(high), amount: high }];
  });
  if (!options.length) throw new Error("Theme surfaces cannot share a contrast-safe foreground");
  return options.sort((a, b) => a.amount - b.amount)[0].color;
}

/** Add UI semantics without changing a theme's original colors or typing contrast. */
export function deriveThemeUI(colors: ThemeColors): ThemeUIColors {
  const background = compositeThemeColor(colors.bg.base, "#ffffff");
  // Mid-tone palettes can straddle both contrast thresholds after tinting. Keep
  // their UI surfaces on one readable side while leaving raw palette data intact.
  const ink = contrastRatio("#000000", background) >= contrastRatio("#ffffff", background)
    ? "#000000" : "#ffffff";
  const card = ensureContrast(compositeThemeColor(colors.bg.surface, background), [ink]);
  const popover = ensureContrast(compositeThemeColor(colors.bg.elevated, background), [ink]);
  const muted = card;
  const secondary = ensureContrast(compositeThemeColor(colors.interactive.secondary.subtle, card), [ink]);
  const accent = ensureContrast(compositeThemeColor(colors.interactive.accent.subtle, card), [ink]);
  const statusSurface = (color: string) => ensureContrast(compositeThemeColor(color, card), [ink]);
  const successSurface = statusSurface(colors.status.success.subtle);
  const warningSurface = statusSurface(colors.status.warning.subtle);
  const destructiveSurface = statusSurface(colors.status.error.subtle);
  const surfaces = [background, card, popover, muted, secondary, accent,
    successSurface, warningSurface, destructiveSurface];
  const primary = ensureContrast(colors.interactive.primary.DEFAULT, surfaces);
  const destructive = ensureContrast(colors.status.error.DEFAULT, surfaces);

  return {
    background,
    foreground: ensureContrast(colors.text.primary, surfaces),
    card,
    cardForeground: ensureContrast(colors.text.primary, [card]),
    popover,
    popoverForeground: ensureContrast(colors.text.primary, [popover]),
    primary,
    primaryForeground: ensureContrast(colors.text.inverse, [primary]),
    secondary,
    secondaryForeground: ensureContrast(colors.text.primary, [secondary]),
    secondaryEmphasis: ensureContrast(colors.interactive.secondary.DEFAULT, surfaces),
    muted,
    mutedForeground: ensureContrast(colors.text.secondary, surfaces),
    accent,
    accentForeground: ensureContrast(colors.text.primary, [accent]),
    accentEmphasis: ensureContrast(colors.interactive.accent.DEFAULT, surfaces),
    success: ensureContrast(colors.status.success.DEFAULT, surfaces),
    successSurface,
    warning: ensureContrast(colors.status.warning.DEFAULT, surfaces),
    warningSurface,
    destructiveSurface,
    destructive,
    destructiveForeground: ensureContrast(colors.text.inverse, [destructive]),
    border: compositeThemeColor(colors.border.default, card),
    input: ensureContrast(colors.border.default, surfaces, 3),
    ring: ensureContrast(colors.border.focus, surfaces, 3),
  };
}

/** Keep exercise text subdued, but never indistinguishable from its surface.
 * Correct/error text uses 4.5:1; large untyped text and carets use a 3:1 floor.
 * Shared PracticeText appears on page, card and popover surfaces.
 */
export function deriveThemeTyping(colors: ThemeColors, ui = deriveThemeUI(colors)): ThemeColors["typing"] {
  const surfaces = [ui.background, ui.card, ui.popover];
  return {
    cursor: ensureContrast(colors.typing.cursor, surfaces, 3),
    cursorGhost: ensureContrast(colors.typing.cursorGhost, surfaces, 3),
    correct: ensureContrast(colors.typing.correct, surfaces),
    incorrect: ensureContrast(colors.typing.incorrect, surfaces),
    upcoming: ensureContrast(colors.typing.upcoming, surfaces, 3),
    default: ensureContrast(colors.typing.default, surfaces, 3),
  };
}
