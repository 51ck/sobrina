# Core

Phase 1 ledger + Session + scheduler in `@sobri/core`. Spec: [roadmap.md](../../spec/roadmap.md) Phase 1. Arch: [architecture.md](../../tech/architecture.md). Glossary: [`CONTEXT.md`](../../CONTEXT.md).

Legacy IDs **T10–T25** (foundation T1–T6; telegram T30–T44; agent T50–T62; character T70–T71 — cross-board uniqueness was a legacy-board convention, kept here only so old commit messages / ADRs stay readable).

## Why

Foundation gives packages, lint/typecheck, env, and `openStore` / migrations. Phase 1 MVP still needs the channel-agnostic fairness ledger (Day, Check-in, Checklist, Grace Token / заморозка, streaks), durable settings, Session hub (Session ≠ Day), Reminder/Deadline scheduler wake points, and verb surfaces the agent/adapter can call — without Grammy I/O and without Profile/Diary tables (Phase 2).

## Themes

1. Ledger schema — chats, settings, Checklist, Days, Check-ins, Grace Token state in SQLite (resolved)
2. Chat settings verbs — Reminder, Deadline, TZ, N (default 3) (resolved)
3. Checklist membership — join / leave / admin remove; Check-in joins (resolved)
4. Day identity + lifecycle — evening Day key; open / closed (ADR 0002) (resolved)
5. Record Check-in — sober / slip intent → stored status via rules (resolved)
6. Grace Token (заморозка) — cap 1; earn / spend / refund (ADR 0001) (resolved)
7. Deadline close Day — auto-slip silent Checklist; Day closed (resolved)
8. Late fix — correct until next Reminder; refund rules (ADR 0005) (resolved)
9. Stats reads — Streak, Antistreak, Longest, full stats (derived on read) (open)
10. Day resolution helper — which Day a Check-in targets; ask if unclear (open)
11. Session hub — `getOrStart`, mutex, idle close (ADR 0004) (open)
12. Scheduler — Reminder / Deadline due evaluation → Session wake hooks (open)
13. askWithOptions (core) — channel-agnostic closed choice + caption max (open)
14. Day Summary fact bundle — ledger facts for narration (no Telegram post) (open)
15. Mastra tool bindings — tools wrap durable verbs (no character prompt) (open)
16. Chat Character setting — durable `unset | pan|artemis|apollo|hestia` (after Character SPEC T70) (open)

## Suggested build order (remaining open work)

```text
T18.1 Streak walk (pure)
  → T18.2-T18.5 remaining stats
  → T19 Day resolution
  → T20 Session hub          ∥ can start any time
  → T21 Scheduler (needs T16 done + T20)
  → T22 askWithOptions       ∥ anytime
  → T23 Day Summary facts
  → T24 Mastra tool bindings
  → T25 Character setting    (needs character T70 done + T11 done)
```

## Non-goals

- Grammy / Telegram I/O, `/settings` UI, inline keyboards (telegram board)
- Character prompt, Summary prose tone, manners copy (agent board T61)
- Telegram Character picker / admin title (telegram T44)
- Profile / Diary tables, digest injection, recall/refactor implementation (Phase 2)
- Check-in **window** / live poll as source of truth
- sushkobot V1 DB import
- Per-person Reminder times
- Monetization; admin HTTP client
- Inventing statuses (`missed` / `absent`) or bypassing Grace Token rules

## Related

- Architecture: [architecture.md](../../tech/architecture.md)
- Foundation: [foundation spec.md](../foundation/spec.md)
- Character: [character spec.md](../character/spec.md) (T70, T25 depends)
- Telegram: [telegram spec.md](../telegram/spec.md)
- Spec: [daily-rhythm.md](../../spec/daily-rhythm.md), [stats.md](../../spec/stats.md), [checklist.md](../../spec/checklist.md), [session.md](../../spec/session.md), [agent.md](../../spec/agent.md), [character.md](../../spec/character.md)
- ADRs: [0001](../../docs/adr/0001-grace-token.md), [0002](../../docs/adr/0002-overnight-deadline-day-key.md), [0004](../../docs/adr/0004-agentic-session-vs-day.md), [0005](../../docs/adr/0005-late-fix-until-next-reminder.md)
