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

For multi-variant themes, author a compact spec (about 15 colors per mode: `bg`, `surface`, `elevated`, `text`, `textSecondary`, `primary`, `secondary`, `accent`, status colors, `cursor`, `cursorGhost`, `upcoming`) and expand it. The expander fills the opacity tiers, borders and typing copies with the catalog conventions. Then check the result:

```bash
bun scripts/expand-theme.ts my-theme.spec.json public/themes/my-theme.json
bun scripts/check-theme.ts public/themes/my-theme.json --category editor
```

`check-theme.ts` fails on schema or convention errors, a dark palette with a light background (or the reverse), and any derivation guarantee from [`theme-audit.ts`](../src/lib/theme-audit.ts) (layer separation, distinct roles, readable mistakes). Its warnings name authored colors the runtime contrast fixes visibly changed, with the displayed color as a suggestion. The spec format is documented at the top of `scripts/expand-theme.ts`.

## How Colors Reach Components

### 1. ThemeProvider loads the theme

On mount, `ThemeProvider` reads the stored theme id from `localStorage`, fetches the JSON, and resolves the active `ThemeColors` based on the current mode (light/dark). It always initializes with the default theme so `colors` is never null.

### 2. Derive colors for their actual use

[`deriveThemeUI()`](../src/lib/colors.ts) derives opaque UI surfaces, text, accents and status colors, leaving the source JSON and context `colors` unchanged. The page background retains the original palette color.

- **Contrast fixes keep the color.** When a color fails its floor, only its OKLCH lightness moves, as far as needed; hue and chroma are kept (chroma shrinks only where sRGB cannot display it). Blending toward white or black, which the derivation used before October 2026, washed brand colors into pastels and could collapse distinct roles into the same near-white.
- **Surfaces form a ladder.** Each derived surface keeps a minimum separation from the layers it sits on or beside (`SURFACE_STEPS`): card from page, popover from page and card, and muted, secondary, accent and status surfaces from card, page and popover. Card and popover step in the direction the palette authored (a sunken dark card stays darker). Inner surfaces and borders step toward the readable ink: lighter on dark palettes, darker on light ones. A card already at white or black on its authored side stops at the edge if it keeps a quarter of the step (`EDGE_SHARE`), so white cards on off-white pages stay white and rely on their now-visible borders. Muted is its own step, never the card color.
- **Confusable roles stay distinct.** `ROLE_DISTANCE` sets the minimum OKLab distance between destructive and primary (red-branded palettes) and between mistakes and typed or untyped exercise text. Untyped text only ever recedes toward the page.
- Mid-tone UI surfaces are adjusted when necessary so they can share readable foregrounds.

[`ThemeProvider`](../src/context/ThemeProvider.tsx) applies the derived UI values as `--background`, `--foreground`, `--secondary-emphasis`, etc. on `:root` whenever the theme, variant or mode changes. `deriveThemeTyping()` supplies the `--theme-typing-*` variables used by `PracticeText`.

| Role | Contrast floor | Backgrounds checked |
|------|----------------|---------------------|
| UI text, accent text, status text | 4.5:1 | Page, card, popover, secondary/accent and status surfaces |
| Input outlines, focus rings | 3:1 | The same UI surfaces |
| Correct exercise text | 4.5:1 | Page, card, popover |
| Incorrect exercise text | 4.5:1, or 3:1 (large text) only when needed to differ from typed/untyped text | Page, card, popover |
| Untyped/upcoming exercise text, carets | 3:1 | Page, card, popover |

The exercise floor retains a subdued untyped state for the large typing display; it is not a guarantee of 4.5:1 for small custom exercise fonts. Decorative borders keep the `SURFACE_STEPS.border` separation rather than a text contrast floor. Disabled controls, animation fades and arbitrary user-customized room colors are outside these guarantees. Avoid adding opacity to essential text after derivation.

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

Tailwind maps the derived status and emphasis roles too: `text-success`, `bg-success-surface`, `text-warning`, `bg-warning-surface`, `text-secondary-emphasis`.

SVG and Recharts strokes can consume CSS variables; they do not need raw JSON colors. The remaining raw `tv.text`, `tv.interactive` and `tv.status` groups are palette accessors, not safe UI defaults. A brand's black or white accent can legitimately match its background: the Celestia Ludenberg dark palette has a near-black secondary accent, so using it directly for WPM made that stat disappear.

Do not append hex alpha suffixes to CSS variable strings (`var(--primary)80` is invalid CSS). Prefer the derived surfaces for panels containing text. If introducing a new translucent surface, check its composited foreground/background pair. Theme previews and the picker's current-color details use the same derivation as the live UI.

### Scoped themes

A subtree can carry its own theme, as the Connect participant room does for a host override. Apply `themeCSSVariables(colors)` (`src/lib/theme-css.ts`, the same map the provider writes to `:root`) plus `color-scheme` as an inline style, add a `dark` or `light` class so `dark:` variants follow the subtree (the variant opts out under `.light`), and provide `PortalContainerContext` (`src/components/ui/portal-container.ts`) so overlays portal inside it. Components inside must read CSS variables, not `useTheme().colors`, or they show the page theme.

### Regression checks

[`foundations-theme-colors.test.ts`](../tests/unit/foundations-theme-colors.test.ts) reads every source JSON, including every variant and both supported modes, and checks UI pairs and typing roles without mutating the raw palette. The September 2026 audit covered 1,557 files / 9,912 palettes; 533 raw secondary accents were below 1.5:1 against the page background.

[`theme-palette-audit.test.ts`](../tests/unit/theme-palette-audit.test.ts) runs the same catalog through the surface ladder and role-distance checks. Its `KNOWN_RESIDUALS` list names the few palettes whose source colors leave no room for a guarantee (mid-tone Windows 95/XP, Brutalist's light "dark" palette, and two exercise palettes). Fix those in JSON and delete their entries; any new failure or newly passing palette fails the test.

Run `bun run test:run tests/unit/foundations-theme-colors.test.ts tests/unit/theme-palette-audit.test.ts tests/unit/foundations-theme-selection.test.tsx` after changing derivation or palettes. On Node 26+, prefix unit runs with `NODE_OPTIONS=--no-experimental-webstorage` so jsdom's `localStorage` is not shadowed by Node's. `bun run test:e2e practice` also checks the actual rendered WPM, accuracy, labels, exercise text and carets in Celestia dark/light, Houston Dynamo's dark away kit and Bubblegum light. See the [isolated browser guide](../tests/browser/README.md) for fixture boundaries. Extend the pair checks when adding a new semantic surface or foreground role.

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

Product themes use `iphone` (one theme per generation; variants are each model's finishes, labeled like `15 Pro — Natural Titanium`) and `mac` (one theme per Mac line; variants labeled with the finish and introduction year). `f1` holds one theme per constructor on the current grid; its variants are the team's full-time race drivers since 2000 (or since the constructor began), labeled with their years, plus a `default` current livery.

`Sports` is reserved for general sport-name themes such as `football`, `basketball`, `hockey`, and `soccer`. Team/franchise themes belong in `Sports Teams` (`sports-teams`) so future team additions do not clutter the general sports list. Sports-team variants should represent visually distinct jersey eras, home/away uniforms, alternates, throwbacks, City Connect/reverse-retro designs, or named kits.
