# Documentation map

Current setup and behavior are described by [the root README](../README.md), [agent handbook](AGENTS.md), [development targets](development.md), [tech stack](TECH-STACK.md), and [browser testing guide](../tests/browser/README.md). Source and tests are authoritative when older prose disagrees.

[Codebase improvements](CODEBASE-IMPROVEMENTS-2026-09-23.md) is the current review and implementation checklist. The [September 22 codebase review](CODEBASE-REVIEW.md) records resolved findings and their verification history.

Current feature details: [typing](features/Core_Typing_Engine.md), [Connect](features/Connect_Multiplayer.md), [solo validation](features/Solo_Anti_Cheat.md), [content](features/Content_Management.md), and [fonts](../public/fonts/README.md).

Historical context:

- `PRDs/`, `TODO.md`, `THEME-VARIANTS-PLAN.md`, and the older sections of root `ToDo.md` describe intentions and past work, not guaranteed current functionality.
- `UI-CLEANUP-AUDIT.md` and `ui-cleanup/` record an earlier UI cleanup. Their old source paths, counts, and deferred items may have been superseded. `ui-cleanup/tooling.md` remains the explanation of the supported compiler/parser split.
- `release-notes/` describes releases at their recorded dates.
- [The deployment guide](deployment/CLOUDFLARE_GUIDE.md) distinguishes checked-in configuration from historical remote observations. Workers Builds was reported connected by the owner; a successful automatic deployment has not been recorded or newly verified.

Update the current guides when changing a public contract. Preserve historical records as history rather than silently presenting their old instructions as current setup.
