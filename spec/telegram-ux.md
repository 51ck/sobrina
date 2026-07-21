# Telegram UX

Group-first surface. Implementation detail stays in `tech/`; this doc locks product feel.

Glossary: [`../CONTEXT.md`](../CONTEXT.md). Character: [character.md](character.md).

## Install

- Private / suitable group; bot can post and edit
- Privacy Mode off (so Sobri hears relevant group messages as designed in tech)
- Admins run `/settings`
- **Character force-choose** before the companion runs as a voice in the chat (no silent default face)

## `/settings`

Group Telegram admins + env bot admins may set (same authority for all rows):

- Reminder time
- Deadline time
- Timezone
- N for заморозка
- **Character** — closed catalog `pan` | `artemis` | `apollo` | `hestia` (one per chat)

Not available to arbitrary Checklist members.

### Character

- **One Character per chat** — not per member
- **Admins only** — same gate as other `/settings` fields
- **Force-choose** — chat must pick a face; no silent default; do not invent a face for the admin
- On set/change: apply **admin custom title** via Telegram `setChatAdministratorCustomTitle` using the face’s RU code name (Пан / Артемида / Аполлон / Гестия) in the chat’s language
- Title is **best-effort** — if the bot is not an administrator (or the API rejects), settings still save; no blocking error spiral for the admin
- **No chat narration** on face switch — do not post “Character changed” / roleplay notices; next speech simply uses the new voice
- Diary Character mark on set/change waits for Diary (**Phase 2**)

## Commands (idea)

Minimum product verbs (names may map to slash commands or natural language):

- Settings (admins) — includes Character
- Join / leave Checklist
- Help
- Progress / stats (or ask Sobri in natural language)

Exact slash menu locked when implementing.

## askWithOptions

- Closed choices rendered as buttons
- **Caption length limited** — short labels only (exact max in tech); no essays on buttons
- Reminder Check-in defaults: **Красавчик** / **Оступился**
- Agent may use special labels only when it truly needs different chrome
- Free text always wins for Check-in intent

## Hygiene

- Prefer edit-in-place for Reminder chrome updates if used; no proactive delete of user messages
- Day Summary is a normal post after Deadline (reply threading optional in tech)
- Readable Russian outbound

## Non-goals

- DM as primary surface in Phase 1
- Web UI in Phase 1
- Per-member Character
- User-authored / custom faces beyond the four
- Changing BotFather display name as the face signal (admin title is the product lever)
