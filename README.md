# Sobrina

Telegram group sobriety companion — agentic core, conversational Check-ins, Reminder + Deadline rhythm.

**Status:** Bun workspace monorepo scaffold (`@sobrina/core`, `@sobrina/telegram`). Architecture and tickets: [`tech/`](tech/).

**Local gate:** `bun run lint` (oxlint on `packages`) and `bun run typecheck` (`tsc --noEmit` across workspace packages).

**Boot (foundation):** copy `.env.example` → `.env`, set `DATABASE_PATH` to a local SQLite path, then `bun run boot` (config → open DB → migrate → exit 0).

## Docs

| Path | Role |
|------|------|
| [`CONTEXT.md`](CONTEXT.md) | Ubiquitous language |
| [`spec/`](spec/) | Product idea (implementation-free) |
| [`tech/`](tech/) | Architecture + ticket boards |
| [`docs/adr/`](docs/adr/) | Decisions |

## Related

- [sushkobot](https://github.com/) — V1 reference experience (separate repo)
- prophet — core/adapter + DOX patterns

## Name

Product and agent person: **Sobrina**.
