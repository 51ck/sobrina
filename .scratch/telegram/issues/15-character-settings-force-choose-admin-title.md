# T44 — Character `/settings` + force-choose + admin title

Status: ready-for-agent

**Problem:** Chat must pick one Character face before personality runs; Telegram should show the face code name as Sobri's admin custom title when possible.

**Done when:** Admins (same gate as T38) set Character via `/settings` or askWithOptions picker to `pan|artemis|apollo|hestia`; until not `unset`, bot only does setup/choose (no Check-in personality); on set/change calls `setChatAdministratorCustomTitle` with code name in chat language (Пан / Артемида / Аполлон / Гестия or EN equivalents); soft-fail + one Russian warn if not admin / API fail; Character still saved via core T25; retry title sync when admin rights appear. No user-facing "face switched" narration from adapter.

**Depends on:** T38 ([09-settings-admins.md](09-settings-admins.md)), core **T25** ([../core/issues/16-chat-character-durable-setting.md](../../core/issues/16-chat-character-durable-setting.md)); character board **T70** ([../character/issues/01-spec-character-sobri.md](../../character/issues/01-spec-character-sobri.md))

**Spec / arch links:** [spec/telegram-ux.md](../../../spec/telegram-ux.md), [spec/character.md](../../../spec/character.md), [character spec.md](../../character/spec.md) (T70), [CONTEXT.md](../../../CONTEXT.md) (Character)

**Out of scope:** Prompt cards (agent T61); Diary mark (agent T62); package rename (character T71); changing BotFather display name

**Tasks:**

- [ ] **T44.1** Admin Character picker in `/settings` (or linked askWithOptions) → core `setCharacter`
- [ ] **T44.2** Force-choose gate: if Character `unset`, setup/choose path only — no Check-in personality Session voice
- [ ] **T44.3** On set/change: `setChatAdministratorCustomTitle` to code name for chat language
- [ ] **T44.4** Soft-fail: warn once if not admin / API error; Character persist still succeeds
- [ ] **T44.5** Retry title sync when Sobri gains admin rights (or documented re-trigger)
- [ ] **T44.6** Tests/smoke: admin can set; non-admin rejected; unset blocks personality path; title failure does not roll back Character
