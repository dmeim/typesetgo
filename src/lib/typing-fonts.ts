/**
 * Typing font configuration for the typing text area.
 *
 * These fonts only apply to the actual typing region (practice, race, lesson).
 * The rest of the site UI font is managed separately.
 */

export interface TypingFontOption {
  /** Stable key persisted to storage / DB */
  value: string;
  /** Human-readable label shown in the dropdown */
  label: string;
  /** CSS font-family stack */
  fontFamily: string;
  /** Whether the font is served locally via src/fonts.css (false = system font) */
  isWebFont: boolean;
  /** Short description for accessibility / tooltip */
  description: string;
}

/**
 * Canonical list of supported typing fonts.
 * Order here determines dropdown order.
 */
export const TYPING_FONT_OPTIONS: readonly TypingFontOption[] = [
  // ── Monospace ──────────────────────────────────────────────
  {
    value: "jetbrains-mono",
    label: "JetBrains Mono",
    fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace',
    isWebFont: true,
    description: "Default monospace font used across the site",
  },
  {
    value: "roboto-mono",
    label: "Roboto Mono",
    fontFamily: '"Roboto Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Clean monospace font from Google",
  },
  {
    value: "source-code-pro",
    label: "Source Code Pro",
    fontFamily: '"Source Code Pro", "Courier New", monospace',
    isWebFont: true,
    description: "Adobe open-source monospace font",
  },
  {
    value: "fira-code",
    label: "Fira Code",
    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
    isWebFont: true,
    description: "Monospace with programming ligatures",
  },
  {
    value: "ibm-plex-mono",
    label: "IBM Plex Mono",
    fontFamily: '"IBM Plex Mono", "Courier New", monospace',
    isWebFont: true,
    description: "IBM's modern monospace, clean and neutral",
  },
  {
    value: "inconsolata",
    label: "Inconsolata",
    fontFamily: '"Inconsolata", "Courier New", monospace',
    isWebFont: true,
    description: "Humanist monospace, popular with developers",
  },
  {
    value: "space-mono",
    label: "Space Mono",
    fontFamily: '"Space Mono", monospace',
    isWebFont: true,
    description: "Geometric monospace with retro character",
  },
  {
    value: "courier-new",
    label: "Courier New",
    fontFamily: '"Courier New", Courier, monospace',
    isWebFont: false,
    description: "Classic typewriter-style monospace",
  },

  // ── Sans-serif ─────────────────────────────────────────────
  {
    value: "arial",
    label: "Arial",
    fontFamily: "Arial, Helvetica, sans-serif",
    isWebFont: false,
    description: "Classic sans-serif system font",
  },
  {
    value: "roboto",
    label: "Roboto",
    fontFamily: '"Roboto", Arial, sans-serif',
    isWebFont: true,
    description: "Popular sans-serif from Google",
  },
  {
    value: "open-sans",
    label: "Open Sans",
    fontFamily: '"Open Sans", Arial, sans-serif',
    isWebFont: true,
    description: "Friendly humanist sans-serif",
  },
  {
    value: "lato",
    label: "Lato",
    fontFamily: '"Lato", Arial, sans-serif',
    isWebFont: true,
    description: "Warm semi-rounded sans-serif",
  },
  {
    value: "inter",
    label: "Inter",
    fontFamily: '"Inter", Arial, sans-serif',
    isWebFont: true,
    description: "Designed for screens, highly legible at small sizes",
  },
  {
    value: "nunito",
    label: "Nunito",
    fontFamily: '"Nunito", Arial, sans-serif',
    isWebFont: true,
    description: "Rounded sans-serif, friendly and approachable",
  },
  {
    value: "montserrat",
    label: "Montserrat",
    fontFamily: '"Montserrat", Arial, sans-serif',
    isWebFont: true,
    description: "Geometric sans-serif inspired by urban signage",
  },
  {
    value: "poppins",
    label: "Poppins",
    fontFamily: '"Poppins", Arial, sans-serif',
    isWebFont: true,
    description: "Geometric sans-serif with a clean modern feel",
  },
  {
    value: "verdana",
    label: "Verdana",
    fontFamily: "Verdana, Geneva, sans-serif",
    isWebFont: false,
    description: "Wide letter spacing, great for readability",
  },
  {
    value: "trebuchet-ms",
    label: "Trebuchet MS",
    fontFamily: '"Trebuchet MS", Helvetica, sans-serif',
    isWebFont: false,
    description: "Humanist sans-serif, good on-screen readability",
  },
  {
    value: "comic-sans",
    label: "Comic Sans",
    fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
    isWebFont: false,
    description: "Informal handwriting-style font",
  },

  // ── Serif ──────────────────────────────────────────────────
  {
    value: "georgia",
    label: "Georgia",
    fontFamily: 'Georgia, "Times New Roman", serif',
    isWebFont: false,
    description: "Elegant serif font, easy on the eyes",
  },
  {
    value: "merriweather",
    label: "Merriweather",
    fontFamily: '"Merriweather", Georgia, serif',
    isWebFont: true,
    description: "Sturdy serif designed for comfortable screen reading",
  },
  {
    value: "lora",
    label: "Lora",
    fontFamily: '"Lora", Georgia, serif',
    isWebFont: true,
    description: "Contemporary serif with calligraphic roots",
  },
  {
    value: "playfair-display",
    label: "Playfair Display",
    fontFamily: '"Playfair Display", Georgia, serif',
    isWebFont: true,
    description: "High-contrast serif with a sophisticated look",
  },
  {
    value: "times-new-roman",
    label: "Times New Roman",
    fontFamily: '"Times New Roman", Times, serif',
    isWebFont: false,
    description: "Traditional serif, the classic document font",
  },

  // ── Accessibility / Readability ────────────────────────────
  {
    value: "lexend",
    label: "Lexend",
    fontFamily: '"Lexend", Arial, sans-serif',
    isWebFont: true,
    description: "Designed for improved reading comfort and dyslexia support",
  },
  {
    value: "atkinson-hyperlegible",
    label: "Atkinson Hyperlegible",
    fontFamily: '"Atkinson Hyperlegible", Arial, sans-serif',
    isWebFont: true,
    description: "Designed for low-vision readability by the Braille Institute",
  },
  {
    value: "opendyslexic",
    label: "OpenDyslexic",
    fontFamily: '"OpenDyslexic", "Comic Sans MS", sans-serif',
    isWebFont: true,
    description: "Weighted bottoms to reduce letter-swapping for dyslexic readers",
  },
] as const;

/** The default typing font value */
export const DEFAULT_TYPING_FONT = "jetbrains-mono";

/**
 * Look up a font option by its value key.
 * Falls back to the default if the key is unknown.
 */
export function getTypingFontOption(value: string | undefined): TypingFontOption {
  if (!value) return TYPING_FONT_OPTIONS[0];
  const found = TYPING_FONT_OPTIONS.find((f) => f.value === value);
  return found ?? TYPING_FONT_OPTIONS[0];
}

/**
 * Resolve a font value key to its CSS font-family string.
 */
export function getTypingFontFamily(value: string | undefined): string {
  return getTypingFontOption(value).fontFamily;
}
