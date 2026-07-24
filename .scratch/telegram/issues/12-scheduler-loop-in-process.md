# T41 — Scheduler loop in telegram process

Status: ready-for-agent

**Problem:** Core due-checks need a process tick so the adapter can deliver Reminder / Day Summary I/O.

**Done when:** Bot process periodically calls **core tick** (core owns due-check + T16 + Session wake); telegram **only consumes returned intents** → T35 (Reminder) / T40 (Summary) I/O; **no second Deadline/Reminder rule engine** in the adapter; fake-clock or integration smoke documented. No Telegram I/O inside `@sobri/core`.

**Depends on:** T35 ([06-reminder-delivery.md](06-reminder-delivery.md)), T36 ([07-button-check-in-core-verbs.md](07-button-check-in-core-verbs.md)), T40 ([11-day-summary-delivery.md](11-day-summary-delivery.md)), core T21 ([../core/issues/12-scheduler-reminder-deadline-wakes.md](../../core/issues/12-scheduler-reminder-deadline-wakes.md))

**Spec / arch links:** [architecture.md](../../../tech/architecture.md) (Scheduler), [spec/daily-rhythm.md](../../../spec/daily-rhythm.md)

**Out of scope:** External cron service; multi-instance leader election; re-implementing due-check / T16 / Session wake in the adapter

**Tasks:**

- [ ] **T41.1** Interval/timer in telegram (or shared runtime) calling core tick only
- [ ] **T41.2** Consume returned Reminder intents → T35 I/O (no adapter due-check)
- [ ] **T41.3** Consume returned Deadline intents → T40 Summary I/O (core T16 + Session wake already done inside core tick)
- [ ] **T41.4** Dedup / "already fired" guard so a tick does not double-post (document strategy; prefer core-owned if possible)
- [ ] **T41.5** Smoke with injected `now` or short test schedule
