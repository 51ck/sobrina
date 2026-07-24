# T34 — askWithOptions → inline keyboard

Status: ready-for-agent

**Problem:** Core `askWithOptions` must render as Telegram buttons; adapter enforces caption max from core.

**Done when:** Options become inline keyboard; over-long labels are **rejected/blocked** per core max (T22.1) — **do not silently truncate** product labels; optional skip/reject mapped if present; callback payload round-trips to Session without inventing ledger outcomes. Reminder defaults available from core constants.

**Depends on:** T32 ([03-inbound-event-session-hub.md](03-inbound-event-session-hub.md)), T33 ([04-outbound-send-path.md](04-outbound-send-path.md)), core T22 ([../core/issues/13-askwithoptions-core.md](../../core/issues/13-askwithoptions-core.md))

**Spec / arch links:** [CONTEXT.md](../../../CONTEXT.md) (askWithOptions), [spec/telegram-ux.md](../../../spec/telegram-ux.md), [architecture.md](../../../tech/architecture.md) (tool rule)

**Out of scope:** Core validation rewrite; essays on buttons; forcing buttons-only Check-in; silent truncation of labels

**Tasks:**

- [ ] **T34.1** Map `askWithOptions` → Grammy inline keyboard builder
- [ ] **T34.2** Before send: **reject/block** any label over core caption max (defense in depth; no silent truncate)
- [ ] **T34.3** Callback data encoding/decoding → option id / reject / skip → Session event
- [ ] **T34.4** Expire/replace keyboard after answer when practical (edit or disable); document behavior
- [ ] **T34.5** Tests: over-long label blocked; default labels Красавчик / Оступился render
