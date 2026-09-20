# Profiles UI cleanup

## September 20 charm restoration

The approved [charm restoration plan](charm-restoration-plan.md) changes the earlier matte-only visual direction documented below while preserving its data, ownership, focus and dialog contracts.

- Leaderboard winners occupy second–first–third visual columns with fixed stepped pedestals and full wrapping names. Semantic order remains first–second–third; empty slots never invent winners. Period panels stack until the 90rem viewport breakpoint leaves room for three readable podiums.
- Active achievement overview, board and detail share tier-derived surfaces, medallions and badges. Unearned achievements retain their tier hue with quieter decoration and readable text. Empty categories do not invent an earned tier. The Collection summary and earned/total meters use existing data.
- History rows use mode icons/chips, explicit validity, emphasized WPM/accuracy and modest interaction feedback. Detail metrics are prominent; absent measurements remain “Not recorded.” Lifetime cards/charts, query semantics and achievement rules remain unchanged.
- Motion is bounded to overview/active artwork and short interaction feedback; reduced motion disables spatial animation. There is no delayed reveal of long lists.
- `profiles/podium.mjs` and `profiles/charm.mjs` extend the existing local fixture checks with stepped geometry, sparse winners, all five earned/unearned tiers, saturated themes and result reflow. `scenario=podium&podiumCount=0|1|2|3|50`, `scenario=charm`, and `palette=synthwave` select the new fixture cases. Final validation is recorded in the restoration plan.

## Scope and isolation

Manager: `codex/ui-profiles` at `/Users/dimitri/Code/typesetgo-worktrees/profiles`, created from `main` containing audit commit `6c0eacb`. The user checkout remains on `main`; its unrelated untracked files are untouched.

| Worker | Branch | Worktree | Ownership |
| --- | --- | --- | --- |
| Profile/history | `codex/ui-profiles-history` | `/Users/dimitri/Code/typesetgo-worktrees/profiles-history` | `UserStats.tsx`, `components/stats/*`, profile helpers/tests |
| Leaderboard/achievements | `codex/ui-profiles-leaderboards` | `/Users/dimitri/Code/typesetgo-worktrees/profiles-leaderboards` | `Leaderboard.tsx`, active `components/auth/*` except `UserButton.tsx`, scoped tests |

Both implementation workers are configured as GPT-6 Astra with XHigh reasoning. No service-tier override, user-facing task creation, reset credits, push, deployment, database writes, or main integration are part of this lane.

## Established evidence

- `getUserStatsByUserId` returns at most 100 recent results, including invalid results; its cached aggregate covers lifetime valid results. It estimates characters as words × 5. A larger-history fixture uses 350 lifetime tests and 100 recent results with the lifetime best outside that sample.
- Missing optional historical metrics are rendered with zero fallbacks in the original detail dialog. The fixture distinguishes absent values from recorded zero.
- `AchievementsCategoryGrid` originally calls the signed-in viewer's mutation while displaying the visited profile's achievements. Ownership must be supplied by the profile page.
- Baseline browser check at 320 CSS pixels reproduces hidden Today/Week leaderboard sections and profile horizontal overflow (document width 334px). Source confirms fixed history columns, absolutely centered profile identity, 7px long-name podium text, non-button chart/history targets, and index-dependent list entrance delays.
- Reachability inspection finds the active profile uses `AchievementsCategoryGrid`, `AchievementsModal`, `AchievementDetailModal`, and `UserStatsChartModal`. Legacy `StatsModal`, `AchievementsGrid`, and `StreakCard` have no active route callers; their UI cleanup is deferred. The integration coordinator later assigned a minimal memo-dependency lint correction in `StatsModal`, without enabling it.

## Contracts and integration order

- Foundations owns semantic colors, shared Dialog behavior, safe auth capability, and animated-counter implementation. This lane consumes existing Dialog exports and the additive `useAppAuth` contract; no shared replacements are introduced.
- `AchievementsCategoryGrid` keeps `earnedAchievements` and adds optional `isLoading?: boolean` and `onRefresh?: () => Promise<unknown>`. The parent supplies refresh only for a verified owner. The child owns pending/error presentation and has no account identity or mutation ownership.
- `AchievementsModal` adds optional `onCloseAutoFocus?: (event: Event) => void`. A caller that opens the board from a disappearing menu/popover item must restore a persistent control. Foundations explicitly delegated the single NotificationCenter caller update to this lane; `c94498c` must follow the modal implementation and callback contract (`d9afbbc`, `0442965`).
- Integrate the actual foundations code commits before profiles for semantic UI colors and `@/components/layout/useAppAuth`; foundations commit `7c27785` documents contracts only. The manager branch includes the dependencies below. If integrating into an already updated Foundations branch, cherry-pick only the profiles commits to avoid duplicate prerequisite commits.
- No backend/schema/query changes are required. `UserStatsChartModal` preserves its existing props and adds an optional `onCloseAutoFocus` callback.

## Baseline and fixture setup

- Baseline `bun run build`: passed; existing large-bundle warning.
- Baseline `bun run lint`: blocked before analysis by the existing TypeScript 7 / typescript-eslint startup incompatibility. This is not a passing lint check.
- Local preview fixtures under `tests/browser/profiles/` replace Convex and auth imports, disable environment loading, and use synthetic owner/visitor/anonymous, 350-lifetime/100-recent, missing/zero metrics, long-name, loading, empty, and failed-action cases. No live backend is used.
- Preview: `node tests/browser/profiles/server.mjs --serve`; open its printed `/user/profile-owner` or `/leaderboard` URL. Query parameters: `scenario=owner|visitor|anonymous|loading|empty|missing|error|achievements-loading` and `theme=light|dark`.

## Implemented audit items

| Audit section title | Change and evidence |
| --- | --- |
| Leaderboard time ranges disappear on smaller screens | All three named sections stack on compact screens; independent loading/empty states. Browser verifies all ranges at 320px. |
| Leaderboard names shrink to unreadable sizes | Readable wrapping names, adaptive podium cards and native table; no name-length font sizing. |
| Large result lists reveal themselves too slowly | Leaderboard rows and podiums render immediately, without count-dependent entrances. Race lists remain multiplayer ownership. |
| Profile headers overlap on narrow screens | Header is normal flex flow with wrapping identity and separate compact navigation. |
| Profile history has no compact layout | Native button rows contain associated date/type/WPM/accuracy labels; history has one bounded vertical scroll area. |
| Profile stat cards and history rows are not keyboard-operable | Native buttons open details/charts; sort toggles expose pressed state; chart values have a native disclosure/table. |
| Achievement refresh acts on the wrong profile | Parent verifies viewer's queried Convex user ID matches the route, then supplies the guarded callback. Visitors, anonymous users and unresolved owners receive no action. |
| Charts imply more history than they contain | Separate lifetime labels and recent-sample title/count/date bounds; highest/lowest are explicitly sample extrema; invalid tests are excluded. |
| Missing historical metrics are shown as real zeros | Four optional detail metrics preserve `undefined` as “Not recorded,” while actual zero remains zero. |
| Achievement cards compress essential text on phones | Container-aware one/two/three-column layout, wrapping category labels, readable progress and tier text. |
| Dialog behavior is implemented repeatedly and inconsistently | Active chart/detail/delete/achievement board/carousel use shared Dialog; nested Escape, focus trap/restoration, pending-delete guards and inline retry feedback. |
| Elevation and glow treatments conflict with the matte direction | Active surfaces consume semantic matte colors/borders, removing glow, heavy shadow and hover scaling. |
| Reduced-motion preferences are ignored | Immediate static profile/list content and Recharts points; achievement navigation jumps under reduced motion and category scrolling is instant. Shared overlay policy stays Foundations-owned. |

No addressed audit finding proved incorrect. The audit's dormant-code warning was confirmed and respected. The estimated-character aggregate was additionally identified and labeled, without changing backend queries or schema.

## Commit record

| Manager commit | Origin | Purpose |
| --- | --- | --- |
| `838f25a` | Foundations `95332d8` | Shared primitive prerequisite |
| `2540a20` | Foundations `989e241` | Safe auth API prerequisite |
| `4c4ab34` | Foundations `596e846` | Semantic role API prerequisite |
| `9701ca9` | Foundations `2fbac30` | Runtime theme/CSS/provider prerequisite |
| `b1f4501` | Foundations `16d3843` | Production auth wiring, shell/route recovery and motion |
| `3c6e004` | Foundations `7194b49` | Foreground theme queue prioritization |
| `d1fb225` | Foundations `902fe4d` | Contrast-safe button hover |
| `103f562` | Foundations `8244849` | Stable nested overlay Escape/focus ownership |
| `f96c711` | Foundations `d8a019b` | Preserve submenu and IME composition Escape behavior |
| `6437d88` | Manager | Isolated browser fixtures and lane evidence |
| `d9afbbc` | Worker `029722f` | Leaderboard and active achievements |
| `5678bdf` | Worker `fe28b31` | Profile history, details and chart semantics |
| `0442965` | Manager | Optional persistent dialog return-focus contract and regression |
| `c94498c` | Manager, precisely delegated by Foundations | NotificationCenter caller uses surviving trigger |
| `80db112` | Manager | Semantic chart labels with readable minimum sizing |
| `821aaa5` | Manager | Unwrapped compact carousel count and balanced navigation labels |

## Final validation and review

- **Build passed:** `bun run build`, including TypeScript and production bundle, rerun after the integration lint followup. With the integrated Foundations lazy routes, the entry is 449.66 kB (136.23 kB gzip), UserStats is a separate 407.14 kB chunk, and the baseline oversized-entry warning is absent. This is build evidence, not a measured loading-performance claim.
- **Full unit suite passed:** `bun run test:run`, **138 tests across 16 files**, after the integration lint followup. This includes 28 scoped profiles/leaderboard/achievement regressions and the integrated Foundations tests. The two directly affected test files also passed separately (23 tests).
- **Browser passed:** `node tests/browser/profiles/check.mjs`, Chrome 152.0.7977.84, 13 check groups. All requests were restricted to the local fixture origin; no unexpected external requests or page errors occurred.
- **Layout/visual matrix:** 320×740 light/reduced motion; 390×844 dark/normal motion; 768×900 light/reduced; 1440×1000 dark/normal; and 640×450 CSS viewport equivalent to 200% zoom on 1280×900. No page horizontal overflow, all compact leaderboard ranges present, bounded dialogs, and readable long names. The zoom check verifies reflow dimensions, not browser-chrome zoom controls. Screenshots of light/dark profile, leaderboard, chart, achievement board and nested detail were visually inspected.
- **Behavior matrix:** keyboard chart cards, sample-high/low toggles, 99-valid-test data disclosure, lifetime best outside the latest-100 sample, absent legacy metrics, nested delete confirmation focus/rapid Escape, owner/visitor/anonymous capabilities, failed refresh/delete recovery, loading/empty/missing profiles, independently loading achievements, nested achievement focus trap/restoration, real carousel one-step arrows/direct choice with reduced motion, and real notification→achievement→Escape→persistent-trigger restoration.
- **Review cleared:** read-only GPT-6 Astra XHigh reviewer examined the integrated profiles diff and followups. Its single P2 finding (disappearing notification opener) was resolved by `0442965` + `c94498c`, with component regression and real-caller browser evidence. Final review found no profiles-owned blockers.
- **Additional integration defect reproduced and resolved:** importing the shared animation runtime exposed a rapid keyboard Enter→Enter→Escape sequence that dismissed both nested test dialogs. The manager reproduced it without backend access and sent decisive Radix passive-layer registration evidence to Foundations. Shared commit `8244849` (`103f562` here) fixes ownership centrally; the original immediate reproduction now passes without test delays or screen-specific guards.
- **Lane lint passed with integration's repaired toolchain:** the four files assigned in the integration lint followup have zero errors or warnings using the coordinator's supported ESLint configuration. The unchanged local `bun run lint` configuration previously failed before source analysis with `typescript-eslint does not support TS 7.0`; repository-wide tooling and lint verification remain coordinator-owned. This lane does not claim a full-repository lint pass.
- `git diff --check` passed.

Final screenshot evidence from the local run is in `/var/folders/hb/0b1xdv1j0x71lfng992wcljc0000gn/T/typesetgo-profiles-uwkgsH`; the runner prints a fresh directory each run.

## Integration lint followup

The integration coordinator supplied a working TypeScript parser and assigned the resulting profiles findings. No package, lint configuration, shared source, or integration-worktree files were changed by this lane.

- `UserStatsChartModal` now computes extrema with immutable reductions and maps, satisfying the compiler lint rule while preserving first chronological ties, empty input, and saved-result immutability. A frozen newest-first history regression covers tied extrema and source ordering.
- The Embla test double is an explicitly named custom hook with its actual `startIndex` dependency, satisfying hook naming and dependency rules.
- Dormant `StatsModal` uses a stable local `allResults` alias consistently inside and outside its memo. This is the coordinator-requested minimal compiler-lint correction; no dormant feature was activated or polished.
- Supported scoped lint command: `/Users/dimitri/Code/typesetgo-worktrees/integration-tooling/node_modules/.bin/eslint --config /Users/dimitri/Code/typesetgo-worktrees/integration-tooling/eslint.config.js src/components/auth/StatsModal.tsx src/components/stats/UserStatsChartModal.tsx tests/unit/achievements-interactions.test.tsx tests/unit/profile-history.test.tsx`.
- Targeted tests, full build, full unit suite, all 13 isolated browser check groups, and whitespace checks passed. The read-only GPT-6 Astra XHigh reviewer found no actionable issues in this followup. No public interfaces changed, lint suppressions were added, or updates were deferred asynchronously.

## Disposition and remaining limits

- **Implemented and verified:** every profiles-owned audit item in the table, including active dialog/matte/reduced-motion behavior, is covered by source evidence and scoped tests/browser checks as appropriate.
- **Integration-owned gate:** the coordinator repaired the lint toolchain externally; assigned profiles findings are resolved and pass scoped lint. The coordinator owns package integration and full-repository lint verification.
- **Deferred intentionally:** UI cleanup of dormant `StatsModal`, `AchievementsGrid`, and `StreakCard`; race-list entrance behavior belongs to multiplayer. No dormant features were activated.
- **Unverified live behavior:** real Clerk sessions and live Convex mutation/deletion/recheck execution were not exercised. Ownership, >100 lifetime histories, missing values and failures use isolated fixtures. Query-error recovery comes from the integrated Foundations route boundary; no live service failures were induced.
- **Integration:** consume the Foundations prerequisites above before the profiles commits, and the delegated notification callback after its modal contract. There are no remaining local implementation blockers or backend contract requests for this lane. No audit finding addressed here was rejected as incorrect.

Run the durable isolated browser check with `node tests/browser/profiles/check.mjs` (installed Chrome by default, overridable through `PLAYWRIGHT_CHANNEL`). It blocks non-local requests and fails if any are attempted. Screenshot paths are printed on completion. This is a standalone browser check, not a change to the existing empty Playwright e2e suite or its configuration.
