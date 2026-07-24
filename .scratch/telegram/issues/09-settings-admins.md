# T38 — `/settings` (admins)

Status: ready-for-agent

**Problem:** Group Telegram admins + env bot admins configure Reminder, Deadline, TZ, N — not arbitrary Checklist members.

**Done when:** `/settings` (or locked slash name) readable/writable only for Telegram group admins or env bot-admin allowlist; updates core T11 settings; rejects others with short Russian notice. Exact slash menu names locked in this theme.

**Depends on:** T31 ([02-identity-bridge.md](02-identity-bridge.md)), T33 ([04-outbound-send-path.md](04-outbound-send-path.md)), core T11 ([../core/issues/02-chat-settings-durable-verbs.md](../../core/issues/02-chat-settings-durable-verbs.md)); foundation env for bot-admin allowlist name (lock in `.env.example` if not already) ([../foundation/issues/04-env-naming-and-config-load.md](../../foundation/issues/04-env-naming-and-config-load.md))

**Spec / arch links:** [spec/telegram-ux.md](../../../spec/telegram-ux.md) (`/settings`), [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (settings fields), [architecture.md](../../../tech/architecture.md) (env bot admins)

**Out of scope:** Per-person Reminder times; Checklist membership UI inside settings; Character picker (T44)

**Tasks:**

- [ ] **T38.1** Lock slash command name(s) for settings + help entry in bot command list
- [ ] **T38.2** Env bot-admin allowlist parse (names only in `.env.example`); combine with Telegram `getChatAdministrators` / message sender admin check
- [ ] **T38.3** Authorized flow: show current Reminder, Deadline, TZ, N (**заморозка**); accept updates → `updateSettings`
- [ ] **T38.4** Unauthorized → short reject; no settings leak beyond "no access"
- [ ] **T38.5** Tests: admin allowed; non-admin rejected; N default 3 visible
