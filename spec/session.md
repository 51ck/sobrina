# Agentic Session

Idea-level lifecycle. Distinct from **Day**. ADR: [0004](../docs/adr/0004-agentic-session-vs-day.md).

## What it is

One in-flight conversation runtime **per chat**:

- Triggered by Telegram events or scheduler events (Reminder, Deadline, …)
- `getOrStart(chat)` — at most one Session at a time
- Each event resets an **idle timeout** (~5–10 minutes quiet; exact number in tech)
- Turns are **serialized** (mutex per chat) — no overlapping generates
- Optional short coalesce (1–2s) only for button/edit spam — not for delaying answers
- Idle fire → close Session → memory refactor hook → drop ephemeral history

## What it is not

- Not the Check-in Day (Day outlives many Sessions)
- Not “wait until idle before answering”
- Not a whole-evening open context from Reminder to Deadline

## Memory timing

- Important Profile/Diary writes **during** the Session via verbs
- Idle close triggers **refactor**, not sole persistence
- Process restart loses RAM Session; durable Profile, Diary, Days, Check-ins survive

## Scheduler

Reminder and Deadline each wake a short Session to act, then idle-close like any other burst.
