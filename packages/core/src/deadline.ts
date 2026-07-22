/**
 * Deadline verbs (T16). See tech/core-tasks.md T16, spec/daily-rhythm.md
 * (Deadline), spec/stats.md ("Deadline silence = slip-class write, no
 * `missed`/`absent`"), docs/adr/0001-grace-token.md.
 *
 * This module owns identifying which active Checklist members are
 * "silent" for a Day — i.e. have no {@link CheckIn} row at all for that
 * `(chatId, dayKey)` (T16.1) — writing each silent member's auto-slip
 * Check-in via Grace Token rules (T16.2), and composing both into the
 * full Deadline verb that also closes the Day (T16.3) via {@link
 * closeDay}.
 *
 * ## T16.3 — closeDayAtDeadline
 *
 * {@link closeDayAtDeadline} is the theme verb: auto-slip, then close.
 * It does **not** produce a Day Summary — that is a separate product
 * step (spec/daily-rhythm.md Deadline step 2, "Post Day Summary") owned
 * by T23 (fact bundle) and the agent layer, not this verb layer. This
 * module has no Summary-shaped return value and never will; callers
 * that need Summary facts call T23's `daySummaryFacts` separately once
 * it exists.
 *
 * **Order:** {@link autoSlipSilentMembers} (T16.2) runs first, then
 * {@link ensureOpenDay} (T13.2), then {@link closeDay} (T13.3). The
 * `ensureOpenDay` step exists because an **empty Checklist** makes
 * `autoSlipSilentMembers` a pure no-op that creates no Day row (its own
 * module doc / T16.2 test) — without it, `closeDay` would throw
 * `DayNotFoundError` (day.ts) on a Day that legitimately has zero silent
 * members.
 * Calling `ensureOpenDay` after `autoSlipSilentMembers` is safe either
 * way: it is idempotent and never reopens an already-closed Day, so it
 * is a no-op both when `autoSlipSilentMembers` already opened the Day
 * via its first `recordCheckIn` call, and when the Day was already
 * closed. Net effect: **Deadline always leaves a closed Day row for
 * `dayKey`**, even when the Checklist is empty.
 *
 * **Already-closed Day:** not special-cased — behavior falls out of the
 * composed verbs' own semantics (documented here rather than adding a
 * redundant guard):
 * - No silent members left to slip (the normal case — a prior
 *   `closeDayAtDeadline` or `autoSlipSilentMembers` call already slipped
 *   everyone, or the Checklist is empty) → `autoSlipSilentMembers`
 *   no-ops, `ensureOpenDay` no-ops, `closeDay` no-ops (T13.3
 *   idempotent) — the whole call is a safe idempotent re-run.
 * - A genuinely silent member somehow still exists against an
 *   already-closed Day (should not happen in normal Deadline-once-per-
 *   Day usage) → `autoSlipSilentMembers` throws `DayClosedError`
 *   (checkin.ts, via `recordCheckIn`, same as any other closed-Day write
 *   attempt) — this module does not swallow that; callers see the same
 *   reject {@link recordCheckIn} already documents for closed-Day
 *   writes.
 *
 * **Validation:** no separate blank-arg guard in {@link
 * closeDayAtDeadline} itself — `autoSlipSilentMembers` already rejects
 * blank `chatId` / `dayKey` before anything else runs, mirroring how
 * {@link joinAndRecordCheckIn} (checkin.ts) leans on the verb it calls
 * first rather than re-validating.
 *
 * ## T16.2 — auto-slip write path
 *
 * {@link autoSlipSilentMembers} composes with the existing {@link
 * recordCheckIn} verb (T14.2) rather than writing `check_ins` directly:
 * each silent member gets a `recordCheckIn(..., "slip")` call, which
 * already runs the full open-Day-check + {@link resolveSlip} (T15.2) +
 * UPSERT path inside its own transaction. This mirrors how {@link
 * joinAndRecordCheckIn} (T14.3) composes smaller verbs rather than
 * re-implementing the write.
 *
 * **Transaction strategy:** per-member, not one transaction spanning the
 * whole silent list. Each `recordCheckIn` call is already atomic
 * (module doc, checkin.ts); this module does not wrap the loop in an
 * outer `store.db.transaction`, matching the sibling composition style
 * in checkin.ts (`joinAndRecordCheckIn` also chains independently atomic
 * calls). Consequence: if the process dies mid-loop, the members already
 * written keep their slip Check-in and the remaining ones stay silent —
 * safe to re-run, since {@link listSilentChecklistMembers} (T16.1) only
 * re-selects members still missing a row, so a retry cannot double-write
 * or double-spend a Grace Token for a member already slipped.
 *
 * **Day lifecycle:** no explicit {@link ensureOpenDay} call before the
 * loop — `recordCheckIn`'s own `requireOpenDay` already opens the Day on
 * the first silent member's call (T13.2 idempotent create) and every
 * later call in the same loop finds it already open. An **already
 * closed** Day (e.g. a caller re-invoking this after T16.3 has run) is
 * out of scope for this slice: `recordCheckIn` throws {@link
 * DayClosedError} on the first silent member it reaches, same as any
 * other closed-Day write — T16.3's integration is responsible for
 * calling this before closing, not after.
 *
 * Members who already have a Check-in row (any status) are excluded by
 * {@link listSilentChecklistMembers} and are never passed to
 * `recordCheckIn` here, so they are never overwritten. Empty silent list
 * (including an empty Checklist) → no `recordCheckIn` call at all, `[]`
 * returned, no Day row created as a side effect.
 */
import type { Store } from "./store.ts";
import { listChecklist } from "./checklist.ts";
import { recordCheckIn, type CheckIn } from "./checkin.ts";
import { closeDay, ensureOpenDay, type Day, type DayKey } from "./day.ts";

function requireChatId(chatId: string): string {
  const trimmed = chatId.trim();
  if (!trimmed) {
    throw new Error("chatId must be non-empty");
  }
  return trimmed;
}

function requireDayKey(dayKey: DayKey): DayKey {
  const trimmed = dayKey.trim();
  if (!trimmed) {
    throw new Error("dayKey must be non-empty");
  }
  return trimmed;
}

function hasCheckInRow(
  store: Store,
  chatId: string,
  memberId: string,
  dayKey: DayKey,
): boolean {
  const row = store.db
    .query(
      `SELECT 1 AS ok FROM check_ins
       WHERE chat_id = ? AND member_id = ? AND day_key = ?`,
    )
    .get(chatId, memberId, dayKey);
  return row !== null;
}

/**
 * Active Checklist members with **no** `check_ins` row for `(chatId,
 * dayKey)` (T16.1) — the set Deadline auto-slip (T16.2) will write to.
 * Members who left the Checklist are excluded (same active-membership
 * rule as {@link listChecklist}); members who already Check-in-ed for
 * this Day — any status, since one row is all it takes — are excluded
 * even if the Day is later reopened or corrected.
 *
 * The `days` row for `dayKey` need not exist yet: with no `check_ins`
 * row, every active Checklist member is silent regardless of whether
 * {@link ensureOpenDay} has ever run for this Day (T16.1 scope note —
 * Day existence is not a precondition for identifying silence).
 *
 * Empty Checklist → empty list. Order matches {@link listChecklist}
 * (oldest join first).
 */
export function listSilentChecklistMembers(
  store: Store,
  chatId: string,
  dayKey: DayKey,
): string[] {
  const chat = requireChatId(chatId);
  const key = requireDayKey(dayKey);

  return listChecklist(store, chat)
    .filter((member) => !hasCheckInRow(store, chat, member.memberId, key))
    .map((member) => member.memberId);
}

/**
 * Write a slip-class Check-in for every silent Checklist member on
 * `dayKey` (T16.2), via Grace Token rules — see module doc "T16.2 —
 * auto-slip write path" for the composition and transaction strategy.
 *
 * Does **not** close the Day itself — that is {@link closeDayAtDeadline}
 * (T16.3) — and does not touch members who already have a Check-in row
 * for this Day (T16.1 already excludes them). Empty silent list → no-op,
 * returns `[]`.
 *
 * Returns the written {@link CheckIn} rows in the same order as {@link
 * listSilentChecklistMembers} (oldest Checklist join first).
 */
export function autoSlipSilentMembers(
  store: Store,
  chatId: string,
  dayKey: DayKey,
): CheckIn[] {
  const chat = requireChatId(chatId);
  const key = requireDayKey(dayKey);

  return listSilentChecklistMembers(store, chat, key).map((memberId) =>
    recordCheckIn(store, chat, memberId, key, "slip"),
  );
}

/**
 * Result of {@link closeDayAtDeadline} — the auto-slip Check-ins written
 * (T16.2) plus the resulting closed {@link Day} row (T13.3). Kept small
 * on purpose: **no Summary fields** — Day Summary facts are T23's
 * `daySummaryFacts`, called separately by the agent layer, never bundled
 * into this verb's return (module doc "T16.3 — closeDayAtDeadline").
 */
export type CloseDayAtDeadlineResult = {
  readonly checkIns: CheckIn[];
  readonly day: Day;
};

/**
 * The Deadline theme verb (T16.3): auto-slip every silent Checklist
 * member (T16.2), then close the Day (T13.3) — see module doc "T16.3 —
 * closeDayAtDeadline" for order, the empty-Checklist safety argument,
 * already-closed-Day behavior, and why this never returns Summary data.
 *
 * Safe to call on an empty Checklist (closes the Day with `checkIns:
 * []`) and safe to re-run once everyone silent has already been
 * auto-slipped (idempotent no-op that still returns the closed Day).
 */
export function closeDayAtDeadline(
  store: Store,
  chatId: string,
  dayKey: DayKey,
): CloseDayAtDeadlineResult {
  const checkIns = autoSlipSilentMembers(store, chatId, dayKey);
  ensureOpenDay(store, chatId, dayKey);
  const day = closeDay(store, chatId, dayKey);

  return { checkIns, day };
}
