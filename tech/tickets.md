# In-repo ticket system

Binding process for agentic (and human) build work. Product truth stays in [`spec/`](../spec/AGENTS.md). Architecture stays in [`architecture.md`](architecture.md). **Boards** under `tech/` hold build tickets only.

## Why

Agents need stable IDs, clear done-when, and one source of queue truth in git. External trackers (GitHub Issues, Linear) are optional glue — not the product brief.

## Layers

| Layer | Owns | Does not own |
|-------|------|----------------|
| `spec/` + `CONTEXT.md` + `docs/adr/` | Problem, character, rhythm, fairness, Session idea, memory, Telegram UX, roadmap phases | Eng ticket lists |
| `tech/architecture.md` | Stack, core vs adapters, Session hub, SQLite ownership, Mastra placement | Backlog chatter |
| **Ticket boards** (`tech/*-tasks.md`) | Buildable slices with IDs | Product philosophy essays |
| GitHub Issues / PRs (optional) | Who / which PR | Alternate product truth |

## Board files

- One board per durable theme/surface
- Name: `tech/<theme>-tasks.md`
- Index every board from [`tech/AGENTS.md`](AGENTS.md) Child DOX Index
- New board only when a theme has lasting multi-ticket work — not for one-off chores

Phase 1 boards (planned order):

| Board | Focus | Status |
|-------|-------|--------|
| [`foundation-tasks.md`](foundation-tasks.md) | Monorepo, env, lint/typecheck, DB, boot (T1–T6) | Active |
| [`core-tasks.md`](core-tasks.md) | Durable verbs, Session hub, scheduler, Mastra tool bindings, Character setting (T10–T25) | Active |
| [`telegram-tasks.md`](telegram-tasks.md) | Grammy group adapter, `/settings`, Character title, askWithOptions chrome (T30–T44) | Active |
| [`agent-tasks.md`](agent-tasks.md) | Mastra agent, prompts, face pack, Session turns, Summary/stats voice (T50–T62) | Active |
| [`character-tasks.md`](character-tasks.md) | Character SPEC lock + Sobrina→Sobri rename (T70–T71) | Active |

## Ticket ID scheme

- **Theme:** `T<n>` — epic/theme header (e.g. `T1` monorepo)
- **Slice:** `T<n>.<m>` — PR-sized checkbox (e.g. `T1.3`)
- IDs are stable once published — do not renumber; mark cancelled instead
- Agents invent new IDs only by **writing them on the board** first
- **Phase 1 preference:** theme numbers are **unique across boards** so commits/issues can cite `T12.3` without a board prefix — foundation `T1`–`T6`, core `T10`–`T25`, telegram `T30`–`T44`, agent `T50`–`T62`, character `T70`–`T71`, later boards continue upward (skip used ranges)
- If a collision ever exists, cite `board-file` + ID; do not renumber published IDs

## Slice shape (required)

Each `T<n>.<m>` checkbox line should be readable alone. Theme section should include:

| Field | Required | Notes |
|-------|----------|-------|
| **Problem** | theme | Why this theme exists |
| **Done when** | theme or slice | Verifiable outcome |
| **Depends on** | theme | Other IDs or prerequisites |
| **Spec / arch links** | theme | Pointers into `spec/` / ADRs / architecture |
| **Out of scope** | board or theme | Explicit non-goals |

Prefer short slice titles on the checkbox. Put detail in the theme body, not a novel per checkbox.

Implementer must answer without asking the planner:

- Rough packages/files to touch
- Done-when check
- Depends on
- Out of scope
- Which spec/ADR/architecture section binds

Prefer many small slices. No mega-tickets.

## Status

- `[ ]` open
- `[x]` done (keep the line; do not delete history of the ID)
- Optional prefix in title if blocked: `(blocked: T1.2)` — rare; prefer Depends on

No separate status database. Board checkboxes are status.

## Agent operating loop

1. Read the relevant board + linked `spec/` / ADR / [`architecture.md`](architecture.md)
2. Take **one** open slice (`T<n>.<m>`) — or one theme only if slices are not yet split
3. Plan → implement → verify (`bun run lint`, `bun run typecheck`, tests when relevant)
4. Mark `[x]` on that slice
5. DOX pass if contracts/indexes changed
6. Commit refs the ID, e.g. `chore(repo): T1.1 workspace root`

Do not start a second open slice in the same turn unless the user explicitly batches them.

### Implementer / reviewer

| Role | Does |
|------|------|
| **Implementer** | One slice: branch (if used), code, verify, mark `[x]`, commit message refs ID |
| **Reviewer** | Second agent or human: checks slice against done-when + spec/arch links; returns concrete fix notes or approves PR |

One implementer owns one slice at a time. Reviewer does not expand scope into the next slice.

## Human / agent rules

- Spec open questions stay in `spec/` until locked; then a board slice implements the lock
- Roadmap phases stay milestones — boards hold the tickets inside a phase ([spec/roadmap.md](../spec/roadmap.md))
- Do not duplicate the same ticket on two boards
- Do not invent product behavior on a board — link SPEC/ADR or file a spec change first
- No secrets in tickets or examples
- No sushkobot V1 DB import tickets
- If using GitHub Issues: title starts with `T1.3: …`, body links to the board section; close issue from PR

## Creating a board

1. Copy structure from [`foundation-tasks.md`](foundation-tasks.md) (Why → Themes → `T<n>` sections → Suggested build order → Non-goals → Related)
2. Add to [`tech/AGENTS.md`](AGENTS.md) Child DOX Index
3. Link from [spec/roadmap.md](../spec/roadmap.md) or owning spec doc if product-facing (one line)
4. Suggested build order at bottom of the board

## Related

- Architecture: [architecture.md](architecture.md)
- First board: [foundation-tasks.md](foundation-tasks.md)
- Character / Sobri: [character-tasks.md](character-tasks.md)
- DOX owner: [AGENTS.md](AGENTS.md)
