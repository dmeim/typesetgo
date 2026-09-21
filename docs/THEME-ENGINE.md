# Theme Engine

How themes work in TypeSetGo, from JSON files to rendered pixels.

## Architecture Overview

```
public/themes/*.json          Theme definitions (source of truth)
        |
        v
src/lib/themes.ts             Loading, caching, manifest, display names
        |
        v
src/context/ThemeProvider.tsx   React provider: resolves colors, sets CSS vars
        |
        +---> CSS variables on :root     (consumed via `tv` helper or raw var())
        +---> `colors` object on context (consumed via useTheme() for hex access)
```

## Theme JSON Format

Each theme lives at `public/themes/<id>.json`. The `id` is the filename without extension (e.g. `solarized.json` = theme id `solarized`).

```jsonc
{
  "category": "editor",       // See ThemeCategory for valid values
  "dark": { /* ThemeColors */ },
  "light": { /* ThemeColors | null */ }  // Optional
}
```

A `ThemeColors` object has six semantic groups:

| Group | Keys | Purpose |
|-------|------|---------|
| `bg` | `base`, `surface`, `elevated`, `overlay` | Surface hierarchy |
| `text` | `primary`, `secondary`, `muted`, `inverse` | Text hierarchy |
| `interactive` | `primary`, `secondary`, `accent` (each a ColorScale) | Buttons, links, selections |
| `status` | `success`, `error`, `warning` (each a ColorScale) | Feedback indicators |
| `border` | `default`, `subtle`, `focus` | Dividers and outlines |
| `typing` | `cursor`, `cursorGhost`, `correct`, `incorrect`, `upcoming`, `default` | Typing-specific colors |

A **ColorScale** has three tiers: `DEFAULT` (full), `muted` (~30% opacity), `subtle` (~10% opacity). All three are specified explicitly in the JSON. UI derivation composites translucent values onto their intended surfaces before checking contrast.

Example (`typesetgo.json` dark mode, `interactive.primary`):
```json
{
  "DEFAULT": "#3cb5ee",
  "muted": "rgba(60, 181, 238, 0.3)",
  "subtle": "rgba(60, 181, 238, 0.1)"
}
```

### Light mode

A theme may optionally include a `"light"` key with a full `ThemeColors` object. If absent or `null`, the theme is dark-only and the light/dark toggle is disabled.

### Adding a new theme

1. Create `public/themes/my-theme.json` with `category`, `dark`, and optionally `light`.
2. The build plugin (`vite-plugin-auto-manifest.ts`) auto-generates `public/themes/manifest.json` -- no manual manifest editing needed.
3. Collections can instead define a `variants` object and `defaultVariant`; see [theme variants](THEME-VARIANTS-IMPLEMENTATION.md).
4. If the theme name needs special capitalization (e.g. `"GitHub"` not `"Github"`), add an entry in `THEME_DISPLAY_NAMES` in `src/lib/theme-catalog.ts`.

## How Colors Reach Components

### 1. ThemeProvider loads the theme

On mount, `ThemeProvider` reads the stored theme id from `localStorage`, fetches the JSON, and resolves the active `ThemeColors` based on the current mode (light/dark). It always initializes with the default theme so `colors` is never null.

### 2. Derive colors for their actual use

[`deriveThemeUI()`](../src/lib/colors.ts) derives opaque UI surfaces, text, accents and status colors. It moves a color toward black or white only when needed for contrast, leaving the source JSON and context `colors` unchanged. Mid-tone UI surfaces are also adjusted when necessary so they can share readable foregrounds. The page background retains the original palette color.

[`ThemeProvider`](../src/context/ThemeProvider.tsx) applies the derived UI values as `--background`, `--foreground`, `--secondary-emphasis`, etc. on `:root` whenever the theme, variant or mode changes. `deriveThemeTyping()` supplies the `--theme-typing-*` variables used by `PracticeText`.

| Role | Contrast floor | Backgrounds checked |
|------|----------------|---------------------|
| UI text, accent text, status text | 4.5:1 | Page, card, popover, secondary/accent and status surfaces |
| Input outlines, focus rings | 3:1 | The same UI surfaces |
| Correct/incorrect exercise text | 4.5:1 | Page, card, popover |
| Untyped/upcoming exercise text, carets | 3:1 | Page, card, popover |

The exercise floor retains a subdued untyped state for the large typing display; it is not a guarantee of 4.5:1 for small custom exercise fonts. Decorative borders, disabled controls, animation fades and arbitrary user-customized room colors are outside these guarantees. Avoid adding opacity to essential text after derivation.

### 3. Components consume the matching roles

Use [`tv.ui`](../src/lib/theme-vars.ts) or the matching Tailwind semantic utilities for UI. In particular, `secondary` and `accent` are tinted **backgrounds**; `secondaryEmphasis` and `accentEmphasis` are readable colored **foregrounds**. Live WPM/accuracy and profile charts use `secondaryEmphasis`.

| Need | Use |
|------|-----|
| Body text / secondary labels | `tv.ui.foreground` / `tv.ui.mutedForeground` |
| Card | `tv.ui.card` with `tv.ui.cardForeground` |
| Primary button | `tv.ui.primary` with `tv.ui.primaryForeground` |
| Secondary tinted selection | `tv.ui.secondary` with `tv.ui.secondaryForeground` |
| Colored stats / chart strokes | `tv.ui.secondaryEmphasis` |
| Success / warning / error text | `tv.ui.success` / `tv.ui.warning` / `tv.ui.destructive` |
| Status panel backgrounds | `tv.ui.successSurface` / `tv.ui.warningSurface` / `tv.ui.destructiveSurface` |
| Exercise characters and carets | `tv.typing.*` |
| A library requiring literal colors | `deriveThemeUI(colors)` or `deriveThemeTyping(colors)` |
| Original palette artwork / editing | Raw `colors` from `useTheme()` |

SVG and Recharts strokes can consume CSS variables; they do not need raw JSON colors. The remaining raw `tv.text`, `tv.interactive` and `tv.status` groups are palette accessors, not safe UI defaults. A brand's black or white accent can legitimately match its background: the Celestia Ludenberg dark palette has a near-black secondary accent, so using it directly for WPM made that stat disappear.

Do not append hex alpha suffixes to CSS variable strings (`var(--primary)80` is invalid CSS). Prefer the derived surfaces for panels containing text. If introducing a new translucent surface, check its composited foreground/background pair. Theme previews and the picker's current-color details use the same derivation as the live UI.

### Regression checks

[`foundations-theme-colors.test.ts`](../tests/unit/foundations-theme-colors.test.ts) reads every source JSON, including every variant and both supported modes, and checks UI pairs and typing roles without mutating the raw palette. The September 2026 audit covered 1,557 files / 9,912 palettes; 533 raw secondary accents were below 1.5:1 against the page background.

Run `bun run test:run tests/unit/foundations-theme-colors.test.ts tests/unit/foundations-theme-selection.test.tsx` after changing derivation or palettes. `bun run test:e2e practice` also checks the actual rendered WPM, accuracy, labels, exercise text and carets in Celestia dark/light, Houston Dynamo's dark away kit and Bubblegum light. See the [isolated browser guide](../tests/browser/README.md) for fixture boundaries. Extend the pair checks when adding a new semantic surface or foreground role.

## Key Files

| File | Role |
|------|------|
| `src/types/theme.ts` | `ThemeColors`, `ThemeDefinition`, `ColorScale` types |
| `src/context/ThemeProvider.tsx` | Provider, `applyThemeCSS()`, localStorage persistence |
| `src/hooks/useTheme.ts` | `useTheme()` hook (thin wrapper around context) |
| `src/lib/theme-vars.ts` | `tv` helper -- static CSS variable string map |
| `src/lib/themes.ts` | Fetching and caching |
| `src/lib/theme-catalog.ts` | Browsing metadata, display names, categories |
| `src/lib/colors.ts` | Color parsing, compositing, contrast and UI/typing derivation |
| `src/index.css` | CSS variable defaults (TypeSetGo theme values) |
| `public/themes/manifest.json` | Auto-generated theme list (do not edit) |

## Context API

`useTheme()` exposes the following core fields (the full contract is in [`theme-context.ts`](../src/context/theme-context.ts)):

```ts
{
  theme: ThemeDefinition;      // Full definition including raw JSON
  themeId: string;             // e.g. "solarized"
  themeName: string;           // e.g. "Solarized" (display-formatted)
  variantId: string;
  mode: "light" | "dark";
  colors: ThemeColors;         // Raw palette for the active variant/mode
  supportsLightMode: boolean;
  isLoading: boolean;
  setTheme(id: string): Promise<void>;
  setMode(mode: ThemeMode): void;
  toggleMode(): void;
}
```

`colors` is guaranteed non-null -- the provider initializes with the default theme synchronously.

## Categories

Themes are organized into categories (gaming, anime, books, editor, nature, sports, sports-teams, etc.). Category display order and names are defined in `CATEGORY_CONFIG` in `src/lib/theme-catalog.ts`. The theme picker UI groups and sorts themes by category.

`Sports` is reserved for general sport-name themes such as `football`, `basketball`, `hockey`, and `soccer`. Team/franchise themes belong in `Sports Teams` (`sports-teams`) so future team additions do not clutter the general sports list. Sports-team variants should represent visually distinct jersey eras, home/away uniforms, alternates, throwbacks, City Connect/reverse-retro designs, or named kits.
