# T23 — Day Summary fact bundle

Status: ready-for-agent

**Problem:** After Deadline, product needs Summary facts (heroes/support/quiet) without Antistreak scoreboard — core supplies data; agent narrates later.

**Done when:** Given a closed Day, core returns a structured fact bundle: sober members, slip members, quiet Day flag, Checklist empty flag; **does not** include Antistreak leaderboard fields; tests lock shape.

**Depends on:** T16 ([07-deadline-close-day-auto-slip.md](07-deadline-close-day-auto-slip.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (Day Summary), [spec/stats.md](../../../spec/stats.md) (voice), [CONTEXT.md](../../../CONTEXT.md) (Day Summary)

**Out of scope:** Russian prose generation; Telegram post/thread; agent tone (agent board)

**Tasks:**

- [ ] **T23.1** `daySummaryFacts(chatId, dayKey)` from Check-ins + Checklist
- [ ] **T23.2** When Checklist exists, expose a soft-line / quiet flag for Summary consumers per [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) ("soft line if quiet") — **no invented numeric "few sobers" threshold**; agent may interpret quiet from the fact bundle later
- [ ] **T23.3** Assert bundle omits Antistreak rankings
- [ ] **T23.4** Tests: heroes/support partition; empty Checklist; soft-line flag present when Checklist exists (shape only — no threshold invention)
