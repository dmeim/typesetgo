# Foundations UI cleanup

## Stable integration contract

These contracts are additive. Existing raw theme/typing roles and supported features stay compatible. The audit supplies hypotheses; implementation requires reproduction or decisive source evidence.

- **Semantic colors:** Tailwind `background/foreground`, `card/card-foreground`, `popover/popover-foreground`, `primary/primary-foreground`, `secondary/secondary-foreground`, `muted/muted-foreground`, `accent/accent-foreground`, `destructive/destructive-foreground`, `border`, `input`, and `ring` map to live palette roles. `tv.ui` exposes the same camelCase roles for inline consumers. Readable UI foreground roles target at least 4.5:1 on their assigned surfaces; focus/input boundaries target 3:1. `tv.typing` and existing raw palette roles retain theme identity and deliberately subdued exercise text. Do not use a typing role for UI labels or assume `text.inverse` contrasts with every highlight.
- **Effective mode:** `useTheme().mode` is the actual supported `light | dark` mode. The provider owns root `.dark`, `data-theme-mode`, and native `color-scheme`. Consumers (including Sonner) read this mode; they do not independently infer OS mode. Theme selection commits palette, mode, state, and persistence together; the latest request wins.
- **Overlays:** Use existing `Dialog`, `Popover`, `DropdownMenu`, and `Select` primitives. Modal content has a title, optional description, bounded viewport scrolling, an accessible close control, focus trap/restoration, Escape handling, and solid matte surfaces. Put nested overlays inside the owning primitive tree. Intentional nondismissal must be an explicit Radix handler: `onEscapeKeyDown.preventDefault()` vetoes dismissal while allowing keyboard controllers to receive the event; also call `stopPropagation()` when the consumer owns the event entirely. Consumers keep their controlled `open/onOpenChange` APIs and composition; no custom backdrop listeners.
- **Motion:** App-level `MotionConfig reducedMotion="user"` plus CSS media policy cover shared presentation. `useAnimatedCounter` must cancel outstanding work and bypass movement/delay under reduced motion. Imperative feature scrolling and Framer opacity/stagger sequences still need consumer adoption when the library policy does not suppress them.
- **Auth capabilities:** The shared `useAppAuth`/provider boundary under `src/components/layout/` exposes auth availability/status, user identity, loaded/signed-in flags, and guarded sign-in/profile/sign-out actions without calling Clerk outside its provider. Only the enabled bridge calls Clerk hooks. Feature owners must adopt this boundary in their Clerk-dependent files; foundations does not fabricate a Clerk provider or edit those features.

## Handoff state

- Run: foundations-2026-09-16.
- Manager branch: `codex/ui-foundations`; worktree: `/Users/dimitri/Code/typesetgo-worktrees/foundations`.
- Base: `main` at audit commit `6c0eacb` (ancestor verified during setup).
- Original main checkout has unrelated untracked files; no edits will be made there.
- Authority: focused local commits and worker cherry-picks; no push, deployment, main merge, live Convex write, or data migration.
- Requested model: GPT-6 Astra, XHigh. Workers/reviewer launched with `gpt-6-astra` and `xhigh`; normal execution settings, no service-tier override. Parent settings are controlled by the host; no self-reconfiguration tool is exposed.
- Manager owns shared primitives except `sonner.tsx`, this report, integration, and validation.
- Theme worker: `/root/theme`, branch `codex/ui-foundations-theme`, worktree `/Users/dimitri/Code/typesetgo-worktrees/foundations-theme`, complete. Owns `src/index.css`, `src/context/ThemeContext.tsx`, `src/lib/theme-vars.ts`, `src/lib/themes.ts`, `src/lib/colors.ts`, `src/types/theme.ts`, `src/components/ui/sonner.tsx`, needed theme data, and `tests/unit/foundations-theme*.test.*`.
- Shell worker: `/root/shell`, branch `codex/ui-foundations-shell`, worktree `/Users/dimitri/Code/typesetgo-worktrees/foundations-shell`, complete. Owns `src/main.tsx`, `src/App.tsx`, `src/components/layout/*`, `src/components/auth/UserButton.tsx`, `src/pages/Home.tsx`, `src/hooks/useAnimatedCounter.ts`, and `tests/unit/foundations-shell*.test.*` / `foundations-counter*.test.*`.
- Workers must report cross-ownership requirements rather than editing feature files. Foundation shared APIs integrate before feature adoption.

## Implementation status

| Audit section title | Outcome and evidence |
| --- | --- |
| Shared UI color classes are disconnected from the theme | Implemented and verified: full Tailwind v4 semantic bridge emits actual background/primary/input/focus utilities; computed browser styles follow the active palette. |
| Shared entry and exit animations have no stylesheet | Implemented and verified: import tw-animate-css once; restrained shared fade entrance/exit; reduced-motion timing verified. Activation exposed a nested-Escape timing defect, fixed in shared overlay state. |
| Theme mode does not control native or Tailwind dark-mode styling | Implemented and verified: effective mode owns root class, data attribute, native color-scheme, and Sonner. App-light/OS-dark and app-dark/OS-light pass. |
| Secondary UI text inherits typing-text contrast | Semantic contract and owned shell labels implemented/verified. All 9,912 palettes pass independent contrast checks. Raw typing roles remain unchanged; feature UI adoption belongs to the other lanes. |
| Multiple palette systems prevent consistent theming | New semantic roles and toast integration implemented/verified. Legacy GLOBAL_COLORS stays compatible because consumers append hex alpha and typing constants intentionally remain subdued. Feature migration is an integration dependency. |
| Elevation and glow treatments conflict with the matte direction | Shared controls/overlays/toasts now use solid matte fills, restrained borders, and no surface shadows. Feature achievement/race treatments remain with their owners. |
| The header overlaps and loses controls at narrow widths | Implemented/verified: flow grid with reserved action/navigation/account space. Browser hit targets pass at 320/390/720/1024/1440px with long account names. Practice spacer and multiplayer page-clearance adoption are external dependencies. |
| Invisible header controls remain keyboard-accessible | Implemented/verified: inert + aria-hidden, focus evacuation/restoration, and inactive portal controls. Owned Home provides a stable focusable main region. |
| Theme loading eagerly requests the whole catalog | Loader infrastructure implemented/verified: global six-request cap, in-flight deduplication, 15-second request timeout, explicit partial failure/retry, and foreground priority. Moving eager feature calls to picker-open is owned by Practice/Multiplayer. No startup latency claim. |
| Rapid theme selections can resolve out of order | Implemented/verified: one request sequence gates startup, theme, variant, and mode changes; failed loads do not erase saved preferences. A separate user-intent revision supports safe preference restoration. |
| Dialog behavior is implemented repeatedly and inconsistently | Shared contract implemented/verified: bounded scrolling, focus trap/return, triggerless external opener restoration, nested Escape ownership, explicit nondismissal, IME handling, and submenu compatibility. Replacing feature overlays remains with their owners. |
| Settings labels and selected states are not programmatically connected | Shared Slider now forwards accessible names/descriptions to thumbs and supports thumbLabels for ranges. Feature-level labels and grouped selection controls remain with Practice. |
| Reduced-motion preferences are ignored | App MotionConfig, global CSS, and counter lifecycle implemented/verified. Imperative feature scrolling and Framer opacity/stagger sequences still require feature adoption. |
| Animated counters restart, leak frames, and mishandle edge cases | Implemented/verified: retarget from displayed value, explicit zero IDs/timestamps, cleanup, finite/nonpositive duration behavior, resets, and live reduced-motion preference. Eight baseline failures reproduced before fix. |
| Quote metadata refuses to fade with the rest of the UI | Shared fade-in releases opacity after entrance; browser verifies computed opacity reaches zero under normal and reduced motion. Full quote/session interaction remains with Practice. |
| Notifications hide their delete action from keyboard and touch users | Implemented/verified: popover/list with separate persistent open/remove actions, explicit names, and focus after deletion. Notification→achievement return-focus integration is completed on the Profiles branch (details below). |
| The application shell lacks route-level recovery | Implemented/verified: lazy data-router boundaries, initial/navigation loading, focused themed not-found/error recovery, reload and home actions. |
| The advertised auth-disabled mode still calls Clerk-only hooks | Safe capability/provider boundary and owned consumers implemented/verified with mocks. Standalone foundations still contains out-of-lane direct Clerk hooks; complete anonymous Home requires Practice/Profile/Race adoption. |
| Route code loads as one large initial bundle | Implemented/verified: lazy route modules with loading/error recovery. Integrated build emits separate page/chart chunks and no chunk-size warning. This is bundle evidence, not a measured startup-speed improvement. |
| UI behavior has little regression coverage | Meaningful foundations unit regressions plus isolated browser fixtures were added/run. No live service tests or mutations. |
| Lint cannot currently run before UI changes are handed off | Blocked baseline: lint exits 2 before analyzing source because TypeScript 7 is unsupported by installed typescript-eslint. Dependency/tooling changes are outside this lane. |

## Shared API details and merge dependencies

- `tv.ui` properties are full CSS color values; the corresponding `--background`, `--primary`, etc. are no longer HSL channel triplets. Existing repository consumers did not depend on HSL wrapping. Keep raw `tv.text`/`tv.typing` for intentionally unmodified theme roles.
- Auth import: `@/components/layout/useAppAuth`. Result: `status` (`unavailable | loading | signed-out | signed-in`), `available`, `isLoaded`, `isSignedIn`, `user` (`UserResource | null`), `unavailableReason` (`not-configured | load-failed | null`), and guarded async `openSignIn`, `openUserProfile`, `signOut` returning success booleans. Missing provider returns the safe unavailable value. Installed Clerk source establishes that children render before loaded; a 10-second bridge timeout gives a useful unavailable state for failed loading.
- Theme preferences: `useTheme().userSelectionRevision` increments synchronously once per public user setter. Restore account preferences with `setThemeSelection(selection, { source: "preferences", expectedUserSelectionRevision: baseline })`, where baseline was captured before loading preferences. Missing/stale baselines are ignored before starting a request. Startup/preference restoration does not increment the revision; later user intent supersedes pending restoration. Existing one-argument setters retain user-intent behavior. The revision is monotonic for the provider lifetime; account-switch reconciliation remains with Practice.
- Catalog: `fetchThemeCatalog({ themeIds? })` returns `{ themes, requestedThemeIds, failedThemeIds, manifestError, complete }`; `retryThemeCatalog(previous)` preserves successes and retries failures. `fetchAllThemes()` remains compatible. Public `fetchTheme(id)` promotes an already queued catalog job instead of duplicating it.
- `Slider` retains Root props but applies `aria-label`, `aria-labelledby`, and `aria-describedby` to interactive thumbs; optional `thumbLabels: string[]` labels ranges.
- Overlay roots keep controlled/uncontrolled `open/defaultOpen/onOpenChange` and caller Escape/autofocus handlers. Content registers Escape ownership during layout, before Radix's passive layer snapshot can become stale. The deepest open overlay handles one Escape; submenu Escape preserves root-menu dismissal. IME Escape does not dismiss UI. A consumer's `preventDefault()` veto leaves propagation intact for descendant keyboard controllers (such as dnd-kit); normal dismissal consumes Escape exclusively. Explicit consumer propagation stops are honored. Pointer handling and focus trapping remain Radix-owned. A triggerless Dialog restores its connected external opener; when that opener unmounts, pass an explicit surviving target through `onCloseAutoFocus`.
- Multiplayer's keyboard plan dragging requires shared commit `57e5a04` (equivalent cherry-pick `9bfde34` on Multiplayer) before its consumer drag-state/RoomDialog Escape veto `cc55f31`. Do not apply both equivalent shared commits. The installed dnd-kit KeyboardSensor listens on `document` and handles cancellation even when `defaultPrevented` is true. The previous shared handler incorrectly stopped propagation after a veto; the new document-listener regression reproduced the failure before the fix.
- Sonner now reads `useTheme()` and must be under ThemeProvider. Its theme prop is no longer independently configurable. Main/App wiring is included in this branch.
- Header is in normal document flow. Practice must remove the old TypingPractice fixed-header spacer. Multiplayer must remove redundant page top padding. Race/Lessons navigation stays disabled; no dormant features were activated.
- Profiles owns the rewritten AchievementsModal optional `onCloseAutoFocus` contract in `0442965`. With explicit narrow delegation, Profiles made the corresponding one-line NotificationCenter caller change in `c94498c`, after its modal rewrite (`d9afbbc`, then `0442965`). The caller dismisses state and focuses the persistent notification trigger in close-autofocus. Profiles browser verified notification→achievement→Escape return focus. This dependent caller patch is intentionally on the Profiles branch so Foundations continues to compile against the original modal. Integrate both halves together.
- Shared documentation request for the integration coordinator: update root `AGENTS.md` and `docs/AGENTS.md` provider stack (optional Clerk/Convex → AppAuth; ThemeProvider/MotionConfig/RouterProvider/Toaster in App), route table location (`components/layout/app-routes.ts`), and README/handbook browser-test commands from the feature lanes. Those files are outside the named foundations ownership and were not edited.

## Validation and review

- Original unit baseline: 55 tests passed.
- Final implementation HEAD `57e5a04`: `bun run build` passed; `bun run test:run` passed **117 tests in 12 files**; `git diff --check` passed. Entry JavaScript is **449.82 kB / 136.28 kB gzip**, with a separate 410.22 kB UserStats chunk and separate route chunks; no chunk-size warning. The audit baseline entry was about 1,571 kB / 441 kB gzip. Initial Home still loads its own dependency chunks, so entry size is not total initial transfer.
- Full catalog: 9,912 palette/mode combinations, independently calculated text pairs ≥4.5:1 and focus/input boundaries ≥3:1. Tests ensure raw palettes are not mutated.
- Chromium local fixtures: 320/390/768/1440px dialogs/popovers, long scrolling content, keyboard Tab trap and focus return, nested Select Escape, six immediate Enter→Enter→Escape nested-dialog cycles, triggerless controlled modal return, and submenu Escape root dismissal. Profiles independently reproduced and verified the original nested-delete timing fix.
- Multiplayer independently verified the composed keyboard-drag contract in its isolated `tests/e2e/connect-ui.spec.ts` case, "Escape cancels keyboard step dragging before closing the unsaved plan": Space starts dragging, ArrowDown moves, first Escape cancels and preserves original order/unsaved title with the modal open, second Escape closes. This requires both `57e5a04` and Multiplayer's consumer drag-state veto; the shared change alone does not infer whether a feature is dragging.
- Shell fixtures: 320/390/720/1024/1440px, guest and mocked signed-in state, long account name, hit testing, horizontal overflow, inert header and focus recovery, keyboard/touch-visible notification removal, missing/error route recovery.
- Theme fixtures: both app modes against both OS modes, Sonner mode/styles, TypeSetGo light/dark plus Dracula, Solarized, and Brutalist palettes. Actual hovered primary/secondary/destructive controls all meet ≥4.5:1. Quote-style opacity ownership verified. Reduced-motion animations/transitions measure 0.00001s with no delays/infinite repetitions. 720×450 viewport checks 200% reflow equivalent to a 1440×900 viewport; native browser zoom UI was not separately exercised.
- Browser traffic was restricted to localhost; shell data/auth were mocked. No live backend mutation, deployment, migration, push, or main merge.
- Browser artifacts and reusable fixture source: `/tmp/typesetgo-foundations-qa`. Scripts: `overlays.cjs`, `theme-matrix.cjs`, `palettes.cjs`, `shell.cjs`, `rapid-overlays.cjs`, `submenu.cjs`. Temporary fixture files are archived under `fixture-source/` and removed from the worktree at completion. Restore them there, run `bun run dev --host 127.0.0.1 --port 4311 --strictPort` plus `bun run dev --config .foundations-qa.config.ts`, then invoke the scripts with Node.
- Read-only reviewer examined the full integrated `6c0eacb..09fd412` diff and followups. Actionable findings resolved: foreground queue starvation, translucent button hover contrast, submenu Escape compatibility, and composing Escape falling through to Radix. Overlay followups `d8a019b` and `57e5a04` cleared. Preference revision contract `1a45c97` also cleared; no remaining actionable reviewer findings. Final build/full suite ran after the latest code landed.
- `bun run lint`: existing TypeScript 7/parser startup failure (exit 2), not a new source finding and not a pass. No dependency files were changed.

## Findings corrected or still limited

- The audit's palette measurements identify unsafe pairs, not every rendered element. New tests cover semantic pairs; screenshots/computed styles cover representative rendered palettes, not every screen in every theme.
- Globally brightening raw text or replacing GLOBAL_COLORS with `var()` would break typing intent and hex-alpha consumers. Additive semantic roles are the implemented migration path.
- A production Clerk key rejected on localhost is not evidence of production sign-in failure. Authentication here was mocked; live account/provider outage scenarios are not certified.
- The whole-catalog latency diagnosis was not profiled. The queue limit, deduplication, priority, retry, and request timeout are verified correctness/resource contracts. A compact generated search catalog and constrained-device startup measurements are deferred.
- Application error recovery covers routed rendering/loading failures. Invalid bootstrap configuration or provider-construction exceptions before the router remain outside that route boundary.
- Feature modal adoption, auth-hook migration, page spacing, full practice focus policy, and imperative reduced-motion behavior must land through their owning lanes. No broad feature or backend fixes were made in this branch.

## Focused manager commits

| Manager SHA | Change | Worker origin where applicable |
| --- | --- | --- |
| 7c27785 | Initial stable contracts and ownership | Manager |
| 95332d8 | Matte shared primitives and accessible slider | Manager |
| fc899bd | Safe auth capability boundary | 989e241 |
| daf6fdb | Semantic colors and catalog validation | 596e846 |
| bff1337 | Effective mode, CSS, selection ownership, catalog loader, Sonner | 2fbac30 |
| 09fd412 | Responsive shell, auth wiring, route recovery/lazy loading, counter | 16d3843 |
| 7194b49 | Foreground theme request priority | 39cf1b2 |
| 902fe4d | Opaque contrast-safe button hover | Manager |
| 8244849 | Shared nested Escape and external focus ownership | Manager |
| d8a019b | Submenu and composition Escape compatibility | Manager |
| 1a45c97 | User-intent revision for safe preference restoration | da8f6a1 |
| 57e5a04 | Preserve vetoed Escape for document keyboard controllers | Manager |

Prefer merging the completed manager branch once. Managers that already cherry-picked worker commits should avoid cherry-picking their equivalent manager SHA again. Integrate foundations before feature consumers, and Profiles' modal/caller changes together.

## Completion checkpoint

Implementation and review are complete for the owned foundations scope. All implementation worker worktrees are clean; reviewer made no edits. Final report is a separate documentation commit after `57e5a04`. Main remains `6c0eacb`; its original six untracked paths remain unchanged. No user-facing tasks were created, usage resets consumed, pushes, deployments, or live Convex writes performed.

Remaining integration work is explicitly assigned above: feature auth/semantic/dialog/motion adoption, lazy picker callers, shell-clearance adjustments, Profiles notification/modal pair, and shared handbook updates. Lint toolchain repair and live authentication validation remain blocked/deferred outside this lane.

Final coordination receipts: Practice reports completion at `codex/ui-practice` / `35585ee` (source `4ec7ffb`), with Foundations through `57e5a04` consumed, build and 182 tests passing, and read-only review cleared. Multiplayer reports completion at `codex/ui-multiplayer` / `18e6835` (source `dd3b740`), with build, Convex type check, 224 unit tests, and 20 isolated browser checks passing, and read-only review cleared. These are owner-reported lane results, not additional changes merged into Foundations. Their reports own the final feature commit order; the coordinator must deduplicate shared commit equivalents and integrate compatible frontend/backend source contracts together without deploying them.
