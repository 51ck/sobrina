/**
 * Deadline verbs (T16). See tech/core-tasks.md T16, spec/daily-rhythm.md
 * (Deadline), spec/stats.md ("Deadline silence = slip-class write, no
 * `missed`/`absent`"), docs/adr/0001-grace-token.md.
 *
 * This module owns identifying which active Checklist members are
 * "silent" for a Day — i.e. have no {@link CheckIn} row at all for that
 * `(chatId, dayKey)` (T16.1) — and writing each silent member's
 * auto-slip Check-in via Grace Token rules (T16.2). Closing the Day
 * (T16.3) is a later slice; {@link autoSlipSilentMembers} never calls
 * {@link closeDay}.
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
import type { DayKey } from "./day.ts";

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
 * Does **not** close the Day (T16.3 is a later slice) and does not
 * touch members who already have a Check-in row for this Day (T16.1
 * already excludes them). Empty silent list → no-op, returns `[]`.
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
