# Practice cleanup implementation record

## Workspace and ownership

- Base: `main` at audit commit `6c0eacb` (verified ancestor).
- Manager: `codex/ui-practice`, `/Users/dimitri/Code/typesetgo-worktrees/practice`.
- Engine worker: `codex/ui-practice-engine`, `/Users/dimitri/Code/typesetgo-worktrees/practice-engine`.
- Presentation worker: `codex/ui-practice-presentation`, `/Users/dimitri/Code/typesetgo-worktrees/practice-presentation` (created from the reviewed extraction).
- All implementation is isolated from the user's main checkout. No push, deployment, main merge, live Convex mutation, or data migration is authorized or performed.
- Workers use GPT-6 Astra with XHigh reasoning and no service-tier override. At most two implementation workers run concurrently; a separate read-only review follows integration.

## Sequence and contracts

1. One owner characterizes and extracts TypingPractice's presentation boundaries without changing behavior.
2. Engine and presentation work starts only after the extraction commit establishes separate file ownership.
3. Integrate focused worker commits, exercise the integrated journeys with local fixtures, run build/full unit suite/lint, and obtain a read-only integrated-diff review.

Engine owns selected configuration, prompt datasets and identity, solo server-session identity, hydration, input position/completion, timing, focus, and TypingArea. Presentation owns extracted dialogs/results/theme browser plus ThemeCard, VariantDrawer, and keyboard presentation. The manager owns ColorPicker and integrated browser checks. Foundations owns global CSS, semantic palette, shared primitives, theme loading/ThemeContext, auth capability, and animated counters.

Agreed Multiplayer contracts:

- Join resolves host-led plans into a concrete locked mode; no local autonomous plan execution is enabled.
- Join keys practice by room/run/reset/step identity. Stopped Connect freezes input, timer, and progress emissions; changing the key starts a fresh run. The same key can pause and resume.
- Timed modes are Time and Preset with `presetModeType: "time"`. A timed preset also finishes if its finite supplied text is exhausted.
- TypingArea gains compatible optional `initialInput` and `initialElapsedMs` props, applied on mount. `TypingStats.typedText` carries exact input for reconnect; callback identity alone must not emit progress.

Agreed Foundations contracts (consumed through Foundations `57e5a04`; manager merge `d5a4454`):

- Existing Dialog/Popover interfaces remain compatible; semantic Tailwind roles and additive `tv.ui` tokens provide UI contrast.
- `useAppAuth` in `@/components/layout/useAppAuth` safely represents disabled/unavailable authentication.
- Header participates in document flow; practice's obsolete fixed-header spacer must be removed with that dependency.
- `fetchThemeCatalog` / `retryThemeCatalog` return themes, failed IDs, manifest error, and completeness; the practice picker requests its catalog on opening and displays loading/partial/error states.
- ThemeContext `userSelectionRevision` and `setThemeSelection(selection, { source: "preferences", expectedUserSelectionRevision })` prevent delayed account restoration from replacing a newer Header or picker choice.
- Shared Dialog restores surviving external openers, stacks Escape ownership, respects nested menus/composition, and preserves a consumer-vetoed Escape for downstream keyboard controllers.
- Foundation semantic foreground/background pairs and reduced-motion policy remain authoritative; practice consumes these interfaces rather than overriding global CSS.

## Evidence and validation

Audit statements are hypotheses until reproduced or established by source evidence. The audit itself is unchanged.

Browser checks use an isolated Vite fixture with no environment files, local Clerk and Convex module substitutes, and external browser requests blocked. Real Home/practice components and public content render locally. An unexpected backend mutation throws rather than reaching a service. This verifies UI journeys, not authenticated production behavior or server deployment.

Baseline Chromium checks against `6c0eacb` reproduced:

- Words → 25 → 10 still rendered 25 target-word elements.
- Ordinary Tab left focus on the hidden typing input.
- Overtype `cattt` against `cat` rendered zero painted-caret elements.
- First entry to Quote retained 25 random-word elements after the delayed quote fixture resolved; quote author remained absent.
- Settings rendered no dialog role and remained open after Escape (checked by its visible Close settings action).
- After loading a quote, `cattt d` prematurely completed target `cat dog`.

The same failures were checked after extraction, with successful manifest requests and delayed local quote data, to distinguish fixture-loading problems from application defects.

## Implemented changes

### Preparatory responsibility split

Manager commit `8b2de61` (worker `06fddc82`) extracts seven typed presentation components, leaving canonical settings and session commands in TypingPractice. No audit behavior is claimed fixed by this step. Build and all 60 unit tests passed. Read-only review found no actionable extraction regressions and confirmed the moved JSX/command wiring against the baseline. Lint reproduced the existing TypeScript 7/parser startup failure.

### ColorPicker positioning and interaction

Addresses **Color picker positioning and listener cleanup are fragile** and **Color picker dragging supports only a mouse**.

Source confirmed fixed-position coordinates incorrectly included document scroll, anonymous add/remove callbacks differed, portal IDs were shared, and dragging installed mouse-only global handlers. ColorPicker now uses the shared collision-aware Popover for placement, Escape, outside interactions, per-instance lifecycle and focus restoration. Canvas drawing is preserved; pointer capture replaces global drag listeners, supports touch/pen, and stops on cancel/lost capture. Hue is keyboard-operable; labeled native saturation/brightness sliders and validated hex drafts provide complete non-pointer editing.

Four focused unit tests pass (dialog/focus, keyboard HSV, hex validation, touch capture/cancel), plus TypeScript build checking. Chromium verified a scrolled 390px viewport: popup bounds stayed inside the viewport, PageUp changed hue, a touch tap changed hue, Escape restored trigger focus, and repeated open/close cycles worked. Shared semantic surface styling depends on Foundations.

### Shared input and TypingArea resume contract

Manager commits `cddb18b` and `2aa8073` (workers `9faba955`, `3b8f11a`) share a word-aligned input/renderer/completion model, preserve extra/terminal carets, constrain native editing consistently to append/backspace, allow ordinary Tab/Shift+Tab, and derive scroll offsets within one transformed layer. Long standard tokens wrap; feeding-tape caret following stays horizontal. Compatible optional `initialInput` and `initialElapsedMs` initialize once per mount; `initialTypedText` remains supported. `TypingStats.typedText` carries exact input. Stopped components emit neither progress nor finish callbacks, and callback identity changes or prompt resets cannot emit stale input.

Eleven focused input tests pass. Chromium independently verified paused restore (`ca`, 1200ms), resume from saved elapsed time, no paused/callback-only reports, `cattt d` remaining unfinished, one finish for `cattt dog`, extra caret visibility, Home/end insertion agreement, and Tab escape. At 390px with 6rem text, a 106-character target wrapped without page overflow and kept its caret visible. Rapid feeding-tape updates kept the caret at the viewport center.

### Shared setting ranges

Manager `4c4f328` (worker `a3d54b3`) defines the supported text-size range of 1–6rem in one model contract and normalizes stored preferences. Two dedicated preference tests pass. Presentation editors and engine updates consume these same constraints.

### Prompt, session, timing, and hydration ownership

`3e380c5` ties prompt generation to the selected configuration and resolved dataset identity. Count changes regenerate in both directions; Quote clears stale words while loading, retries failures, and rejects superseded datasets. `PracticeText`, `practice-input`, `useTypingScroll`, `usePracticeClock`, and `usePracticeDataset` own their respective behavior. Focus fading derives from running/focus/session state; metadata has no competing forwards animation. Ghost reference positions include spaces and derive from the same elapsed clock.

A ranked response adopts the server prompt and session ID together before typing. If local input/composition has begun, even if subsequently erased, the response is cancelled; history saves remain explicitly unranked. Repeat preserves the displayed prompt and never starts another ranked session. Server timing, authenticated ownership, burst/rate limits, score calculation, and leaderboard validation remain in place. `e01c79c` updates only the dedicated solo completion validator to the shared final-reference-word model; `validateTypingSession` has one production caller, `convex/typingSessions.ts`.

Initialization loads local storage synchronously. Actual user commands mark individual preference fields; account hydration restores unedited fields and guards theme changes with the Foundation revision contract. `fd8a59c` preserves an active or finished attempt when account prompt defaults arrive late: display preferences apply immediately, prompt defaults queue for deliberate Next Test, and Repeat retains the original prompt. Persistence stores the queued defaults without changing the current attempt's scoring configuration.

### Presentation contracts

`b6b043e` converts settings, quick settings, counts, preset entry, and theme selection to shared dialogs with labels, selected states, real disabled controls, and focus restoration. Quick Settings stays mounted beneath its count editor so nested Escape restores its actual opener. Result keyboard shortcuts apply only when the summary itself owns focus. Correct/Incorrect counts are touch- and keyboard-operable word-detail popovers. Result actions use semantic color pairs (`8fdbb2b`).

The theme picker loads on opening, distinguishes partial/total failure and retry, stacks preview/browser on narrow screens, unmounts collapsed categories, removes the expansion height ceiling, and keeps variant presence ownership stable with intrinsic sizing. Cards expose selection, expansion, mode actions, and focus previews. The read-only surface is named Current theme details; no custom-theme feature was enabled. The keyboard retains its measurement container when too narrow, recovers after growth, uses readable state colors, and derives current-word/Shift/Caps Lock guidance coherently.

### Review-driven boundary corrections

- `31a37e0` and `347f7b4`: preserve IME drafts independently through parent rerenders; commit once at composition end. Empty restored input with nonzero elapsed time resumes timing.
- `fef4661` and `99bace8`: preserve the supported custom-duration maximum, 6:59:59 (25199 seconds), rather than silently changing 6:30 after reload.
- `fd8a59c`: delayed account defaults no longer reset active input, results, pending saves, or Repeat identity.
- `8fdbb2b`: Save action state colors use paired semantic roles; regression covers light/dark contrast of at least 4.5:1.
- `89cdf74`: unavailable/loading/failed sign-in now explains why Save could not open authentication, retains the result and retry intent, and protects stale async replies. Kid-mode entry/exit mark layout changes as real user edits.
- `4ec7ffb`: shared bounds move into browser-independent `src/lib/practice-limits.ts` with compatible re-exports for frontend callers and relative imports for Convex.

## Audit section disposition

“Verified” below means implemented plus targeted regression/source checks and applicable isolated browser checks. Shared rows describe this lane's consumer work, not ownership of other screens.

| Audit section title | Status and evidence |
|---|---|
| The main practice component couples unrelated UI lifecycles | Implemented/verified: single-owner characterization and extraction first; engine/dataset/clock/input/presentation boundaries afterward. |
| Word-count changes do not rebuild the prompt | Verified: exact 25 → 10 → 50 → 10 rendered counts; completion and session reset follow the prompt. |
| Quote mode can display the previous word test | Verified: cold delayed Quote shows loading, then matching text/author; stale length responses rejected by regression. |
| Displayed and ranked prompts can have different owners | Verified with delayed local mutation mocks: atomic adoption or cancellation/history-only; exact Repeat. Live authenticated service remains unverified. |
| Quote completion disagrees with word-aligned editing | Verified: `cattt d` does not complete `cat dog`; `cattt dog`, missed earlier characters, and final-word submission agree with solo validator. |
| Local settings hydration can overwrite account preferences | Verified in regression and browser fixtures: local initialization differs from actual edits, newer theme intent wins, active/results prompt identity survives delayed defaults. |
| The visible caret ignores native input selection | Verified: documented append/backspace editing, constrained arrows/Home/End/selection, IME draft, pointer refocus. |
| The visual caret disappears after extra characters | Verified: extra and terminal insertion positions retain one caret. |
| The typing input traps Tab navigation | Verified: Tab/Shift+Tab leave the input; intentional Ctrl/Cmd+Enter Repeat remains. |
| Results shortcuts intercept unrelated inputs and dialogs | Verified: shortcut scope is the focused summary; settings controls retain Enter/Space behavior. |
| Typing scroll calculations use already-animated geometry | Implemented/verified stable untransformed measurements and one scroll layer. Baseline runtime overshoot was not reproduced; source risk was decisive. |
| Quote metadata refuses to fade with the rest of the UI | Verified: actual Home computed opacity reaches zero while typing and returns on focus recovery. |
| Focus-mode fading waits for a typing pause | Verified: session/focus state owns immediate fading, without restarting a per-character delay. |
| Keyboard guidance keeps demanding Backspace after historical mistakes | Verified: submitted wrong `x ` guides the next `c`, not historical Backspace. |
| The ghost cursor skips spaces and drifts from elapsed time | Verified: shared elapsed-time derivation and explicit space/terminal positions in regression; visible browser ghost while typing. |
| Long words can be clipped with no way to see the remaining letters | Verified: Home and TypingArea at 390px/6rem wrap a 102-character token and retain the caret; feeding tape follows horizontally. |
| The on-screen keyboard disappears permanently after shrinking | Verified: 260px → 900px restores all 51 key elements. |
| Pressed keyboard keys use an unreadable foreground/background pair | Verified: semantic matched colors; light/dark and Caps Lock/Shift coverage. |
| Result-word details are available only through hover | Verified: touch/click/keyboard disclosure, 280-character content, Escape/focus restoration. |
| Compact and desktop text-size controls disagree | Verified: one 1–6rem range, normalized storage and matching editors. |
| Visually disabled sound and ghost settings still accept keyboard input | Verified: native disabled behavior and guarded preview actions. |
| Settings labels and selected states are not programmatically connected | Verified: named actual inputs/sliders, pressed state, field labels. |
| Dialog behavior is implemented repeatedly and inconsistently | Verified for practice dialogs: shared modal contract, nested count/settings, Escape, focus, scroll containment. |
| The theme picker has no usable phone layout | Verified at 390×844, 1280×900, and 640×450 compact viewport. |
| Collapsed theme categories still contain focusable controls | Verified: closed category content is unmounted. |
| Theme-category expansion has an arbitrary clipping ceiling | Verified: no height cap; worker's synthetic 80-theme category reached 8278px with final card reachable. |
| Variant drawers cannot play their exit animation | Verified: stable presence keeps closing drawer inert through normal-motion exit, then removes it. |
| Variant drawer height becomes stale after layout changes | Verified: intrinsic Fire Force 13-variant drawer measured 1381px at narrow width, with resize recovery. Baseline resize appearance itself was not reproduced. |
| Theme-card selection and expansion lack a complete interaction contract | Verified: separate native button actions, names, pressed/expanded state, focus previews and light/dark selection. |
| “Custom Theme” opens a read-only color display | Implemented/verified: renamed Current theme details, still read-only. |
| Theme loading eagerly requests the whole catalog | Verified consumer change: startup requested one theme in the fixture; opening picker requested the catalog, with loading/partial failure/retry. No latency improvement is claimed. |
| Rapid theme selections can resolve out of order | Shared dependency: Foundation request/revision contract consumed; its regression evidence is in foundations.md. |
| Reduced-motion preferences are ignored | Shared dependency plus practice reduced-motion handling; reduced-motion browser journeys and normal drawer exit verified. |
| Animated counters restart, leak frames, and mishandle edge cases | Foundation-owned fix consumed; practice Results uses its corrected counter. |
| Color picker positioning and listener cleanup are fragile | Verified: shared Popover, pointer capture, scroll placement, repeated open/close, Escape/focus. |
| Color picker dragging supports only a mouse | Verified: pointer touch/cancel plus keyboard hue/HSV/hex editing. |
| Timed presets are configured as timed but execute as completion tests | Practice interface implemented; Multiplayer verified real Join with 45-second timed preset completing at time. |
| Host Stop and Reset do not control the full participant session | Practice interface implemented; Multiplayer verified real Join Stop disables input/freezes progress, fresh Start/reset clears input with current run/reset IDs. |

## Integrated browser matrix

All checks use real components with local content/auth/Convex substitutes and blocked external network requests. No live service was contacted by these journeys.

- **Home, wide:** configure counts → type/correct → finish → settings during results → exact Repeat → Next; cold Quote; Tab; extra caret; no page errors.
- **Session identity:** server resolves before input → displayed `dog` prompt finalizes the same mock session; Repeat preserves `dog` and saves history only. Delayed response after type → erase rejects the response and keeps local `cat` prompt/history-only save.
- **Delayed account defaults:** locally selected 10 words with `ca` entered → restored 50-word/5rem defaults leaves input and 10-word attempt intact, applies display size, finishes/saves original attempt, repeats 10, then Next uses 50.
- **Home, narrow:** 390×844, 6rem, long quote token; caret inside the typing viewport, no horizontal document overflow, quote metadata computed opacity zero during input. Touch result disclosure with a 280-character wrong word stays within the page; Escape restores its button.
- **Themes:** 390×844 phone, 1280×900 wide, and 640×450 effective 200%-zoom layout; partial failure and Retry; category collapse; 13 variants; selected light mode; retained drawer after resizing; Escape returns to Change theme. Browser toolbar zoom itself was not automated; the compact CSS viewport tests its layout effect.
- **Keyboard/ghost:** historical error correction guidance, elapsed ghost, 260→900 width recovery; worker checked pressed key contrast in light mode and Caps Lock guidance.
- **TypingArea:** paused/resumed restoration, callback-only rerenders, extra characters, final completion, max-size long token, rapid feeding tape; stopped state emits no progress/finish.
- **ColorPicker:** scrolled phone viewport, hue keyboard and touch changes, pointer cancellation, repeated open/close, focus restoration.
- **Motion/dialogs:** reduced-motion journeys; worker normal-motion drawer exit retains inert content until removal; nested Count Escape restores custom button and keeps Quick Settings open.
- **Cross-lane:** Multiplayer reported real Join + real TypingPractice browser pass for timed preset 45s, Stop over 10s with no new reports, fresh Start, resetVersion, matching run/reset metadata, no solo mutations and no console errors.

## Limits, deferred work, and remaining integration dependencies

- No production authentication or live Convex session journey was executed. Backend completion changes remain local source; a later authorized backend rollout must accompany the frontend when exercising ranked quote/preset completion against the service. There are no schema changes or data migrations in this lane.
- The dedicated solo validator retains ownership, server-derived timing/scores, rate/burst checks, and leaderboard eligibility. Client history saves already force `rankedEligible: false`; this lane does not weaken that contract.
- Foundation consumer changes require its completed branch through `57e5a04`, including `1a45c97` preference revision and `d8a019b` submenu/composition Escape contracts. Manager history includes Foundation merges; integration should avoid cherry-picking duplicate worker and manager equivalents.
- Connect's locked plan-step/run/reset contract is supplied by Multiplayer. Host/server range alignment consumes `4ec7ffb` (worker `d1b6dc4`, Multiplayer equivalent `f765e6f`). Dormant autonomous plan execution stays disabled.
- No measured theme-loading performance claim is made. Baseline animated-scroll overshoot and stale drawer resize were source-confirmed risks rather than reproduced baseline visual failures; final boundary behavior was checked.
- User main checkout, audit, SoundController, room/schema contracts, and package configuration were not edited by practice workers. Shared Foundation changes were consumed only as owner-authored dependency commits.

## Final commit and check record

Source snapshot: **`4ec7ffb` on `codex/ui-practice`**, based on audit `6c0eacb`. The final report-only commit follows this snapshot.

| Manager commit | Worker equivalent | Focus |
|---|---|---|
| `8b2de61` | `06fddc82` | Behavior-preserving extraction and characterization |
| `7681ef9` | Manager-authored | ColorPicker interaction/lifecycle |
| `cddb18b` | `9faba955` | Shared input/render/clock/scroll and TypingArea restore contract |
| `4c4f328` | `a3d54b3` | Shared settings normalization/ranges |
| `2aa8073` | `3b8f11a` | Stopped/stale TypingArea emission guards |
| `b6b043e` | `f67e604` | Settings/results/theme/keyboard presentation |
| `31a37e0` | `1153bd2` | IME draft preservation |
| `e01c79c` | `6292438` | Dedicated solo validator completion |
| `3e380c5` | `ba8f1d1` | Prompt/session ownership, timing and hydration |
| `fef4661` | `9b511aa` | Complete persisted duration range |
| `347f7b4` | `3509de7` | Empty restored attempt timing and IME rerenders |
| `99bace8` | `7e1388c` | Count editor shares duration bound |
| `8fdbb2b` | `c1b89a2` | Result action contrast |
| `fd8a59c` | `8a629e6` | Delayed prompt preferences preserve active/results identity |
| `89cdf74` | `ef6f136` | Sign-in failure feedback and Kid-mode layout edits |
| `4ec7ffb` | `d1b6dc4` | Pure cross-lane configuration limits |

Owner-authored Foundation dependencies are merged in manager history (`492cb31`, `26d9f7c`, `db3d2e5`, `a19abff`, `2ff5b1d`, `d5a4454`), ending at Foundation `57e5a04`. Prefer merging the completed manager branches; if cherry-picking, take only one of each manager/worker equivalent and preserve the dependency order above.

Final checks on `4ec7ffb`:

- `bun run build`: **PASS**, TypeScript plus production Vite build.
- `bun run test:run`: **PASS, 182 tests / 18 files**, 2026-09-16 11:13 local time.
- `git diff --check`: **PASS**.
- `bun run lint`: **BLOCKED at baseline startup**, `typescript-eslint does not support TS 7.0`, before files are analyzed. No new lint findings are asserted; package/config remediation belongs to Integration.
- Isolated browser journeys above: **PASS**. Final auth-disabled Save produced explicit feedback and an enabled retry action. Final Save colors resolved to matched dark/light pairs (`rgb(60,181,238)` / `rgb(63,63,63)` and `rgb(39,116,153)` / `rgb(239,239,239)`).
- Read-only reviewer: **PASS for `6c0eacb..4ec7ffb`**, all seven reported findings resolved; no remaining actionable defects. Reviewer inspected the integrated practice diff and reused manager execution evidence rather than independently rerunning tests. Foundation has its own completed review.
- Worktree/base verification: user main remained `main` at `6c0eacb`; its unrelated untracked files remained untouched. Worker branches were clean on completion.

**Implemented and verified:** practice-owned findings and agreed practice-side Connect interfaces listed above. **Blocked:** lint startup only. **Deferred/unverified:** real live authenticated/Convex journeys, actual browser-toolbar zoom, performance profiling, and later authorized deployment; no local implementation is blocked. No audit finding was conclusively disproved; source-only baseline risks are labeled explicitly rather than promoted to reproduced failures.

**Merge order / shared contracts:** consume Foundations through `57e5a04` before the practice consumer changes. Include additive TypingArea restoration props/`typedText` with Multiplayer reconnect callers. `practice-limits.ts` must precede Multiplayer's host/plan/server range imports; shared bounds are text 1–6rem, duration 1–25199 seconds, words 1–9999, ghost 1–200 WPM. Take the dedicated solo completion helper/validator with the frontend completion changes. No schema or package changes originate in this lane.
