# tech — Architecture

## Purpose

Own how the product idea in [spec/](../spec/AGENTS.md) becomes a running system. Stack, monorepo layout, core vs adapters, models, deploy, and tickets live here.

## Ownership

- Runtime architecture and stack (Bun workspaces, Mastra, Grammy, SQLite)
- Sobri core vs channel adapters (`@sobri/core`, `@sobri/telegram`)
- Deploy and env naming (not values)
- Build tickets live in [`.scratch/`](../.scratch/) per [`docs/agents/issue-tracker.md`](../docs/agents/issue-tracker.md) — this repo's old in-repo `tech/*-tasks.md` board system was retired and fully ported there

Does not own product vision (`spec/`) or glossary (`CONTEXT.md`).

## Local Contracts

- Must not weaken `spec/` product contracts
- Adapters own I/O only; channel tools call core verbs
- Product name / agent person: **Sobri** (Character faces: see [`.scratch/character/`](../.scratch/character/) T70–T71)
- No secrets in repo
- `askWithOptions` must enforce **caption length limit** (exact max when implemented)
- Build tickets live under `.scratch/<feature>/issues/` — not in `spec/`

## Work Guidance

- Spec-first: lock or update `spec/` before behavior work
- Prefer prophet-shaped packages: `core` + `telegram`
- Agentic build: take one open ticket from [`.scratch/`](../.scratch/); mark it resolved when done; commit message refs the ID (e.g. `T18.1`)

## Verification

- When scaffold exists: `bun run lint`, `bun run typecheck` (see [`.scratch/foundation/`](../.scratch/foundation/))
- Package tests via `bun test` when present

## Child DOX Index

| Path | Owns |
|------|------|
| [architecture.md](architecture.md) | System shape: core vs telegram, Session hub, durable verbs vs agent, scheduler, SQLite, Mastra |
| [`.scratch/foundation/`](../.scratch/foundation/) | Foundation: monorepo, env, lint/typecheck, DB, boot (T1–T6, resolved) |
| [`.scratch/core/`](../.scratch/core/) | Core: ledger, Grace Token, Session hub, scheduler, durable verbs (T10–T25) |
| [`.scratch/telegram/`](../.scratch/telegram/) | Telegram: Grammy group adapter, `/settings`, Character title, Reminder buttons, Summary delivery (T30–T44) |
| [`.scratch/agent/`](../.scratch/agent/) | Agent: Mastra agent, character prompts, face pack, Session turns, Summary/stats voice (T50–T62) |
| [`.scratch/character/`](../.scratch/character/) | Character / Sobri: SPEC lock + package rename (T70–T71, resolved) |
