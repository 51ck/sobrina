# spec — Product Idea

## Purpose

Own the pure-idea product specification for Sobrina: what the service is, who she is, daily rhythm, stats rules, Checklist, Session, memory, Telegram UX, roadmap. No implementation, stack, or engineering layout lives here (see [tech/](../tech/AGENTS.md)).

## Ownership

- Product vision and authenticity bar
- Sobrina character and conceptual agent capabilities
- Daily rhythm (Reminder, Deadline, Check-in, Day Summary)
- Stats rules (statuses, Grace Token, Streak / Antistreak)
- Checklist membership
- Agentic Session lifecycle (idea level)
- Chat Profile / Diary memory
- Telegram UX principles
- Product roadmap phases

Root DOX owns repo-wide agent contracts. `tech/` owns how ideas become systems. Glossary: [`../CONTEXT.md`](../CONTEXT.md).

## Local Contracts

- Idea docs stay implementation-free: no stack names, no library choices, no source-tree layouts for code, no API schemas
- Roadmap phases are product milestones, not build tickets — Phase 1 tickets live under `tech/`
- Locked product decisions live in the docs below; change them by editing the owning doc, then refresh this index if files move
- Open questions stay labeled as open — do not pretend resolved
- Terms must match [`CONTEXT.md`](../CONTEXT.md); conflict → fix glossary or SPEC

## Work Guidance

- Spec first before behavior changes in code (when code exists)
- Prefer short docs; link rather than duplicate
- ADRs for hard trade-offs: [`../docs/adr/`](../docs/adr/)

## Verification

- Docs use glossary terms from `CONTEXT.md`
- No Mastra / Grammy / SQLite / package paths in `spec/` body (except “see tech” pointers)

## Child DOX Index

_(none — idea documents, not nested DOX folders)_

Idea documents:

| Doc | Owns |
|-----|------|
| [vision.md](vision.md) | Problem, what/why, authenticity bar |
| [character.md](character.md) | Sobrina persona |
| [agent.md](agent.md) | Role, authority, conceptual capabilities |
| [daily-rhythm.md](daily-rhythm.md) | Reminder, Deadline, Check-in, Summary, Day resolution |
| [stats.md](stats.md) | Statuses, Grace Token, streaks, full stats, late fix |
| [checklist.md](checklist.md) | Membership, join/leave |
| [session.md](session.md) | Agentic Session lifecycle |
| [memory.md](memory.md) | Profile, Diary, injection, corrections |
| [telegram-ux.md](telegram-ux.md) | Group UX, `/settings`, askWithOptions |
| [roadmap.md](roadmap.md) | Product phases |
