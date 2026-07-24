# T20 — Session hub

Status: ready-for-agent

**Problem:** One in-flight Session per chat; serialized turns; idle close. Distinct from Day.

**Done when:** `getOrStart(chatId)`, per-chat mutex/queue, idle timeout reset on activity, idle → close → drop ephemeral history; process restart loses RAM Session only; optional 1–2s coalesce hook stub for button spam (no answer delay). Exact idle minutes locked in this theme.

**Depends on:** foundation packages ([../foundation/spec.md](../../foundation/spec.md)); no hard depend on ledger for hub itself (may call refactor no-op hook)

**Spec / arch links:** [spec/session.md](../../../spec/session.md), [ADR 0004](../../../docs/adr/0004-agentic-session-vs-day.md), [architecture.md](../../../tech/architecture.md) (Session hub)

**Out of scope:** Profile/Diary refactor implementation (Phase 2 — provide empty/no-op hook); Grammy wiring; Mastra generate body (T24/agent)

**Tasks:**

- [ ] **T20.1** Lock idle timeout minutes in core constant (within spec ~5–10; document choice)
- [ ] **T20.2** `getOrStart(chatId)` — at most one Session per chat; create if none
- [ ] **T20.3** Per-chat turn serialization (mutex/queue) — overlapping turns cannot interleave generates
- [ ] **T20.4** Activity resets idle timer; idle fires → close Session → invoke memory-refactor hook (no-op in Phase 1) → drop ephemeral history
- [ ] **T20.5** Optional coalesce window 1–2s for burst events — not used to delay ordinary answers; document
- [ ] **T20.6** Tests: single Session; mutex ordering; idle close; restart has no durable Session row required
