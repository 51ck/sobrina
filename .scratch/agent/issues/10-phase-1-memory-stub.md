# T59 — Phase 1 memory stub (no Profile/Diary impl)

Status: ready-for-agent

**Problem:** Session/architecture mention memory hooks; Phase 1 must not ship Profile/Diary tables or fake persistence theater.

**Done when:** Agent turn injection uses empty/stub Profile + empty digest (or omits); memory write/recall/refactor tools **absent or no-op** with clear Phase 2 TODO; idle Session close refactor hook remains no-op (core T20); prompt does not claim saved memory. No «я сохранила».

**Depends on:** T51 ([02-character-and-authority-prompts.md](02-character-and-authority-prompts.md)), T52 ([03-session-turn-loop-tools.md](03-session-turn-loop-tools.md)), core T20 ([../core/issues/11-session-hub.md](../../core/issues/11-session-hub.md))

**Spec / arch links:** [spec/memory.md](../../../spec/memory.md), [ADR 0003](../../../docs/adr/0003-memory-markdown-and-injection.md), [architecture.md](../../../tech/architecture.md) (Profile/Diary Phase 2), [spec/roadmap.md](../../../spec/roadmap.md) Phase 2

**Out of scope:** Profile/Diary schema; hybrid injection caps; manners correction persistence; diary refactor quality

**Tasks:**

- [ ] **T59.1** Turn context: stub/empty memory fields only
- [ ] **T59.2** Do not register real Profile/Diary write tools in Phase 1 (or register no-ops that return "not available yet")
- [ ] **T59.3** Prompt: no persistence narration; no dossier dump
- [ ] **T59.4** Document Phase 2 follow-up board expectation in theme Out of scope / Related
