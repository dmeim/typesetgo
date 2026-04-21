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
src/context/ThemeContext.tsx   React provider: resolves colors, sets CSS vars
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

A **ColorScale** has three tiers: `DEFAULT` (full), `muted` (~30% opacity), `subtle` (~10% opacity). All three are specified explicitly in the JSON -- no runtime opacity math.

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
3. If the theme name needs special capitalization (e.g. `"GitHub"` not `"Github"`), add an entry in `THEME_DISPLAY_NAMES` in `src/lib/themes.ts`.

## How Colors Reach Components

### 1. ThemeProvider loads the theme

On mount, `ThemeProvider` reads the stored theme id from `localStorage`, fetches the JSON, and resolves the active `ThemeColors` based on the current mode (light/dark). It always initializes with the default theme so `colors` is never null.

### 2. CSS variables are set on `:root`

`applyThemeCSS()` maps every color in `ThemeColors` to a CSS custom property:

```
colors.bg.base                    --> --theme-bg-base
colors.interactive.primary.DEFAULT --> --theme-interactive-primary
colors.typing.cursor              --> --theme-typing-cursor
...  (30 variables total)
```

These update on every theme/mode change.

### 3. Components consume colors

There are two consumption patterns, each with a specific use case:

#### Pattern A: `tv` helper (preferred for most styling)

Import `tv` from `@/lib/theme-vars` -- a static object mirroring the `ThemeColors` shape, where every leaf is a `var(--theme-*)` string.

```tsx
import { tv } from "@/lib/theme-vars";

<div style={{ backgroundColor: tv.bg.surface, color: tv.text.primary }}>
```

**Why use it:** TypeScript autocompletion, no runtime dependency on React context, no null-checking. Works in any inline `style` prop.

**Limitation:** Cannot append hex opacity suffixes. `tv.bg.base` resolves to the string `"var(--theme-bg-base)"`, and `"var(--theme-bg-base)80"` is not valid CSS.

#### Pattern B: `colors` from `useTheme()` (for opacity manipulation)

When you need the resolved hex value -- typically to append an opacity suffix:

```tsx
const { colors } = useTheme();

<div style={{ backgroundColor: `${colors.bg.base}80` }}>
```

**When to use:** Template literals with opacity suffixes, gradient strings, passing colors to SVG/canvas/charting libraries that need raw values.

### Quick decision guide

| Need | Use |
|------|-----|
| `style={{ color: ... }}` | `tv.text.primary` |
| `style={{ background: \`\${...}80\` }}` | `colors.bg.base` |
| Gradient template literal | `colors.*` |
| Recharts / SVG `fill` / `stroke` | `colors.*` |
| Conditional color (ternary) | `tv.*` (works fine) |

## Key Files

| File | Role |
|------|------|
| `src/types/theme.ts` | `ThemeColors`, `ThemeDefinition`, `ColorScale` types |
| `src/context/ThemeContext.tsx` | Provider, `applyThemeCSS()`, localStorage persistence |
| `src/hooks/useTheme.ts` | `useTheme()` hook (thin wrapper around context) |
| `src/lib/theme-vars.ts` | `tv` helper -- static CSS variable string map |
| `src/lib/themes.ts` | Fetching, caching, display names, category config |
| `src/index.css` | CSS variable defaults (TypeSetGo theme values) |
| `public/themes/manifest.json` | Auto-generated theme list (do not edit) |

## Context API

`useTheme()` returns:

```ts
{
  theme: ThemeDefinition;      // Full definition including raw JSON
  themeId: string;             // e.g. "solarized"
  themeName: string;           // e.g. "Solarized" (display-formatted)
  mode: "light" | "dark";
  colors: ThemeColors;         // Resolved colors for current mode
  supportsLightMode: boolean;
  isLoading: boolean;
  setTheme(id: string): Promise<void>;
  setMode(mode: ThemeMode): void;
  toggleMode(): void;
}
```

`colors` is guaranteed non-null -- the provider initializes with the default theme synchronously.

## Categories

Themes are organized into ~40 categories (gaming, anime, books, editor, nature, etc.). Category display order and names are defined in `CATEGORY_CONFIG` in `src/lib/themes.ts`. The theme picker UI groups and sorts themes by category.
