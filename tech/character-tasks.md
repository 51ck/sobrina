# Character / Sobri — ticket board

Board under the [in-repo ticket system](tickets.md). Product lock for selectable Character faces + brand rename Sobrina → Sobri. Spec: [character.md](../spec/character.md), [telegram-ux.md](../spec/telegram-ux.md), [agent.md](../spec/agent.md), [memory.md](../spec/memory.md). Arch: [architecture.md](architecture.md). Glossary: [`CONTEXT.md`](../CONTEXT.md).

IDs **T70–T71** (foundation T1–T6, core T10–T25, telegram T30–T44, agent T50–T62; cross-board uniqueness per [tickets.md](tickets.md)).

## Why

Grill locked: product/person **Sobri**; closed **Character** catalog (Pan / Artemis / Apollo / Hestia); one face per chat; admin-only; force-choose; peer foundation shared across faces; no kinship self-claim; no user-facing switch narration; admin custom title best-effort; Diary Character mark waits for Diary. Spec and package names still say Sobrina — this board locks idea docs then renames code.

## Themes

1. **Spec lock** — glossary + character.md + scrub gendered Sobrina-person across idea docs
2. **Rename expand–contract** — `@sobrina/*` → `@sobri/*` and human-facing Sobrina → Sobri in green batches

---

## T70 — Spec: Character + Sobri

**Problem:** Idea docs lock a single female Sobrina voice. Product needs Sobri + selectable Character faces before core/telegram/agent implement them.

**Done when:** [`CONTEXT.md`](../CONTEXT.md) defines **Sobri** and **Character** (catalog ids + RU code names); [character.md](../spec/character.md) has shared peer foundation + four faces (Pan/Artemis/Apollo/Hestia) with gender/voice; no kinship self-claim; silent face switch; Diary mark deferred to Phase 2; [telegram-ux.md](../spec/telegram-ux.md) adds Character to `/settings` + force-choose + admin title best-effort; vision/agent/memory/roadmap scrub she/Sobrina-as-woman for Sobri; optional ADR if Character-per-chat + title trade-off needs recording. No code rename in this theme (T71).

**Depends on:** none

**Spec / arch links:** [character.md](../spec/character.md), [agent.md](../spec/agent.md), [telegram-ux.md](../spec/telegram-ux.md), [memory.md](../spec/memory.md), [vision.md](../spec/vision.md), [`CONTEXT.md`](../CONTEXT.md), [docs/adr/](../docs/adr/)

**Out of scope:** Package/path rename (T71); core schema; Grammy title API; prompt files; Diary implementation

**Tasks:**

- [x] **T70.1** Glossary: **Sobri**, **Character**; catalog ids `pan` | `artemis` | `apollo` | `hestia` + RU code names Пан / Артемида / Аполлон / Гестия; retire Sobrina-as-person wording
- [ ] **T70.2** Rewrite [character.md](../spec/character.md): shared peer foundation + four face cards; archetypes not kinship claims; Sobri continuous self; face = voice/gender
- [ ] **T70.3** SPEC UX: Character in `/settings` (admins only); force-choose (no silent default); `setChatAdministratorCustomTitle` best-effort; no chat narration on face switch
- [ ] **T70.4** Scrub she/Sobrina-person in vision, agent, memory, telegram-ux, roadmap, related SPEC cross-links; Diary Character mark noted as Phase 2
- [ ] **T70.5** Optional ADR: Character per chat + admin title vs display-name limits — only if trade-off needs recording

---

## T71 — Rename Sobrina → Sobri (expand–contract)

**Problem:** Repo, packages, and docs still say Sobrina / `@sobrina/*` after product locks Sobri.

**Done when:** Human-facing product name is **Sobri**; workspace packages are `@sobri/core` and `@sobri/telegram` (or locked equivalent); README, architecture, boards, and code imports use new names; old `@sobrina/*` / Sobrina-person strings removed in contract step; `bun run lint` + `bun run typecheck` green after each migrate batch. GitHub repo rename out of scope unless asked later.

**Depends on:** T70

**Spec / arch links:** [architecture.md](architecture.md), [tech/AGENTS.md](AGENTS.md), [tickets.md](tickets.md), root README

**Out of scope:** GitHub org/repo rename; Telegram BotFather display-name ops; Character schema/UI (T25/T44); prompt prose (T61)

**Tasks:**

- [ ] **T71.1** Expand: document target names (`Sobri`, `@sobri/core`, `@sobri/telegram`); add dual-read or alias strategy so migrate batches stay green
- [ ] **T71.2** Migrate package names + imports + root workspace scripts (batch; lint/typecheck green)
- [ ] **T71.3** Migrate architecture, AGENTS, ticket boards, README, env docs strings Sobrina → Sobri / `@sobrina` → `@sobri`
- [ ] **T71.4** Contract: remove aliases/old package names; grep gate no stale `@sobrina/` or Sobrina-as-product in owned trees
- [ ] **T71.5** Smoke: clean install + lint + typecheck on renamed workspace

---

## Suggested build order

```text
T70 Spec Character + Sobri
  → T71 rename expand–contract
  → core T25 Character setting   (needs T11 + T70)
  → telegram T44 settings+title  (needs T25 + T38)
  → agent T61 face prompt pack   (needs T70 + T50; extends T51)
  → agent T62 Diary mark         (Phase 2; needs Diary + T61)
```

Suggested first slices:

1. **T70.1** — glossary Sobri + Character catalog  
2. **T70.2** — character.md foundation + four faces  
3. **T70.3** — telegram-ux Character + force-choose + title  

## Non-goals

- Implementing Character persistence or Grammy title in this board (core/telegram)
- Shipping Diary Character marks before Diary exists (T62)
- Custom / user-authored Characters beyond the four
- Kinship self-claim (“я твой брат”) in product copy
- User-facing “face switched” narration
- sushkobot import; DM-primary UX

## Related

- Process: [tickets.md](tickets.md)
- Core: [core-tasks.md](core-tasks.md) (T25)
- Telegram: [telegram-tasks.md](telegram-tasks.md) (T44)
- Agent: [agent-tasks.md](agent-tasks.md) (T51, T61, T62)
- Spec: [character.md](../spec/character.md), [telegram-ux.md](../spec/telegram-ux.md), [agent.md](../spec/agent.md), [memory.md](../spec/memory.md)
- DOX: [AGENTS.md](AGENTS.md)
