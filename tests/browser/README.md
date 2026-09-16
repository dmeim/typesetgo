# Isolated browser acceptance

Run from the repository root after `bun install --frozen-lockfile`. Requires Bun 1.3.3+, Node.js 22.12+, and installed Google Chrome by default.

```sh
bun run test:e2e
bun run test:e2e practice
bun run test:e2e profiles race
```

The central runner executes suites sequentially and exits unsuccessfully when a suite fails. It does not reuse an existing fixture server. Stop a server you own before rerunning its suite; do not stop another checkout's process.

## Suites and boundaries

| Suite | Components exercised | Data and identity |
| --- | --- | --- |
| `practice` | Real Home, header, practice engine/results/dialogs/themes, TypingArea and ColorPicker | Local auth/Convex replacements; allowlisted simulated ranked calls, delayed preferences, and controlled public datasets |
| `profiles` | Real profile/history/chart, leaderboard, achievement and notification dialogs | Synthetic owner/visitor/anonymous, legacy metrics, loading/empty/missing and failed actions |
| `connect` | Real Host, Join membership UI, plans, cards, fullscreen and settings | Local room store; typing executor replaced to isolate dashboard behavior |
| `connect-session` | Real Join and TypingPractice | Local versioned room store; timed preset, Stop, new Start and reset, with no solo-session writes |
| `race` | Real lobby/active/results, race course, avatar picker and TypingArea | Local membership/run/input snapshots, delayed and rejected actions, reconnect and reactive echoes |

Fixtures bind to loopback and replace remote service modules. They require no `.env`, Clerk account, or Convex deployment. The repository's Convex development deployment serves the live app and must not be used for these tests. Browser requests outside the fixture are blocked. This is UI and mocked-contract acceptance, not proof of real authentication or network behavior.

The Practice fixture serves explicit local manifest responses before Vite indexes public files; theme IDs come from the checked-in theme JSON files. It does not generate or rewrite application manifests. Fixture caches are separated from application/other-worktree caches. The central runner selects the repository root so Tailwind scans the intended sources, including when invoked by absolute path.

## Browser choice and evidence

Select another installed browser channel with `PLAYWRIGHT_CHANNEL`, or use an explicit Chromium executable with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. These options do not download browsers or choose a remote browser.

Practice screenshots use `TYPESETGO_BROWSER_ARTIFACTS` when set, otherwise the system temporary `typesetgo-browser-acceptance` directory. Profiles prints a fresh temporary screenshot directory. Multiplayer Playwright configs write failure artifacts under the system `/tmp/typesetgo-*-results` paths; their specs also capture representative screenshots under `/tmp/typesetgo-*`.

A passing run covers the assertions in these fixtures: narrow/wide layouts, representative light/dark themes, long content, keyboard navigation, reduced motion, and failed-request recovery. Zoom cases exercise CSS zoom or the equivalent smaller CSS viewport. Native browser-toolbar zoom, real multi-device reconnection and every catalog theme are separate verification scopes.

## Maintaining the harness

Integration owns shared browser configuration and package scripts. Feature owners own their scenario assertions and local fixture contracts. Keep public module aliases aligned with application interfaces when components move. Unexpected mutations must fail in fixtures instead of falling through to a real service.

The [integration ledger](../../docs/ui-cleanup/integration.md) maps all 81 audit findings to owners and distinguishes code integration from independent verification. The [tooling note](../../docs/ui-cleanup/tooling.md) describes the deliberate TypeScript compiler/parser split.
