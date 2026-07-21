# DOX framework

DOX is a hierarchy of `AGENTS.md` work contracts. Agent must follow DOX across any edit.

## Project

**Sobri** — Telegram group sobriety companion. Conversational Check-ins, Reminder + Deadline rhythm, Grace Token (заморозка), chat memory, agentic Sessions. Russian UI.

| Doc | Role |
|-----|------|
| [`CONTEXT.md`](CONTEXT.md) | Ubiquitous language (glossary) |
| [`spec/`](spec/AGENTS.md) | Product idea — what, not how |
| [`tech/`](tech/AGENTS.md) | Architecture + tickets — how (stub until SPEC locks) |
| [`docs/adr/`](docs/adr/) | Hard-to-reverse decisions |

Reference (not this repo): sushkobot V1 experience; prophet for core/adapter + DOX shape.

## Core Contract

- `AGENTS.md` files are binding work contracts for their subtrees
- Work must stay understandable from the nearest `AGENTS.md` plus every parent above it
- **Do not duplicate SPEC in AGENTS** — link SPEC sections; AGENTS owns process and local architecture
- `CONTEXT.md` is glossary only — no implementation detail

## Read Before Editing

1. Read this root `AGENTS.md`
2. Identify every file or folder you expect to touch
3. Walk from repo root to each target path; read every `AGENTS.md` on the route
4. If a parent lists a child `AGENTS.md` whose scope contains the path, read that child
5. Use nearest `AGENTS.md` as local contract; parents for repo-wide rules
6. If docs conflict, closer doc wins for local details; no child may weaken DOX

Re-read the applicable DOX chain in the current session before editing.

## Product Changes (Spec First + DOX)

For behavior, flows, commands, agent capabilities, data model ideas, or env/config semantics:

1. **Read DOX chain** for touched paths
2. **Update SPEC first** — `spec/` per [`spec/AGENTS.md`](spec/AGENTS.md)
3. **Update `CONTEXT.md`** when domain terms change
4. **Implement** only after idea docs lock (code comes later)
5. **Closeout** — sync docs; update nearest `AGENTS.md` if contracts/structure changed

Skip SPEC only when: pure refactor (zero behavior change), typo/formatting in non-spec files, user says spec later.

## Update After Editing

Update the closest owning `AGENTS.md` when a change affects purpose, scope, contracts, workflows, verification, or child index. Update parents when structure or index changes. Remove stale or contradictory text.

## Hierarchy

- Root `AGENTS.md` — DOX rail, project pointers, Child DOX Index
- Child `AGENTS.md` — domain-specific rules and nested index
- Closer doc = more specific and practical

## Child Doc Shape

Default section order: Purpose → Ownership → Local Contracts → Work Guidance → Verification → Child DOX Index

## Style

Concise, operational, stable contracts. Broad rules in parents; concrete details in children. No diary entries.

## Closeout

1. Re-check changed paths against DOX chain
2. Update nearest owning docs and affected parents/children
3. Refresh affected Child DOX Index entries
4. Run relevant verification when it exists
5. Report docs intentionally left unchanged and why

## User Preferences

- Spec-first for product behavior
- Caveman communication when workspace rules request it
- Clean-slate cutover (no sushkobot DB import)
- Tickets later under `tech/` (not in `spec/`)

## Child DOX Index

| Path | Owns |
|------|------|
| [`spec/AGENTS.md`](spec/AGENTS.md) | Product idea docs |
| [`tech/AGENTS.md`](tech/AGENTS.md) | Architecture, stack, tickets (stub) |
| [`docs/adr/`](docs/adr/) | ADRs (no child AGENTS yet) |
