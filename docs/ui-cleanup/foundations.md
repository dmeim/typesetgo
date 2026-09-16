# Foundations UI cleanup

## Stable integration contract

These contracts are additive. Existing raw theme/typing roles and supported features stay compatible. The audit supplies hypotheses; implementation requires reproduction or decisive source evidence.

- **Semantic colors:** Tailwind `background/foreground`, `card/card-foreground`, `popover/popover-foreground`, `primary/primary-foreground`, `secondary/secondary-foreground`, `muted/muted-foreground`, `accent/accent-foreground`, `destructive/destructive-foreground`, `border`, `input`, and `ring` map to live palette roles. `tv.ui` exposes the same camelCase roles for inline consumers. Readable UI foreground roles target at least 4.5:1 on their assigned surfaces; focus/input boundaries target 3:1. `tv.typing` and existing raw palette roles retain theme identity and deliberately subdued exercise text. Do not use a typing role for UI labels or assume `text.inverse` contrasts with every highlight.
- **Effective mode:** `useTheme().mode` is the actual supported `light | dark` mode. The provider owns root `.dark`, `data-theme-mode`, and native `color-scheme`. Consumers (including Sonner) read this mode; they do not independently infer OS mode. Theme selection commits palette, mode, state, and persistence together; the latest request wins.
- **Overlays:** Use existing `Dialog`, `Popover`, `DropdownMenu`, and `Select` primitives. Modal content has a title, optional description, bounded viewport scrolling, an accessible close control, focus trap/restoration, Escape handling, and solid matte surfaces. Put nested overlays inside the owning primitive tree. Intentional nondismissal must be an explicit Radix handler. Consumers keep their controlled `open/onOpenChange` APIs and composition; no custom backdrop listeners.
- **Motion:** App-level `MotionConfig reducedMotion="user"` plus CSS media policy cover shared presentation. `useAnimatedCounter` must cancel outstanding work and bypass movement/delay under reduced motion. Imperative feature scrolling and Framer opacity/stagger sequences still need consumer adoption when the library policy does not suppress them.
- **Auth capabilities:** An additive shared `useAppAuth`/provider boundary under `src/components/layout/` will expose auth availability/status, user identity, loaded/signed-in flags, and guarded sign-in/profile/sign-out actions without calling Clerk outside its provider. Only the enabled bridge calls Clerk hooks. Feature owners must adopt this boundary in their Clerk-dependent files; foundations will not fabricate a Clerk provider or edit those features.

## Handoff state

- Run: foundations-2026-09-16.
- Manager branch: `codex/ui-foundations`; worktree: `/Users/dimitri/Code/typesetgo-worktrees/foundations`.
- Base: `main` at audit commit `6c0eacb` (ancestor verified during setup).
- Original main checkout has unrelated untracked files; no edits will be made there.
- Authority: focused local commits and worker cherry-picks; no push, deployment, main merge, live Convex write, or data migration.
- Requested model: GPT-6 Astra, XHigh. Workers/reviewer launched with `gpt-6-astra` and `xhigh`; normal execution settings, no service-tier override. Parent settings are controlled by the host; no self-reconfiguration tool is exposed.
- Manager owns shared primitives except `sonner.tsx`, this report, integration, and validation.
- Theme worker owns `src/index.css`, `src/context/ThemeContext.tsx`, `src/lib/theme-vars.ts`, `src/lib/themes.ts`, `src/lib/colors.ts`, `src/types/theme.ts`, `src/components/ui/sonner.tsx`, needed theme data, and `tests/unit/foundations-theme*.test.*`.
- Shell worker owns `src/main.tsx`, `src/App.tsx`, `src/components/layout/*`, `src/components/auth/UserButton.tsx`, `src/pages/Home.tsx`, `src/hooks/useAnimatedCounter.ts`, and `tests/unit/foundations-shell*.test.*` / `foundations-counter*.test.*`.
- Workers must report cross-ownership requirements rather than editing feature files. Foundation shared APIs integrate before feature adoption.

## Status and evidence

Implementation and validation in progress. Final report will distinguish implemented, verified, blocked, and deferred findings, including exact commands, browser coverage, commits, and unresolved consumer dependencies.
