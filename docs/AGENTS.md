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
- **Static content pipeline:** Vite plugin auto-generates manifests for themes/words/quotes/sounds.

---

## 2) Tech Stack (Actual Repo)

- **Runtime/package manager:** Bun
- **Frontend:** Vite 7, React 19, React DOM 19, TypeScript 5.9
- **Routing:** `react-router-dom@6`
- **Realtime/data backend:** Convex (`convex` package, functions in `convex/`)
- **Auth/UI identity:** `@clerk/clerk-react` (optional at runtime)
- **Styling:** Tailwind CSS v4 + Radix primitives + Shadcn/UI patterns
- **Animation:** `framer-motion`
- **Forms/validation:** `react-hook-form` + `zod`
- **Testing:** Vitest + Testing Library (`jsdom`), Playwright script available
- **Linting:** ESLint 9 + TypeScript ESLint + React Hooks/Refresh plugins

Key alias:
- `@/` -> `src/` (configured in Vite + TS configs)

---

## 3) Environment and Runtime Assumptions

### Required environment variables
- `VITE_CONVEX_URL` (required for Convex client initialization)

### Optional environment variables
- `VITE_CLERK_PUBLISHABLE_KEY` (if missing, auth flows are disabled and app still boots)

### Local startup model
Typical dev flow uses two processes:
1. Convex backend dev process (`bun run convex:dev`)
2. Vite frontend dev server (`bun run dev`, port 3000)

---

## 4) Command Reference

- **Install deps:** `bun install`
- **Dev server:** `bun run dev`
- **Build:** `bun run build` (runs `tsc -b` + Vite build)
- **Lint:** `bun run lint`
- **Unit tests (watch):** `bun run test`
- **Unit tests (single run):** `bun run test:run`
- **E2E test command:** `bun run test:e2e` (Playwright)
- **Convex dev:** `bun run convex:dev`
- **Convex deploy:** `bun run convex:deploy`
- **Preview production build:** `bun run preview`

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
- Unit tests are lightweight and currently concentrated in `tests/unit/lib.test.ts`.
- If you modify utility behavior, validation logic, or deterministic transforms, add/adjust unit tests in `tests/unit/`.

### D. E2E posture
- Script exists (`bun run test:e2e`) for Playwright-based testing.
- No committed Playwright config/specs are currently present in the repo tree.
- If you add E2E tests, include a `playwright.config.*` and specs under a clear folder (for example `tests/e2e/`), then document usage in `README.md` and this file.

### E. Manual smoke checks (recommended for UI behavior changes)
At minimum verify:
- home route loads,
- race/connect routes render without crashes,
- settings/theme/sound interactions still function,
- any modified flows still round-trip with Convex queries/mutations.

---

## 6) Project Layout (Simple Tree + Purpose)

```text
typesetgo/
├── src/                      # Frontend SPA source
│   ├── pages/                # Route-level pages (Home, Connect, Race, etc.)
│   ├── components/           # Feature and shared components
│   │   └── ui/               # Shadcn/Radix-style UI primitives
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities, schemas, constants, stores
│   ├── context/              # React context providers (theme, etc.)
│   ├── types/                # TypeScript domain types
│   ├── App.tsx               # Route declarations
│   └── main.tsx              # App bootstrap/providers
├── convex/                   # Convex backend functions + schema
│   ├── schema.ts             # Database schema + indexes
│   ├── *.ts                  # Query/mutation/action modules
│   └── _generated/           # Auto-generated Convex artifacts (do not hand-edit)
├── public/                   # Static assets/content
│   ├── themes/               # Theme JSON files
│   ├── words/                # Word lists
│   ├── quotes/               # Quote sets
│   └── sounds/               # Sound packs
├── tests/                    # Vitest setup + unit tests
├── docs/                     # Feature docs, PRDs, release notes, deployment docs
├── docker/                   # Dockerfile, compose, nginx config
├── vite-plugin-auto-manifest.ts # Generates data manifests for public content
└── AGENTS.md                 # This handbook
```

---

## 7) Frontend Architecture Notes

### Bootstrap/provider stack (`src/main.tsx`)
Provider order is:
1. `ConvexProvider`
2. `NotificationProvider`
3. `ClerkProvider` (conditional on `VITE_CLERK_PUBLISHABLE_KEY`)
4. `BrowserRouter`
5. global `Toaster`

Important behavior:
- Missing Clerk key logs warning and continues without auth provider.
- A static footer in `index.html` is hidden after React hydration.

### Routes (`src/App.tsx`)
Routes are defined with React Router `Routes/Route`.
Current areas include:
- core practice (`/`)
- leaderboard and user stats
- connect host/join
- race lobby/active/results
- lessons and legal/info pages

Routing guidance:
- Use React Router primitives (`<Link>`, hooks such as `useSearchParams`, etc.).
- Avoid introducing alternate navigation systems.

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
- `leaderboardCache`
- `raceResults`

Patterns in this codebase:
- timestamp-based lifecycle fields (`createdAt`, `updatedAt`, etc.)
- explicit indexes for common lookups
- cached aggregate tables for performance (stats/leaderboard)
- anti-cheat/session tracking in typing session records

Convex guidance:
- Keep args validated with Convex validators.
- Preserve index-aware query paths when editing data access logic.
- **Never manually edit** `convex/_generated/*`.

---

## 9) Static Content and Manifest Pipeline

The custom plugin `vite-plugin-auto-manifest.ts` auto-generates manifests for:
- `public/themes/manifest.json`
- `public/words/manifest.json`
- `public/quotes/manifest.json`
- `public/sounds/manifest.json`

Generation runs:
- on build start,
- during dev via file watcher add/remove events.

Rules:
- Add/remove source content files; do not manually maintain manifest files.
- Manifest files are git-ignored and considered generated artifacts.

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
- **Keep unrelated edits out of scope:** do not opportunistically refactor unrelated modules.
- **Prefer incremental, reversible changes** over large unscoped rewrites.

---

## 13) Helpful File Landmarks

- App entry/providers: `src/main.tsx`
- Routes: `src/App.tsx`
- Shared validation schemas: `src/lib/schemas.ts`
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
- `docs/deployment/DOCKER_GUIDE.md` for container deployment details

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
