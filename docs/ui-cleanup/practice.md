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

Agreed Multiplayer contracts (implementation pending):

- Join resolves host-led plans into a concrete locked mode; no local autonomous plan execution is enabled.
- Join keys practice by room/run/reset/step identity. Stopped Connect freezes input, timer, and progress emissions; changing the key starts a fresh run. The same key can pause and resume.
- Timed modes are Time and Preset with `presetModeType: "time"`. A timed preset also finishes if its finite supplied text is exhausted.
- TypingArea gains compatible optional `initialInput` and `initialElapsedMs` props, applied on mount. `TypingStats.typedText` carries exact input for reconnect; callback identity alone must not emit progress.

Agreed Foundations contracts (implementation pending):

- Existing Dialog/Popover interfaces remain compatible; semantic Tailwind roles and additive `tv.ui` tokens provide UI contrast.
- `useAppAuth` in `@/components/layout/useAppAuth` safely represents disabled/unavailable authentication.
- Header participates in document flow; practice's obsolete fixed-header spacer must be removed with that dependency.
- `fetchThemeCatalog` / `retryThemeCatalog` return themes, failed IDs, manifest error, and completeness; the practice picker requests its catalog on opening and displays loading/partial/error states.

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

Implementation and final validation results will be appended as work completes.
