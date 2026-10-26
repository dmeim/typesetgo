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

type Oklch = [number, number, number];

const toLinear = (channel: number) => {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (value: number) => 255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);

function luminance(color: string): number {
  const [r, g, b] = parseThemeColor(color).slice(0, 3).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toOklch(color: string): Oklch {
  const [r, g, b] = parseThemeColor(color).slice(0, 3).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(a, bAxis), Math.atan2(bAxis, a)];
}

function oklchToLinear([lightness, chroma, hue]: Oklch): RGB {
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: RGB) => rgb.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4);

/** Keep lightness and hue, giving up only the chroma sRGB cannot display. */
function fromOklch([lightness, chroma, hue]: Oklch): string {
  const clamped = Math.min(1, Math.max(0, lightness));
  let displayable = chroma;
  if (!inGamut(oklchToLinear([clamped, chroma, hue]))) {
    let low = 0;
    let high = chroma;
    for (let i = 0; i < 14; i++) {
      const middle = (low + high) / 2;
      if (inGamut(oklchToLinear([clamped, middle, hue]))) low = middle;
      else high = middle;
    }
    displayable = low;
  }
  const rgb = oklchToLinear([clamped, displayable, hue]).map((channel) => fromLinear(Math.min(1, Math.max(0, channel))));
  return toHex(rgb as RGB);
}

/** Perceptual (OKLab) distance between two opaque colors; ~0.02 is barely visible, ~0.1 clearly different. */
export function colorDistance(first: string, second: string): number {
  const [l1, c1, h1] = toOklch(first);
  const [l2, c2, h2] = toOklch(second);
  return Math.hypot(l1 - l2, c1 * Math.cos(h1) - c2 * Math.cos(h2), c1 * Math.sin(h1) - c2 * Math.sin(h2));
}

/** WCAG contrast ratio; alpha foregrounds are composited over the background. */
export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = luminance(compositeThemeColor(foreground, background));
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

type Shift = { color: string; distance: number };

/**
 * Smallest OKLCH lightness move toward black (0) or white (1) that `accept`s, keeping hue and chroma.
 * A coarse scan finds the first accepted step (a contrast ceiling plus a distance floor can leave
 * only a middle band), then bisection refines it.
 */
function shiftLightness(color: string, target: 0 | 1, accept: (value: string) => boolean): Shift | null {
  const [lightness, chroma, hue] = toOklch(color);
  const at = (value: number) => fromOklch([value, chroma, hue]);
  const steps = Math.max(1, Math.ceil(Math.abs(target - lightness) / 0.02));
  let low = lightness;
  let found: number | null = null;
  for (let i = 1; i <= steps && found === null; i++) {
    const next = lightness + (target - lightness) * (i / steps);
    if (accept(at(next))) found = next;
    else low = next;
  }
  if (found === null) return null;
  let high = found;
  for (let i = 0; i < 12; i++) {
    const middle: number = (low + high) / 2;
    if (accept(at(middle))) high = middle;
    else low = middle;
  }
  return { color: at(high), distance: Math.abs(high - lightness) };
}

function nearestShift(color: string, accept: (value: string) => boolean, targets: Array<0 | 1> = [0, 1]): string | null {
  const options = targets.flatMap((target) => shiftLightness(color, target, accept) ?? []);
  return options.sort((a, b) => a.distance - b.distance)[0]?.color ?? null;
}

/** Keep the candidate hue and saturation, changing lightness only as far as needed. */
export function ensureContrast(color: string, backgrounds: string[], minimum = 4.5): string {
  const candidate = compositeThemeColor(color, backgrounds[0]);
  const passes = (value: string) => backgrounds.every((bg) => contrastRatio(value, bg) >= minimum);
  if (passes(candidate)) return candidate;
  const adjusted = nearestShift(candidate, passes);
  if (!adjusted) throw new Error("Theme surfaces cannot share a contrast-safe foreground");
  return adjusted;
}

type Separation = Array<[reference: string, minimum: number]>;

/** Share of a surface step a white or black edge surface may keep instead of flipping sides. */
export const EDGE_SHARE = 0.25;

/**
 * Step a surface away from the layers it sits on or beside, preferring the `toward` side. When that
 * side runs out of room (a white card on an off-white page), the surface stops at the edge rather
 * than flipping, provided it keeps a quarter of the step; borders and shadows carry the rest.
 * Best effort: a palette that cannot separate keeps its color, and the all-themes audit test
 * reports it.
 */
function separateSurface(color: string, separation: Separation, toward: 0 | 1): string {
  const meets = (value: string, share = 1) => separation.every(([reference, minimum]) =>
    contrastRatio(value, reference) >= 1 + (minimum - 1) * share);
  const passes = (value: string) => meets(value);
  if (passes(color)) return color;
  const preferred = nearestShift(color, passes, [toward]);
  if (preferred) return preferred;
  const [, chroma, hue] = toOklch(color);
  const edge = fromOklch([toward, chroma, hue]);
  if (meets(edge, EDGE_SHARE)) return edge;
  return nearestShift(color, passes, [toward ? 0 : 1]) ?? color;
}

/** Move an opaque color until it reads as a different role from `others`, keeping its contrast floor. */
function ensureDistinct(color: string, others: string[], backgrounds: string[], minimum: number,
  delta: number, targets?: Array<0 | 1>): string | null {
  const accept = (value: string) => others.every((other) => colorDistance(value, other) >= delta)
    && backgrounds.every((bg) => contrastRatio(value, bg) >= minimum);
  return accept(color) ? color : nearestShift(color, accept, targets);
}

type Layer = "background" | "card" | "popover";

/**
 * Minimum WCAG ratio between each derived surface and the layers it can sit on or beside, so
 * stacked surfaces never blend together. Kept modest: every UI foreground must still reach 4.5:1
 * on all of them, and the default palette's brand blue must survive unchanged.
 */
export const SURFACE_STEPS = {
  card: { background: 1.08 },
  popover: { background: 1.06, card: 1.1 },
  muted: { card: 1.1, background: 1.06, popover: 1.06 },
  secondary: { card: 1.15, background: 1.1, popover: 1.06 },
  accent: { card: 1.15, background: 1.1, popover: 1.06 },
  status: { card: 1.08, background: 1.05, popover: 1.05 },
  border: { card: 1.25, background: 1.25, popover: 1.15 },
} as const satisfies Record<string, Partial<Record<Layer, number>>>;

/** Minimum OKLab distance between roles that must never be mistaken for each other. */
export const ROLE_DISTANCE = {
  destructive: 0.1,
  incorrect: 0.12,
  upcoming: 0.08,
} as const;

/** Add UI semantics without changing a theme's original colors or typing contrast. */
export function deriveThemeUI(colors: ThemeColors): ThemeUIColors {
  const background = compositeThemeColor(colors.bg.base, "#ffffff");
  // Mid-tone palettes can straddle both contrast thresholds after tinting. Keep
  // their UI surfaces on one readable side while leaving raw palette data intact.
  const ink = contrastRatio("#000000", background) >= contrastRatio("#ffffff", background)
    ? "#000000" : "#ffffff";
  // Raised and selected layers step toward the ink: lighter on dark palettes, darker on light ones.
  const toward: 0 | 1 = ink === "#ffffff" ? 1 : 0;
  const authoredDirection = (color: string, from: string): 0 | 1 => {
    const difference = toOklch(color)[0] - toOklch(from)[0];
    if (Math.abs(difference) < 0.005) return toward;
    return difference > 0 ? 1 : 0;
  };
  const layers: Partial<Record<Layer, string>> = { background };
  const against = (steps: Partial<Record<Layer, number>>): Separation =>
    Object.entries(steps).map(([layer, minimum]) => [layers[layer as Layer]!, minimum]);
  const layer = (color: string, steps: Partial<Record<Layer, number>>, direction: 0 | 1) =>
    ensureContrast(separateSurface(color, against(steps), direction), [ink]);

  const authoredCard = compositeThemeColor(colors.bg.surface, background);
  const card = layer(authoredCard, SURFACE_STEPS.card, authoredDirection(authoredCard, background));
  layers.card = card;
  const authoredPopover = compositeThemeColor(colors.bg.elevated, background);
  const popover = layer(authoredPopover, SURFACE_STEPS.popover, authoredDirection(authoredPopover, background));
  layers.popover = popover;
  // Inner surfaces also appear inside dialogs and menus, so their steps include the popover.
  const inner = (color: string, steps: Partial<Record<Layer, number>>) =>
    layer(compositeThemeColor(color, card), steps, toward);
  const muted = inner(card, SURFACE_STEPS.muted);
  const secondary = inner(colors.interactive.secondary.subtle, SURFACE_STEPS.secondary);
  const accent = inner(colors.interactive.accent.subtle, SURFACE_STEPS.accent);
  const successSurface = inner(colors.status.success.subtle, SURFACE_STEPS.status);
  const warningSurface = inner(colors.status.warning.subtle, SURFACE_STEPS.status);
  const destructiveSurface = inner(colors.status.error.subtle, SURFACE_STEPS.status);
  const surfaces = [background, card, popover, muted, secondary, accent,
    successSurface, warningSurface, destructiveSurface];
  const primary = ensureContrast(colors.interactive.primary.DEFAULT, surfaces);
  const destructiveSafe = ensureContrast(colors.status.error.DEFAULT, surfaces);
  // Red-branded palettes must still tell an error apart from a primary action.
  const destructive = ensureDistinct(destructiveSafe, [primary], surfaces, 4.5, ROLE_DISTANCE.destructive)
    ?? destructiveSafe;
  const border = separateSurface(compositeThemeColor(colors.border.default, card), against(SURFACE_STEPS.border),
    toward);

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
    border,
    input: ensureContrast(colors.border.default, surfaces, 3),
    ring: ensureContrast(colors.border.focus, surfaces, 3),
  };
}

/** Keep exercise text subdued, but never indistinguishable from its surface or from typed text.
 * Correct text uses 4.5:1; large untyped text and carets use a 3:1 floor. Mistakes prefer 4.5:1
 * but may drop to the large-text 3:1 floor when that is the only way to differ from typed and
 * untyped text.
 * Shared PracticeText appears on page, card and popover surfaces.
 */
export function deriveThemeTyping(colors: ThemeColors, ui = deriveThemeUI(colors)): ThemeColors["typing"] {
  const surfaces = [ui.background, ui.card, ui.popover];
  const correct = ensureContrast(colors.typing.correct, surfaces);
  // Untyped text only ever recedes toward the page, so progress stays visible.
  const recede: 0 | 1 = toOklch(ui.background)[0] > 0.5 ? 1 : 0;
  const subdued = (color: string) => {
    const safe = ensureContrast(color, surfaces, 3);
    return ensureDistinct(safe, [correct], surfaces, 3, ROLE_DISTANCE.upcoming, [recede]) ?? safe;
  };
  const upcoming = subdued(colors.typing.upcoming);
  const untyped = subdued(colors.typing.default);
  // A mistake replaces untyped text in place and sits beside typed text; it must differ from both.
  const neighbors = [correct, upcoming, untyped];
  const incorrectSafe = ensureContrast(colors.typing.incorrect, surfaces);
  const incorrect = ensureDistinct(incorrectSafe, neighbors, surfaces, 4.5, ROLE_DISTANCE.incorrect)
    ?? ensureDistinct(compositeThemeColor(colors.typing.incorrect, ui.background), neighbors, surfaces, 3,
      ROLE_DISTANCE.incorrect)
    ?? incorrectSafe;
  return {
    cursor: ensureContrast(colors.typing.cursor, surfaces, 3),
    cursorGhost: ensureContrast(colors.typing.cursorGhost, surfaces, 3),
    correct,
    incorrect,
    upcoming,
    default: untyped,
  };
}
