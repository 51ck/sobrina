# Daily rhythm

No check-in **window**. The rhythm is Reminder → Check-ins anytime → Deadline → Day Summary.

See also: [stats.md](stats.md), [checklist.md](checklist.md), ADR [0002](../docs/adr/0002-overnight-deadline-day-key.md), [0005](../docs/adr/0005-late-fix-until-next-reminder.md).

## Settings (`/settings` in group)

Configurable by Telegram group admins and env bot admins (same authority for all rows — see [telegram-ux.md](telegram-ux.md)):

| Field | Role |
|-------|------|
| Reminder time | When Sobri pings the group |
| Deadline time | When the Day closes (may be next clock morning) |
| Timezone | Chat TZ for Day key and schedule |
| N (заморозка) | Sober Streak length to earn Grace Token (default **3**) |
| Character | Closed face catalog; one per chat; **force-choose** (no silent default) |

No “window duration.”

## Day

- One **Day** per Reminder cycle, keyed to the evening / Reminder date in chat TZ
- If Deadline is after midnight, Day key stays that evening date — not Deadline’s clock date
- Day accumulates Check-ins; closes at Deadline

## Reminder

- Scheduler fires → Sobri posts Reminder (agentic Session wake)
- Buttons via askWithOptions; defaults **Красавчик** / **Оступился** unless special chrome is truly needed
- Button tap: join Checklist if needed + record Check-in
- Free text Check-in always works (and also joins if needed)

## Check-in (anytime)

- Members may Check-in before Reminder, between Reminder and Deadline, or after Deadline as late fix (if still allowed)
- Conversational: «я сегодня трезвый» → record via durable verb
- Day resolution: see below

## Day resolution

Which Day a Check-in targets:

1. Explicit day in speech if still fixable
2. Else open Day (after Reminder, before Deadline)
3. Else previous Day if still fixable (before next Reminder)
4. Else current / upcoming calendar Day (early Check-in)

If unclear → Sobri asks one clarifying question.

## Deadline

1. For each silent Checklist member: write slip-class Check-in (Grace Token rules)
2. Post **Day Summary** (always when Checklist exists; soft line if quiet)
3. Day is closed; late fixes still allowed until next Reminder

## Day Summary

- Heroes / sober progress; support for others
- Do **not** lead with Antistreak scoreboard
- Quiet Day: soft line, not shame parade or total silence

## Late fix

Until the chat’s **next Reminder**: member may correct Check-in (e.g. auto-slip → sober). Sober fix refunds Grace Token if that Check-in spent one.

## Explicit non-goals

- Open window / live poll invite as source of truth
- Mid-window nudge as a separate product beat (may return later)
- Buttons-only Check-in
