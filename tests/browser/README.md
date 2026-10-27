# Isolated browser acceptance

Run from the repository root after `bun install --frozen-lockfile`. Requires Bun 1.3.3+, Node.js 22.12+, and installed Google Chrome by default.

```sh
VITE_CONVEX_URL=https://fixture.invalid VITE_CLERK_PUBLISHABLE_KEY= bun run build
bun run test:e2e
bun run test:e2e practice
bun run test:e2e fonts
bun run test:e2e profiles race
bun run test:e2e connect
```

The `fonts` suite (included in the default run) requires a current `dist` build. It checks the real built CSS and static font files with bootstrap scripts removed, so the production asset check never starts Clerk/Convex. It uses a separate strict loopback preview port, 4318. Other suites do not require a build.

The central runner executes suites sequentially and exits unsuccessfully when a suite fails. It does not reuse an existing fixture server. Stop a server you own before rerunning its suite; do not stop another checkout's process.

## Suites and boundaries

| Suite | Components exercised | Data and identity |
| --- | --- | --- |
| `practice` | Real Home, header, practice engine/results, the test settings pill with its custom length and own-text editors (wide and 320/390px phones), stored themes and fonts, TypingArea, and toast/history delivery | Local auth/Convex replacements; allowlisted simulated ranked calls, delayed preferences, and controlled public datasets |
| `fonts` | Real Home in fresh contexts with each stored font (the picker lives on the Profile page); all 65 webfonts, built CSS/font/license paths | Reuses the practice fixture; blocks foreign origins including Google Fonts/CDNFonts; verifies successful FontFace loads and actual rendered custom-font glyphs, plus all shipped subset/weight/style combinations in the build |
| `profiles` | Real Profile page (`/profile`: stats/chart, history timeline, achievement journeys, keyboard settings, `/user/:userId` redirect), leaderboard and notification dialogs | Synthetic owner/visitor/anonymous, legacy metrics, loading/empty/missing and failed actions |
| `connect` | Real App routes and header: Connect landing (Host/Join cards, code lookup, recent rooms), host panel (test list states, editor, pacing, overrides, participants board, fullscreen/pop-out), participant room (lobby, real TypingPractice, host- and self-paced results, Up next splash, summary, removed/ended) and the pop-out board, plus 360px overflow checks | In-memory `convex/connect.ts` stand-in seeded per scenario (`?fixture=`); host actions from "another tab" are simulated through `window.__connectFixture`; Clerk disabled |
| `race` | Real landing (join/host switch), lobby track map, live track and standings, results podium, avatar picker and TypingArea | Local membership/run/input snapshots, delayed and rejected actions, reconnect and reactive echoes |

Fixtures bind to loopback and replace remote service modules. They require no `.env`, Clerk account, or Convex deployment. The repository's Convex development deployment serves the live app and must not be used for these tests. Browser requests outside the fixture are blocked. This is UI and mocked-contract acceptance, not proof of real authentication or network behavior.

The Practice fixture serves explicit local manifest responses and an in-memory theme browsing index before Vite indexes public files; both use the checked-in theme JSON files and the shared catalog metadata builder. It does not rewrite application manifests. `practice/theme-catalog.mjs` checks the full catalog's cold/warm requests, palette isolation, and preview layout; `practice/alignment.mjs` checks justified row geometry and editing. Fixture caches are separated from application/other-worktree caches. The central runner selects the repository root so Tailwind scans the intended sources, including when invoked by absolute path.

Backend boundaries additionally have `convex-test` suites under `tests/unit/*contract*`: they execute registered validators, schema/index behavior and authenticated identities without a remote deployment. Mock-runtime acceptance does not establish production auth configuration. The bootstrap unit test exercises the production provider wiring with transport mocked.

Vite dependency discovery uses each actual fixture entry (not the production root HTML). The Connect fixture (`tests/fixtures/connect-browser/`, port 4319) renders the real `App` and replaces only `convex/react` and `@clerk/clerk-react`. Its mock store mirrors the server's view projections and the mutation transitions the scenarios need; unmocked queries or mutations throw. It serves in-memory word/quote/theme/sound manifests because the generated public manifests are gitignored. Seeds live in `mock-convex.ts`; add a seed there rather than branching inside the spec.

## Browser choice and evidence

Select another installed browser channel with `PLAYWRIGHT_CHANNEL`, or use an explicit Chromium executable with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. These options do not download browsers or choose a remote browser.

Practice screenshots use `TYPESETGO_BROWSER_ARTIFACTS` when set, otherwise the system temporary `typesetgo-browser-acceptance` directory. Profiles prints a fresh temporary screenshot directory. Multiplayer Playwright configs write failure artifacts under the system `/tmp/typesetgo-*-results` paths; their specs also capture representative screenshots under `/tmp/typesetgo-*`.

A passing run covers the assertions in these fixtures: narrow/wide layouts, representative light/dark themes, long content, keyboard navigation, reduced motion, and failed-request recovery. Zoom cases exercise CSS zoom or the equivalent smaller CSS viewport. Native browser-toolbar zoom, real multi-device reconnection and every catalog theme are separate verification scopes.

Font assertions use Chromium's DevTools rendered-font API, so their browser override must support CDP. Font evidence includes `fonts-picker-*` and `fonts-practice-*` screenshots in the usual artifact directory. Inventory, source versions, licenses, byte counts, coverage and limitations are documented in the [local font guide](../../public/fonts/README.md).

## Maintaining the harness

Integration owns shared browser configuration and package scripts. Feature owners own their scenario assertions and local fixture contracts. Keep public module aliases aligned with application interfaces when components move. Unexpected mutations must fail in fixtures instead of falling through to a real service.

The [integration ledger](../../docs/ui-cleanup/integration.md) maps all 81 audit findings to owners and distinguishes code integration from independent verification. The [tooling note](../../docs/ui-cleanup/tooling.md) describes the deliberate TypeScript compiler/parser split.
