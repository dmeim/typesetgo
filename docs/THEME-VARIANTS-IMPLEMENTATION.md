# Theme Variants Implementation

Planning document for adding per-theme variants to the existing theme engine and theme picker UI.

This is a design and implementation guide only. It does not reflect shipped behavior yet.

## Goal

Expand the theme system from:

- `theme`
- `mode` (`light` or `dark`)

to:

- `theme`
- `variant`
- `mode` (`light` or `dark`)

Example:

- theme: `linkin-park`
- variant: `meteora`
- mode: `dark`

Themes that do not need multiple variants will still use the same model. They will define a single `default` variant that contains that theme's light and dark palettes.

## Current State

The current theme engine assumes a single palette pair per theme:

- `src/types/theme.ts` defines `ThemeDefinition` as `id`, `name`, `category`, `dark`, and optional `light`.
- `src/lib/themes.ts` loads theme JSON by reading `data.dark` and `data.light` directly.
- `src/context/ThemeContext.tsx` persists only `themeId` and `mode` in local storage.
- `src/components/typing/TypingPractice.tsx` renders one card per theme and exposes light/dark selection with the small button rail on the right edge of each card.
- Convex preferences currently save `themeName`, not a stable theme identifier.

The current model works for a two-choice palette system, but it does not scale cleanly once a theme can contain multiple named sub-palettes.

## Decision Summary

These are the planning assumptions for the variants project:

- The new JSON format will replace the current top-level `dark` and `light` format.
- We will not keep runtime backward compatibility for legacy theme files.
- We will not keep runtime backward compatibility for legacy persisted theme preferences either.
- Existing theme files will be rewritten to the new schema.
- Every theme will expose variants explicitly, even if it only has one.
- Light and dark mode will remain global user-facing concepts, but they will resolve through the selected variant.
- Themes without custom variants will use a single `default` variant.
- Themes with only a single `default` variant will keep the current collapsed-card light/dark controls.
- Only themes with two or more variants will replace the collapsed-card light/dark rail with a variants badge and inline expansion.

## Proposed Theme JSON Format

Each theme file should move to an explicit `variants` object.

```json
{
  "category": "music-bands",
  "defaultVariant": "default",
  "variants": {
    "default": {
      "label": "Default",
      "dark": {
        "bg": { "base": "#0e0a0a", "surface": "#1a1212", "elevated": "#241818", "overlay": "rgba(0, 0, 0, 0.6)" },
        "text": { "primary": "#d4c5c5", "secondary": "#6b4a4a", "muted": "rgba(107, 74, 74, 0.6)", "inverse": "#ffffff" },
        "interactive": {
          "primary": { "DEFAULT": "#c41e1e", "muted": "rgba(196, 30, 30, 0.3)", "subtle": "rgba(196, 30, 30, 0.1)" },
          "secondary": { "DEFAULT": "#8b1a1a", "muted": "rgba(139, 26, 26, 0.3)", "subtle": "rgba(139, 26, 26, 0.1)" },
          "accent": { "DEFAULT": "#e84040", "muted": "rgba(232, 64, 64, 0.3)", "subtle": "rgba(232, 64, 64, 0.1)" }
        },
        "status": {
          "success": { "DEFAULT": "#22c55e", "muted": "rgba(34, 197, 94, 0.3)", "subtle": "rgba(34, 197, 94, 0.1)" },
          "error": { "DEFAULT": "#ef4444", "muted": "rgba(239, 68, 68, 0.3)", "subtle": "rgba(239, 68, 68, 0.1)" },
          "warning": { "DEFAULT": "#f59e0b", "muted": "rgba(245, 158, 11, 0.3)", "subtle": "rgba(245, 158, 11, 0.1)" }
        },
        "border": { "default": "rgba(107, 74, 74, 0.3)", "subtle": "rgba(107, 74, 74, 0.15)", "focus": "#c41e1e" },
        "typing": { "cursor": "#c41e1e", "cursorGhost": "#e84040", "correct": "#d4c5c5", "incorrect": "#ef4444", "upcoming": "#6b4a4a", "default": "#6b4a4a" }
      },
      "light": {
        "bg": { "base": "#f5f0f0", "surface": "#ffffff", "elevated": "#ede6e6", "overlay": "rgba(0, 0, 0, 0.3)" },
        "text": { "primary": "#1a1010", "secondary": "#8a7070", "muted": "rgba(138, 112, 112, 0.6)", "inverse": "#000000" },
        "interactive": {
          "primary": { "DEFAULT": "#b01818", "muted": "rgba(176, 24, 24, 0.2)", "subtle": "rgba(176, 24, 24, 0.08)" },
          "secondary": { "DEFAULT": "#7a1515", "muted": "rgba(122, 21, 21, 0.2)", "subtle": "rgba(122, 21, 21, 0.08)" },
          "accent": { "DEFAULT": "#d43535", "muted": "rgba(212, 53, 53, 0.2)", "subtle": "rgba(212, 53, 53, 0.08)" }
        },
        "status": {
          "success": { "DEFAULT": "#17823e", "muted": "rgba(23, 130, 62, 0.2)", "subtle": "rgba(23, 130, 62, 0.08)" },
          "error": { "DEFAULT": "#e03030", "muted": "rgba(224, 48, 48, 0.2)", "subtle": "rgba(224, 48, 48, 0.08)" },
          "warning": { "DEFAULT": "#ab6e07", "muted": "rgba(171, 110, 7, 0.2)", "subtle": "rgba(171, 110, 7, 0.08)" }
        },
        "border": { "default": "rgba(138, 112, 112, 0.2)", "subtle": "rgba(138, 112, 112, 0.1)", "focus": "#b01818" },
        "typing": { "cursor": "#b01818", "cursorGhost": "#d43535", "correct": "#1a1010", "incorrect": "#e03030", "upcoming": "#8a7070", "default": "#8a7070" }
      }
    },
    "meteora": {
      "label": "Meteora",
      "dark": {},
      "light": {}
    },
    "hybrid-theory": {
      "label": "Hybrid Theory",
      "dark": {},
      "light": {}
    }
  }
}
```

## Why This Shape

- It makes variants explicit instead of overloading top-level keys.
- It keeps all variant-specific metadata in one place.
- It gives each variant a stable id and a user-facing label.
- It preserves the current mental model that a palette choice is always `light` or `dark`.
- It lets single-variant themes use the same structure as multi-variant themes.

## Type Model Changes

`src/types/theme.ts` should move from a flat `ThemeDefinition` to a variant-aware model.

Proposed shape:

```ts
export type ThemeVariantDefinition = {
  id: string;
  label: string;
  dark: ThemeColors;
  light: ThemeColors | null;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  category: ThemeCategory;
  defaultVariantId: string;
  variants: ThemeVariantDefinition[];
};

export type ThemeSelection = {
  themeId: string;
  variantId: string;
  mode: ThemeMode;
};
```

Implementation notes:

- `ThemeDefinition` should no longer expose top-level `dark` and `light`.
- Variant ids should come from the keys inside `variants`.
- `defaultVariantId` should be required so selection always has a stable fallback.
- `ThemeContext` should resolve active colors from `theme + variant + mode`.
- Theme updates should be applied through a single atomic selection setter so `themeId`, `variantId`, and `mode` do not drift during UI interactions.

## Runtime Model

The active theme selection should become:

- `themeId`
- `variantId`
- `mode`

Resolved colors should come from:

1. load selected theme
2. resolve selected variant by `variantId`
3. if `mode === "light"` and the variant provides `light`, use it
4. otherwise use that variant's `dark`

If a saved variant id no longer exists for a theme, the system should fall back to `defaultVariantId`.

If a saved mode is `light` but the selected variant does not provide a light palette, the system should fall back to `dark`.

## Persistence Changes

### Local storage

`src/context/ThemeContext.tsx` currently stores:

- `typesetgo-theme-id`
- `typesetgo-theme-mode`

It should store:

- `typesetgo-theme-id`
- `typesetgo-theme-variant-id`
- `typesetgo-theme-mode`

### Convex preferences

Convex preferences currently store `themeName`, which is display-oriented and not stable enough for the new model.

The preferences model should move to stable ids:

- `themeId`
- `themeVariantId`
- `themeMode`

Files impacted:

- `convex/preferences.ts`
- `convex/schema.ts`
- `src/components/typing/TypingPractice.tsx`

This change is important even without variants, because the current UI already identifies themes by id internally and only converts back to names for persistence.

This should be treated as a breaking preference-schema change. Existing persisted theme preferences can be deliberately reset instead of migrated.

## Theme Loading Changes

`src/lib/themes.ts` should be updated so that `fetchTheme()` parses the new JSON format.

Expected responsibilities:

- read `category`
- read `defaultVariant`
- convert `variants` object into `ThemeVariantDefinition[]`
- assign variant ids from object keys
- preserve formatted theme display names using `THEME_DISPLAY_NAMES`

`fetchAllThemes()` and `groupThemesByCategory()` can remain mostly the same, because grouping still happens at the theme-family level, not the variant level.

## Theme Picker UI

The current picker card UI works because each theme only exposes two palette choices. With variants, selection becomes:

1. choose theme family
2. choose variant
3. choose light or dark

The picker should keep the grid as the entry point, with the selected card expanding in place to reveal per-variant light and dark controls directly inside the card.

#### Collapsed card

The collapsed card should remain visually close to the current theme card design, but it should branch based on variant count.

For single-variant themes:

- keep the current collapsed card layout
- keep the per-card light/dark button rail on the right edge
- do not show a `1 variant` badge

For multi-variant themes:

- theme name
- current swatch row
- variants badge on the same row as the swatches
- no per-card light/dark buttons while collapsed

The badge should communicate the number of available variants clearly, for example:

- `2 variants`
- `3 variants`

During search, if only some variants inside a multi-variant theme match, the badge should show the number of matching variants instead of the full total.

#### Expanded card

When a user clicks a theme card, that card expands vertically and becomes the active selection surface.

Expanded card layout:

- theme name and selected state styling
- selected variant label as a subtitle under the theme name, left-aligned
- the same swatch row from the collapsed state
- one row per variant, using the same light/dark button treatment the UI already has today
- each variant row shows the variant label on the left and light/dark buttons on the right

This keeps the expanded view familiar. The current card interaction model for choosing light or dark can be reused, but it will now exist per variant instead of once per theme.

#### Interaction flow

1. user scans collapsed theme cards
2. hover on a collapsed card previews that theme's `defaultVariant`
3. click on a collapsed card expands it
4. all other cards dim to focus attention on the active card
5. inside the expanded card, the user hovers a variant row to preview that specific variant
6. user clicks light or dark for that variant to apply the selection
7. clicking the expanded card again collapses it and removes dimming
8. clicking another multi-variant card while one is expanded should switch expansion directly to the new card

#### Hover preview behavior

Hover behavior should differ by state:

- collapsed card hover previews the theme's `defaultVariant`
- expanded card hover previews the specific variant row under the pointer
- light/dark button hover inside the expanded card previews that exact `variant + mode` combination

This preserves a simple scan experience in the collapsed grid while allowing more precise preview once the user has focused on a single theme.

On mobile, hover behavior becomes tap behavior:

- tapping a multi-variant collapsed card expands it
- tapping a variant row mode button applies that exact `variant + mode` selection and updates the preview
- tapping a single-variant theme's light or dark button applies it directly

#### Focus and dimming behavior

Only one card should be expanded at a time.

When a card is expanded:

- all non-active cards should dim
- the active card should remain fully opaque and visually elevated
- category headers can remain visible but should not compete visually with the active card
- clicking the active card again should collapse it and restore the full grid

The dimming should feel like focus guidance, not like a hard modal lock. Users should still be able to change themes by collapsing the current card and selecting another one.

## Picker Interaction Model

The intended interaction is:

1. grid shows one collapsed card per theme family
2. single-variant themes keep the current collapsed light/dark rail and do not show a `1 variant` badge
3. multi-variant themes show swatches plus a variants count badge in the old light/dark rail area
4. hover on a collapsed multi-variant card previews that theme's `defaultVariant`
5. click on a collapsed multi-variant card expands it inline
6. expanding one card dims the rest of the grid
7. expanded card shows one row per variant with light and dark buttons
8. hover inside the expanded card previews the exact variant or mode being hovered
9. clicking a variant mode button applies immediately
10. clicking another multi-variant card switches the expanded state directly

Behavior details:

- Themes with one variant should not show a variants badge and should not require expansion just to access light/dark mode.
- Themes with two or more variants should use the expanded card structure.
- For multi-variant themes, search should match theme names, theme ids, variant labels, variant ids, and category names.
- If a query matches a multi-variant theme through one or more variants, the theme card should remain visible and the badge should show the number of matching variants.
- If a multi-variant theme is expanded during search, it should show only the matching variant rows.
- Variant labels should be display strings like `Meteora` or `Hybrid Theory`, while ids remain stable kebab-case keys.
- The preview pane should remain in place, but it becomes a live feedback panel rather than the primary control surface.
- Only one expanded card should be open at a time.
- The expanded card should reuse the current light/dark button styling and interaction model as much as possible.
- The preview pane should show the theme name as the title and the selected or previewed variant label as a left-aligned subtitle beneath it.
- The global light/dark toggle should act on the currently selected variant only, and it should be disabled when that variant has no light palette.

## File-Level Implementation Plan

### 1. Update domain types

Files:

- `src/types/theme.ts`

Changes:

- add `ThemeVariantDefinition`
- move `ThemeDefinition` to `variants + defaultVariantId`
- add a `ThemeSelection` type if useful

### 2. Update theme loading

Files:

- `src/lib/themes.ts`

Changes:

- parse `defaultVariant`
- parse `variants`
- expose stable variant ids and labels
- update `getDefaultTheme()` to return a theme with one `default` variant

### 3. Update context and persistence

Files:

- `src/context/ThemeContext.tsx`
- `src/hooks/useTheme.ts`
- `src/components/layout/Header.tsx`

Changes:

- store `variantId` in state
- add a combined selection setter for `themeId + variantId + mode`
- resolve active colors from selected variant and mode
- persist variant id to local storage
- expose current variant and available variants through `useTheme()`
- make the global light/dark toggle resolve against the selected variant, not the theme family as a whole

### 4. Update preference storage

Files:

- `convex/preferences.ts`
- `convex/schema.ts`
- `src/components/typing/TypingPractice.tsx`

Changes:

- replace display-name-based theme persistence with id-based persistence
- save and restore `themeId`, `themeVariantId`, and `themeMode`

### 5. Update theme picker UI

Files:

- `src/components/typing/TypingPractice.tsx`

Changes:

- keep the collapsed card light/dark rail for single-variant themes
- replace the collapsed card light/dark rail with a variants count badge aligned to the swatch row for multi-variant themes only
- add single-card inline expansion for the active theme card
- render one variant row per expanded theme card using the current light/dark button treatment
- dim non-active cards while one card is expanded
- add state for the currently expanded theme card
- update preview behavior so collapsed hover uses `defaultVariant`
- update preview behavior so expanded hover uses the specific hovered variant and mode
- update preview state so it can represent a specific `theme + variant + mode`
- update preview header to show theme title plus variant subtitle
- update search so it can match themes, categories, and variants
- when search filters a multi-variant theme, show the matching variant count in the badge and only matching variant rows in the expanded state
- on mobile, use tap interactions in place of hover
- allow clicking a second multi-variant card to switch expansion directly

### 6. Rewrite theme JSON files

Files:

- `public/themes/*.json`

Changes:

- convert all themes to the `variants` structure
- use a single `default` variant for themes without custom variants
- add additional named variants only where needed

### 7. Update theme documentation

Files:

- `docs/THEME-ENGINE.md`

Changes:

- document the new JSON schema
- document how variants resolve into active colors
- document the updated `useTheme()` API

## Preview State Model

The current modal preview tracks `ThemeDefinition` plus an optional preview mode.

That preview state should become variant-aware. A simple shape would be:

```ts
type ThemePreviewSelection = {
  themeId: string;
  variantId: string;
  mode: ThemeMode;
};
```

That allows the preview panel to represent:

- hovered collapsed theme with `defaultVariant`
- expanded theme with focused variant row
- hovered light or dark state for a specific variant
- tapped mobile preview of a specific variant and mode
- currently applied `theme + variant + mode` when there is no active hover preview

## Migration Notes

This project is intentionally planning a breaking schema update for theme JSON.

That means:

- there is no need to preserve runtime support for the old `dark` and `light` root keys
- there is no need to preserve runtime support for legacy persisted theme preference fields like `themeName`
- all theme files can be updated in one coordinated pass
- docs and type definitions should be updated together with the code

Because `public/themes/manifest.json` is auto-generated by `vite-plugin-auto-manifest.ts`, the manifest should continue to update based on filenames only. Variant changes do not require manifest format changes.

## Risks and Tradeoffs

### Theme rewrite scale

There are over a thousand theme files in `public/themes/`, so the schema rewrite needs to be scripted or otherwise automated.

### Preference migration

Persisted theme preferences currently use display-oriented values. Moving to stable ids is the correct long-term direction, and this project will treat that as a breaking change instead of supporting a one-time fallback path.

### UI density

Variants introduce one more axis of choice. If the picker tries to show theme family, variant, and mode all at once in the grid, discoverability will improve but scanability will likely get worse.

This inline-expansion approach reduces that risk by keeping the full grid collapsed by default, but the implementation still needs to avoid excessive layout jump when a card expands.

### Naming consistency

Variant labels need their own display rules. Theme ids already use `THEME_DISPLAY_NAMES`; variants may need a lighter-weight formatting helper or explicit labels in JSON.

## Finalized Interaction Decisions

- Applying a variant should happen immediately when the user clicks or taps a light/dark control.
- Variants should be searchable in the main theme search field.
- Search should match theme names, theme ids, category names, variant labels, and variant ids.
- Multi-variant theme badges should show matching-variant counts during search.
- The current light/dark mode remains a user-facing global concept, but it resolves through the selected variant rather than the theme family as a whole.
- Dimmed multi-variant cards should remain clickable so users can switch expansion directly.
- Single-variant themes should keep their existing collapsed-card light/dark controls and should never show a `1 variant` badge.
- On mobile, tap interactions should replace hover interactions.

## Suggested Implementation Order

1. Finalize the variant JSON schema and naming rules.
2. Update TypeScript types and theme loader logic.
3. Update `ThemeContext` and local storage for `variantId`.
4. Update Convex preferences to store stable theme selection ids.
5. Build the theme picker with the inline expanded-card UI.
6. Validate desktop and mobile behavior.
7. Rewrite all theme JSON files into the new schema.
8. Update `docs/THEME-ENGINE.md` to match the shipped system.

## Proposed Outcome

After this work, the theme system should support:

- one theme family with many named variants
- light and dark palettes inside each variant
- a cleaner, more scalable picker flow
- stable persistence based on ids instead of display names

This keeps the theme engine flexible for artist, album, artwork, era, or mood-based expansions without forcing the picker UI to become a flat wall of theme permutations.
