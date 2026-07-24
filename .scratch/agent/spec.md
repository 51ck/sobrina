# Agent

Phase 1 Sobri person: Mastra agent, prompts, Session turns, tool-backed narration. Spec: [agent.md](../../spec/agent.md), [character.md](../../spec/character.md), [stats.md](../../spec/stats.md), [session.md](../../spec/session.md), [memory.md](../../spec/memory.md) (Phase 2 depth). Arch: [architecture.md](../../tech/architecture.md) (Mastra in `@sobri/core`; durable verbs vs agent). Glossary: [`CONTEXT.md`](../../CONTEXT.md).

Legacy IDs **T50–T62**.

## Why

Core exposes durable verbs + T24 tool bindings; telegram delivers I/O. Phase 1 still needs the **person**: Mastra agent with character, Session-turn generate loop, Check-in conversation via tools, Day resolution asks, Reminder/Summary voice constraints, and full-stats narration — without inventing ledger outcomes, leading with Antistreak, or shipping Profile/Diary (Phase 2).

## Themes (all open)

1. Mastra agent bootstrap — MODEL_ID / provider wiring in `@sobri/core`
2. Character + authority prompts — baseline from character.md / agent.md; face catalog pack (T61)
3. Session turn loop — tools from core T24; mutex via core T20
4. Conflict rule — ledger/tool results win
5. Day resolution in dialogue — core T19 helper; ask if unclear
6. Conversational Check-in — record / late fix via tools only
7. Reminder voice + askWithOptions defaults — Красавчик / Оступился
8. Day Summary narration — core T23 facts; no Antistreak lead
9. Progress / full stats narration — core T18 bundle only
10. Phase 1 memory stub — no Profile/Diary tables; empty/no-op injection
11. Integration smoke — Session + tools + outbound handoff
12. Face prompt pack — active Character + other faces as same-instance blurbs (T61)
13. Diary Character mark — Phase 2; silent append on set/change (T62)

## Suggested build order

```text
core T20, T24, T19, T14, T17, T18, T22, T23 (gates — see ../core/spec.md)
  → character board resolved (T70 SPEC, T71 rename) — see ../character/spec.md
  → T50 Mastra bootstrap
  → T51 character prompts (peer foundation)
  → T61 face prompt pack     (needs character T70 + core T25)
  → T52 Session turn + tools
  → T53 conflict rule
  → T54 Day resolution dialogue
  → T55 conversational Check-in
  → T56 Reminder voice + defaults
  → T57 Day Summary narration
  → T58 progress / full stats
  → T59 Phase 1 memory stub
  → T60 integration smoke
  → T62 Diary Character mark (Phase 2; after Diary)
```

## Non-goals

- Grammy / Telegram I/O inside agent modules
- Reimplementing Grace Token, Streak walk, or Deadline auto-slip in the LLM
- Profile / Diary persistence, injection budgets, recall/refactor quality (Phase 2) — except T62 when Diary exists
- Character SPEC / package rename (character board, resolved)
- Telegram Character picker / admin title (telegram T44)
- Leading with Antistreak in Reminder, Summary, or unsolicited greetings
- Inventing Check-in statuses or streak numbers without tools
- Therapy / crisis / diagnosis framing
- Kinship self-claim or user-facing face-switch narration
- sushkobot import; DM-primary UX; web UI

## Related

- Architecture: [architecture.md](../../tech/architecture.md)
- Core: [core spec.md](../core/spec.md) (esp. T19, T22–T25)
- Telegram: [telegram spec.md](../telegram/spec.md) (T32, T35, T37, T40, T44)
- Character: [character spec.md](../character/spec.md)
- Spec: [agent.md](../../spec/agent.md), [character.md](../../spec/character.md), [stats.md](../../spec/stats.md), [session.md](../../spec/session.md), [memory.md](../../spec/memory.md)
