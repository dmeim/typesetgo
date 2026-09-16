# Profiles UI cleanup

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
- Reachability inspection finds the active profile uses `AchievementsCategoryGrid`, `AchievementsModal`, `AchievementDetailModal`, and `UserStatsChartModal`. Legacy `StatsModal`, `AchievementsGrid`, and `StreakCard` have no active route callers and are deferred.

## Contracts and integration order

- Foundations owns semantic colors, shared Dialog behavior, safe auth capability, and animated-counter implementation. This lane consumes existing Dialog exports and the additive `useAppAuth` contract; no shared replacements are introduced.
- `AchievementsCategoryGrid` keeps `earnedAchievements` and adds optional `isLoading?: boolean` and `onRefresh?: () => Promise<unknown>`. The parent supplies refresh only for a verified owner. The child owns pending/error presentation and has no account identity or mutation ownership.
- Integrate the actual foundations code commits before profiles for semantic UI colors and `@/components/layout/useAppAuth`; foundations commit `7c27785` documents contracts only.

## Validation in progress

- Baseline `bun run build`: passed; existing large-bundle warning.
- Baseline `bun run lint`: blocked before analysis by the existing TypeScript 7 / typescript-eslint startup incompatibility. This is not a passing lint check.
- Local preview fixtures under `tests/browser/profiles/` replace Convex and auth imports, disable environment loading, and use synthetic owner/visitor/anonymous, 350-lifetime/100-recent, missing/zero metrics, long-name, loading, empty, and failed-action cases. No live backend is used.
- Preview: `node tests/browser/profiles/server.mjs --serve`; open its printed `/user/profile-owner` or `/leaderboard` URL. Query parameters: `scenario=owner|visitor|anonymous|loading|empty|missing|error|achievements-loading` and `theme=light|dark`.

Final integrated validation, reviewer findings, commits, and item dispositions will be recorded before completion.
