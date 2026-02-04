# Agent Guidelines

## Commands
- **Build:** `bun run build` (Vite build)
- **Lint:** `bun run lint` (ESLint)
- **Dev:** `bun run dev` (Vite dev server on port 3000)
- **Test:** `bun run test` (Vitest watch mode) or `bun run test:run` (single run)
- **E2E Test:** `bun run test:e2e` (Playwright)
- **Convex Dev:** `bun run convex:dev` (Convex development server)

## Code Style & Conventions
- **Runtime:** Bun
- **Framework:** Vite + React 19 + TypeScript
- **Backend:** Convex (real-time database + backend functions)
- **Styling:** Tailwind CSS v4 + Shadcn/UI
- **Forms:** react-hook-form + zod
- **Routing:** react-router-dom v6
- **Formatting:** Double quotes, semicolons, 2-space indentation.
- **Naming:** PascalCase for components (`TypingPractice.tsx`), kebab-case for utils (`color-utils.ts`).
- **Imports:** Use `@/` alias for `src/` directory. Group external then internal imports.
- **State:** Use React hooks (`useState`, `useEffect`). No class components.
- **Types:** Strict TypeScript; define interfaces in `src/types/` or co-located.
- **Structure:** 
  - `src/pages/` for route components
  - `src/components/` for UI components
  - `src/components/ui/` for Shadcn components
  - `src/lib/` for utilities
  - `src/hooks/` for custom hooks
  - `src/types/` for TypeScript types
  - `convex/` for Convex functions and schema

## Rules
- No `"use client"` directives needed (this is not Next.js).
- Verify changes with `bun run build` and `bun run test:run`.
- Use Shadcn/UI components from `@/components/ui/` when available.
- Use react-router-dom's `<Link>` and `useSearchParams` for navigation.
- **Git:** NEVER perform git operations (add, commit, push) unless explicitly requested by the user.
- **Manifests:** Do NOT manually edit manifest files in `public/` (e.g., theme manifests, sound manifests). These are auto-generated at runtime by Vite plugins.
