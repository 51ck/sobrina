# T62 — Diary mark Character (Phase 2)

Status: ready-for-agent

**Problem:** Character set/change should leave a durable Diary note for continuity without telling the chat the face switched.

**Done when:** On Character set or change, Diary appends a brief Character mark (id/code name); agent does **not** narrate the switch to users; works with real Profile/Diary injection. **Blocked until Diary implementation exists.**

**Depends on:** T61 ([12-face-prompt-pack.md](12-face-prompt-pack.md)); Phase 2 Diary/Profile persistence (beyond T59 stub — [10-phase-1-memory-stub.md](10-phase-1-memory-stub.md))

**Spec / arch links:** [spec/memory.md](../../../spec/memory.md), [spec/character.md](../../../spec/character.md), [ADR 0003](../../../docs/adr/0003-memory-markdown-and-injection.md), [character spec.md](../../character/spec.md)

**Out of scope:** Phase 1 shipping; user-facing switch lines; wiping Diary on face change

**Tasks:**

- [ ] **T62.1** (Phase 2) On `setCharacter`, append Diary Character mark
- [ ] **T62.2** (Phase 2) Digest/injection includes current Character without switch drama
- [ ] **T62.3** (Phase 2) Tests: set/change → Diary note; no outbound "switched face" requirement
