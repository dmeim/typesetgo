# Local webfonts

TypeSetGo serves its 65 downloadable families from this directory under the application's own `/fonts/` origin. [`src/fonts.css`](../../src/fonts.css), imported by [`src/index.css`](../../src/index.css), is the central face registry. [`src/lib/typing-fonts.ts`](../../src/lib/typing-fonts.ts) remains the canonical 72-choice settings catalog (65 local families plus 7 system fonts).

## Inventory and provenance

The 64 Google families are **unmodified WOFF2 responses from Google's official `fonts.gstatic.com` distribution**, retrieved using the same CSS2 request previously in `index.html` (the original 19) or a per-family CSS2 request (45 families added on 2026-10-26). All returned unicode subsets and requested normal weights are retained; no Latin-only resubsetting or font conversion was performed. Identical variable-font URLs shared by several weights are declared once with the corresponding weight range. This preserves the existing outlines and lets the browser interpolate intermediate weights.

**2026-10-26 additions.** 45 popular families were added with the same method and user agent: one CSS2 request per family asking for weights 400, 500, 600 and 700. Google now answers with only the faces a family actually has, so single- and two-weight families (for example PT Mono, Comic Neue, Courier Prime) ship exactly those weights; the browser falls back to the nearest face for other requests, as before. The exact requests are listed under `additions` in the catalog. Every addition's `OFL.txt` comes from the same pinned Google Fonts commit. Two candidates were left out to keep the all-OFL, all-notice-checked set: Roboto Slab (Apache-2.0 in the Google Fonts repository) and Reddit Mono (its upstream notice lacks the standard OFL heading the license test requires). The temporary importer re-derived every original asset's samples and PostScript names identically before adding new ones.

OpenDyslexic is copied without modification from the author's [official archived repository](https://github.com/antijingoist/opendyslexic/tree/1824da5c0e41dc3e13ffc7f3a636dcaf695d61b7/compiled), pinned to commit `1824da5c0e41dc3e13ffc7f3a636dcaf695d61b7`. The author's [current project](https://opendyslexic.org/) links to the successor Forgejo repository. Regular uses the upstream 0.990 binary; bold, italic and bold italic use upstream 0.950 binaries. The upstream Bold file's OS/2 weight is 800; CSS maps the author's Bold face to the application's conventional bold request, 700. No font metadata or outlines are changed.

[`catalog.json`](catalog.json) records the original CSS request and user agent, retrieval date, exact versioned source URLs, binary version strings, SHA-256 hashes, byte counts, weight/style descriptors, unicode ranges, and samples from each binary's character map. Metadata was read with FontTools 4.60.2 (`name`, `cmap`, and `fvar` tables) in a temporary tooling environment; it is not a project dependency. PostScript names include named variable instances for browser rendering checks. This file is audit/test data and is not imported or fetched by the application.

| Family / stored key | Binary version | Required weights | Subsets | WOFF2 bytes |
| --- | --- | --- | --- | ---: |
| Andika / `andika` | 6.101 | 400, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 188,308 |
| Anonymous Pro / `anonymous-pro` | 1.003 | 400, 700 | cyrillic, greek, latin-ext, latin | 48,208 |
| Atkinson Hyperlegible / `atkinson-hyperlegible` | 1.006 | 400, 700 | latin-ext, latin | 34,140 |
| Atkinson Hyperlegible Mono / `atkinson-hyperlegible-mono` | 2.001 | 400, 500, 600, 700 | latin-ext, latin | 28,468 |
| Atkinson Hyperlegible Next / `atkinson-hyperlegible-next` | 2.001 | 400, 500, 600, 700 | latin-ext, latin | 53,100 |
| Barlow / `barlow` | 1.408 | 400, 500, 600, 700 | vietnamese, latin-ext, latin | 120,976 |
| Bitter / `bitter` | 3.021 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 122,132 |
| Comic Neue / `comic-neue` | 2.003 | 400, 700 | latin | 26,020 |
| Courier Prime / `courier-prime` | 3.018 | 400, 700 | latin-ext, latin | 37,120 |
| Crimson Pro / `crimson-pro` | 1.003 | 400, 500, 600, 700 | vietnamese, latin-ext, latin | 99,676 |
| DM Mono / `dm-mono` | 1.000 | 400, 500 | latin-ext, latin | 28,812 |
| DM Sans / `dm-sans` | 4.004 | 400, 500, 600, 700 | latin-ext, latin | 55,172 |
| EB Garamond / `eb-garamond` | 1.003 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 260,108 |
| Figtree / `figtree` | 2.002 | 400, 500, 600, 700 | latin-ext, latin | 30,412 |
| Fira Code / `fira-code` | 5.002 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, symbols2, latin-ext, latin | 110,120 |
| Fira Mono / `fira-mono` | 3.206 | 400, 500, 700 | cyrillic-ext, cyrillic, greek-ext, greek, symbols2, latin-ext, latin | 143,412 |
| Fira Sans / `fira-sans` | 4.203 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 355,848 |
| Fredoka / `fredoka` | 2.001 | 400, 500, 600, 700 | hebrew, latin-ext, latin | 43,044 |
| Geist / `geist` | 1.800 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 75,948 |
| Geist Mono / `geist-mono` | 1.701 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, symbols2, vietnamese, latin-ext, latin | 70,516 |
| IBM Plex Mono / `ibm-plex-mono` | 2.3 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 131,404 |
| IBM Plex Sans / `ibm-plex-sans` | 3.201 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin | 319,348 |
| Inconsolata / `inconsolata` | 3.001 | 400, 500, 600, 700 | vietnamese, latin-ext, latin | 63,208 |
| Inter / `inter` | 4.001 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 218,888 |
| JetBrains Mono / `jetbrains-mono` | 2.211 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin | 66,164 |
| Karla / `karla` | 2.004 | 400, 500, 600, 700 | latin-ext, latin | 36,172 |
| Lato / `lato` | 1.104 | 400, 700 | latin-ext, latin | 34,164 |
| Lexend / `lexend` | 1.007 | 300, 400, 500, 600, 700 | vietnamese, latin-ext, latin | 87,908 |
| Libre Baskerville / `libre-baskerville` | 2.005 | 400, 500, 600, 700 | latin-ext, latin | 69,312 |
| Literata / `literata` | 3.103 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 132,988 |
| Lora / `lora` | 3.008 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, math, symbols, vietnamese, latin-ext, latin | 158,232 |
| Manrope / `manrope` | 4.504 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin | 74,804 |
| Martian Mono / `martian-mono` | 1.000 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, latin-ext, latin | 53,144 |
| Merriweather / `merriweather` | 2.100 | 400, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 268,816 |
| Montserrat / `montserrat` | 9.000 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 159,916 |
| Mulish / `mulish` | 3.603 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 103,740 |
| Noto Sans / `noto-sans` | 2.015 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, devanagari, greek-ext, greek, vietnamese, latin-ext, latin | 441,084 |
| Noto Sans Mono / `noto-sans-mono` | 2.014 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 316,148 |
| Noto Serif / `noto-serif` | 2.015 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, math, vietnamese, latin-ext, latin | 454,052 |
| Nunito / `nunito` | 3.602 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 137,344 |
| Nunito Sans / `nunito-sans` | 3.101 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 107,284 |
| Open Sans / `open-sans` | 3.003 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, hebrew, math, symbols, vietnamese, latin-ext, latin | 256,060 |
| Outfit / `outfit` | 1.100 | 400, 500, 600, 700 | latin-ext, latin | 46,988 |
| Overpass Mono / `overpass-mono` | 4.000 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 84,860 |
| PT Mono / `pt-mono` | 1.001W OFL | 400 | cyrillic-ext, cyrillic, latin-ext, latin | 29,912 |
| PT Sans / `pt-sans` | 2.003W OFL | 400, 700 | cyrillic-ext, cyrillic, latin-ext, latin | 70,040 |
| PT Serif / `pt-serif` | 1.000W OFL | 400, 700 | cyrillic-ext, cyrillic, latin-ext, latin | 85,884 |
| Playfair Display / `playfair-display` | 1.203 | 400, 500, 600, 700 | cyrillic, vietnamese, latin-ext, latin | 89,640 |
| Playpen Sans / `playpen-sans` | 2.000 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, math, vietnamese, latin-ext, latin | 1,153,576 |
| Plus Jakarta Sans / `plus-jakarta-sans` | 2.071 | 400, 500, 600, 700 | cyrillic-ext, vietnamese, latin-ext, latin | 58,968 |
| Poppins / `poppins` | 4.004 | 400, 500, 600, 700 | devanagari, latin-ext, latin | 210,868 |
| Quicksand / `quicksand` | 3.006 | 400, 500, 600, 700 | vietnamese, latin-ext, latin | 63,716 |
| Raleway / `raleway` | 4.026 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, vietnamese, latin-ext, latin | 122,252 |
| Readex Pro / `readex-pro` | 1.205 | 400, 500, 600, 700 | arabic, vietnamese, latin-ext, latin | 93,152 |
| Red Hat Mono / `red-hat-mono` | 1.030 | 400, 500, 600, 700 | latin-ext, latin | 34,128 |
| Roboto / `roboto` | 3.015 | 400, 500, 700 | cyrillic-ext, cyrillic, greek-ext, greek, math, symbols, vietnamese, latin-ext, latin | 192,232 |
| Roboto Mono / `roboto-mono` | 3.001 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin | 134,420 |
| Rubik / `rubik` | 2.300 | 400, 500, 600, 700 | arabic, cyrillic-ext, cyrillic, hebrew, latin-ext, latin | 123,840 |
| Source Code Pro / `source-code-pro` | 1.026 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 100,424 |
| Source Sans 3 / `source-sans-3` | 3.052 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin | 152,488 |
| Source Serif 4 / `source-serif-4` | 4.004 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin | 181,220 |
| Space Mono / `space-mono` | 1.003 | 400, 700 | vietnamese, latin-ext, latin | 46,784 |
| Victor Mono / `victor-mono` | 1.561 | 400, 500, 600, 700 | cyrillic-ext, cyrillic, greek, vietnamese, latin-ext, latin | 67,060 |
| Work Sans / `work-sans` | 2.012 | 400, 500, 600, 700 | vietnamese, latin-ext, latin | 98,076 |
| OpenDyslexic / `opendyslexic` | 0.950, 0.990 | 400, 700 (normal + italic) | full | 437,216 |

All Google requests previously specified **normal** style only. That contract remains unchanged; any incidental italic UI text uses the browser's existing synthetic-italic behavior. OpenDyslexic includes real normal and italic faces at 400/700. Family-level coverage differs as before: unsupported characters fall through the existing font stacks. Shipping all upstream subsets does not mean every family covers every writing system.

The seven system choices are Courier New (`courier-new`), Arial (`arial`), Verdana (`verdana`), Trebuchet MS (`trebuchet-ms`), Comic Sans (`comic-sans`), Georgia (`georgia`), and Times New Roman (`times-new-roman`). These and fallback names such as Helvetica, Geneva, Courier and Times remain system fonts. No proprietary system font files are included.

## Redistribution notices

Every included family is distributed under **SIL Open Font License 1.1**. Each family directory contains its own unmodified `OFL.txt`, including the copyright holder and any Reserved Font Names. Those notices are copied into `dist/fonts/` with the binaries and are available at `/fonts/<family-key>/OFL.txt` after deployment. The original notices embedded in the binaries are also retained. Upstream line endings and trailing whitespace are intentionally preserved for hash verification (`.gitattributes` prevents license line-ending conversion); an unfiltered `git diff --check` can flag those original notices.

Google-family license files are pinned to the [Google Fonts repository at `92345ac0`](https://github.com/google/fonts/tree/92345ac0dbb28d27dbd32f3a782e84c55eaac214/ofl); exact per-family license URLs and hashes are in the catalog. OpenDyslexic uses its own pinned upstream OFL notice. OFL permits bundling, embedding and redistribution with software subject to its terms, including retaining notices, keeping the fonts under OFL, and restrictions on selling fonts alone and naming modified fonts. These files are redistributed as supplied, without conversion, subsetting, or renaming their internal family names.

## Loading and size

- 400 WOFF2 files total **9,299,464 bytes (8.87 MiB)** on disk. Google families account for 8,862,248 bytes; the four OpenDyslexic faces account for 437,216 bytes. Playpen Sans is the largest family (1.15 MB across seven subsets, about 197 KB for Latin).
- Every face uses `font-display: swap`. There are no font preloads, `local()` font shortcuts, JavaScript catalog fetches, or runtime font-provider requests.
- The browser fetches faces/subsets only when rendered text needs them. The default English/Latin Home fixture loads **one 31,340-byte JetBrains Mono file**, serving its regular through bold weights. A stored non-default selection adds that font's needed subsets. Additional scripts in actual content can request additional subsets.
- Opening the picker renders previews in each family's typeface and can therefore load the catalog's regular Latin faces. The fixture measured **65 files / 2,103,256 bytes (2.01 MiB), including the UI font** (it was 20 files / 724,488 bytes before the 2026-10-26 additions). This is intentional, initiated by opening the picker; unused styles and other subsets remain lazy. Closing the dialog keeps normal browser font caching behavior.
- The central registry's 400 face rules contribute 123,511 bytes to the minified CSS, about **9,701 bytes of incremental gzip** measured by removing its face rules from the built stylesheet and comparing gzip sizes. There is no added application JavaScript or runtime package dependency.
- Assets use root-relative `/fonts/` paths with content hashes in their filenames. Vite copies them unchanged to `dist/fonts/`; the existing Worker Static Assets configuration serves them. Nested SPA routes resolve the same root-relative paths. As with the rest of this app, deployment assumes the origin root rather than an arbitrary URL subdirectory.

## Validation and maintenance

Verified on 2026-09-16 with Chrome 152.0.7977.84: build, all 279 unit tests (32 files), lint, and all six isolated browser suites (`practice`, `fonts`, `profiles`, `connect`, `connect-session`, `race`) passed. The font suite verified 20 cold stored selections, 27 picker choices, four width/theme combinations, all 134 WOFF2 files and 370 subset/weight/style combinations. Representative picker and practice screenshots were also visually inspected.

Re-verified on 2026-10-26 after adding 45 families: build, 523 unit tests, lint, and the `fonts` suite passed. It covered 65 cold stored selections, the 72-choice picker, all 400 WOFF2 files, and 1,107 subset/weight/style combinations.

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
