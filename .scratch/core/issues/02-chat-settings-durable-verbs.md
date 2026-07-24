# T11 — Chat settings durable verbs

Status: resolved

**Problem:** Reminder, Deadline, TZ, and N must be readable/writable in core before `/settings` chrome exists.

**Done when:** Core can create/get a chat, get/update settings with validation (times + TZ + N ≥ 1); default N = 3; unit tests cover defaults and updates. No Telegram admin checks here (adapter later).

**Depends on:** T10.1 ([01-ledger-schema.md](01-ledger-schema.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (settings table), [CONTEXT.md](../../../CONTEXT.md) (Reminder, Deadline, Grace Token N)

**Out of scope:** Grammy `/settings` UI; who-is-admin authorization; posting Reminder copy

**Tasks:**

- [x] **T11.1** `getOrCreateChat(chatId)` + `getSettings(chatId)`
- [x] **T11.2** `updateSettings(chatId, patch)` — Reminder time, Deadline time, timezone, N; reject invalid values
- [x] **T11.3** Defaults: N = **3** when unset; document time/TZ representation chosen in core
- [x] **T11.4** Tests: create chat → defaults → patch N/times/TZ → read back
