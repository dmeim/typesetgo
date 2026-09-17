# AGENTS.md

This file provides coding-agent guidance for TypeSetGo. It replaces the old Claude Code-specific `CLAUDE.md` and is intended for Pi and other coding agents.

For the full handbook, see [`docs/AGENTS.md`](docs/AGENTS.md). Keep this root file as the quick orientation and update both files when project structure or workflows change.

## Project Snapshot

**TypeSetGo** is a React + Convex typing practice platform featuring solo practice modes (Time, Words, Quotes, Zen, Preset), real-time multiplayer Connect/race flows, achievements/streaks, leaderboards, themes with variants, sound packs, and an on-screen keyboard with multiple layouts.

## Commands

```bash
# Development (usually two terminals)
bun run convex:dev      # Start Convex backend
bun run dev             # Start Vite frontend (port 3000)

# Build & Test
bun run build           # TypeScript check + Vite build
bun run test:run        # Unit tests (single run)
bun run test            # Unit tests (watch mode)
bun run test:e2e        # Isolated browser acceptance (installed Chrome by default)
bun run lint            # ESLint

# Deployment
bun run convex:deploy   # Deploy Convex functions
bun run cf:dev          # Serve an existing dist build locally through Wrangler
bun run cf:deploy       # Build locally and deploy LIVE typesetgo.app (confirm target first)
```

**Before handoff/commit:** run `bun run build && bun run test:run` when possible. Add `bun run lint` for broader/shared changes.

## Architecture

- **Frontend:** Vite 8 SPA with React 19 + TypeScript 7 (`src/`)
- **Hosting:** Cloudflare Workers Static Assets (`typesetgo.app`); manual Wrangler deployment, no container build workflow
- **Live services:** production Clerk + existing Convex development deployment (intentional; do not migrate the database)
- **Backend:** Convex real-time functions (`convex/`)
- **Auth:** Clerk, enabled when `VITE_CLERK_PUBLISHABLE_KEY` is set
- **Styling:** Tailwind CSS v4 + Radix primitives + Shadcn/UI-style components
- **State:** React context (`ThemeContext`, notification store) + Convex reactive queries; no Redux/Zustand
- **Package manager/runtime:** Bun

**Import alias:** `@/` -> `src/`

## Key Directories

| Path | Purpose |
|------|---------|
| `src/pages/` | Route-level pages (`Home`, `Connect`, `Race`, `Leaderboard`, `Lessons`, legal/info pages) |
| `src/components/` | Feature components organized by domain (`typing/`, `race/`, `connect/`, `auth/`, `plan/`, `settings/`, `stats/`, `layout/`) |
| `src/components/ui/` | Shadcn/Radix-style UI primitives |
| `src/hooks/` | Custom hooks (`useTheme`, `useSound`, `useAnimatedCounter`, `useSessionId`, `useGridColumns`) |
| `src/lib/` | Utilities, schemas, constants, stores, content loaders |
| `src/context/` | React context providers |
| `src/types/` | TypeScript domain types |
| `convex/schema.ts` | Database schema (11 tables) + indexes |
| `convex/*.ts` | Convex queries/mutations/actions for users, results, rooms, participants, races, achievements, streaks, stats, cleanup, migrations |
| `convex/lib/` | Convex-side shared helpers/constants |
| `public/themes/` | Theme JSON files (manifest generated) |
| `public/words/` | Word lists (manifest generated) |
| `public/quotes/` | Quote sets (manifest generated) |
| `public/sounds/` | Sound packs (manifest generated) |
| `public/fonts/`, `src/fonts.css` | Local WOFF2 catalog, redistribution notices, provenance, and lazy font-face definitions; see [`public/fonts/README.md`](public/fonts/README.md) |
| `tests/unit/` | Vitest unit tests |
| `tests/e2e/`, `tests/browser/`, `tests/fixtures/` | Isolated browser acceptance, local auth/data fixtures, and Playwright specs |
| `docs/` | Agent handbook, feature docs, PRDs, release notes, deployment docs |
| `worker/`, `wrangler.jsonc` | Worker asset handler, generated runtime types, and live deployment configuration |
| `scripts/` | One-off migration/maintenance scripts |

## Routes (`src/components/layout/app-routes.ts`)

| Route | Page |
|-------|------|
| `/` | Home/main typing practice |
| `/leaderboard` | Leaderboard |
| `/user/:userId` | User stats profile |
| `/connect` | Multiplayer hub |
| `/connect/host` | Host a room |
| `/connect/join` | Join a room |
| `/race` | Race creation/selection |
| `/race/lobby/:lobbyId` | Race lobby |
| `/race/:raceId` | Active race |
| `/race/results/:raceId` | Race results/podium |
| `/lessons` | Lessons mode |
| `/about`, `/privacy`, `/tos` | Info/legal pages |
| `/admin` | Existing review route; backend capability dependent |
| Other paths | Themed not-found recovery |

## Provider Stack (`src/main.tsx`)

`NotificationProvider` -> optional `ClerkProvider` -> `ConvexClerkProvider` (or anonymous `ConvexProvider`) -> `AppAuthProvider` -> `App`. App owns `ThemeProvider`, `MotionConfig reducedMotion="user"`, lazy `RouterProvider`, and themed `Toaster`.

Notes:
- `VITE_CONVEX_URL` is required for the Convex client.
- Missing `VITE_CLERK_PUBLISHABLE_KEY` logs a warning and disables auth-only features.
- Feature auth uses `useAppAuth`; it safely describes missing/unavailable Clerk.
- `ThemeProvider` wraps routes and Toaster inside `App`. Route boundaries cover loading/render failures; bootstrap configuration must still be valid.
- Notifications use the themed shadcn Base UI `src/components/ui/toast.tsx`. Use `toast.add` from `@/lib/toast-manager` for temporary feedback, or `useNotify` for a toast plus notification-center history. History stays in browser localStorage (latest 50; not account-scoped or synced to Convex).
- Browser acceptance uses local mocks, never the live Convex development deployment. See [`tests/browser/README.md`](tests/browser/README.md).
- The `fonts` browser suite also checks production CSS/assets; build first with fixture environment values as documented in the browser guide.
- Build pins native TypeScript 7; lint uses the compatible TypeScript 6 API. Use `bun run build`, not an ambiguous bare `tsc`; see [`docs/ui-cleanup/tooling.md`](docs/ui-cleanup/tooling.md).

## Generated Files (Do Not Edit)

- `convex/_generated/*` — Convex generated artifacts
- `public/*/manifest.json` — generated by `vite-plugin-auto-manifest.ts`
- build outputs such as `dist/`

## Conventions

- Functional components and hooks only; no class components.
- No `"use client"` directives (this is Vite, not Next.js).
- Double quotes, semicolons, 2-space indentation.
- Components: `PascalCase.tsx`; utilities: `kebab-case.ts` where applicable.
- Prefer `@/` imports for local `src/` modules.
- Prefer existing `@/components/ui/` primitives before adding base UI components.
- Keep changes focused; avoid unrelated refactors.
- Do not run git write operations (`git add`, `commit`, `push`, history rewrites) unless explicitly asked.

## More Context

- [`docs/AGENTS.md`](docs/AGENTS.md) — comprehensive agent handbook
- [`docs/TECH-STACK.md`](docs/TECH-STACK.md) — technology inventory
- [`docs/deployment/CLOUDFLARE_GUIDE.md`](docs/deployment/CLOUDFLARE_GUIDE.md) — live Worker deployment, migration history, and verification status
- [`docs/features/`](docs/features/) — feature implementation docs
- [`docs/PRDs/`](docs/PRDs/) — product requirements and roadmap context
