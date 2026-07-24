# T55 — Conversational Check-in (record / late fix)

Status: ready-for-agent

**Problem:** Speech like «я сегодня трезвый» must become tool-backed Check-in; late fix until next Reminder uses core T17.

**Done when:** Agent maps sober/slip intent to `recordCheckIn` / `correctCheckIn` tools only; join via Check-in uses Checklist tools as core composes; acknowledges late sober fix and заморозка refund **from tool result** without drama spiral ([character.md](../../../spec/character.md)). No closed-Day T14 writes.

**Depends on:** T54 ([05-day-resolution-in-dialogue.md](05-day-resolution-in-dialogue.md)), core T14, T15, T17, T12 ([../core/issues/05-record-check-in-verb.md](../../core/issues/05-record-check-in-verb.md), [../core/issues/06-grace-token-rules.md](../../core/issues/06-grace-token-rules.md), [../core/issues/08-late-fix-until-next-reminder.md](../../core/issues/08-late-fix-until-next-reminder.md), [../core/issues/03-checklist-membership-verbs.md](../../core/issues/03-checklist-membership-verbs.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md), [spec/stats.md](../../../spec/stats.md), [spec/character.md](../../../spec/character.md) (Late fixes), [ADR 0005](../../../docs/adr/0005-late-fix-until-next-reminder.md)

**Out of scope:** Button chrome (telegram T36); Grace Token arithmetic in agent code

**Tasks:**

- [ ] **T55.1** Prompt examples: sober / slip intents → appropriate tools (`recordCheckIn` / `correctCheckIn`) (Russian)
- [ ] **T55.2** Open Day → `recordCheckIn`; closed Day in late-fix period → `correctCheckIn` only
- [ ] **T55.3** Narrate tool outcomes (including refund) without moral verdict spiral
- [ ] **T55.4** Smoke: slip then late sober fix uses correct tool order against temp DB
