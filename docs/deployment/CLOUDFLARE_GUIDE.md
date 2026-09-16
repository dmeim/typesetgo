# Cloudflare Worker deployment

TypeSetGo's frontend runs on Workers Static Assets. React/Vite, Clerk authentication, and the Convex backend remain unchanged. Deploying the Worker does not deploy Convex functions or migrate data.

## Current target

- Worker: `typesetgo`, default Wrangler environment.
- Account: **Dimitri Meimaridis** (owner-confirmed for this project).
- Preview: https://typesetgo.dimitri-meimaridis.workers.dev
- Configuration: `wrangler.jsonc`; assets: `dist/`; handler: `worker/index.ts`.
- The frontend now uses **production Clerk** with the existing **development Convex deployment**, intentionally retained by the owner.
- Convex's `CLERK_JWT_ISSUER_DOMAIN` was changed to `https://clerk.typesetgo.app`; no data migration or backend code deployment was performed.
- `wrangler.jsonc` pins the confirmed account. **https://typesetgo.app is attached and serving the Worker over HTTPS.** The owner removed the conflicting VPS A record before attachment succeeded.
- The owner stopped the VPS container and confirmed school Google sign-in and access to existing data on the live Worker. Hosting migration is complete.
- Test production Clerk on `typesetgo.app`; the workers.dev URL is no longer a development-auth test environment.

## Build and deploy

Use the project's installed Wrangler (`bun install` first if dependencies are absent). Confirm the account before deploying:

```bash
./node_modules/.bin/wrangler whoami
bun run build
bun run test:run
./node_modules/.bin/wrangler deploy --config wrangler.jsonc --dry-run
```

Build inputs are `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY`, currently supplied by ignored `.env.local`. These public frontend values are embedded at build time. Setting Worker runtime variables will not change an already-built frontend. Never put secret keys in `VITE_*` variables.

After confirming the target account and backend settings, deploy with an explicit account selector:

```bash
CLOUDFLARE_ACCOUNT_ID=YOUR_CONFIRMED_ACCOUNT_ID bun run cf:deploy
```

Replace the placeholder with the account ID reported by `whoami`, matching `account_id` in `wrangler.jsonc`. This command rebuilds and uploads the frontend, then configures `typesetgo.app` as a custom domain. Only the `ASSETS` binding is configured; no database resources need provisioning. A deploy can partially succeed: always check domain triggers separately from the asset upload.

For local Worker testing, run `bun run build && bun run cf:dev`.

## Verified preview behavior

Before switching to production Clerk, the development-key preview was checked using headless Chrome:

- Direct navigation to `/`, `/leaderboard`, `/connect`, `/race`, `/lessons`, and `/about` returned HTTP 200 and rendered without uncaught page errors.
- Clerk's development sign-in dialog opened.
- A 15-second guest typing test completed and displayed results.
- Build, 55 unit tests, and Wrangler deployment dry run passed.

These initial preview checks did **not** establish authenticated save behavior, production auth compatibility, or multiplayer correctness. Production sign-in was subsequently confirmed by the owner (below). A browser request to the external OpenDyslexic stylesheet at `fonts.cdnfonts.com` was blocked; other tested flows remained usable.

## Production verification and remaining checks

- HTTPS and direct navigation to `/`, `/leaderboard`, `/race`, and `/about` passed with HTTP 200 and no uncaught page errors.
- Production Clerk's sign-in dialog opened with Google and GitHub options. Its script, environment, and client requests returned HTTP 200 on a fresh browser check.
- Browser testing exposed theme-request failures (`ERR_INSUFFICIENT_RESOURCES`, and connection closures during the first check). Theme loading needs follow-up; these checks are not a clean bill of health for every theme. The external font remained blocked, and the analytics beacon reported a certificate error in the test browser.
- The owner confirmed signing in with the existing school Google account and seeing all existing data. Saving a new result and multiplayer have not been explicitly verified after cutover.
- Keep the existing development Convex deployment; do not migrate to Convex production as part of this cutover.
- Final repository-cleanup checks: build and all 55 tests pass. `bun run lint` cannot start because the installed `typescript-eslint` rejects TypeScript 7.0. This existing tooling incompatibility is deferred; the proposed Workers Builds command runs build/tests, not lint.

The initial domain attachment failed with error 100117 despite a conflict-free preflight. The owner removed the old apex VPS A record and deployment then succeeded. Clerk, email, and unrelated DNS records were not changed by the agent.

Deployment is manual until the repository connection below is enabled. The retired Docker publishing workflow, Dockerfile, Compose/nginx configuration, `.dockerignore`, and Docker guide have been removed. `dist/` is now ignored and untracked; always build it from source before deploying. No GitHub Actions workflow is required for Cloudflare Workers Builds.

## Connect the repository to Workers Builds

This is the planned automation, **not yet configured or verified**. After the migration is on GitHub `main`, connect the repository to the **existing** `typesetgo` Worker under Settings → Builds. Do not create a second Worker.

| Setting | Value |
| --- | --- |
| Repository | `dmeim/typesetgo` |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `bun run build && bun run test:run` |
| Deploy command | `bunx wrangler deploy` |
| Build variable `BUN_VERSION` | `1.3.3` |
| Build variable `VITE_CONVEX_URL` | Same URL used by the current live app's Convex development deployment |
| Build variable `VITE_CLERK_PUBLISHABLE_KEY` | Production `pk_live_...` publishable key from ignored `.env.local` |

Configure these under **build variables**, not only Worker runtime variables. The local `.env.local` file is not committed and will not be present in Cloudflare's build environment. Do not add Clerk secret keys, Convex deployment keys, or a Convex deploy step: this pipeline only builds and publishes the frontend.

Start with non-production branch builds disabled; production Clerk authentication is tied to the production hostname. The deploy command uses the project-local Wrangler dependency. Do not use `bun run cf:deploy` as the deploy command when a separate build command is configured, since it would build twice.

After connecting, verify the first build installs the locked dependencies, passes build/tests, deploys to `typesetgo`, and preserves school Google sign-in and existing data. Each subsequent push to `main` will then trigger a live deployment. Review the generated Cloudflare build token's account/zone access.

References: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [build tool versions](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

## Migration record

1. Added the Worker static-asset handler, SPA fallback, Wrangler scripts/types, and updated frontend tooling on `cf`.
2. Deployed and tested a workers.dev preview using development Clerk and the existing Convex development deployment.
3. Rebuilt with production Clerk. The old VPS image had received frontend settings from GitHub Actions build arguments; local Worker builds instead read ignored `.env.local`.
4. Updated Convex's trusted Clerk issuer to `https://clerk.typesetgo.app`, retaining the same database and backend functions.
5. Attached `typesetgo.app` after the owner removed the obsolete apex VPS A record. No unrelated DNS records were changed by the agent.
6. Verified HTTPS, direct routes, production Clerk loading, and owner-confirmed school account/data access. Successful cutover Worker version: `504c86b5-37ea-4f79-bcaa-dd8e99709eff`.
7. Retired the container deployment files and GitHub Actions container publishing; removed generated `dist/` from version control. `main` is the canonical branch for the migrated project.

Remote GHCR images, old GitHub Actions secrets/history, and stopped VPS files have not been deleted. They are not needed by the Worker; removal is a separate remote housekeeping task.

## Recovery and maintenance

Before each update, record the current deployment with `./node_modules/.bin/wrangler deployments list --config wrangler.jsonc` under the confirmed account. Rollback changes live Worker traffic and requires explicit authorization; inspect the installed CLI's rollback help before executing it.

Update this guide when the preview URL, account, backend environment, bindings, or deployment workflow changes. Product improvements and broader code cleanup are separate from this hosting migration. Local `CF_ToDo.md` and `CLEANUP.md` scouting notes are not part of this deployment guide; old preview-only/branch restrictions in those notes are superseded by the completed cutover.
