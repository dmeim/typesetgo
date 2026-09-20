# TypeSetGo charm restoration: plan and implementation record

Status: approved September 20, 2026; implementation and verification recorded below. Research baseline: `ee67fc5` on `main`.

The recommendation is to restore TypeSetGo's distinctive feature styling around the current accessible controls: a miniature homepage theme preview, a real Olympic podium, colorful collectible achievements, and more expressive result history. Shadcn can remain the foundation for controls, dialogs, and keyboard behavior. The feature surfaces need their own visual character.

The research and approved design below describe the original findings and intended changes. The implementation record at the end distinguishes delivered behavior and measured verification from those proposals.

## Research findings

| Concern | Finding | Confidence |
| --- | --- | --- |
| Slow theme picker | Opening starts a catalog load that waits for all **1,557 theme files**, with six requests in flight at a time, before displaying any catalog results. Earlier code preloaded the catalog on homepage mount. | Source and history verified; loading state observed locally. Production latency has not been measured. |
| Missing miniature website | The full miniature homepage was explicitly replaced with a title and sample typing text in `b6b043e`. | Source/history and current browser verified. |
| Justify does not fill rows | The setting reaches the container. The renderer inserts a hard `<br>` after the configured word limit; `text-align-last: auto` leaves these forced-break lines start-aligned. | Reproduced and measured in the isolated practice fixture. |
| Missing podium | `d9afbbc` removed rank-specific heights and second–first–third placement. Current cards are equal-height, in rank order, and become a vertical list in narrower period panels. | Source/history, screenshots, and current fixture verified. |
| Flat achievements | `d9afbbc` removed most tier-colored surfaces, borders, pills, and medallions. Tier identity now largely survives as a small dot. | Source/history and current fixture verified. |
| Flat profile results | `5678bdf` simplified history chips, validity treatment, accuracy emphasis, and detail metrics. | Source/history and current fixture verified. |

The largest visual changes predate the recent `814d706` shadcn-control migration. The earlier [profile cleanup record](profiles.md) explicitly describes a matte direction and removal of glow and hover scaling. The current request changes that visual direction while preserving the cleanup's functional improvements.

### Historical references to adapt

These are design references, not commits to revert or cherry-pick wholesale.

| Reference | Useful evidence | Problems to avoid restoring |
| --- | --- | --- |
| `6c0eacb`, `TypingPractice.tsx:3185–3337`; also `b6b043e^`, `PracticeThemePicker.tsx:177–330` | Miniature header, trophy/avatar, mode controls, duration/difficulty, typing colors/caret, variant label, palette legend. | Absolute-positioned preview, manual overlay behavior, raw SVG icons, fragile color concatenation. |
| `bff1337` and `b6b043e` | Bounded theme loading followed by open-time loading explains the new first-open bottleneck. | Reinstating unbounded eager fetching would merely move the cost back to homepage startup. |
| `d9afbbc^`, `Leaderboard.tsx:220–226` | Bottom-aligned second/first/third podium at **180/210/160px**. Original route dates to `4b4f75e`. | Fixed-width cards, username shrinking down to 7px, hidden compact-screen periods, slow row reveals. |
| `d9afbbc^`, active achievement components | Earned tier surfaces, stronger borders, tier pills, collector feature card, larger detail medallion. | Whole-card opacity, grayscale locked cards, inaccessible bespoke modal handling. |
| `5678bdf^`, `UserStats.tsx` | Colorful mode chips, status icons, emphasized accuracy, stronger detail hierarchy. | Fixed history columns, non-button interactions, missing measurements shown as zero, weak owner gating. |
| `acde302` | Brief profile entrances and podium ceremony demonstrate the earlier motion direction. | Half-second content delays, height animation that moves layout, delays increasing down long lists. |

Two distinctions matter: the old catalog already contained 1,557 themes, so recent catalog growth does not explain this regression; and the old unearned achievement cards used grayscale. Preserving their tier hue is a new improvement requested here, not an exact recreation of the historical code.

## Design direction

Use a calm, modern page structure with expressive areas for choosing, practicing, and celebrating. Put color into meaningful surfaces—tier medallions, podium steps, mode chips, and result highlights—while keeping names, requirements, and measurements easy to read.

- Keep the current Phosphor icon system; give icons character through size, tier-colored backgrounds, rings, and restrained motion.
- Use small hover lifts and press feedback on interactive cards. Keyboard focus should receive equally clear emphasis; touch should not depend on hover.
- Initial motion tuning: roughly 150–250ms for interaction feedback and 250–400ms for a podium or section entrance. These are proposed values to tune visually, not fixed requirements.
- Keep content available immediately. Animate decoration or bounded groups; do not stagger hundreds of achievements or history rows.
- Honor reduced motion explicitly. Remove spatial movement, scaling, smooth category scrolling, and animated preview carets when requested.
- Keep tier, rank, and earned status readable in text as well as color. Muting an unearned decoration must not reduce the readability of its title or requirement.

The top profile statistic cards and their charts retain their current design. This work does not add achievement rules, ranking rules, profile features, or backend migrations.

## 1. Make theme browsing fast and restore the miniature site

### Evidence

[PracticeThemePicker.tsx](../../src/components/typing/PracticeThemePicker.tsx), lines 74–92, waits for [fetchThemeCatalog](../../src/lib/themes.ts), lines 786–800. That function waits for every palette. The loader's six-request concurrency cap is useful protection, but the UI's all-or-nothing dependency creates the bottleneck.

The catalog contains **4,956 variants and 18,247,282 raw JSON bytes**. An illustrative metadata index serialized during research measured approximately **690 KB minified / 136 KB gzip**. This is a sizing experiment, not a shipped format or measured browser transfer.

### Proposed implementation

1. Generate a separate, compact browsing index containing theme IDs/names/categories, default variant, searchable variant labels/IDs, mode availability, and swatches. Keep the small startup manifest separate so ordinary practice startup does not need the browsing index.
2. Render searchable categories/cards as soon as the index arrives. Fetch a validated full palette only for a requested preview or selection, or another interaction that actually needs it. Random selection can choose an index entry and then load that palette.
3. Reuse successful metadata/palette loads on reopening. Optional prefetch on theme-control intent may help, but the primary fix is removing the full-catalog prerequisite.
4. Preserve existing caching, request deduplication, foreground priority, timeouts, validation, and latest-selection guarantees. Preview requests also need stale-response protection and bounded hover intent. A slow palette must not block unrelated browsing; provide a local retry state.
5. Keep previewing independent of applying a theme. Hover/focus must not persist preferences or recolor the application. Show a clearly labeled loading preview rather than mismatching a new title with an old palette.
6. Add a presentation-only `ThemeSitePreview` showing a recognizable miniature current homepage: header/logo/navigation, mode and difficulty controls, typing sample, compact keyboard or footer, and variant name. Give it an aspect ratio instead of stretching two lines of text through the dialog height. Use a side-by-side desktop layout and a compact complete scene above the catalog on narrow screens.
7. Scope preview colors to its own subtree, using the same palette-to-UI color derivation as the app. Miniature controls are decorative, not extra tab stops. Do not mount live Home, auth, router, or typing-session components inside the preview.

Likely files: [manifest generator](../../vite-plugin-auto-manifest.ts), [theme types](../../src/types/theme.ts), [theme loader](../../src/lib/themes.ts), [picker](../../src/components/typing/PracticeThemePicker.tsx), [ThemeCard](../../src/components/typing/ThemeCard.tsx), [VariantDrawer](../../src/components/typing/VariantDrawer.tsx), and a new feature preview component.

Generator details: exclude the generated catalog from theme discovery if it lives under `public/themes`; regenerate metadata on source-file **changes** as well as add/remove. Ignore generated outputs in the watcher to prevent regeneration loops. Never edit generated manifests manually. Preserve `fetchAllThemes()` compatibility for the existing Host caller; changing Host loading is a separate scope.

### Acceptance

- Cold browsing/search no longer requires 1,557 palette requests. Theme/category/variant search works before individual palettes load.
- Opening shows the currently selected preview immediately; reopening reuses completed work.
- A failed palette does not hide the rest of the catalog; rapid hover/focus/selection cannot show or commit stale data.
- The preview depicts the site, including surface and control colors, in light/dark modes and different variants.
- Measure cold first-use, warm reopening, request counts, and transferred bytes using the real catalog. Record the browser/network conditions; set latency budgets from that baseline rather than claiming an unmeasured “instant” guarantee.
- Retain the existing loading/selection unit tests. Extend browser coverage beyond its current three-theme scenario, including index failure, palette failure, search, keyboard preview, and short/narrow dialogs.

## 2. Make Justify work with the word-per-line setting

### Evidence

[TypingPractice.tsx](../../src/components/typing/TypingPractice.tsx), line 1704, correctly sets `textAlign`. [PracticeText.tsx](../../src/components/typing/PracticeText.tsx), line 61, inserts `<br>` after every configured group; the stored layout defaults to seven words.

In the fixture, computed `text-align` was `justify`, computed `text-align-last` was `auto`, and a complete seven-word line stopped approximately 83 CSS pixels short of the right edge. Inter-word spaces stayed uniform rather than expanding. This matches the documented [forced-break behavior of text-align-last](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-align-last).

The pre-cleanup `6c0eacb` source also had forced breaks and the same alignment assignment. The current bug is confirmed, but the evidence does not establish that the recent shadcn change introduced it.

### Proposed implementation

- Define the expected behavior: expand spaces across complete practice rows; keep a short final partial row naturally start-aligned; preserve the selected maximum words per line and natural wrapping on smaller screens.
- Prototype the smallest scoped CSS/markup correction. A suitable approach is logical word groups whose nonterminal/full groups permit last-line justification, while the final partial group keeps normal last-line alignment. Preserve the global word/character indices and actual spaces. Do not apply `text-align-last: justify` indiscriminately to short final content.
- Keep the existing character rendering, correct/incorrect colors, extra-character caret, ghost caret, IME handling, and measured scrolling. Avoid a JavaScript pixel-positioning layout engine.
- `PracticeText` is shared. Keep feeding-tape behavior unchanged, and inspect both solo/Connect `TypingPractice` and the separate `TypingArea` callers. `TypingArea` currently exposes only left/center/right; widening that public setting is not required for this fix.

### Acceptance

Use real browser geometry checks, not only a test that asserts a CSS property. Cover all four alignments, natural wraps and forced breaks, a short last line, a single long word, 1–6rem fonts, extra characters/backspace, IME, ghost caret, and scrolling. Verify changing alignment preserves the prompt, input, and session. Extend existing practice input/presentation/caret coverage; run shared-consumer browser checks if the shared renderer changes.

## 3. Restore the Olympic leaderboard podium

### Proposed presentation

| Visual position | Entrant | Pedestal |
| --- | --- | --- |
| Left | Second | Medium |
| Center | First | Highest |
| Right | Third | Lowest |

Use a common baseline and visibly stepped pedestals. Above each step, show the avatar, full wrapping name, and prominent WPM. Identity content must have room to grow independently of the decorative step height. Keep dates secondary. Use rank numerals plus a Phosphor trophy/medal treatment and restrained rank-colored surfaces.

[Leaderboard.tsx](../../src/pages/Leaderboard.tsx), lines 61–112, currently renders equal cards; a nested `26rem` container breakpoint switches between one and three columns. The outer three-period grid can make each panel narrow again on desktop. Fix the outer layout and the podium together: stack period sections until each has sufficient room for readable three-slot podiums. Determine the breakpoint with the long-name fixture rather than preserving the current `lg` switch automatically.

Keep the 2–1–3 arrangement at compact widths using smaller decoration and wrapping names, without reducing names to tiny type. Use at least the current normal small-text size. For unusually long names, allow more vertical room; do not rely on truncation or hover-only disclosure. Test whether identity blocks obscure the height hierarchy and adjust their shared layout if necessary.

Implementation can remain local to the page or use a small leaderboard-specific component. [Race Podium](../../src/components/race/Podium.tsx) already separates identity from stepped blocks and provides a useful visual pattern. Do not import its race-specific session/finisher contract or redesign races to obtain that appearance.

### Behavior and acceptance

- Keep semantic reading order 1–2–3, placing entries visually with CSS. With one entrant, first remains centered; with two, second remains left. Do not invent placeholder winners.
- Preserve all three period sections, independent loading/empty states, server rank/WPM association, existing query arguments, and the immediate ranks 4–50 table.
- Reserve final geometry before motion. A short podium-only entrance may animate decorative steps/awards; names and scores remain available without a ceremony delay.
- Assert `second.x < first.x < third.x`, shared pedestal baseline, and `first.height > second.height > third.height`. Assert the pedestal geometry separately from variable-height identity content.
- Cover 0/1/2/3/50 entries, equal WPM with distinct server ranks, different name lengths, missing/broken avatars, intermediate desktop widths, and mobile reflow.

An unrelated research finding is that UI date subtitles say ET while backend windows use UTC. Record this separately; this visual change must not silently change ranking windows. Leaderboard records also lack user IDs, so profile-link additions are outside this plan.

## 4. Restore colorful achievements across all three active surfaces

Use one feature-level tier presentation system for **copper, silver, gold, diamond, and emerald**, derived from existing `TIER_COLORS`. Define surface, border, medallion, and readable badge colors for earned/unearned states. Reuse [AchievementIcon](../../src/components/auth/AchievementIcon.tsx) and the existing [color utilities](../../src/lib/colors.ts); raw historical foreground colors are not automatically readable on new tints.

| Surface | Proposed treatment |
| --- | --- |
| [Category overview](../../src/components/auth/AchievementsCategoryGrid.tsx) | A larger icon medallion, shallow tier-tinted surface, visible tier pill, and compact earned/total meter. Give Collection a distinctive summary treatment using its existing data. |
| [Achievement board](../../src/components/auth/AchievementsModal.tsx) | Collectible tiles with tier-colored border/surface, larger artwork, readable title, and compact explicit earned status. Earned tiles have stronger color and a check indicator; unearned tiles retain the same hue with flatter, quieter decoration. |
| [Achievement detail](../../src/components/auth/AchievementDetailModal.tsx) | A larger tier medallion/ring, prominent title and tier pill, lightly tinted requirement panel, and clearly stated earned date or unearned status. Keep the current carousel/navigation controls. |

Unearned tiles remain clickable so children can inspect requirements. Do not gray out the entire card or make it appear disabled. An empty category has no earned tier: use a friendly neutral/category treatment or a clearly labeled actual unearned achievement, not an invented earned rank.

A category completion meter can use current earned/total counts. Exact progress toward an arbitrary next achievement is not available from the earned timestamp map; do not invent a percentage or expand backend scope to support it.

Animate bounded overview areas and only the active detail medallion. The board has **532 achievements in 16 categories**, and detail mounts a category's slides, so avoid continuous glow, per-card entrance delays, or an animation on every mounted slide. Opening an already-earned achievement should not pretend it was newly unlocked.

### Contracts and acceptance

- Preserve native button semantics, tier/status accessible names, category navigation, exact notification target focusing, nested Escape, persistent return focus, and native select arrow behavior.
- Preserve parent-supplied owner-only refresh, pending guards, and visible retryable failures.
- Every tier is visually recognizable in both earned states; titles and requirements remain readable in light, dark, and saturated custom themes.
- Show an earned and unearned example of each tier, a zero-earned category, Collection, a long title, and a notification-linked achievement in the review screenshots.
- Work on the active path: `AchievementsCategoryGrid → AchievementsModal → AchievementDetailModal`. Dormant `AchievementsGrid` and `StatsModal` are not the target.

## 5. Give profile results clearer hierarchy and interaction

Keep the current history structure, sorting, bounded scrolling, and native button rows in [UserStats.tsx](../../src/pages/UserStats.tsx). Restore a readable mode icon/tinted chip, a compact icon-plus-text validity state, stronger WPM/accuracy emphasis, and modest hover/focus/press feedback. Reduce repeated visual noise through hierarchy rather than removing useful metadata.

In [TestDetailDialog](../../src/components/stats/TestDetailDialog.tsx), give WPM and accuracy two prominent metric panels with restrained Phosphor artwork and theme accents. Group correct/incorrect words and missed/extra characters more quietly below; retain semantic definitions and the invalid-result explanation.

Preserve the latest-100 history limit, invalid rows, sort direction, owner-only deletion, confirmation/pending/error flows, and the distinction between “Not recorded” and an actual zero. Top lifetime statistic cards and charts remain unchanged. No new personal-best claim or scoring interpretation is introduced.

Acceptance should demonstrate readable dense history on desktop, stacked readable rows on phones, long labels, valid/invalid entries, absent/zero metrics, working keyboard detail opening/return focus, and owner/visitor/anonymous capabilities.

## Delivery sequence after approval

1. **Capture targeted baselines.** Use the real theme catalog for cold/warm measurement and local profile fixtures for consistent screenshots. Add focused regression assertions for the loading dependency, justified row geometry, and podium geometry.
2. **Correct theme loading and justification.** Keep these as separately reviewable changes with their own behavioral evidence. Theme index schema/generator work precedes picker adaptation.
3. **Restore the miniature site preview.** Build on the corrected palette-loading path; verify preview isolation and rapid browsing.
4. **Restore the podium.** Agree its content sizing through actual responsive renders before finalizing breakpoints and motion.
5. **Restore achievement styling, then result styling.** Establish shared tier treatment first, apply it to overview/board/detail, and then tune result history/detail. Preserve the existing accessible controls throughout.
6. **Review screenshots and interactions together.** Capture the same light/dark/tier states before and after, then run the final implementation checks once the relevant changes settle.

Steps 4 and 5 can be independent implementation scopes. The user's subsequent approval authorizes implementation and local milestone commits. Push and deployment remain pending the user's review and separate authorization.

## Verification plan

Reuse existing coverage rather than replacing it:

- Themes: `foundations-theme-loading`, `foundations-theme-selection`, `practice-presentation`, plus the practice browser theme scenarios. Add real-size metadata coverage and measurable request assertions.
- Practice: `practice-input`, `practice-presentation`, preference tests, and browser caret/layout checks. Exercise Connect/race consumers if shared renderer changes affect them.
- Profiles: `achievements-interactions`, `leaderboard-presentation`, `profile-history`, `profile-presentation`, and the isolated profiles browser suite. Add pure contrast tests only if the new tier derivation helper warrants them.
- Visual matrix: 320/390px phones, 768px tablet, 1024/1280/1440px desktop and either side of chosen breakpoints; short dialogs and 200% equivalent reflow; normal/reduced motion; light/dark and a saturated custom theme. Native toolbar zoom and other browser engines are separate checks if available.
- Implementation gates: `bun run build`, `bun run test:run`, `bun run lint`, and `bun run test:e2e practice profiles`. Add `connect-session`/`race` when shared renderer code changes; follow the [browser guide](../../tests/browser/README.md) for fixture-only targets and any build prerequisites.

Visual acceptance is part of completion: passing DOM assertions alone does not establish that the podium reads as a podium or achievements feel colorful and collectible.

## What this research did and did not verify

Inspected the seven supplied screenshots; current source and reachable Git history; the actual theme JSON inventory; and existing test contracts. Used the Codex browser on the already-running `localhost:3000` app to inspect theme loading and its reduced preview. Used the repository's isolated practice/profile fixtures to reproduce justification and inspect achievements, detail dialogs, results, and the leaderboard with synthetic data. No account refresh, test deletion, or completed ranked practice was performed.

No historical app checkout was run. Historical appearance findings come from source comparisons, not a rendered old build. No production network waterfall or controlled latency benchmark was captured. The proposals and motion values above remain subject to implementation and visual review. Build/unit/E2E suites were inspected but not executed for this documentation-only pass; they are implementation gates, not claimed results.

At the research stage, only this plan was added; application and unrelated working-tree files were left untouched. Implementation followed the user's subsequent approval.

## Implementation record — September 20, 2026

All five approved areas are implemented. The top lifetime statistic cards/charts, backend data, ranking rules and achievement rules remain unchanged.

| Area | Delivered behavior |
| --- | --- |
| Theme browsing | Separate generated metadata index, searchable variant labels, validated retryable cache, full palettes loaded only when needed, bounded hover intent, keyboard previews and local preview retry. Legacy empty-string variant IDs remain supported. The Host caller keeps the full-palette API. |
| Miniature preview | Decorative homepage header, controls, sample typing colors/caret, keyboard and footer. Preview colors are scoped to the scene and do not change saved preferences. Phone/short-window layouts keep browsing usable. |
| Justification | Complete logical word groups justify, final partial content keeps natural spacing, and existing spaces/global indices remain intact. Feeding tape retains its original path. |
| Leaderboard | Center winner, second left, third right; common pedestal baseline with distinct heights. Equal identity space and rank offsets keep the winner's avatar highest even with long names. Missing/broken avatars have an initial fallback. |
| Achievements/results | Shared tier surfaces, badges, medallions and earned/unearned treatments on all active achievement surfaces. Collection summary and category meters use existing counts. History has mode/status treatments and clearer metrics; detail numbers remain whole at 320px, including 300 WPM and 100%. |

Motion is limited to short interaction feedback, the overview group, active achievement artwork and podium decoration. Reduced-motion behavior, nested dialog focus, owner-only actions, retry/pending safeguards, and missing-versus-zero metrics remain intact.

### Theme loading measurement

Recorded by the committed `tests/browser/practice/theme-catalog.mjs` scenario using installed Chrome 152, the local isolated Vite fixture, 1440×1000, reduced motion, no network/CPU throttling, and guarded routing (HTTP cache disabled). These are single-run development observations, not production latency guarantees.

| Observation | Result |
| --- | --- |
| Catalog inventory | 1,557 themes / 4,956 variants |
| First-open ready observation | 180 ms, including the automated action and UI-ready assertion |
| Warm reopen ready observation | 193 ms; no additional theme requests |
| Browsing index | 727,233 body bytes / 727,533 transfer bytes on the uncompressed fixture response |
| Illustrative gzip size | 148,721 bytes; calculated compression size, not measured production transfer |
| Initial browsing palette fanout | None; startup loaded the selected TypeSetGo palette, then browsing requested one index |
| Intent preview | One additional Fire Force palette request; search and subsequent viewport changes made no palette requests |

The generated index is excluded from theme discovery, ignored by Git, and regenerated on source add/change/remove events. Generated outputs are excluded from watcher triggers. The metadata builder is shared with the fixture so browser checks exercise the real catalog shape.

### Verification and review

- `bun run build` passed with fixture environment values. The existing oversized-chunk warning remains; no deployment was performed.
- `bun run test:run` passed: **35 files / 316 tests**. The final compact metric adjustment also passed its 21-test profile-history suite.
- `bun run test:e2e practice` passed, including real-catalog request counts, index/palette retries, preview isolation, 320/390/640-short/768/1024 reflow, caret/ghost geometry, all alignments, a narrow long word, IME drafts/commit, and original ranked-session finalization.
- `bun run test:e2e connect-session race` passed: the real Connect session scenario and all **12 race tests**.
- `bun run test:e2e profiles` passed: **25 check groups**, including 320–1440px layouts, both sides of the period-grid breakpoint, sparse podiums, avatar/identity/step geometry, all five earned/unearned tiers, saturated themes, numeric reflow, notification targeting, nested focus, ownership and failure recovery.
- Visual review covered miniature previews; desktop/mobile podiums with unusually long names; achievement overview, board and detail in light/dark/saturated themes; and history/result layouts. The actual app at `localhost:3000` was also checked in the Codex browser for complete catalog loading and the miniature preview.
- Independent read-only reviews found no remaining justification or theme-loading blockers; identified coverage gaps were added to the browser checks.
- A final keyboard-to-mouse preview regression was reproduced and fixed. Actual pointer movement resumes hover previews while stationary-pointer events caused by keyboard scrolling remain ignored. Both affected theme browser scenarios and all 27 presentation tests passed after this follow-up.
- Full `bun run lint` remains blocked by the pre-existing untracked `worker/index 2.ts` triple-slash-reference error (plus warnings in `worker/worker-configuration.d 2.ts`). Lint passes with only those two unrelated duplicate files excluded. They were not edited or committed.

Browser acceptance suites use isolated data/service fixtures with unexpected external requests blocked. The separate check of the user's running app was read-only; no live test result, achievement refresh or deletion was submitted. Native browser-toolbar zoom, other browser engines and production network latency were not measured. User review remains the gate before any push or deployment.

### Approved review follow-up — result actions and public profile links

The user's subsequent browser review requested two additional changes:

- Practice results now put Save Results alone in the first row, preserving its saving, saved, invalid and retry states. Repeat Test and Next Test appear in that order beneath it. DOM and keyboard order match the visual order; the navigation buttons share a row even at 320px.
- Every podium and table username links to the existing public `/user/:userId` route using the user's Convex document ID. The additive `getLeaderboard` response field is taken from `user._id`, never the username or Clerk ID. Ranking and eligibility are unchanged, and duplicate or renamed usernames retain the correct destination. This explicitly expands the original plan's scope to include profile links.

The backend query change remains local with the frontend change. The deployed Convex query must include `userId` before these links appear against that deployment. Older responses retain readable plain names rather than inventing IDs or generating broken links. No schema migration is needed, and no backend deployment was performed.

Follow-up verification includes a successful fixture-environment build, **36 unit-test files / 320 tests**, and repository lint with the same two unrelated duplicate worker files excluded. The practice `secondary`, `journeys` and `ranked` browser scenarios passed, covering two-row geometry at 320/390/1440px, long retry text at 320px, Save → Repeat → Next keyboard order, and existing test navigation/finalization behavior. Desktop and narrow retry screenshots were visually reviewed.

The full isolated profiles browser suite passed with **26 check groups**, including all 50 profile destinations, keyboard navigation from podium/table names as both signed-out and signed-in visitors, correct profile headings, and withheld owner-only actions. Unit coverage verifies stable destinations after renames, duplicate names with distinct IDs, and compatibility with older responses. Desktop/mobile podium screenshots were visually reviewed after links were added. No live records were changed, and neither local commit was pushed or deployed.
