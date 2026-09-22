# TypeSetGo Agent Handbook

This file is the operating guide for any coding agent working in this repository.
Use it as your default orientation document before making changes.

---

## 1) Project Snapshot

TypeSetGo is a React + Convex typing platform focused on:
- solo typing practice,
- real-time multiplayer ("Connect"),
- user stats/leaderboards,
- personalization (themes/sounds/settings),
- optional authentication with Clerk.

High-level architecture:
- **Frontend:** Vite SPA (`src/`) with React 19 + TypeScript.
- **Backend:** Convex functions + schema (`convex/`).
- **Auth:** Clerk (enabled when publishable key is present).
- **Static content pipeline:** Vite plugin auto-generates manifests for themes/words/quotes/sounds and a separate theme browsing catalog.

---

## 2) Tech Stack (Actual Repo)

- **Runtime/package manager:** Bun
- **Frontend:** Vite 8, React 19, React DOM 19, TypeScript 7
- **Routing:** `react-router-dom@7`
- **Realtime/data backend:** Convex (`convex` package, functions in `convex/`)
- **Auth/UI identity:** `@clerk/clerk-react` (optional at runtime)
- **Styling:** Tailwind CSS v4 + Radix primitives + Shadcn/UI patterns
- **Animation:** `framer-motion`
- **Forms/validation:** React state, typed preference adapters, Convex validators
- **Testing:** Vitest + Testing Library (`jsdom`), isolated Playwright/browser acceptance
- **Linting:** ESLint 10 + TypeScript ESLint using the pinned TypeScript 6 JavaScript API; builds retain native TypeScript 7. React Hooks/Refresh rules remain enabled. See [`ui-cleanup/tooling.md`](ui-cleanup/tooling.md).
- **Hosting:** Cloudflare Workers Static Assets at `typesetgo.app`; manual Wrangler deployment; owner-reported Workers Builds connection (unverified), no container workflow

Key alias:
- `@/` -> `src/` (configured in Vite + TS configs)

---

## 3) Environment and Runtime Assumptions

### Required environment variables
- `VITE_CONVEX_URL` (required for Convex client initialization)

### Optional environment variables
- `VITE_CLERK_PUBLISHABLE_KEY` (if missing, auth flows are disabled and app still boots)

### Live service configuration
The live Worker intentionally uses production Clerk with the existing Convex **development** deployment. Convex trusts `https://clerk.typesetgo.app` via `CLERK_JWT_ISSUER_DOMAIN`. Do not migrate data to Convex production as a hosting maintenance task. Local Convex development commands may target the live app's database; inspect the selected deployment before writes.

### Local startup model
Start with `bun run dev:fixture` (isolated UI on port 4317). For a real backend use an isolated checkout and explicit env file/expected target with `bun run convex:dev`; see [development targets](development.md). Never use the live cloud development deployment for tests.

---

## 4) Command Reference

- **Install deps:** `bun install`
- **Dev server:** `bun run dev`
- **Build:** `bun run build` (explicit native TypeScript 7 project build + Vite; includes Worker source checking)
- **Lint:** `bun run lint`
- **Unit tests (watch):** `bun run test`
- **Unit tests (single run):** `bun run test:run`
- **E2E test command:** `bun run test:e2e` (all isolated browser suites), or append `practice`, `fonts`, `profiles`, `connect`, `connect-session`, or `race`. Build first for `fonts` (included in the default run); see the browser guide for fixture environment values.
- **Convex dev:** `bun run convex:dev --env-file PATH --expect local:NAME` (explicit target required)
- **Convex deploy:** `bun run convex:deploy`
- **Preview production build:** `bun run preview`
- **Local Worker:** `bun run cf:dev` (build `dist/` first)
- **Live Worker deploy:** `bun run cf:deploy` (builds locally and updates `typesetgo.app`; confirm account and build-time backend settings first)

---

## 5) Testing Methodology and Quality Gates

Use this testing strategy for reliable changes.

### A. Fast safety checks (minimum expected before handoff)
1. `bun run build`
2. `bun run test:run`

These catch type errors, bundling issues, and unit regressions.

### B. Lint discipline
- Run `bun run lint` when touching multiple files, shared utilities, hooks, or architecture-level code.
- Treat lint errors as real failures; do not leave avoidable warnings/errors.

### C. Unit tests (current setup)
- Framework: Vitest (`vitest.config.ts`)
- Env: `jsdom`
- Setup file: `tests/setup.ts` (Testing Library jest-dom)
- Include pattern: `tests/unit/**/*.test.{ts,tsx}`

Current repo state:
- Unit tests cover shared theme/auth/overlay contracts, practice input/session/preferences, profile capabilities, and multiplayer handlers against in-memory fixtures. Registered backend contract tests additionally use `convex-test` with real validators/schema/indexes and identity contexts; they do not verify deployed infrastructure.
- If you modify utility behavior, validation logic, or deterministic transforms, add/adjust unit tests in `tests/unit/`.

### D. E2E posture
- `bun run test:e2e` runs the central `tests/browser/run.mjs` suite coordinator.
- Reusable browser fixtures/specs live under `tests/browser/`, `tests/fixtures/`, and `tests/e2e/`. Each uses local auth/data substitutes, isolated Vite caches, and refuses external service requests. No credentials or Convex server are required.
- Installed Chrome is the default. Browser overrides, suite selection, safety boundaries, and artifact locations are in [`../tests/browser/README.md`](../tests/browser/README.md).
- Keep fixture ports/configuration changes coordinated centrally. Tests must not reuse a different checkout’s server or target the live development database.

### E. Manual smoke checks (recommended for UI behavior changes)
At minimum verify:
- home route loads,
- race/connect routes render without crashes,
- settings/theme/sound interactions still function,
- modified flows with local mocked queries/mutations or an explicitly verified isolated backend; never use the live development deployment as a test database.

---

## 6) Project Layout (Simple Tree + Purpose)

```text
typesetgo/
├── src/                      # Frontend SPA source
│   ├── pages/                # Route-level pages (Home, Connect, Race, etc.)
│   ├── components/           # Feature and shared components
│   │   └── ui/               # Shadcn/Radix-style UI primitives
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities, adapters, constants, stores
│   ├── context/              # React context providers (theme, etc.)
│   ├── types/                # TypeScript domain types
│   ├── App.tsx               # Theme, motion, router and toast composition
│   └── main.tsx              # App bootstrap/providers
├── convex/                   # Convex backend functions + schema
│   ├── schema.ts             # Database schema + indexes
│   ├── *.ts                  # Query/mutation/action modules
│   └── _generated/           # Auto-generated Convex artifacts (do not hand-edit)
├── public/                   # Static assets/content
│   ├── themes/               # Theme JSON files
│   ├── words/                # Word lists
│   ├── quotes/               # Quote sets
│   ├── fonts/                # Local WOFF2, licenses and pinned source catalog
│   └── sounds/               # Sound packs
├── tests/                    # Vitest + isolated browser tests/fixtures
├── docs/                     # Feature docs, PRDs, release notes, deployment docs
├── worker/                   # Worker asset handler + generated runtime types
├── wrangler.jsonc            # Live Worker account, domain, and asset configuration
├── vite-plugin-auto-manifest.ts # Generates data manifests for public content
└── AGENTS.md                 # This handbook
```

---

## 7) Frontend Architecture Notes

### Bootstrap/provider stack (`src/main.tsx`)
Provider order is:
1. `StrictMode`.
2. When configured, `ClerkProvider` and `ConvexClerkProvider`; otherwise anonymous `ConvexProvider`.
3. `AppAuthProvider`, exposing safe `useAppAuth` availability and guarded account actions.
4. `AccountProvider`, owning authenticated account synchronization and readiness, then account-scoped `NotificationProvider`.
5. `App`: `ThemeProvider` → `IconProvider` → `MotionConfig reducedMotion="user"` → `RouterProvider` and themed `Toaster`.

Important behavior:
- Missing Clerk configuration continues with a supported anonymous experience. Loading and failed auth remain distinct states.
- A static footer in `index.html` is hidden after React hydration.
- Invalid bootstrap configuration can fail before route recovery; isolated browser fixtures bypass live providers deliberately.

### Notifications

- `src/components/ui/toast.tsx` adapts shadcn's Base UI Toast with TypeSetGo theme tokens, top-center stacking, seven visible toasts, and a four-second default timeout. Achievement toasts use five seconds and tier styling. The expanded stack scrolls on short viewports.
- Import `toast` from `@/lib/toast-manager` for temporary feedback (`add`, `update`, `close`, or `promise`). Use `useNotify` from `@/hooks/useNotify` to deliver a new notification to both the toast and bell history; `{ persist: false }` opts out of history.
- `NotificationProvider` retains the latest 50 entries under localStorage keys `typesetgo_notifications:user:<Clerk ID>` or `typesetgo_notifications:guest`, including read state. Account changes switch the visible history without remounting practice. The old unscoped key is not imported because its owner cannot be determined; histories do not sync across devices. Convex stores earned achievements, not this inbox.
- Dismissing a toast does not mark its history entry read. Restoring history never emits toasts; call notification delivery from new event handlers rather than effects watching the stored list.
- Dialogs ignore outside interactions targeting the toast viewport, so closing a toast does not dismiss the underlying form. Toasts use polite announcements and do not automatically focus; F6 reaches the viewport outside modal focus traps.
- `tests/unit/foundations-toasts.test.tsx` covers delivery/history behavior; the practice browser suite includes `tests/browser/practice/toasts.mjs` for themes, keyboard focus, modal feedback, scrolling, and timer behavior.

### Routes (`src/components/layout/app-routes.ts`)
Lazy route modules cover Home, leaderboard/profile, Connect host/join, race lobby/active/results, lessons, admin, and legal/info pages. `RouteRecovery.tsx` supplies loading, route error, and not-found recovery. Race/Lessons navigation remains disabled; route existence does not mean an unfinished feature is enabled.

Use React Router links and hooks. Avoid alternate navigation systems. Header now participates in normal page flow; do not reintroduce fixed-header clearance spacers.

---

## 8) Backend Architecture Notes (Convex)

Primary schema tables in `convex/schema.ts` include:
- `users`
- `testResults`
- `typingSessions`
- `rooms`
- `participants`
- `userPreferences`
- `userAchievements`
- `userStreaks`
- `userStatsCache`
- `leaderboardCache` (legacy rows retained for schema compatibility; no runtime reader/writer)
- `achievementProgress`
- `raceResults`

Patterns in this codebase:
- timestamp-based lifecycle fields (`createdAt`, `updatedAt`, etc.)
- explicit indexes for common lookups
- bounded achievement progress and profile stats cache; leaderboard queries read indexed results directly
- anti-cheat/session tracking in typing session records

Convex guidance:
- Keep args validated with Convex validators.
- Preserve index-aware query paths when editing data access logic.
- **Never manually edit** `convex/_generated/*`.

---

## 9) Static Content and Manifest Pipeline

Webfonts are checked in under `public/fonts/` with per-family licenses and source/hash metadata. `src/fonts.css` declares lazy, same-origin faces and is imported by `src/index.css`. Preserve settings keys and system fallbacks in `src/lib/typing-fonts.ts`. See [`../public/fonts/README.md`](../public/fonts/README.md) for the font inventory, provenance, loading contract and update checks. Font assets and their catalog are not generated by the manifest plugin below.

The custom plugin `vite-plugin-auto-manifest.ts` auto-generates manifests for:
- `public/themes/manifest.json`
- `public/themes/catalog.json` (compact browsing metadata, separate from the startup manifest)
- `public/words/manifest.json`
- `public/quotes/manifest.json`
- `public/sounds/manifest.json`

Generation runs:
- on build start,
- during dev via file watcher add/change/remove events; generated outputs are ignored to prevent loops.

Rules:
- Add/edit/remove source content files; do not manually maintain generated files.
- Manifests and the theme catalog are git-ignored generated artifacts.
- The practice picker uses `fetchThemeCatalogIndex()` to browse without loading all palettes. Full palettes load on preview/selection using the existing cache and prioritized queue. `fetchAllThemes()` remains available for older callers; Host now uses catalog metadata and selected-palette loading.

---

## 10) Coding Conventions (Enforced Team Norms)

- Use **TypeScript** throughout; keep strict typing intact.
- Use **functional React components** and hooks; no class components.
- No `"use client"` directives (not a Next.js app).
- Formatting baseline: double quotes, semicolons, 2-space indentation.
- Naming:
  - components: `PascalCase.tsx`
  - utility modules: kebab-case (for example `color-utils.ts`)
- Imports:
  - external first, internal second,
  - prefer `@/` alias for local source imports.
- Prefer existing UI primitives under `@/components/ui/` before introducing new base components.
- Use `@phosphor-icons/react` with `Icon`-suffixed exports for all UI icons, including shared Shadcn controls. Custom artwork or text glyphs are fallbacks only when Phosphor has no suitable icon; logos, profile photos, and player-selected avatars remain content.
- `src/components/ui/icon-provider.tsx` sets the shared defaults to `weight="bold"` and a 24px fallback size. Use `weight="regular"` where lighter artwork is needed (the large WPM/accuracy result icons), and `weight="fill"` for solid indicators such as the dropdown radio dot. Use Phosphor weights rather than SVG `strokeWidth`; CSS size classes and explicit `size` props still control dimensions. Browser fixtures use the same provider as the app.
- `components.json` selects `"iconLibrary": "phosphor"` for future Shadcn components; it does not rewrite existing components. Check newly generated imports for the `Icon` suffix and replace icon `strokeWidth` styling with the appropriate weight.
- Place action icons before their text with `gap-2`; hide decorative icons with `aria-hidden="true"` and give icon-only controls an accessible label. Disclosure indicators may stay at the trailing edge of selects and menus.
- Keep icon families consistent across screens and states: `FloppyDiskIcon` / `CheckCircleIcon` / `WarningCircleIcon` for save actions, `CircleNotchIcon` while pending, `ArrowClockwiseIcon` for repeat/reset, `ArrowsClockwiseIcon` for refresh/retry, `ArrowFatRightIcon` for advancing tests, `ArrowLeftIcon` for back navigation, `SignOutIcon` for leaving a room, `CopyIcon` / `CheckIcon` for copying, and `TrashIcon` for deletion. Keep the labels that distinguish a failed save from an invalid result.
- Achievement definitions use typed icon names from `src/lib/achievement-icons.ts`; render them with `AchievementIcon` so cards, details, toasts, and notification history use the same symbol.

---

## 11) Agent Workflow (Recommended Operating Procedure)

When implementing non-trivial changes:
1. Read relevant feature code and nearby utilities/types.
2. Confirm whether changes also impact Convex functions/schema.
3. Implement smallest coherent diff.
4. Update or add tests when behavior changes.
5. Run at least:
   - `bun run build`
   - `bun run test:run`
6. Run `bun run lint` when scope is medium/large or shared code touched.
7. Summarize risks, edge cases, and any deferred items.

---

## 12) Boundaries and Safety Rules

- **Git operations:** never run `git add`, `git commit`, `git push`, force pushes, or history rewrite unless explicitly asked by the user.
- **Generated files:** do not manually edit:
  - `convex/_generated/*`
  - manifest files in `public/*/manifest.json`
  - theme browsing index `public/themes/catalog.json`
- **Keep unrelated edits out of scope:** do not opportunistically refactor unrelated modules.
- **Prefer incremental, reversible changes** over large unscoped rewrites.

---

## 13) Helpful File Landmarks

- App entry/providers: `src/main.tsx`
- Routes: `src/components/layout/app-routes.ts`
- Typed preference adapters: `src/lib/practice-preferences.ts`; backend validators: `convex/schema.ts` and function arguments
- Theme/sound/content helpers: `src/lib/*`
- Convex schema: `convex/schema.ts`
- Convex features: files like `convex/rooms.ts`, `convex/participants.ts`, `convex/raceResults.ts`
- Build/test configs:
  - `vite.config.ts`
  - `vitest.config.ts`
  - `eslint.config.js`
  - `tsconfig.app.json`

---

## 14) Documentation Map

For feature intent and product context, use:
- `docs/features/` for implementation-level feature docs
- `docs/PRDs/` for product requirements and roadmap context
- `docs/release-notes/` for shipped behavior snapshots
- `docs/deployment/CLOUDFLARE_GUIDE.md` for live Worker deployment, migration history, and verification status; Docker/VPS hosting is retired

---

## 15) Quick Start Checklist for New Agents

Before coding:
- Read this file.
- Inspect `src/App.tsx` and relevant feature modules.
- Inspect related Convex files if data flow is involved.

Before final handoff:
- Ensure changed behavior is tested (unit and/or manual smoke tests).
- Run `bun run build` and `bun run test:run`.
- Mention any constraints, unknowns, or follow-up recommendations.
