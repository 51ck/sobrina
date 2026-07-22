/**
 * Record Check-in verb (T14.1 — sober write path on an open Day). See
 * tech/core-tasks.md T14, spec/daily-rhythm.md (Check-in anytime),
 * spec/stats.md (status), spec/checklist.md (join + record),
 * spec/agent.md (Record Check-in capability), CONTEXT.md (Check-in).
 *
 * A Check-in is one member's stored status for one Day: `sober` |
 * `minor_slip` | `major_slip` (CONTEXT.md). One row per (chatId,
 * memberId, dayKey) — UPSERT (T10.4 schema; product "one status per
 * member per Day"). This module owns the write path only; Grace Token
 * rules for slip live in T15 (grace.ts), full closed-Day policy and the
 * late-fix carve-out live in T14.4 / T17.
 *
 * ## T14.1 scope decisions
 * - **Intent:** only `sober` is implemented. `slip` is accepted in the
 *   type surface (checked first) so T14.2 can extend this verb's call
 *   sites without a signature break, but {@link recordCheckIn} throws
 *   for it until T15's `resolveSlip` is wired in here (T14.2).
 * - **Checklist membership:** requires the member already **on the
 *   Checklist** — throws {@link NotOnChecklistError} rather than
 *   silently joining. spec/checklist.md allows "Check-in from a
 *   non-member joins Checklist then records", but that composition is
 *   explicitly T14.3; this verb stays single-responsibility (write,
 *   given membership) so T14.3 can layer `joinChecklist` +
 *   `recordCheckIn` on top without changing behavior underneath it.
 * - **Day lifecycle:** uses {@link ensureOpenDay} (T13.2) rather than a
 *   plain read, so an early Check-in before the Day was otherwise
 *   opened still succeeds (spec/daily-rhythm.md Day resolution branch
 *   4). A `closed` Day is never reopened; this verb throws
 *   {@link DayClosedError} — an early, narrow slice of T14.4's full
 *   closed-Day policy (late corrections stay T17's job).
 * - **Grace Token earn:** after a sober write, calls
 *   {@link maybeEarnGraceToken} with `currentStreak = 0` as a documented
 *   interim (T15's implementation note, tech/core-tasks.md — the real
 *   Streak walk is T18.1). `graceTokenN >= 1` is enforced by
 *   `updateSettings`, so `0 < graceTokenN` always holds and no token is
 *   granted via this path yet; the call shape is correct ahead of
 *   T18.1 supplying the real Streak count.
 * - **Membership + Day-open check + write** run inside one
 *   `store.db.transaction` (mirrors grace.ts's `resolveSlip`) so a
 *   concurrent `closeDay` (T16 Deadline close, e.g. another process
 *   sharing the SQLite file) cannot land between the open-Day check and
 *   the write.
 */
import type { Store } from "./store.ts";
import { isOnChecklist } from "./checklist.ts";
import { ensureOpenDay, type Day, type DayKey } from "./day.ts";
import { maybeEarnGraceToken } from "./grace.ts";
import { getSettings } from "./settings.ts";

/** Caller's recorded intent — see T14.1 scope note above for `slip`. */
export type CheckInIntent = "sober" | "slip";

/** Stored Check-in status (CONTEXT.md Check-in; spec/stats.md). */
export type CheckInStatus = "sober" | "minor_slip" | "major_slip";

export type CheckIn = {
  readonly chatId: string;
  readonly memberId: string;
  readonly dayKey: DayKey;
  readonly status: CheckInStatus;
  readonly spentGraceToken: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Thrown by {@link recordCheckIn} when the member is not on the Checklist (join is T14.3). */
export class NotOnChecklistError extends Error {
  override readonly name = "NotOnChecklistError";

  constructor(
    readonly chatId: string,
    readonly memberId: string,
  ) {
    super(
      `Not on Checklist: ${chatId}/${memberId}. Join first (tech/core-tasks.md T14.3), then record.`,
    );
  }
}

/** Thrown by {@link recordCheckIn} when the target Day is closed (late fix is T17). */
export class DayClosedError extends Error {
  override readonly name = "DayClosedError";

  constructor(
    readonly chatId: string,
    readonly dayKey: DayKey,
  ) {
    super(
      `Day closed: ${chatId}/${dayKey}. Late fix is tech/core-tasks.md T17, not recordCheckIn.`,
    );
  }
}

function requireChatId(chatId: string): string {
  const trimmed = chatId.trim();
  if (!trimmed) {
    throw new Error("chatId must be non-empty");
  }
  return trimmed;
}

function requireMemberId(memberId: string): string {
  const trimmed = memberId.trim();
  if (!trimmed) {
    throw new Error("memberId must be non-empty");
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

function requireOpenDay(store: Store, chatId: string, dayKey: DayKey): Day {
  const day = ensureOpenDay(store, chatId, dayKey);
  if (day.status !== "open") {
    throw new DayClosedError(chatId, dayKey);
  }
  return day;
}

type CheckInRow = {
  chat_id: string;
  member_id: string;
  day_key: string;
  status: CheckInStatus;
  spent_grace_token: number;
  created_at: string;
  updated_at: string;
};

function toCheckIn(row: CheckInRow): CheckIn {
  return {
    chatId: row.chat_id,
    memberId: row.member_id,
    dayKey: row.day_key,
    status: row.status,
    spentGraceToken: row.spent_grace_token === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readCheckInRow(
  store: Store,
  chatId: string,
  memberId: string,
  dayKey: DayKey,
): CheckIn | null {
  const row = store.db
    .query(
      `SELECT chat_id, member_id, day_key, status, spent_grace_token, created_at, updated_at
       FROM check_ins WHERE chat_id = ? AND member_id = ? AND day_key = ?`,
    )
    .get(chatId, memberId, dayKey) as CheckInRow | null;
  return row ? toCheckIn(row) : null;
}

/**
 * Overwrites `spent_grace_token` to `0` unconditionally. Correct while
 * only `sober` intent exists (this slice); once T14.2 lands a
 * sober-over-slip overwrite through this same open-Day path, that
 * caller must call grace.ts's `refundGraceToken` (T15.4) *before* this
 * clears the flag, the same way T17's late fix does — this helper does
 * not infer that on its own.
 */
function writeSober(
  store: Store,
  chatId: string,
  memberId: string,
  dayKey: DayKey,
): CheckIn {
  store.db
    .query(
      `INSERT INTO check_ins (chat_id, member_id, day_key, status, spent_grace_token)
       VALUES (?, ?, ?, 'sober', 0)
       ON CONFLICT(chat_id, member_id, day_key) DO UPDATE SET
         status = excluded.status,
         spent_grace_token = excluded.spent_grace_token,
         updated_at = datetime('now')`,
    )
    .run(chatId, memberId, dayKey);

  // Present immediately after the statement above — non-null by construction.
  return readCheckInRow(store, chatId, memberId, dayKey) as CheckIn;
}

/**
 * Record a Check-in for `memberId` on `dayKey` (T14.1: `sober` only —
 * see module doc for `slip`, Checklist, and Day-lifecycle scope notes).
 *
 * Order of checks: intent (`slip` rejected first), then Checklist
 * membership, then Day open (via {@link ensureOpenDay}), then write —
 * the last three run inside one `store.db.transaction` (module doc).
 * Throws {@link NotOnChecklistError} / {@link DayClosedError}
 * accordingly; rejects blank `chatId` / `memberId` / `dayKey`.
 *
 * One status per (chat, member, Day) — a second sober Check-in for the
 * same Day updates the existing row rather than erroring (T10.4 PK,
 * product "one status per member per Day").
 */
export function recordCheckIn(
  store: Store,
  chatId: string,
  memberId: string,
  dayKey: DayKey,
  intent: CheckInIntent,
): CheckIn {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  const key = requireDayKey(dayKey);

  if (intent === "slip") {
    throw new Error(
      `recordCheckIn: "slip" intent lands in tech/core-tasks.md T14.2 (chatId=${chat} memberId=${member} dayKey=${key})`,
    );
  }

  const run = store.db.transaction((): CheckIn => {
    if (!isOnChecklist(store, chat, member)) {
      throw new NotOnChecklistError(chat, member);
    }
    requireOpenDay(store, chat, key);
    return writeSober(store, chat, member, key);
  });
  const checkIn = run();

  const settings = getSettings(store, chat);
  maybeEarnGraceToken(store, chat, member, 0, settings.graceTokenN);

  return checkIn;
}
