# T16 — Deadline close Day (auto-slip)

Status: resolved

**Problem:** At Deadline, silent Checklist members get slip-class Check-ins; then Day closes. Summary facts are T23.

**Done when:** `closeDayAtDeadline(chatId, dayKey)` (or equivalent) auto-slips each Checklist member without a Check-in for that Day using Grace Token rules; Day marked closed; members who already Check-in-ed are untouched; tests cover mixed silent/checked.

**Depends on:** T12 ([03-checklist-membership-verbs.md](03-checklist-membership-verbs.md)), T13 ([04-day-identity-lifecycle.md](04-day-identity-lifecycle.md)), T14 ([05-record-check-in-verb.md](05-record-check-in-verb.md)), T15 ([06-grace-token-rules.md](06-grace-token-rules.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (Deadline), [spec/stats.md](../../../spec/stats.md), [ADR 0001](../../../docs/adr/0001-grace-token.md)

**Out of scope:** Posting Day Summary text; Telegram send; scheduler timer (T21 wires the call)

**Tasks:**

- [x] **T16.1** Identify silent Checklist members for Day (no Check-in row yet)
- [x] **T16.2** Write slip-class Check-in per silent member via Grace Token rules
- [x] **T16.3** Close Day after auto-slips; safe if Checklist empty (document: no Summary obligation at verb layer — product Summary when Checklist exists is T23/agent)
- [x] **T16.4** Tests: all silent; partial Check-ins; token spend on silence; Day closed afterward

**Implementation note (T16.4 — theme close-out):** Audited `deadline.test.ts` against the T16 Done-when matrix — T16.1–T16.3 already covered every required cell individually, but mostly via `autoSlipSilentMembers` (T16.2) rather than the board's own composed verb, `closeDayAtDeadline`. Added one new `describe` block, two tests, that re-walks the required matrix specifically through `closeDayAtDeadline` so the Done-when is exercised at the seam it names: (1) one test drives an "all silent" Checklist (one member holding a Grace Token, one without) through `closeDayAtDeadline` and asserts both resulting statuses (`minor_slip`/`major_slip`), that the spent token is actually gone (`hasGraceToken` false, not just `spentGraceToken` on the returned row), that every returned status is in the literal `sober | minor_slip | major_slip` allow-list, and that the Day is closed both via the returned `result.day` and via a fresh `getDay(...)` read; (2) one test adds an already-checked-in member to the same shape (partial Check-ins) and asserts that member's row is byte-for-byte untouched (`status`/`spent_grace_token`/`updated_at`) while the two silent members are still auto-slipped correctly, plus the same allow-list scan over every row for the Day (touched and untouched) and the same `getDay` closed assertion. The already-covered "empty Checklist through `closeDayAtDeadline`" cell (T16.3's own first test) was not duplicated — it already calls the composed verb directly and is not redundant with anything new here. No production code changed; `deadline.ts` behavior was already correct per T16.1–T16.3, this slice only closed a "which seam is exercised" test gap.
