# T12 — Checklist membership verbs

Status: resolved

**Problem:** Only Checklist members get Deadline auto-slip and streak accounting.

**Done when:** Join / leave / admin-remove verbs work; idempotent join; non-members excluded from Checklist reads used by Deadline; tests cover membership matrix from [spec/checklist.md](../../../spec/checklist.md).

**Depends on:** T10.2 ([01-ledger-schema.md](01-ledger-schema.md)), T11.1 ([02-chat-settings-durable-verbs.md](02-chat-settings-durable-verbs.md))

**Spec / arch links:** [spec/checklist.md](../../../spec/checklist.md), [CONTEXT.md](../../../CONTEXT.md) (Checklist)

**Out of scope:** Slash command parsing; Telegram admin role detection (adapter passes "admin remove" intent)

**Tasks:**

- [x] **T12.1** `joinChecklist(chatId, memberId)` — idempotent
- [x] **T12.2** `leaveChecklist(chatId, memberId)`
- [x] **T12.3** `removeFromChecklist(chatId, memberId)` (admin path; same durable remove)
- [x] **T12.4** `listChecklist(chatId)` / `isOnChecklist(...)`
- [x] **T12.5** Tests: join/leave/remove; double-join safe; leave when absent is safe no-op or clear error (pick one; document)
