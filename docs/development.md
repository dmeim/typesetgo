# Development targets

The cloud Convex **development** deployment used by the website holds live data. `convex dev` pushes schema and functions and watches for subsequent changes. It is not just a local web server. Do backend work in an isolated checkout that has no live watcher.

## First run without credentials

```sh
bun install --frozen-lockfile
bun run dev:fixture
```

Open `http://127.0.0.1:4317`. This serves the real Home/practice UI with local data and mocked auth/Convex transport. It does not save to an account. Other fixture routes and suites are described in [browser acceptance](../tests/browser/README.md).

```sh
VITE_CONVEX_URL=https://fixture.invalid VITE_CLERK_PUBLISHABLE_KEY= bun run build
bun run test:run
bun run lint
bun run test:e2e
```

On Node 26+, jsdom tests that touch `localStorage` fail because Node's experimental Web Storage shadows jsdom's. Run them with `NODE_OPTIONS=--no-experimental-webstorage bun run test:run` (CI uses Node 22 and needs no flag).

`convex-test` runs backend validator, identity, schema/index, and lifecycle tests entirely in process. It is not proof of live Clerk configuration or deployed behavior.

## An isolated real backend

Illustrative setup, not executed during remediation: in a separate checkout without live env files, configure a new local development deployment with the installed CLI's `convex dev --configure new --dev-deployment local`. This command starts and writes to that selected backend; inspect its prompts and keep it separate from the existing cloud project. Rename its generated env file to `.env.backend-local`, retain the exact generated `CONVEX_DEPLOYMENT=local:...` value, and supply the corresponding local frontend URL to Vite. Configure Clerk separately if real authenticated development is needed.

The guarded wrapper requires both the env file and the expected deployment identity. Substitute the actual local identity:

```sh
bun run convex:dev --env-file .env.backend-local --expect local:YOUR_DEPLOYMENT --check
bun run convex:dev --env-file .env.backend-local --expect local:YOUR_DEPLOYMENT
```

The first command only validates and prints the selected target. The second starts the watcher. The wrapper rejects deployment keys/self-hosted overrides, unknown options, and mismatched targets. Cloud `dev:` targets additionally require `--allow-cloud`; use that only after independently verifying the target and authorizing its writes. The flag acknowledges cloud writes; it does not prove that a cloud deployment is safe or isolated.

`bun run convex:deploy` remains the raw Convex deployment command and is a separate live operation: with a normal development configuration the CLI selects the project's **production** deployment, not the named development deployment. It is not part of the test or local-start workflow. This project intentionally retains its current development database; do not use that command as an automatic migration step.

For quick throwaway testing, an anonymous local backend also works: copy the repository without `.env*`, `.git`, or `node_modules` (symlink `node_modules` back), replace `convex/auth.config.ts` with `export default { providers: [] };`, and run `CONVEX_AGENT_MODE=anonymous CONVEX_DEPLOYMENT= npx convex dev --codegen disable --typecheck disable` inside the copy. It serves `http://127.0.0.1:3210`; point Vite at it with `VITE_CONVEX_URL=http://127.0.0.1:3210 VITE_CLERK_PUBLISHABLE_KEY= vite` (the `connect-local` entry in `.claude/launch.json` does this on port 5179). Auth-only features are unavailable there.

## Generated types without a deployment

`bun run convex:codegen:offline` uses the installed Convex 1.45 CLI's local application code generator (`--system-udfs --typecheck disable`). Its inspected branch calls local `doCodegen`, without deployment credentials or a network push. The project has no Convex components. This hidden CLI switch is version-sensitive: recheck its implementation when upgrading Convex or adding components. Run the app build and Convex typecheck afterward; never hand-edit generated files.

## State and compatibility choices

- UTC dates define activity streaks and daily totals. Explicit browser-local date/hour/month/weekday facts support calendar badges; month is zero-based. Historical rows without local facts do not earn badges by assuming a timezone.
- Achievement progress is incremental. Refresh, deletion, and admin invalidation use the same evaluator; large histories rebuild in scheduled batches of 100. The UI reports a queued refresh and reactive awards update on completion. No historical result backfill was run.
- Multiplayer uses a random private browser credential, hashed in the backend and omitted from public responses. Old rooms without credentials expire rather than receive a permission bypass. A browser storage reset loses its old room ownership; create a new room.
- Account initialization has one owner, `AccountProvider`; private feature queries wait for readiness. Notification history is partitioned by account or guest. The previous unscoped history is not copied to any account because its owner is unknown.
- Error-sound selection has no active assets or consumer and is removed from frontend settings/persistence. Optional legacy backend fields remain accepted for existing rows and older clients.
- The legacy leaderboard-cache table is retained for existing database rows, but no active code reads or writes it. Removing stored legacy rows is a separate maintenance operation.

Local fixture and verification commands do not deploy the backend, migrate data, change cloud configuration, or push Git commits. Live deployment and publishing are separate, explicitly authorized operations.

## Releasing backend-dependent changes

Deploy the Convex changes **before publishing this frontend**. Solo completion now sends `completed: true` to `typingSessions.recordProgress`, and unranked Words saves send `wordTarget` to `testResults.saveResult`. A backend without these optional arguments can reject the updated client's saves. The new backend continues accepting older clients that omit them.

A push to `main` may automatically build and publish the Cloudflare Worker, but that pipeline does **not** deploy Convex. Keep production Clerk and the existing cloud Convex **development** deployment; do not switch databases or use the raw `bun run convex:deploy` command to target it.

Release order:

1. Confirm the intended `dev:` deployment against the backend URL embedded in the live frontend. Check that no uncontrolled Convex watcher is running.
2. With live backend deployment authorized, use the guarded wrapper with an explicit env file, matching `--expect`, `--allow-cloud`, and `--once`. This pushes schema/functions once and exits rather than leaving a watcher running.
3. Confirm successful deployment and the updated function argument contracts before publishing the frontend.
4. Commit only the intended changes and push to `main`; check GitHub checks and the Cloudflare build/deployment separately.
5. After the frontend publishes, verify authenticated saving and Connect recovery against the intended backend.

### Connect rebuild

The rebuilt Connect adds the `connectRooms` and `connectParticipants` tables, `convex/connect.ts`, `convex/connectCleanup.ts`, and a `cleanupConnect` cron (every 30 seconds). Deploy Convex with the same guarded steps **before** publishing the frontend; the new pages call functions an old backend does not have. Legacy practice-room functions stay deployed so cached old frontends keep working during the rollout. Rooms created with the old Connect are not migrated. See [Connect and Race](features/Connect_Multiplayer.md#deployment-order).

The added `typingSessions.completedAt` and `testResults.wordTarget` schema fields are optional, so existing records do not require a backfill for this release. Historical word targets that were not stored remain unknown. Previously incorrect scores or achievement state are not automatically rewritten; an achievement/stats replay is a separate authorized maintenance operation.
