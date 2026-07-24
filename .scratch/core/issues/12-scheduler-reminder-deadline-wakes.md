# T21 — Scheduler (Reminder / Deadline wakes)

Status: ready-for-agent

**Problem:** Core owns when Reminder and Deadline are due in chat TZ; each due event should wake a short Session.

**Done when:** Given "now" + chat settings, core detects due Reminder / due Deadline for the correct Day key; exposes a tick/scan API that returns wake intents; integrating with Session `getOrStart` is tested with a fake clock. No Telegram send inside scheduler.

**Depends on:** T11 ([02-chat-settings-durable-verbs.md](02-chat-settings-durable-verbs.md)), T13 ([04-day-identity-lifecycle.md](04-day-identity-lifecycle.md)), T16 (Deadline action) ([07-deadline-close-day-auto-slip.md](07-deadline-close-day-auto-slip.md)), T20 (Session wake) ([11-session-hub.md](11-session-hub.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md), [spec/session.md](../../../spec/session.md) (scheduler wakes Session), [architecture.md](../../../tech/architecture.md) (Scheduler), [ADR 0002](../../../docs/adr/0002-overnight-deadline-day-key.md)

**Out of scope:** OS cron; Reminder button labels posting; Day Summary narration; choosing webhook vs polling (telegram board)

**Tasks:**

- [ ] **T21.1** Pure due-check: Reminder due? Deadline due? for one chat at instant `now`
- [ ] **T21.2** Day key association for each due event (evening key rules)
- [ ] **T21.3** Tick/scan across chats → list of wake intents `{ chatId, kind: reminder|deadline, dayKey }`
- [ ] **T21.4** Reminder intent order (no Telegram I/O): resolve evening Day key → `ensureOpenDay` (T13) for that key → Session wake `reminder` via `getOrStart` with `{ kind: reminder, dayKey }`
- [ ] **T21.5** Deadline intent order (no Telegram I/O): resolve evening Day key → **T16** `closeDayAtDeadline` → Session wake `deadline` via `getOrStart` with `{ kind: deadline, dayKey }` (dayKey available for T23 Summary facts); tests with fake clock / overnight Deadline
