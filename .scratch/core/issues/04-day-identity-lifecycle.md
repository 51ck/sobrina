# T13 — Day identity + lifecycle

Status: resolved

**Problem:** Day is keyed to the Reminder-cycle evening date in chat TZ; Deadline may fall next clock morning without changing the Day key.

**Done when:** Core can compute Day key for a cycle, open/ensure a Day, mark Day closed; overnight Deadline fixture proves Day key ≠ Deadline clock date ([ADR 0002](../../../docs/adr/0002-overnight-deadline-day-key.md)).

**Depends on:** T11 ([02-chat-settings-durable-verbs.md](02-chat-settings-durable-verbs.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md), [ADR 0002](../../../docs/adr/0002-overnight-deadline-day-key.md), [CONTEXT.md](../../../CONTEXT.md) (Day), [architecture.md](../../../tech/architecture.md) (Session ≠ Day)

**Out of scope:** Auto-slip contents (T16); Session hub; Reminder message text

**Tasks:**

- [x] **T13.1** Pure helper: Day key from chat TZ + Reminder cycle (evening date rules per ADR 0002)
- [x] **T13.2** `ensureOpenDay(chatId, dayKey)` / get Day state (open vs closed)
- [x] **T13.3** `closeDay(chatId, dayKey)` — state transition only (no auto-slip yet)
- [x] **T13.4** Tests: same-calendar Deadline; overnight Deadline keeps evening Day key; close is idempotent or well-defined
