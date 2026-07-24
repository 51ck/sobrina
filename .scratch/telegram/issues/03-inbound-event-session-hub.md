# T32 — Inbound event → Session hub

Status: ready-for-agent

**Problem:** Group messages and callbacks must wake the one Session per chat and serialize turns.

**Depends on:** T31 ([02-identity-bridge.md](02-identity-bridge.md)), core T20 ([../core/issues/11-session-hub.md](../../core/issues/11-session-hub.md))

**Done when:** Inbound group text/callback enters `getOrStart(chatId)` under per-chat mutex; activity resets idle; adapter does not bypass Session for agent turns. Stub handler may no-op reply until later themes.

**Spec / arch links:** [spec/session.md](../../../spec/session.md), [ADR 0004](../../../docs/adr/0004-agentic-session-vs-day.md), [architecture.md](../../../tech/architecture.md) (Session hub)

**Out of scope:** Full Mastra dialogue; Profile/Diary; coalesce tuning beyond calling core hook if exposed

**Tasks:**

- [ ] **T32.1** Wire group `message` → Session `getOrStart` + turn queue
- [ ] **T32.2** Wire `callback_query` → same Session path (distinct event kind)
- [ ] **T32.3** Drop/ignore non-group chats for Phase 1 (or reply once "group only") — document choice
- [ ] **T32.4** Tests or smoke: two rapid messages same chat serialize; two chats independent
