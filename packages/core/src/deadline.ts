/**
 * Deadline verbs (T16). See tech/core-tasks.md T16, spec/daily-rhythm.md
 * (Deadline), spec/stats.md ("Deadline silence = slip-class write, no
 * `missed`/`absent`"), docs/adr/0001-grace-token.md.
 *
 * This module owns identifying which active Checklist members are
 * "silent" for a Day — i.e. have no {@link CheckIn} row at all for that
 * `(chatId, dayKey)`. Silence is a row-presence check, not a status
 * check: there is no `missed`/`absent` status to look for
 * (spec/stats.md), so "silent" can only mean "no `check_ins` row yet".
 * Writing the auto-slip Check-in (T16.2) and closing the Day (T16.3) are
 * later slices — this module does not write anything.
 */
import type { Store } from "./store.ts";
import { listChecklist } from "./checklist.ts";
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
