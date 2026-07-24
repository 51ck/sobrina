# T60 — Integration smoke (agent + Session + handoff)

Status: ready-for-agent

**Problem:** Prove agent board slices work together before calling Phase 1 agent path done.

**Done when:** Documented smoke path: Session turn with text Check-in → tool write → Russian ack; Reminder turn → defaults; Summary turn → no Antistreak lead; `bun run lint` + `bun run typecheck` clean for touched packages. Telegram delivery may be stubbed if T35/T40 not running.

**Depends on:** T52–T59 as applicable ([03](03-session-turn-loop-tools.md)–[10](10-phase-1-memory-stub.md)); telegram T32/T37 optional for full E2E ([../telegram/issues/03-inbound-event-session-hub.md](../../telegram/issues/03-inbound-event-session-hub.md), [../telegram/issues/08-free-text-check-in-handoff.md](../../telegram/issues/08-free-text-check-in-handoff.md))

**Spec / arch links:** [spec/roadmap.md](../../../spec/roadmap.md) Phase 1, [architecture.md](../../../tech/architecture.md)

**Out of scope:** Declaring product Phase 1 complete; load testing; deploy

**Tasks:**

- [ ] **T60.1** Script or test doc: Check-in conversation smoke against temp DB
- [ ] **T60.2** Reminder + Summary turn smoke (facts fixtures)
- [ ] **T60.3** fullStats narration smoke
- [ ] **T60.4** Lint + typecheck gate on agent-touched packages
