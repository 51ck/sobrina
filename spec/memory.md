# Memory

Memory engine lives in the agentic core (not the Telegram adapter). ADR: [0003](../docs/adr/0003-memory-markdown-and-injection.md).

## Shape

| Store | Role |
|-------|------|
| **Chat Profile** | Stable free-form markdown: tone, nicknames, manners prefs, lore pointers |
| **Diary** | Continuity free-form markdown: dated notes; append + regular refactor |

Both are markdown strings in persistence (idea: editable prose, not rigid CRM columns).

## Injection (token budget)

Every agent turn:

1. **Capped Chat Profile** (always)
2. **Short Diary digest** (always)
3. **Full Diary** only via recall tool when needed

Profile over cap → must trim on write. Refactor on Session close compresses Diary.

Open (tech): whether digest is stored or derived on read; exact char/token caps.

## Corrections

User corrects behavior/names → Sobri may:

- Update Profile
- Append / refactor Diary
- Discard (joke, one-off, conflicts with fairness rules)

Fluency: no dossier dump; no persistence narration («я сохранил(а)»).

## Character and Diary (Phase 2)

When Diary exists, Character set/change should leave a Diary mark for continuity ([character.md](character.md)). **Phase 2** — not before Diary ships (agent T62).

## Privacy

- Memory is **chat-scoped**
- Care with facts about one member when another asks
- Do not invent private biography

## MVP scope

Flat chat Profile + Diary. No full per-member CRM; member facts may appear as prose inside those docs.
