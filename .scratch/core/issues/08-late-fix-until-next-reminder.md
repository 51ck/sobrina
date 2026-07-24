# T17 — Late fix until next Reminder

Status: resolved

**Problem:** After Deadline, members may correct a Check-in until the chat's next Reminder; sober fix may refund Grace Token.

**Done when:** `correctCheckIn` (or equivalent) allowed only during the **late-fix period** (after Day closed, **until next Reminder**); updates stored status; refunds per T15.4 when applicable; streaks recompute from history on read; tests for allowed vs past-next-Reminder rejection ([ADR 0005](../../../docs/adr/0005-late-fix-until-next-reminder.md)). No check-in **window**.

**Depends on:** T14 ([05-record-check-in-verb.md](05-record-check-in-verb.md)), T15 ([06-grace-token-rules.md](06-grace-token-rules.md)), T16 ([07-deadline-close-day-auto-slip.md](07-deadline-close-day-auto-slip.md)), T11 (Reminder schedule for "next Reminder" boundary) ([02-chat-settings-durable-verbs.md](02-chat-settings-durable-verbs.md))

**Spec / arch links:** [ADR 0005](../../../docs/adr/0005-late-fix-until-next-reminder.md), [spec/daily-rhythm.md](../../../spec/daily-rhythm.md), [spec/stats.md](../../../spec/stats.md)

**Out of scope:** Forever-editable history; freeze-at-midnight-only rule; inventing a check-in window

**Tasks:**

- [x] **T17.1** Helper: is late fix still allowed now? (after Day closed, **until next Reminder** in chat TZ)
- [x] **T17.2** `correctCheckIn` → new status; apply refund when correcting to sober if token was spent
- [x] **T17.3** Reject corrections after the late-fix period ends (once next Reminder has passed)
- [x] **T17.4** Tests: auto-slip → sober refund; correction after next Reminder rejected; open-Day ordinary record still via T14 not late-fix

**Implementation note (T17.4 — theme close-out):** Audited `latefix.test.ts` against the T17 Done-when matrix — T17.1–T17.3 already covered fence helpers, `correctCheckIn` write/refund, and reject-after-fence depth end-to-end (exact-at-fence in T17.2; well-after + overnight in T17.3). Standards previously pushed back on re-cloning that reject matrix in T17.3, so this close-out does **not** re-walk the past-fence cell (same skip pattern as T16.4's empty-Checklist). Added one new `describe` block, two tests, that close the remaining Done-when gaps at the product seams the board names: (1) `closeDayAtDeadline` silent auto-slip with a spent Grace Token → late sober `correctCheckIn` refunds the token and a fresh `getDay` read shows the Day **stays closed** (the Day-stays-closed assertion was the real gap vs T17.2's refund twin); (2) open Day: T14 `recordCheckIn` succeeds, then `correctCheckIn` rejects with `LateFixNotAllowedError` reason `"day-open"` without mutating the T14 row or Day status — proving late-fix is not the open-Day path (T17.2 only covered the reject half). No production code changed.
