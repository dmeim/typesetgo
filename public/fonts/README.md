# Local webfonts

TypeSetGo serves its 20 downloadable families from this directory under the application's own `/fonts/` origin. [`src/fonts.css`](../../src/fonts.css), imported by [`src/index.css`](../../src/index.css), is the central face registry. [`src/lib/typing-fonts.ts`](../../src/lib/typing-fonts.ts) remains the canonical 27-choice settings catalog; all keys, labels and fallback stacks are unchanged.

## Inventory and provenance

The 19 Google families are **unmodified WOFF2 responses from Google's official `fonts.gstatic.com` distribution**, retrieved using the same CSS2 request previously in `index.html`. All returned unicode subsets and requested normal weights are retained; no Latin-only resubsetting or font conversion was performed. Identical variable-font URLs shared by several weights are declared once with the corresponding weight range. This preserves the existing outlines and lets the browser interpolate intermediate weights.

OpenDyslexic is copied without modification from the author's [official archived repository](https://github.com/antijingoist/opendyslexic/tree/1824da5c0e41dc3e13ffc7f3a636dcaf695d61b7/compiled), pinned to commit `1824da5c0e41dc3e13ffc7f3a636dcaf695d61b7`. The author's [current project](https://opendyslexic.org/) links to the successor Forgejo repository. Regular uses the upstream 0.990 binary; bold, italic and bold italic use upstream 0.950 binaries. The upstream Bold file's OS/2 weight is 800; CSS maps the author's Bold face to the application's conventional bold request, 700. No font metadata or outlines are changed.

[`catalog.json`](catalog.json) records the original CSS request and user agent, retrieval date, exact versioned source URLs, binary version strings, SHA-256 hashes, byte counts, weight/style descriptors, unicode ranges, and samples from each binary's character map. Metadata was read with FontTools 4.60.2 (`name`, `cmap`, and `fvar` tables) in a temporary tooling environment; it is not a project dependency. PostScript names include named variable instances for browser rendering checks. This file is audit/test data and is not imported or fetched by the application.

| Family / stored key | Binary version | Required weights | Subsets | WOFF2 bytes |
| --- | --- | --- | --- | ---: |
| Atkinson Hyperlegible / `atkinson-hyperlegible` | 1.006 | 400, 700 | latin-ext, latin | 34,140 |
| Fira Code / `fira-code` | 5.002 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, symbols2, latin-ext, latin | 110,120 |
| IBM Plex Mono / `ibm-plex-mono` | 2.3 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 131,404 |
| Inconsolata / `inconsolata` | 3.001 | 400, 500, 600, 700 | vietnamese, latin-ext, latin | 63,208 |
| Inter / `inter` | 4.001 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 218,888 |
| JetBrains Mono / `jetbrains-mono` | 2.211 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin | 66,164 |
| Lato / `lato` | 1.104 | 400, 700 | latin-ext, latin | 34,164 |
| Lexend / `lexend` | 1.007 | 300, 400, 500, 600, 700 | vietnamese, latin-ext, latin | 87,908 |
| Lora / `lora` | 3.008 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, math, symbols, vietnamese, latin-ext, latin | 158,232 |
| Merriweather / `merriweather` | 2.100 | 400, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 268,816 |
| Montserrat / `montserrat` | 9.000 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 159,916 |
| Nunito / `nunito` | 3.602 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 137,344 |
| Open Sans / `open-sans` | 3.003 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, hebrew, math, symbols, vietnamese, latin-ext, latin | 256,060 |
| Playfair Display / `playfair-display` | 1.203 | 400, 500, 600, 700 | cyrillic, vietnamese, latin-ext, latin | 89,640 |
| Poppins / `poppins` | 4.004 | 400, 500, 600, 700 | devanagari, latin-ext, latin | 210,868 |
| Roboto / `roboto` | 3.015 | 400, 500, 700 | cyrillic-ext, cyrillic, greek-ext, greek, math, symbols, vietnamese, latin-ext, latin | 192,232 |
| Roboto Mono / `roboto-mono` | 3.001 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin | 134,420 |
| Source Code Pro / `source-code-pro` | 1.026 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 100,424 |
| Space Mono / `space-mono` | 1.003 | 400, 700 | vietnamese, latin-ext, latin | 46,784 |
| OpenDyslexic / `opendyslexic` | 0.950, 0.990 | 400, 700 (normal + italic) | full | 437,216 |

All Google requests previously specified **normal** style only. That contract remains unchanged; any incidental italic UI text uses the browser's existing synthetic-italic behavior. OpenDyslexic includes real normal and italic faces at 400/700. Family-level coverage differs as before: unsupported characters fall through the existing font stacks. Shipping all upstream subsets does not mean every family covers every writing system.

The seven system choices are Courier New (`courier-new`), Arial (`arial`), Verdana (`verdana`), Trebuchet MS (`trebuchet-ms`), Comic Sans (`comic-sans`), Georgia (`georgia`), and Times New Roman (`times-new-roman`). These and fallback names such as Helvetica, Geneva, Courier and Times remain system fonts. No proprietary system font files are included.

## Redistribution notices

Every included family is distributed under **SIL Open Font License 1.1**. Each family directory contains its own unmodified `OFL.txt`, including the copyright holder and any Reserved Font Names. Those notices are copied into `dist/fonts/` with the binaries and are available at `/fonts/<family-key>/OFL.txt` after deployment. The original notices embedded in the binaries are also retained. Upstream line endings and trailing whitespace are intentionally preserved for hash verification (`.gitattributes` prevents license line-ending conversion); an unfiltered `git diff --check` can flag those original notices.

Google-family license files are pinned to the [Google Fonts repository at `92345ac0`](https://github.com/google/fonts/tree/92345ac0dbb28d27dbd32f3a782e84c55eaac214/ofl); exact per-family license URLs and hashes are in the catalog. OpenDyslexic uses its own pinned upstream OFL notice. OFL permits bundling, embedding and redistribution with software subject to its terms, including retaining notices, keeping the fonts under OFL, and restrictions on selling fonts alone and naming modified fonts. These files are redistributed as supplied, without conversion, subsetting, or renaming their internal family names.

## Loading and size

- 134 WOFF2 files total **2,937,948 bytes (2.80 MiB)** on disk. Google families account for 2,500,732 bytes; the four OpenDyslexic faces account for 437,216 bytes.
- Every face uses `font-display: swap`. There are no font preloads, `local()` font shortcuts, JavaScript catalog fetches, or runtime font-provider requests.
- The browser fetches faces/subsets only when rendered text needs them. The default English/Latin Home fixture loads **one 31,340-byte JetBrains Mono file**, serving its regular through bold weights. A stored non-default selection adds that font's needed subsets. Additional scripts in actual content can request additional subsets.
- Opening the picker renders previews in each family's typeface and can therefore load the catalog's regular Latin faces. The fixture measured **20 files / 724,488 bytes (707.5 KiB), including the UI font**. This is intentional, initiated by opening the picker; unused styles and other subsets remain lazy. Closing the dialog keeps normal browser font caching behavior.
- The central registry contributes 44,509 bytes to the minified CSS, about **4,569 bytes of incremental gzip** measured by removing its face rules from the built stylesheet and comparing gzip sizes. There is no added application JavaScript or runtime package dependency.
- Assets use root-relative `/fonts/` paths with content hashes in their filenames. Vite copies them unchanged to `dist/fonts/`; the existing Worker Static Assets configuration serves them. Nested SPA routes resolve the same root-relative paths. As with the rest of this app, deployment assumes the origin root rather than an arbitrary URL subdirectory.

## Validation and maintenance

Verified on 2026-09-16 with Chrome 152.0.7977.84: build, all 279 unit tests (32 files), lint, and all six isolated browser suites (`practice`, `fonts`, `profiles`, `connect`, `connect-session`, `race`) passed. The font suite verified 20 cold stored selections, 27 picker choices, four width/theme combinations, all 134 WOFF2 files and 370 subset/weight/style combinations. Representative picker and practice screenshots were also visually inspected.

Run from the repository root:

```sh
VITE_CONVEX_URL=https://fixture.invalid VITE_CLERK_PUBLISHABLE_KEY= bun run build
bun run test:run
bun run lint
bun run test:e2e fonts
```

The font suite uses the existing isolated practice/auth/data fixtures and fresh browser contexts, blocking every foreign request and WebSocket (including Google Fonts and CDNFonts). It checks stored selections, the 27-choice picker, OpenDyslexic previews and persistence, default lazy loading, narrow/wide layouts and light/dark themes. It combines nonempty successful `document.fonts.load()` results with Chrome's `CSS.getPlatformFontsForNode` custom-font glyph counts and PostScript identities; a computed `font-family` alone cannot pass.

The production probe serves the real `dist` HTML/CSS/assets through Vite preview at loopback port 4318. It removes bootstrap scripts to avoid contacting live providers and exercises every shipped subset/weight/style using real character-map samples with font synthesis disabled. It also checks HTTP status, WOFF2 content type, byte hashes, license delivery and root-relative paths from a nested route. Full UI behavior is exercised separately by the practice fixture on port 4317. This validates the build's static paths; it does not claim a deployed CDN/Worker smoke test. No live Convex mutations or real authentication are used.

For an update, deliberately choose a pinned official source, retain its matching notices, and update the catalog, content-hashed assets, and central CSS together. Fetch the recorded source URLs to recover these exact files and verify their SHA-256 hashes before use. A new upstream revision may alter metrics, glyph coverage or licensing: inspect those changes rather than silently replacing assets in place. Re-run the font suite and the ordinary build/unit/lint gates. Do not copy system fonts or add runtime provider links.

**Limitations:** CDNFonts returned HTTP 403 during this change, so its inaccessible OpenDyslexic binary could not be compared byte-for-byte or visually against this official release. The intended OpenDyslexic family now renders; it necessarily differs from the fallback previously seen when loading failed. Browser acceptance uses installed Chrome/Chromium and checks representative glyphs from each shipped subset, not every glyph, shaping sequence, browser engine or operating-system fallback.
