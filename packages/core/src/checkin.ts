/**
 * Record Check-in verb (T14.1 sober path + T14.2 slip path, both on an
 * open Day) plus the T14.3 join-then-record composition. See
 * tech/core-tasks.md T14, spec/daily-rhythm.md (Check-in anytime),
 * spec/stats.md (status), spec/checklist.md (join + record),
 * spec/agent.md (Record Check-in capability), CONTEXT.md (Check-in).
 *
 * A Check-in is one member's stored status for one Day: `sober` |
 * `minor_slip` | `major_slip` (CONTEXT.md). One row per (chatId,
 * memberId, dayKey) — UPSERT (T10.4 schema; product "one status per
 * member per Day"). This module owns the write path only; the Grace
 * Token rule matrix itself lives in T15 (grace.ts); the late-fix
 * carve-out lives in T17.
 *
 * ## Reject cases (T14.4)
 *
 * Both {@link recordCheckIn} and {@link joinAndRecordCheckIn} throw
 * rather than inventing a status (no `missed` / `absent`). This is the
 * full reject-case policy for the Record Check-in verbs — nothing else
 * in this module rejects a write:
 *
 * | Case | Thrown by | Error | Notes |
 * |------|-----------|-------|-------|
 * | Target Day already **closed** | both verbs, both intents (`sober` and `slip`) | {@link DayClosedError} | Late correction is **T17 only** — a closed Day is never reopened here. On `joinAndRecordCheckIn`, the join still lands (T14.3 behavior); only the write rejects. |
 * | Member **not on the Checklist** | `recordCheckIn` only | {@link NotOnChecklistError} | `joinAndRecordCheckIn` never throws this — it joins first (T14.3), so membership always holds by the time it calls `recordCheckIn`. |
 * | Blank `chatId` / `memberId` / `dayKey` (empty or whitespace-only) | both verbs | plain `Error` | Same "trim then require non-empty" guard used across `@sobri/core` (day.ts, checklist.ts, grace.ts, settings.ts) — no dedicated error class. |
 *
 * A rejected write never mutates an existing Check-in row for that Day.
 * The Checklist-membership check, the Day-open check, and the write
 * itself run inside one transaction (see "Membership + Day-open check +
 * write" below), so `DayClosedError` / `NotOnChecklistError` always fires
 * **before** {@link writeSober} or {@link writeSlip} ever runs — so
 * before the sober-write refund (which reads, then updates the Grace
 * Token store) and before either write's `check_ins` UPSERT. A prior
 * Check-in for that Day, if any, is left exactly as it was (status,
 * `spent_grace_token`, `updated_at` all unchanged); see checkin.test.ts
 * for coverage of this with a prior Check-in already on the row before
 * the Day closes.
 *
 * ## Scope decisions
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
 *   {@link DayClosedError} for both `sober` and `slip` intents — the
 *   full closed-Day reject policy (T14.4; late corrections stay T17's
 *   job). See "Reject cases" above.
 * - **Non-member Check-in (T14.3):** {@link joinAndRecordCheckIn} is a
 *   thin, separately-named composition of {@link joinChecklist} (T12.1,
 *   idempotent) then {@link recordCheckIn} — ticket T14.3 Option A. Kept
 *   as its own verb (not a `{ joinIfNeeded }` flag folded into
 *   `recordCheckIn`, Option B) so every existing `recordCheckIn` call
 *   site that relies on strict membership (`NotOnChecklistError` above)
 *   keeps that behavior unchanged; callers who want "button or
 *   conversational Check-in = join + record" (spec/checklist.md) opt in
 *   by calling the composed verb instead. `joinChecklist` and
 *   `recordCheckIn` each run as their own atomic statement/transaction —
 *   no single transaction spans both — which is fine for a single
 *   in-process call and mirrors how other durable verbs in this package
 *   are composed from smaller idempotent verbs.
 * - **Grace Token earn (sober only):** after a sober write, calls
 *   {@link maybeEarnGraceToken} with `currentStreak = 0` as a documented
 *   interim (T15's implementation note, tech/core-tasks.md — the real
 *   Streak walk is T18.1). `graceTokenN >= 1` is enforced by
 *   `updateSettings`, so `0 < graceTokenN` always holds and no token is
 *   granted via this path yet; the call shape is correct ahead of
 *   T18.1 supplying the real Streak count. **Never called for `slip`**
 *   (ticket T14.2: explicit slip is not sober progress).
 * - **Grace Token spend (slip, T14.2):** calls {@link resolveSlip} once
 *   per `recordCheckIn(..., "slip")` call — resolveSlip's own read+spend
 *   transaction (grace.ts) makes this safe to call unconditionally,
 *   regardless of the Check-in's previous status:
 *   - no prior row, or prior `sober` → resolves fresh; spends a held
 *     token (`minor_slip`) or not (`major_slip`).
 *   - prior `minor_slip`/`major_slip` for the same Day (re-recording a
 *     slip) → resolves fresh again. If the first slip already spent the
 *     token, the token is gone, so this call finds none and returns
 *     `major_slip` — **not** a double-spend, but note this can *upgrade*
 *     a `minor_slip` to `major_slip` on a same-Day re-slip. Accepted per
 *     ticket: "one status per Day", and resolving fresh each time is the
 *     simplest rule that cannot double-spend.
 * - **Grace Token refund (sober-over-slip, T14.1 note):** if a `sober`
 *   write overwrites a prior Check-in that had `spent_grace_token = 1`,
 *   {@link refundGraceToken} runs first (mirrors T17's late-fix refund,
 *   spec/stats.md "Late fix to sober: refund token if that Check-in
 *   spent one") — cheap: one extra read of the existing row before the
 *   UPSERT — and keeps an open-Day sober correction from leaving a
 *   spent token stranded ahead of T17. Note the inverse is not
 *   symmetric: re-slipping after a slip already cleared the token
 *   (module doc above) does not restore it on a later sober write,
 *   since `spent_grace_token` is already `0` by then — matches the
 *   ticket's literal UPSERT shape, flagged here for T17/T18 awareness.
 * - **Membership + Day-open check + write** run inside one
 *   `store.db.transaction` so a concurrent `closeDay` (T16 Deadline
 *   close, e.g. another process sharing the SQLite file) cannot land
 *   between the open-Day check and the write. `resolveSlip`'s own
 *   transaction nests inside via SQLite `SAVEPOINT` (bun:sqlite
 *   `Database.transaction` supports nesting).
 */
import type { Store } from "./store.ts";
import { isOnChecklist, joinChecklist } from "./checklist.ts";
import { ensureOpenDay, type Day, type DayKey } from "./day.ts";
import { maybeEarnGraceToken, refundGraceToken, resolveSlip, type SlipResolution } from "./grace.ts";
import { getSettings } from "./settings.ts";

/** Caller's recorded intent — see module doc above for the `sober` / `slip` write paths. */
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
 * Writes `sober`, refunding a token first (T15.4 `refundGraceToken`) if
 * the row being overwritten had `spent_grace_token = 1` — see module doc
 * "Grace Token refund (sober-over-slip, T14.1 note)".
 */
function writeSober(
  store: Store,
  chatId: string,
  memberId: string,
  dayKey: DayKey,
): CheckIn {
  const previous = readCheckInRow(store, chatId, memberId, dayKey);
  if (previous?.spentGraceToken) {
    refundGraceToken(store, chatId, memberId);
  }

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

/** Writes the status/spend outcome a {@link resolveSlip} call already decided. */
function writeSlip(
  store: Store,
  chatId: string,
  memberId: string,
  dayKey: DayKey,
  resolution: SlipResolution,
): CheckIn {
  store.db
    .query(
      `INSERT INTO check_ins (chat_id, member_id, day_key, status, spent_grace_token)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(chat_id, member_id, day_key) DO UPDATE SET
         status = excluded.status,
         spent_grace_token = excluded.spent_grace_token,
         updated_at = datetime('now')`,
    )
    .run(
      chatId,
      memberId,
      dayKey,
      resolution.status,
      resolution.spentToken ? 1 : 0,
    );

  // Present immediately after the statement above — non-null by construction.
  return readCheckInRow(store, chatId, memberId, dayKey) as CheckIn;
}

/**
 * Record a Check-in for `memberId` on `dayKey` — `sober` (T14.1) or
 * `slip` via Grace Token rules (T14.2). See module doc for Checklist,
 * Day-lifecycle, and Grace Token earn/spend/refund scope notes.
 *
 * Order of checks: Checklist membership, then Day open (via
 * {@link ensureOpenDay}), then the intent-specific write — all three run
 * inside one `store.db.transaction` (module doc). Throws
 * {@link NotOnChecklistError} / {@link DayClosedError} accordingly;
 * rejects blank `chatId` / `memberId` / `dayKey`.
 *
 * One status per (chat, member, Day) — a second Check-in (either
 * intent) for the same Day updates the existing row rather than
 * erroring (T10.4 PK, product "one status per member per Day").
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

  const run = store.db.transaction((): CheckIn => {
    if (!isOnChecklist(store, chat, member)) {
      throw new NotOnChecklistError(chat, member);
    }
    requireOpenDay(store, chat, key);
    if (intent === "slip") {
      const resolution = resolveSlip(store, chat, member);
      return writeSlip(store, chat, member, key, resolution);
    }
    return writeSober(store, chat, member, key);
  });
  const checkIn = run();

  // Grace Token earn is sober-progress-only (module doc) — never for slip.
  if (intent === "sober") {
    const settings = getSettings(store, chat);
    maybeEarnGraceToken(store, chat, member, 0, settings.graceTokenN);
  }

  return checkIn;
}

/**
 * Non-member Check-in (T14.3): {@link joinChecklist} then
 * {@link recordCheckIn} — spec/checklist.md "button or conversational
 * Check-in = join + record if not already on the list." See module doc
 * "Non-member Check-in (T14.3)" for why this is a separate verb (Option
 * A) rather than a flag on `recordCheckIn`.
 *
 * Already-member calls behave exactly like calling {@link recordCheckIn}
 * directly — `joinChecklist` is a no-op for an already-active member.
 * Works for both `sober` and `slip` intents (passed straight through).
 */
export function joinAndRecordCheckIn(
  store: Store,
  chatId: string,
  memberId: string,
  dayKey: DayKey,
  intent: CheckInIntent,
): CheckIn {
  joinChecklist(store, chatId, memberId);
  return recordCheckIn(store, chatId, memberId, dayKey, intent);
}
