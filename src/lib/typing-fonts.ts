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
  {
    value: "fira-mono",
    label: "Fira Mono",
    fontFamily: '"Fira Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Mozilla's monospace, the ligature-free sibling of Fira Code",
  },
  {
    value: "noto-sans-mono",
    label: "Noto Sans Mono",
    fontFamily: '"Noto Sans Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Google's Noto monospace with wide language coverage",
  },
  {
    value: "red-hat-mono",
    label: "Red Hat Mono",
    fontFamily: '"Red Hat Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Red Hat's friendly, open monospace",
  },
  {
    value: "dm-mono",
    label: "DM Mono",
    fontFamily: '"DM Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Light, low-contrast monospace with a soft feel",
  },
  {
    value: "overpass-mono",
    label: "Overpass Mono",
    fontFamily: '"Overpass Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Monospace inspired by highway sign lettering",
  },
  {
    value: "courier-prime",
    label: "Courier Prime",
    fontFamily: '"Courier Prime", "Courier New", monospace',
    isWebFont: true,
    description: "A sharper Courier, designed for screenplays",
  },
  {
    value: "anonymous-pro",
    label: "Anonymous Pro",
    fontFamily: '"Anonymous Pro", "Courier New", monospace',
    isWebFont: true,
    description: "Keeps look-alike characters such as 0/O and 1/l distinct",
  },
  {
    value: "pt-mono",
    label: "PT Mono",
    fontFamily: '"PT Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Clear monospace from the ParaType public type project",
  },
  {
    value: "victor-mono",
    label: "Victor Mono",
    fontFamily: '"Victor Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Narrow, crisp monospace popular with programmers",
  },
  {
    value: "geist-mono",
    label: "Geist Mono",
    fontFamily: '"Geist Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Vercel's modern monospace, crisp and minimal",
  },
  {
    value: "martian-mono",
    label: "Martian Mono",
    fontFamily: '"Martian Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Wide, technical monospace with a futuristic look",
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
  {
    value: "noto-sans",
    label: "Noto Sans",
    fontFamily: '"Noto Sans", Arial, sans-serif',
    isWebFont: true,
    description: "Google's Noto sans, made to cover nearly every language",
  },
  {
    value: "raleway",
    label: "Raleway",
    fontFamily: '"Raleway", Arial, sans-serif',
    isWebFont: true,
    description: "Elegant sans-serif with stylish capitals",
  },
  {
    value: "rubik",
    label: "Rubik",
    fontFamily: '"Rubik", Arial, sans-serif',
    isWebFont: true,
    description: "Slightly rounded sans-serif with a playful feel",
  },
  {
    value: "work-sans",
    label: "Work Sans",
    fontFamily: '"Work Sans", Arial, sans-serif',
    isWebFont: true,
    description: "Grotesque sans-serif tuned for on-screen text",
  },
  {
    value: "nunito-sans",
    label: "Nunito Sans",
    fontFamily: '"Nunito Sans", Arial, sans-serif',
    isWebFont: true,
    description: "Nunito's straight-cornered sibling, clean and balanced",
  },
  {
    value: "fira-sans",
    label: "Fira Sans",
    fontFamily: '"Fira Sans", Arial, sans-serif',
    isWebFont: true,
    description: "Mozilla's humanist sans-serif, very readable on screens",
  },
  {
    value: "quicksand",
    label: "Quicksand",
    fontFamily: '"Quicksand", Arial, sans-serif',
    isWebFont: true,
    description: "Rounded geometric sans-serif, soft and friendly",
  },
  {
    value: "mulish",
    label: "Mulish",
    fontFamily: '"Mulish", Arial, sans-serif',
    isWebFont: true,
    description: "Minimalist sans-serif with open, even spacing",
  },
  {
    value: "barlow",
    label: "Barlow",
    fontFamily: '"Barlow", Arial, sans-serif',
    isWebFont: true,
    description: "Slightly rounded grotesk inspired by California road signs",
  },
  {
    value: "manrope",
    label: "Manrope",
    fontFamily: '"Manrope", Arial, sans-serif',
    isWebFont: true,
    description: "Modern geometric sans-serif with a technical edge",
  },
  {
    value: "dm-sans",
    label: "DM Sans",
    fontFamily: '"DM Sans", Arial, sans-serif',
    isWebFont: true,
    description: "Low-contrast geometric sans-serif for small text",
  },
  {
    value: "pt-sans",
    label: "PT Sans",
    fontFamily: '"PT Sans", Arial, sans-serif',
    isWebFont: true,
    description: "Humanist sans-serif from the ParaType public type project",
  },
  {
    value: "karla",
    label: "Karla",
    fontFamily: '"Karla", Arial, sans-serif',
    isWebFont: true,
    description: "Quirky grotesque sans-serif with a hand-made touch",
  },
  {
    value: "outfit",
    label: "Outfit",
    fontFamily: '"Outfit", Arial, sans-serif',
    isWebFont: true,
    description: "Clean geometric sans-serif with round letterforms",
  },
  {
    value: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    fontFamily: '"Plus Jakarta Sans", Arial, sans-serif',
    isWebFont: true,
    description: "Contemporary geometric sans-serif from Jakarta",
  },
  {
    value: "figtree",
    label: "Figtree",
    fontFamily: '"Figtree", Arial, sans-serif',
    isWebFont: true,
    description: "Friendly geometric sans-serif that is easy to read",
  },
  {
    value: "ibm-plex-sans",
    label: "IBM Plex Sans",
    fontFamily: '"IBM Plex Sans", Arial, sans-serif',
    isWebFont: true,
    description: "IBM's neutral, engineered sans-serif",
  },
  {
    value: "source-sans-3",
    label: "Source Sans 3",
    fontFamily: '"Source Sans 3", Arial, sans-serif',
    isWebFont: true,
    description: "Adobe's open-source sans-serif, clear and versatile",
  },
  {
    value: "geist",
    label: "Geist",
    fontFamily: '"Geist", Arial, sans-serif',
    isWebFont: true,
    description: "Vercel's modern sans-serif, sharp and minimal",
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
  {
    value: "noto-serif",
    label: "Noto Serif",
    fontFamily: '"Noto Serif", Georgia, serif',
    isWebFont: true,
    description: "Google's Noto serif with wide language coverage",
  },
  {
    value: "pt-serif",
    label: "PT Serif",
    fontFamily: '"PT Serif", Georgia, serif',
    isWebFont: true,
    description: "Sturdy serif from the ParaType public type project",
  },
  {
    value: "libre-baskerville",
    label: "Libre Baskerville",
    fontFamily: '"Libre Baskerville", Georgia, serif',
    isWebFont: true,
    description: "Baskerville tuned for body text on screens",
  },
  {
    value: "eb-garamond",
    label: "EB Garamond",
    fontFamily: '"EB Garamond", Georgia, serif',
    isWebFont: true,
    description: "Classic Garamond revival with old-style elegance",
  },
  {
    value: "crimson-pro",
    label: "Crimson Pro",
    fontFamily: '"Crimson Pro", Georgia, serif',
    isWebFont: true,
    description: "Book-style serif inspired by classic old-style types",
  },
  {
    value: "source-serif-4",
    label: "Source Serif 4",
    fontFamily: '"Source Serif 4", Georgia, serif',
    isWebFont: true,
    description: "Adobe's open-source serif, a partner to Source Sans",
  },
  {
    value: "bitter",
    label: "Bitter",
    fontFamily: '"Bitter", Georgia, serif',
    isWebFont: true,
    description: "Slab serif designed for comfortable screen reading",
  },
  {
    value: "literata",
    label: "Literata",
    fontFamily: '"Literata", Georgia, serif',
    isWebFont: true,
    description: "Google Play Books' serif, made for long reading",
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
  {
    value: "andika",
    label: "Andika",
    fontFamily: '"Andika", Arial, sans-serif',
    isWebFont: true,
    description: "Made by SIL for beginning readers, with clear letter shapes",
  },
  {
    value: "comic-neue",
    label: "Comic Neue",
    fontFamily: '"Comic Neue", "Comic Sans MS", sans-serif',
    isWebFont: true,
    description: "A cleaner take on Comic Sans, casual and friendly",
  },
  {
    value: "atkinson-hyperlegible-next",
    label: "Atkinson Hyperlegible Next",
    fontFamily: '"Atkinson Hyperlegible Next", "Atkinson Hyperlegible", Arial, sans-serif',
    isWebFont: true,
    description: "Updated Atkinson Hyperlegible with more weights and languages",
  },
  {
    value: "atkinson-hyperlegible-mono",
    label: "Atkinson Hyperlegible Mono",
    fontFamily: '"Atkinson Hyperlegible Mono", "Courier New", monospace',
    isWebFont: true,
    description: "Monospace Atkinson Hyperlegible with very distinct letters",
  },
  {
    value: "playpen-sans",
    label: "Playpen Sans",
    fontFamily: '"Playpen Sans", "Comic Sans MS", sans-serif',
    isWebFont: true,
    description: "Handwriting-style font made for young readers and writers",
  },
  {
    value: "readex-pro",
    label: "Readex Pro",
    fontFamily: '"Readex Pro", "Lexend", Arial, sans-serif',
    isWebFont: true,
    description: "Lexend's reading-friendly design, extended to Arabic",
  },
  {
    value: "fredoka",
    label: "Fredoka",
    fontFamily: '"Fredoka", Arial, sans-serif',
    isWebFont: true,
    description: "Big, round and bubbly, great for younger typists",
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
