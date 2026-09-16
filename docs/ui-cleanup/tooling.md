# Lint and compiler compatibility

## Running the checks

Use Bun 1.3.3 or newer and the checked-in lockfile:

```sh
bun install --frozen-lockfile
bun run lint
bun run build
bun run test:run
```

`bun run lint` analyzes source with the existing recommended ESLint, TypeScript,
React Hooks, and React Refresh rules. It can exit with source errors; fixing its
startup failure does not make those errors pass. No lint rules or source paths
were suppressed by this repair.

## Deliberate compiler split

The project uses two pinned TypeScript packages:

| Dependency | Version | Purpose |
| --- | --- | --- |
| `typescript` | `6.0.3` | JavaScript compiler API used by `typescript-eslint` |
| `@typescript/native` | `npm:typescript@7.0.2` | Native compiler used by the build |

`typescript-eslint@8.68.0` explicitly rejects TypeScript 7 during import. Its
[supported TypeScript range](https://typescript-eslint.io/users/dependency-versions/)
is `>=4.8.4 <6.1.0`. Microsoft recommends keeping the TypeScript 6 API available
alongside the TypeScript 7 compiler for tools such as ESLint in its
[TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).

The announcement's `@typescript/typescript6` wrapper was tested first. Bun 1.3.3
resolved its nested `@typescript/old` alias back to the wrapper itself, leaving
the API empty. This reproduces the failure described in
[Bun issue 33834](https://github.com/oven-sh/bun/issues/33834). The direct
`typescript@6.0.3` dependency avoids that nested alias.

Both installed compiler packages expose a binary named `tsc`. The build therefore
invokes the native compiler by its package path instead of relying on which
package supplies `node_modules/.bin/tsc`:

```sh
node node_modules/@typescript/native/bin/tsc -b
```

`bun run build` runs that command before `vite build`. The existing TypeScript
project references and strict compiler settings remain in effect. Use
`bun run build` for the supported build entry point rather than a bare `tsc`.

When updating TypeScript or typescript-eslint, check the parser's supported API
range and revalidate both compiler resolution and a fresh frozen-lockfile
install. Remove the split only when the parser supports the native compiler API.

## Verification recorded on 2026-09-16

All installs and build artifacts used an independent tooling-worktree
`node_modules` directory, with Bun 1.3.3 and Node 22.22.3.

- Original `bun run lint` at `6c0eacb` exited 2 before analysis with
  `typescript-eslint does not support TS 7.0`.
- A fresh `bun install --frozen-lockfile` with the repair succeeded. The parser's
  resolved TypeScript API reports `6.0.3`; the explicit native compiler reports
  `7.0.2`.
- `bun run build` passed using TypeScript 7.0.2; Vite retained the existing large
  chunk warning.
- `bun run test:run` passed all 55 tests in the four baseline test files.
- Lint completed source analysis with no fatal parser errors on both the
  baseline and integrated UI sources. Both runs exited 1 for the findings below.

The integrated scan used the working tree whose HEAD was `faee829`, including
in-progress browser files, with the tooling worktree's unchanged ESLint
configuration and repaired dependencies. It did not edit the integrated worktree.
Counts describe these source snapshots, before subsequent source fixes.

| Rule | Baseline `6c0eacb` | Integrated `faee829` |
| --- | ---: | ---: |
| `no-useless-assignment` | 3 | 2 |
| `@typescript-eslint/no-unused-vars` | 12 | 10 |
| `@typescript-eslint/no-explicit-any` | 2 | 2 |
| `react-hooks/preserve-manual-memoization` | 3 | 1 |
| `react-hooks/immutability` | 2 | 3 |
| `prefer-const` | 1 | 0 |
| `react-hooks/set-state-in-effect` | 13 | 10 |
| `react-hooks/refs` | 0 | 14 |
| `react-hooks/rules-of-hooks` | 0 | 2 |
| `react-refresh/only-export-components` | 5 | 10 |
| `@typescript-eslint/triple-slash-reference` | 1 | 1 |
| **Total errors** | **42** | **55** |
| `react-hooks/exhaustive-deps` warnings | 5 | 3 |
| Files analyzed | 141 | 217 |
| Files with findings | 17 | 24 |

The toolchain repair leaves these findings available for source owners to fix;
it does not claim a clean lint gate. Source changes and browser acceptance runs
belong to the integration work. The `test:e2e` script now points to the integration
runner, `node tests/browser/run.mjs`. The runner is supplied by the integration
branch and was not exercised in this tooling worktree.
