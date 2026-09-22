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

## Generated types without a deployment

`bun run convex:codegen:offline` uses the installed Convex 1.45 CLI's local application code generator (`--system-udfs --typecheck disable`). Its inspected branch calls local `doCodegen`, without deployment credentials or a network push. The project has no Convex components. This hidden CLI switch is version-sensitive: recheck its implementation when upgrading Convex or adding components. Run the app build and Convex typecheck afterward; never hand-edit generated files.

## State and compatibility choices

- UTC dates define activity streaks and daily totals. Explicit browser-local date/hour/month/weekday facts support calendar badges; month is zero-based. Historical rows without local facts do not earn badges by assuming a timezone.
- Achievement progress is incremental. Refresh, deletion, and admin invalidation use the same evaluator; large histories rebuild in scheduled batches of 100. The UI reports a queued refresh and reactive awards update on completion. No historical result backfill was run.
- Multiplayer uses a random private browser credential, hashed in the backend and omitted from public responses. Old rooms without credentials expire rather than receive a permission bypass. A browser storage reset loses its old room ownership; create a new room.
- Account initialization has one owner, `AccountProvider`; private feature queries wait for readiness. Notification history is partitioned by account or guest. The previous unscoped history is not copied to any account because its owner is unknown.
- Error-sound selection has no active assets or consumer and is removed from frontend settings/persistence. Optional legacy backend fields remain accepted for existing rows and older clients.
- The legacy leaderboard-cache table is retained for existing database rows, but no active code reads or writes it. Removing stored legacy rows is a separate maintenance operation.

No backend deployment, data migration, cloud configuration change, or push is included in the local remediation work.

## Releasing this branch after review

This branch adds Convex functions and changes multiplayer mutation arguments. The frontend and backend need a coordinated release to the existing intended deployment; publishing only the frontend against old functions is not supported. A push to `main` may trigger only the Worker build, which does not deploy Convex. Plan the backend/frontend release together and have existing multiplayer users create new credential-backed rooms or reload their clients. No release command was run during remediation.
