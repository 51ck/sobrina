# T40 — Day Summary delivery

Status: ready-for-agent

**Problem:** After Deadline, Summary is a normal group post — not an Antistreak scoreboard.

**Done when:** On Deadline Session wake (after core T16), adapter obtains core T23 fact bundle (+ agent prose when agent board lands); posts Summary to group; soft line when quiet flag / Checklist exists per facts; does not lead with Antistreak. Reply threading optional — lock choice here.

**Depends on:** T33 ([04-outbound-send-path.md](04-outbound-send-path.md)), core T16, T21.5, T23 ([../core/issues/07-deadline-close-day-auto-slip.md](../../core/issues/07-deadline-close-day-auto-slip.md), [../core/issues/12-scheduler-reminder-deadline-wakes.md](../../core/issues/12-scheduler-reminder-deadline-wakes.md), [../core/issues/14-day-summary-fact-bundle.md](../../core/issues/14-day-summary-fact-bundle.md)); agent narration optional stub

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (Day Summary), [spec/stats.md](../../../spec/stats.md) (voice), [spec/telegram-ux.md](../../../spec/telegram-ux.md) (Hygiene)

**Out of scope:** Inventing quiet thresholds; Antistreak leaderboard posts

**Tasks:**

- [ ] **T40.1** Deadline wake → load `daySummaryFacts` for `dayKey`
- [ ] **T40.2** Build outbound text: use agent Summary tool/prose when available; else minimal factual Russian stub from bundle (heroes/support/soft-line) — no Antistreak list
- [ ] **T40.3** Lock threading: normal post vs reply-to Reminder (document)
- [ ] **T40.4** Smoke: closed Day with fixtures → one Summary message; empty Checklist → no shame parade (per core empty flag)
