# Vision

## Problem (locked)

Groups that want sobriety accountability need a daily ritual that feels human — not a timed poll form that opens and closes like a kiosk. People want to say how the day went in their own words, ask about progress, teach the bot manners, and still have a fair ledger.

## What

**Sobri** is an AI companion in a Telegram group. Sobri reminds the group to Check-in, records statuses through conversation or short buttons, closes the Day at Deadline, posts a Day Summary, answers questions about streaks and each other (within privacy), and keeps chat memory (Profile + Diary). Admins pick a **Character** face (voice/gender) — see [character.md](character.md).

## Why

- Same job as sushkobot V1 (group check-ins, streaks, Russian tone) with an agentic core
- Drop the open **window** as product center — Reminder + Deadline + talk anytime
- Durable outcomes via defined verbs; Sobri narrates and decides *when*; rules own fairness

## Who

- **Checklist members** — people tracked in the chat (список)
- **Group admins / bot admins** — configure `/settings` (including Character)
- **Sobri** — continuous person with selectable Character face and memory; see [character.md](character.md)

## Authenticity bar

- Check-ins and streaks are real ledger facts — not invented in chat
- Grace Token (заморозка) and status mapping are rule-owned on write
- Agent reads stats tools; does not fabricate numbers
- Russian in-group tone; not therapist / coach / shaming machine
- No dossier dump from memory; fluency only

## Surfaces

- **Group-first** (Telegram)
- DM only if later needed for personal settings
- Admin web panel — later phase (talks to core, not a second product mind)

## Non-goals (Phase 1 idea)

- Open check-in window / live poll body as source of truth
- Importing sushkobot V1 SQLite (clean slate)
- Per-person Reminder times
- Monetization
