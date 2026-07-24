# Foundation

Phase 1 MVP scaffold before domain verbs or live Telegram. Spec: [roadmap.md](../../spec/roadmap.md) Phase 1. Arch: [architecture.md](../../tech/architecture.md).

## Why

No application packages exist yet. Before Check-in verbs, Session hub, or Grammy can land, the repo needs a Bun workspace, shared TypeScript baseline, lint/typecheck gate, env naming, SQLite ownership in `@sobri/core`, and a process that boots cleanly. This board is that scaffold only.

## Themes (all resolved)

1. Bun workspace monorepo — root + `@sobri/core` + `@sobri/telegram` packages exist
2. Shared TypeScript baseline — base tsconfig and package scripts typecheck
3. Lint and typecheck gate — `bun run lint` / `bun run typecheck` from root; optional pre-commit
4. Env naming and config load — documented names, example file, fail-fast load
5. SQLite store shell — core owns DB path, connection, migration runner skeleton
6. Runnable process boot — one entry opens config + DB and exits/stays healthy without product features

## Non-goals

- Product durable verbs (Check-in, Deadline, Grace Token, Checklist)
- Session hub / idle timeout / Mastra agent loop
- Live Grammy group bot or `/settings`
- Day / Check-in / memory schema
- Deploy, GHCR, Docker Compose
- sushkobot V1 database import

## Related

- Architecture: [architecture.md](../../tech/architecture.md)
- Roadmap Phase 1: [spec/roadmap.md](../../spec/roadmap.md)
- Superseded process: this feature was ported from the legacy in-repo ticket system (`tech/foundation-tasks.md`, now removed) to `.scratch/` per [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md)
