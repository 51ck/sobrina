# T70 — Spec: Character + Sobri

Status: resolved

**Problem:** Idea docs lock a single female Sobrina voice. Product needs Sobri + selectable Character faces before core/telegram/agent implement them.

**Done when:** [`CONTEXT.md`](../../../CONTEXT.md) defines **Sobri** and **Character** (catalog ids + RU code names); [character.md](../../../spec/character.md) has shared peer foundation + four faces (Pan/Artemis/Apollo/Hestia) with gender/voice; no kinship self-claim; silent face switch; Diary mark deferred to Phase 2; [telegram-ux.md](../../../spec/telegram-ux.md) adds Character to `/settings` + force-choose + admin title best-effort; vision/agent/memory/roadmap scrub she/Sobrina-as-woman for Sobri; optional ADR if Character-per-chat + title trade-off needs recording. No code rename in this theme (T71).

**Depends on:** none

**Spec / arch links:** [character.md](../../../spec/character.md), [agent.md](../../../spec/agent.md), [telegram-ux.md](../../../spec/telegram-ux.md), [memory.md](../../../spec/memory.md), [vision.md](../../../spec/vision.md), [`CONTEXT.md`](../../../CONTEXT.md), [ADR 0006](../../../docs/adr/0006-character-per-chat-and-admin-title.md)

**Out of scope:** Package/path rename (T71); core schema; Grammy title API; prompt files; Diary implementation

**Tasks:**

- [x] **T70.1** Glossary: **Sobri**, **Character**; catalog ids `pan` | `artemis` | `apollo` | `hestia` + RU code names Пан / Артемида / Аполлон / Гестия; retire Sobrina-as-person wording
- [x] **T70.2** Rewrite [character.md](../../../spec/character.md): shared peer foundation + four face cards; archetypes not kinship claims; Sobri continuous self; face = voice/gender
- [x] **T70.3** SPEC UX: Character in `/settings` (admins only); force-choose (no silent default); `setChatAdministratorCustomTitle` best-effort; no chat narration on face switch
- [x] **T70.4** Scrub she/Sobrina-person in vision, agent, memory, telegram-ux, roadmap, related SPEC cross-links; Diary Character mark noted as Phase 2
- [x] **T70.5** Optional ADR: Character per chat + admin title vs display-name limits — only if trade-off needs recording
