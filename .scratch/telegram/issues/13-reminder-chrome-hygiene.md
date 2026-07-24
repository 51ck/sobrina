# T42 — Reminder chrome hygiene

Status: ready-for-agent

**Problem:** Prefer edit-in-place for Reminder updates; never proactively delete user messages.

**Done when:** After button Check-in (and similar), adapter can edit Reminder message chrome instead of spamming new keyboards when message id known; no code path deletes arbitrary user messages.

**Depends on:** T33.4 ([04-outbound-send-path.md](04-outbound-send-path.md)), T35.3 ([06-reminder-delivery.md](06-reminder-delivery.md)), T36 ([07-button-check-in-core-verbs.md](07-button-check-in-core-verbs.md))

**Spec / arch links:** [spec/telegram-ux.md](../../../spec/telegram-ux.md) (Hygiene)

**Out of scope:** Moderating / deleting member content; aggressive keyboard wipe of unrelated messages

**Tasks:**

- [ ] **T42.1** On successful button Check-in: edit Reminder reply markup or caption chrome when message id stored
- [ ] **T42.2** Audit: no `deleteMessage` on user messages in adapter paths
- [ ] **T42.3** Fallback if edit fails: send short ack instead of deleting anything
