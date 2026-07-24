# T25 — Chat Character durable setting

Status: ready-for-agent

**Problem:** Each chat needs one persistent Character face (`unset` until admin chooses) before telegram/agent can force-choose or load voice.

**Done when:** Chat settings (or sibling column) store Character as `unset` | `pan` | `artemis` | `apollo` | `hestia`; get/set verbs with validation; default on create = `unset`; unit tests cover set/get/reject unknown id. No Telegram title sync here.

**Depends on:** T11 ([02-chat-settings-durable-verbs.md](02-chat-settings-durable-verbs.md)); character board **T70** (catalog locked in SPEC/glossary) ([../character/issues/01-spec-character-sobri.md](../../character/issues/01-spec-character-sobri.md))

**Spec / arch links:** [character spec.md](../../character/spec.md) (T70), [spec/character.md](../../../spec/character.md), [`CONTEXT.md`](../../../CONTEXT.md) (Character), [architecture.md](../../../tech/architecture.md) (chat settings)

**Out of scope:** `/settings` UI; `setChatAdministratorCustomTitle`; prompt cards (T61); Diary mark (T62); package rename (T71)

**Tasks:**

- [ ] **T25.1** Migration: Character field on chat settings (`unset` + four catalog ids)
- [ ] **T25.2** `getCharacter` / `setCharacter` (or settings update path) with catalog validation
- [ ] **T25.3** New chat defaults to `unset`
- [ ] **T25.4** Tests: set each id; reject unknown; read round-trip
- [ ] **T25.5** Expose Character on settings get used by T24 tools / telegram (no title side effects)
