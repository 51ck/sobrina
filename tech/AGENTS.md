# tech — Architecture

## Purpose

Own how the product idea in [spec/](../spec/AGENTS.md) becomes a running system. Stack, monorepo layout, core vs adapters, models, deploy, and tickets live here.

## Ownership

- Runtime architecture and stack (Bun workspaces, Mastra, Grammy, SQLite)
- Sobri core vs channel adapters (`@sobri/core`, `@sobri/telegram`)
- Deploy and env naming (not values)
- In-repo ticket system + theme boards ([tickets.md](tickets.md))

Does not own product vision (`spec/`) or glossary (`CONTEXT.md`).

## Local Contracts

- Must not weaken `spec/` product contracts
- Adapters own I/O only; channel tools call core verbs
- Product name / agent person: **Sobri** (Character faces: see [character-tasks.md](character-tasks.md) T70–T71)
- No secrets in repo
- `askWithOptions` must enforce **caption length limit** (exact max when implemented)
- Build tickets live under `tech/` — not in `spec/`
- Ticket boards follow [tickets.md](tickets.md); index every board below

## Work Guidance

- Spec-first: lock or update `spec/` before behavior work
- Prefer prophet-shaped packages: `core` + `telegram`
- Agentic build: take one open slice from a board; mark `[x]` when done; commit message refs the ID

## Verification

- When scaffold exists: `bun run lint`, `bun run typecheck` (see [foundation-tasks.md](foundation-tasks.md))
- Package tests via `bun test` when present

## Child DOX Index

| Path | Owns |
|------|------|
| [architecture.md](architecture.md) | System shape: core vs telegram, Session hub, durable verbs vs agent, scheduler, SQLite, Mastra |
| [tickets.md](tickets.md) | In-repo ticket process (boards, IDs, agent loop, implementer/reviewer, theme chunk pipeline) |
| [foundation-tasks.md](foundation-tasks.md) | Foundation board: monorepo, env, lint/typecheck, DB, boot (T1–T6) |
| [core-tasks.md](core-tasks.md) | Core board: ledger, Grace Token, Session hub, scheduler, durable verbs (T10–T25) |
| [telegram-tasks.md](telegram-tasks.md) | Telegram board: Grammy group adapter, `/settings`, Character title, Reminder buttons, Summary delivery (T30–T44) |
| [agent-tasks.md](agent-tasks.md) | Agent board: Mastra agent, character prompts, face pack, Session turns, Summary/stats voice (T50–T62) |
| [character-tasks.md](character-tasks.md) | Character / Sobri board: SPEC lock + package rename (T70–T71) |
