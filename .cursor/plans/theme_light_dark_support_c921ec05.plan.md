---
name: Theme Light/Dark Support
overview: Consolidate paired light/dark themes into unified themes with both variants, and update the theme selector modal UI to include light/dark mode toggle buttons on each theme card.
todos:
  - id: merge-themes
    content: Create script to merge github, solarized, and vim theme pairs into unified themes with both light and dark variants
    status: completed
  - id: update-display-names
    content: Update THEME_DISPLAY_NAMES in src/lib/themes.ts to remove 'Dark'/'Light' suffixes for merged themes
    status: completed
  - id: update-card-ui
    content: Modify theme card in TypingPractice.tsx to add 90/10 split with light/dark mode buttons
    status: completed
  - id: preview-mode
    content: Update preview state and rendering to support light/dark mode preview on hover
    status: completed
  - id: disabled-state
    content: Implement grayed-out styling for unavailable mode buttons
    status: completed
isProject: false
---

# Theme Light/Dark Mode Support

## Summary

This plan covers two main changes:

1. **Theme consolidation**: Merge paired light/dark themes (e.g., `github-dark` + `github-light` → `github`) and add light mode variants to remaining themes
2. **UI enhancement**: Add light/dark mode toggle buttons to each theme card in the theme selector modal

---

## Part 1: Theme Consolidation

### Themes to Merge

Three theme pairs should be merged into unified themes:


| Current Files                                  | Merged File      | Dark Source    | Light Source    |
| ---------------------------------------------- | ---------------- | -------------- | --------------- |
| `github-dark.json` + `github-light.json`       | `github.json`    | github-dark    | github-light    |
| `solarized-dark.json` + `solarized-light.json` | `solarized.json` | solarized-dark | solarized-light |
| `vim-dark.json` + `vim-light.json`             | `vim.json`       | vim-dark       | vim-light       |


### Themes NOT to Merge (standalone themes, not variants)

These themes contain "dark" or "light" in their names but are standalone themes:

- `dark-mode.json` - Generic utility theme
- `one-dark.json` - Atom's One Dark theme
- `dark-academia.json` - Aesthetic style
- `dark-souls.json` - Game theme
- `light-academia.json` - Aesthetic style
- `blue-light-filter.json`, `moonlight.json`, `twilight.json`, etc.

### Migration Script

Create a script at `[scripts/consolidate-themes.ts](scripts/consolidate-themes.ts)`:

```typescript
// Script will:
// 1. Read paired theme files
// 2. Create merged theme with dark.colors from *-dark and light.colors from *-light
// 3. Delete old paired files
// 4. Update manifest
```

### Display Name Updates

Update `[src/lib/themes.ts](src/lib/themes.ts)` - remove "Dark" and "Light" suffixes from merged themes:

```typescript
const THEME_DISPLAY_NAMES: Record<string, string> = {
  // Remove these entries:
  // "github-dark": "GitHub Dark",
  // "github-light": "GitHub Light",
  
  // Add:
  "github": "GitHub",
  "solarized": "Solarized", 
  "vim": "Vim",
  // ...
};
```

---

## Part 2: Theme Selector Modal UI

### Current Card Structure

```
+---------------------------+
| [o][o][o]                 |  <- Color dots
| Theme Name                |  <- Name
+---------------------------+
```

### New Card Structure

```
+------------------------+-----+
| [o][o][o]              | [sun]|  <- Light mode button (top 50%)
| Theme Name             |-----|
|                        |[moon]|  <- Dark mode button (bottom 50%)
+------------------------+-----+
   ~90% width            ~10%
```

### Implementation in `[src/components/typing/TypingPractice.tsx](src/components/typing/TypingPractice.tsx)`

**Changes to theme card (lines 2624-2646 and 2702-2724):**

1. Wrap current button content in a flex container with 90/10 split
2. Add new right column with vertically split light/dark buttons
3. Implement hover preview for mode buttons
4. Gray out buttons when mode unavailable (`theme.light === null` or `theme.dark === null`)

```tsx
<button className="flex rounded-lg border transition overflow-hidden ...">
  {/* Left column - existing content (90%) */}
  <div className="flex-[9] p-2">
    <div className="flex items-center gap-1.5 mb-2">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeData.dark.typing.cursor }} />
      {/* ... other dots */}
    </div>
    <div className="text-xs truncate">{themeData.name}</div>
  </div>
  
  {/* Right column - mode toggles (10%) */}
  <div className="flex-1 flex flex-col border-l border-gray-600">
    {/* Light mode button */}
    <button
      onClick={(e) => { e.stopPropagation(); handleThemeSelect(themeData.name, 'light'); }}
      onMouseEnter={() => setPreviewTheme({ ...themeData, previewMode: 'light' })}
      onMouseLeave={() => setPreviewTheme(null)}
      disabled={!themeData.light}
      className={`flex-1 flex items-center justify-center ${!themeData.light ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}`}
    >
      <Sun className="w-3 h-3" />
    </button>
    
    {/* Dark mode button */}
    <button
      onClick={(e) => { e.stopPropagation(); handleThemeSelect(themeData.name, 'dark'); }}
      onMouseEnter={() => setPreviewTheme({ ...themeData, previewMode: 'dark' })}
      onMouseLeave={() => setPreviewTheme(null)}
      className="flex-1 flex items-center justify-center hover:bg-white/10"
    >
      <Moon className="w-3 h-3" />
    </button>
  </div>
</button>
```

### Preview Mode Handling

Update `previewTheme` state to include optional `previewMode`:

```typescript
const [previewTheme, setPreviewTheme] = useState<(ThemeDefinition & { previewMode?: ThemeMode }) | null>(null);
```

Update preview panel to use `previewMode` when rendering colors:

```typescript
const previewColors = previewTheme
  ? (previewTheme.previewMode === 'light' && previewTheme.light ? previewTheme.light : previewTheme.dark)
  : theme.dark;
```

### Height Adjustment

Increase card height slightly with `min-h-[60px]` or `py-2.5` instead of `p-2`.

---

## Files to Modify

1. **Scripts** (new):
  - `[scripts/consolidate-themes.ts](scripts/consolidate-themes.ts)` - Theme merging script
2. **Theme Files**:
  - Delete: `github-dark.json`, `github-light.json`, `solarized-dark.json`, `solarized-light.json`, `vim-dark.json`, `vim-light.json`
  - Create: `github.json`, `solarized.json`, `vim.json`
3. **Source Files**:
  - `[src/lib/themes.ts](src/lib/themes.ts)` - Update display name overrides
  - `[src/components/typing/TypingPractice.tsx](src/components/typing/TypingPractice.tsx)` - Update theme card UI

---

## Open Questions

Before proceeding, I need clarification on one aspect:

**Light mode generation for remaining 430+ themes**: For themes that don't have a light variant (i.e., all themes except the 3 pairs being merged), should I:

- (A) Leave `light: null` for now and only implement the UI (themes without light mode will have grayed-out sun button)
- (B) Generate complementary light mode colors programmatically for all themes
- (C) Manually create light mode variants for a subset of popular themes

Option A is the fastest and allows incremental light mode additions. Options B/C are more comprehensive but significantly more work.