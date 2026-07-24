# T35 — Reminder delivery

Status: ready-for-agent

**Problem:** When core scheduler wakes Reminder, the group must see Reminder text + Check-in buttons.

**Done when:** On Reminder intent, adapter **posts the core Reminder Session turn result** (`runTurn` / `kind: reminder` from agent **T56**) — text + askWithOptions (defaults Красавчик / Оступился unless turn supplies special chrome); no ledger writes in the post itself. Until T56: **minimal stub** post only. Free text still accepted afterward (T37).

**Depends on:** T34 ([05-askwithoptions-inline-keyboard.md](05-askwithoptions-inline-keyboard.md)), core T21.4 ([../core/issues/12-scheduler-reminder-deadline-wakes.md](../../core/issues/12-scheduler-reminder-deadline-wakes.md)); agent **T56** for product Reminder copy (stub OK before T56) ([../agent/issues/07-reminder-voice-askwithoptions-defaults.md](../../agent/issues/07-reminder-voice-askwithoptions-defaults.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (Reminder), [spec/telegram-ux.md](../../../spec/telegram-ux.md), [agent spec.md](../../agent/spec.md) (T56)

**Out of scope:** Mid-evening nudge beat; **authoring product Reminder copy in the adapter after T56** (core turn owns it); Mastra/generate in telegram

**Tasks:**

- [ ] **T35.1** Handler: Reminder wake → post core `runTurn` Reminder result (text + options); until T56 use minimal stub — **do not author product Reminder after T56**
- [ ] **T35.2** Send Reminder message + keyboard to mapped Telegram chat (from turn/stub result)
- [ ] **T35.3** Store message id for optional edit-in-place (T42)
- [ ] **T35.4** Smoke: Reminder intent → posted message has two default buttons (from turn result or stub)
