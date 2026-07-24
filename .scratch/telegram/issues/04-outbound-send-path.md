# T33 — Outbound send path

Status: ready-for-agent

**Problem:** Outbound must be readable Russian-capable text with a locked parse mode and safe failure.

**Done when:** Adapter send helper always applies chosen `parse_mode` (lock HTML or plain in this theme — document); never forwards raw unsafe markup unchecked; parse failure falls back to plain text without crashing.

**Depends on:** T30 ([01-grammy-group-boot.md](01-grammy-group-boot.md))

**Spec / arch links:** [spec/telegram-ux.md](../../../spec/telegram-ux.md) (Hygiene — readable Russian outbound), [architecture.md](../../../tech/architecture.md)

**Out of scope:** Heavy markdown tables; Mini Apps; deleting user messages

**Tasks:**

- [ ] **T33.1** Lock Phase 1 outbound `parse_mode` (document choice in package note)
- [ ] **T33.2** `sendMessage(chat, text, extras?)` applies parse mode + sanitize/escape as needed
- [ ] **T33.3** Fallback: send failure / parse error → plain text retry once
- [ ] **T33.4** `editMessage` helper for Reminder chrome updates (used by T42)
