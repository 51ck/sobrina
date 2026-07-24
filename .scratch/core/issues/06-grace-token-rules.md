# T15 — Grace Token (заморозка) rules

Status: resolved

**Problem:** Visible token (cap 1) replaces V1 invisible grace gate; earn/spend/refund must be rule-owned on write.

**Done when:** Earn when sober Streak reaches N; spend on explicit slip or Deadline silence → `minor_slip`; no token → `major_slip`; late sober fix refunds if that Check-in spent a token; cap 1 enforced; tests match [ADR 0001](../../../docs/adr/0001-grace-token.md) + [spec/stats.md](../../../spec/stats.md).

**Depends on:** T10.4–T10.5 ([01-ledger-schema.md](01-ledger-schema.md)), T11 (N) ([02-chat-settings-durable-verbs.md](02-chat-settings-durable-verbs.md)), T13 ([04-day-identity-lifecycle.md](04-day-identity-lifecycle.md)), **T18.1** (earn path needs Streak walk) ([09-streak-and-full-stats.md](09-streak-and-full-stats.md))

**Spec / arch links:** [ADR 0001](../../../docs/adr/0001-grace-token.md), [spec/stats.md](../../../spec/stats.md), [CONTEXT.md](../../../CONTEXT.md) (Grace Token)

**Out of scope:** Agent "remind about заморозка" copy; stacking tokens; mute-to-save-token behavior

**Tasks:**

- [x] **T15.1** Read/write token present (0|1) per Checklist member
- [x] **T15.2** Spend path: with token → `minor_slip` + token gone; without → `major_slip`
- [x] **T15.3** Earn path: after sober progress, when Streak reaches N → grant token if none (cap 1)
- [x] **T15.4** Refund path helper used by late fix: if Check-in spent token and corrected to sober → restore token
- [x] **T15.5** Tests: cap 1; earn at N; re-earn after spend by reaching N again; spend on slip; no double-stack

**Implementation note:** `maybeEarnGraceToken` takes `currentStreak` as a caller-supplied parameter rather than walking Check-in history itself (T18.1 Streak walk was not yet built when T15 landed). T14 (Record Check-in) and later T18 wiring should pass the pure Streak walk result once T18.1 exists; the rule (`currentStreak >= graceTokenN` and no token held) stays correct either way. See `packages/core/src/grace.ts`.
