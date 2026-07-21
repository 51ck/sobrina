# tech — Architecture

## Purpose

Own how the product idea in [spec/](../spec/AGENTS.md) becomes a running system. Stack, monorepo layout, core vs adapters, models, deploy, and tickets live here.

## Ownership

- Runtime architecture and stack (planned: Bun workspaces, Mastra, Grammy, SQLite — detail when SPEC phase ends)
- Sobrina core vs channel adapters
- Deploy and env naming (not values)
- In-repo ticket boards (to be added)

Does not own product vision (`spec/`) or glossary (`CONTEXT.md`).

## Local Contracts

- Must not weaken `spec/` product contracts
- Adapters own I/O only; channel tools call core verbs
- Product name / agent person: **Sobrina**
- No secrets in repo
- `askWithOptions` must enforce **caption length limit** (exact max when implemented)
- Build tickets live under `tech/` — not in `spec/`

## Work Guidance

- Spec-first: lock or update `spec/` before behavior work
- Prefer prophet-shaped packages: `core` + `telegram` (when code starts)

## Verification

_(none yet — no lint/test harness in this phase)_

## Child DOX Index

_(none yet)_
