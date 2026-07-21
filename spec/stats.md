# Stats and fairness rules

Rule-owned ledger. Sobrina calls durable verbs; she narrates results — she does not invent statuses or streak numbers.

Glossary: [`../CONTEXT.md`](../CONTEXT.md). ADR: [0001](../docs/adr/0001-grace-token.md), [0005](../docs/adr/0005-late-fix-until-next-reminder.md).

## Check-in status (stored)

| Status | Meaning |
|--------|---------|
| `sober` | Трезвый день |
| `minor_slip` | Slip with Grace Token spent — Streak preserved; day not counted as sober |
| `major_slip` | Slip without token — sober Streak breaks |

No separate `missed` / `absent` status. Deadline silence is a slip-class write.

## Grace Token (заморозка)

| Rule | Value |
|------|--------|
| Cap | **1** |
| Earn | When sober Streak reaches **N** Days (setting; default **3**); re-earn after spent by reaching N again |
| Spend | Explicit slip **or** Deadline silence |
| With token | → `minor_slip`, token gone |
| Without token | → `major_slip` |
| Late fix to sober | Refund token if that Check-in spent one |
| Visibility | In stats; Sobrina may remind |

Replaces V1 invisible grace threshold.

## Streak (derived on read)

Walk history with `minor_slip` as non-counting and non-breaking (same spirit as V1 sober streak + token days). Exact walk algorithm locked in tech tests; product intent: consecutive sober progress with one shielded slip not wiping the series.

## Antistreak (derived on read)

Consecutive slip Days (`minor_slip` or `major_slip`). Computed under the hood. **Do not feature in Day Summary or unsolicited chat** — only when asked or when delivering **full stats**.

## Longest Streak

All-time best sober Streak for the member. Part of full stats.

## Full stats

Agent may request for any Checklist member:

- Current Streak
- Antistreak
- Longest Streak
- Grace Token (есть / нет)
- Totals as defined when implementing (e.g. total sober Days) — open detail, not blocking

Not dumped unsolicited.

## Late fix

See [daily-rhythm.md](daily-rhythm.md). Window: until next Reminder. Affects stored Check-in and token refund; streaks recompute from history.

## Voice

- Don’t focus on bad days until somebody asks
- Summary celebrates and supports; full stats can include Antistreak when requested
