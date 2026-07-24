# T31 — Identity bridge

Status: ready-for-agent

**Problem:** Core verbs use opaque chat/member ids; Telegram supplies numeric chat/user ids.

**Done when:** Stable mapping Telegram group chat → core `chatId`, Telegram user → core `memberId`; `getOrCreateChat` on first sight; no cross-chat leakage; unit tests on mapping helpers.

**Depends on:** T30 ([01-grammy-group-boot.md](01-grammy-group-boot.md)), core T11.1 ([../core/issues/02-chat-settings-durable-verbs.md](../../core/issues/02-chat-settings-durable-verbs.md))

**Spec / arch links:** [architecture.md](../../../tech/architecture.md) (adapters map ids), [CONTEXT.md](../../../CONTEXT.md)

**Out of scope:** Multi-bot sharding; importing sushkobot ids

**Tasks:**

- [ ] **T31.1** `toChatId(telegramChatId)` / `toMemberId(telegramUserId)` (document format; stable strings OK)
- [ ] **T31.2** On inbound group event: ensure core chat exists via core T11
- [ ] **T31.3** Tests: same Telegram ids → same core ids; different chats isolated
