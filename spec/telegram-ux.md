# Telegram UX

Group-first surface. Implementation detail stays in `tech/`; this doc locks product feel.

## Install

- Private / suitable group; bot can post and edit
- Privacy Mode off (so she hears relevant group messages as designed in tech)
- Admins run `/settings`

## `/settings`

Group Telegram admins + env bot admins may set:

- Reminder time
- Deadline time
- Timezone
- N for заморозка

Not available to arbitrary Checklist members.

## Commands (idea)

Minimum product verbs (names may map to slash commands or natural language):

- Settings (admins)
- Join / leave Checklist
- Help
- Progress / stats (or ask Sobrina in natural language)

Exact slash menu locked when implementing.

## askWithOptions

- Closed choices rendered as buttons
- **Caption length limited** — short labels only (exact max in tech); no essays on buttons
- Reminder Check-in defaults: **Красавчик** / **Оступился**
- Agent may use special labels only when she truly needs different chrome
- Free text always wins for Check-in intent

## Hygiene

- Prefer edit-in-place for Reminder chrome updates if used; no proactive delete of user messages
- Day Summary is a normal post after Deadline (reply threading optional in tech)
- Readable Russian outbound

## Non-goals

- DM as primary surface in Phase 1
- Web UI in Phase 1
