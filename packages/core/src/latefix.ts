/**
 * Late fix fence (T17.1). See tech/core-tasks.md T17, ADR 0005
 * (docs/adr/0005-late-fix-until-next-reminder.md), spec/daily-rhythm.md
 * (Late fix), spec/stats.md (Late fix).
 *
 * This module owns exactly one question, pure(ish) against the store —
 * "may this closed Day still be corrected at `now`?" — via
 * {@link isLateFixAllowed} (T17.1). It also owns the write verb built on
 * top, {@link correctCheckIn} (T17.2), so the late-fix window and the
 * late-fix write live in one place rather than being split across
 * `checkin.ts` and here. T17.3 locks the reject-after-fence contract on
 * this same verb (deepened tests only — see "T17.3 — reject after
 * late-fix fence" in `latefix.test.ts`; no gate changed).
 *
 * ## Locked semantics (T17.1)
 *
 * Late fix is allowed for `(chatId, dayKey)` at instant `now` iff **all**:
 *
 * 1. The Day exists and its status is **`closed`** (T13). An **open**
 *    Day is not a late-fix target — ordinary Check-in is T14's job, and
 *    a **missing** Day (never opened) has nothing to fix.
 * 2. The chat has a usable `reminderTime` ({@link ChatSettings}) — the
 *    late-fix fence cannot be computed without it (see "Unknown fence"
 *    below).
 * 3. `now` is **strictly before** the next Reminder instant after this
 *    Day (see "Next Reminder fence" below).
 *
 * ## Next Reminder fence
 *
 * ADR 0005 / spec/daily-rhythm.md: the fence is "the chat's next
 * Reminder" after the closed Day. Reminder fires once per calendar day
 * at `settings.reminderTime` local wall-clock (T11); Day `dayKey` was
 * itself opened by the Reminder on calendar date `dayKey` (T13.1). The
 * **next** Reminder — the one that opens the *following* Reminder-cycle
 * — therefore always falls on `dayKey` shifted by **+1 calendar day**,
 * at the same `reminderTime`, regardless of same-calendar or overnight
 * Deadline:
 *
 * - **Same-calendar** (`deadlineTime > reminderTime`): Deadline closes
 *   the Day on calendar date `dayKey` itself, strictly before
 *   `dayKey + 1`'s Reminder — the fence is later than the close, always
 *   a non-empty window.
 * - **Overnight** (`deadlineTime <= reminderTime`, ADR 0002): Deadline
 *   closes the Day on calendar date `dayKey + 1` at `deadlineTime`,
 *   which is `<= reminderTime` on that same date — so Deadline always
 *   lands at or before `dayKey + 1`'s Reminder too. (`deadlineTime ==
 *   reminderTime` is the degenerate boundary case: Deadline and the next
 *   Reminder coincide, so the late-fix window is zero-length —
 *   documented, not specially rejected; `now` can never be *strictly*
 *   before an instant equal to the close.)
 *
 * This means the fence never needs the Day's own Deadline instant to be
 * recomputed — {@link nextReminderAfterDay} derives it purely from the
 * Day key + settings, per the ticket's "prefer deriving from Day key +
 * settings ... rather than wall-clock guessing" guidance, using day.ts's
 * {@link shiftDayKey} (+1 calendar day) and {@link instantFromLocalClock}
 * (local wall-clock → UTC instant) — both generic calendar helpers that
 * live beside {@link localDateAndClock} in `day.ts` rather than being
 * duplicated here. Reminder cadence is assumed daily (one Reminder per
 * calendar day) — the model has no per-cycle Reminder skipping.
 *
 * ## Unknown fence (`reminderTime === null`)
 *
 * Without a configured Reminder time there is no fence to compute at
 * all — this is not a normal "not allowed" outcome (like an open or
 * past-fence Day) but a configuration gap the caller must fix first.
 * {@link isLateFixAllowed} and {@link nextReminderAfterDay} both throw
 * {@link LateFixFenceUnknownError} rather than returning `false`,
 * mirroring how sibling verbs (`checkin.ts` {@link DayClosedError} /
 * {@link NotOnChecklistError}) throw dedicated errors for reject cases
 * a caller can act on, rather than folding every rejection into a single
 * boolean.
 *
 * ## Reject cases
 *
 * | Case | Result | Notes |
 * |------|--------|-------|
 * | Day missing (never opened) | `false` | Nothing to fix; not an error — see T19 Day resolution, which treats a non-fixable Day as just another branch. |
 * | Day status `open` | `false` | Late fix is for **closed** Days only; ordinary Check-in is T14. |
 * | Day `closed`, `reminderTime` unset | throws {@link LateFixFenceUnknownError} | Configuration gap, not a normal reject — see "Unknown fence" above. |
 * | Day `closed`, `now` at/after next Reminder | `false` | Past the ADR 0005 fence — `now` **at** the fence rejects too (strict `<` in {@link isLateFixAllowed}, not `<=`). Same-calendar at-fence via {@link correctCheckIn} is locked in T17.2; T17.3 adds overnight + well-after-fence depth on the same verb. |
 * | Day `closed`, `now` strictly before next Reminder | `true` | Allowed. |
 * | Blank `chatId` / `dayKey` | throws plain `Error` | Same "trim then require non-empty" guard used across `@sobri/core` (day.ts, checklist.ts, grace.ts, settings.ts, checkin.ts). |
 *
 * `now` defaults to `new Date()` but is always an injectable parameter —
 * never hardcoded inside the decision — so tests can pin an instant.
 *
 * ## T17.2 — correctCheckIn
 *
 * {@link correctCheckIn} corrects the stored status of an **existing**
 * Check-in on a **closed** Day, during the late-fix window
 * {@link isLateFixAllowed} defines. It reuses `checkin.ts`'s write
 * primitives rather than duplicating them:
 *
 * - **To `sober`**: {@link writeSober} (checkin.ts) — refunds a Grace
 *   Token first if the row being overwritten had `spentGraceToken` true
 *   (spec/stats.md "Late fix to sober: refund token if that Check-in
 *   spent one"), then writes `sober` with `spent_grace_token` cleared.
 *   This is the ticket's minimum-required behavior.
 * - **To `slip`**: {@link resolveSlip} (grace.ts) then {@link writeSlip}
 *   (checkin.ts) — identical to T14.2's open-Day slip write: a held
 *   token shields (`minor_slip`, spent) or not (`major_slip`). Product-
 *   minimal choice for "member might correct TO slip" (ticket guidance):
 *   this does **not** refund a previously spent token when correcting
 *   slip → slip (e.g. changing class) — matches the same asymmetry
 *   `checkin.ts`'s module doc already documents for same-Day re-slip,
 *   so late fix does not introduce a new rule, just reuses the existing
 *   one on a closed Day.
 *
 * **Gates, in order** (all inside one `store.db.transaction`):
 *
 * 1. Blank `chatId` / `memberId` / `dayKey` → plain `Error` (module
 *    convention).
 * 2. Not on the Checklist → {@link NotOnChecklistError} (checkin.ts,
 *    reused as-is — "same as record" per ticket guidance).
 * 3. {@link isLateFixAllowed} false → {@link LateFixNotAllowedError}. Its
 *    `reason` distinguishes the ticket's explicit cases: `"day-missing"`
 *    (never opened — nothing to fix), `"day-open"` (ordinary Check-in is
 *    T14's `recordCheckIn`, not this verb), `"past-fence"` (ADR 0005
 *    window elapsed — same-calendar at-fence in T17.2; overnight and
 *    well-after-fence depth in T17.3). `isLateFixAllowed`'s
 *    own {@link LateFixFenceUnknownError} (unset `reminderTime`) is not
 *    caught here — it propagates, since that is a configuration gap, not
 *    a normal reject (module doc "Unknown fence").
 * 4. No existing Check-in row for `(chatId, memberId, dayKey)` →
 *    {@link CheckInNotFoundError}. Ticket guidance: "late fix is correct
 *    after Deadline auto-slip — typically row exists"; spec/daily-
 *    rhythm.md says a member "may correct **a** Check-in" (an existing
 *    one), so a missing row is a clear reject rather than a late first
 *    Check-in created through this verb — creating one is T14/T16's job
 *    (`recordCheckIn` / the Deadline auto-slip), always run before a Day
 *    closes.
 *
 * A rejected correction never mutates the existing row, mirroring
 * `checkin.ts`'s closed-Day reject guarantee — every throw above fires
 * before {@link writeSober} / {@link resolveSlip} / {@link writeSlip}
 * ever runs.
 *
 * `now` is threaded straight through to {@link isLateFixAllowed} (same
 * injectable-`now` convention as this module's other exports).
 */
import type { Store } from "./store.ts";
import { isOnChecklist } from "./checklist.ts";
import {
  getCheckIn,
  writeSlip,
  writeSober,
  NotOnChecklistError,
  type CheckIn,
  type CheckInIntent,
} from "./checkin.ts";
import {
  getDay,
  instantFromLocalClock,
  shiftDayKey,
  type DayKey,
} from "./day.ts";
import { resolveSlip } from "./grace.ts";
import { getSettings, type ChatSettings } from "./settings.ts";

/**
 * Thrown by {@link isLateFixAllowed} / {@link nextReminderAfterDay} when
 * the chat has no `reminderTime` configured — the late-fix fence cannot
 * be computed at all (see module doc "Unknown fence").
 */
export class LateFixFenceUnknownError extends Error {
  override readonly name = "LateFixFenceUnknownError";

  constructor(readonly chatId: string) {
    super(
      `Cannot compute late-fix fence for ${chatId}: reminderTime is unset. Configure Reminder time (T11) before checking late fix.`,
    );
  }
}

/** Settings {@link nextReminderAfterDay} needs — a subset of {@link ChatSettings}. */
export type LateFixSettings = Pick<ChatSettings, "timezone" | "reminderTime">;

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

/**
 * The chat's next Reminder instant after the Reminder-cycle that opened
 * `dayKey` (T17.1) — see module doc "Next Reminder fence" for why this
 * is always `dayKey + 1 calendar day` at `settings.reminderTime`, pure
 * calendar-key + settings arithmetic (no Deadline instant needed).
 *
 * Throws {@link LateFixFenceUnknownError} when `settings.reminderTime`
 * is `null` (module doc "Unknown fence"). Pure — no store access.
 */
export function nextReminderAfterDay(
  settings: LateFixSettings,
  dayKey: DayKey,
  chatId = "(unknown)",
): Date {
  if (settings.reminderTime === null) {
    throw new LateFixFenceUnknownError(chatId);
  }
  const nextDayKey = shiftDayKey(dayKey, 1);
  return instantFromLocalClock(settings.timezone, nextDayKey, settings.reminderTime);
}

/**
 * May the closed Day `(chatId, dayKey)` still be corrected at `now`
 * (T17.1, ADR 0005)? See module doc for the full locked-semantics
 * matrix. `now` defaults to `new Date()` but is always injectable —
 * never hardcoded inside the decision.
 *
 * Rejects blank `chatId` / `dayKey` (plain `Error`, module doc). Throws
 * {@link LateFixFenceUnknownError} when the chat has no `reminderTime`
 * configured on a **closed** Day (an open or missing Day short-circuits
 * to `false` before settings are even read, so an unconfigured
 * `reminderTime` never blocks those two cases).
 */
export function isLateFixAllowed(
  store: Store,
  chatId: string,
  dayKey: DayKey,
  now: Date = new Date(),
): boolean {
  const chat = requireChatId(chatId);
  const key = requireDayKey(dayKey);

  const day = getDay(store, chat, key);
  if (!day || day.status !== "closed") {
    return false;
  }

  const settings = getSettings(store, chat);
  const fence = nextReminderAfterDay(settings, key, chat);
  return now.getTime() < fence.getTime();
}

/**
 * Why {@link correctCheckIn} rejected via {@link LateFixNotAllowedError}
 * — see module doc "T17.2 — correctCheckIn" gate 3. `"past-fence"`
 * covers both "next Reminder already passed" and the ADR 0005 zero-
 * length-window boundary case (module doc "Next Reminder fence").
 */
export type LateFixRejectReason = "day-missing" | "day-open" | "past-fence";

/**
 * Thrown by {@link correctCheckIn} when {@link isLateFixAllowed} is
 * `false` for `(chatId, dayKey)` at the call's `now` — see module doc
 * "T17.2 — correctCheckIn" gate 3 and {@link LateFixRejectReason}.
 */
export class LateFixNotAllowedError extends Error {
  override readonly name = "LateFixNotAllowedError";

  constructor(
    readonly chatId: string,
    readonly dayKey: DayKey,
    readonly reason: LateFixRejectReason,
  ) {
    super(LateFixNotAllowedError.describe(chatId, dayKey, reason));
  }

  private static describe(
    chatId: string,
    dayKey: DayKey,
    reason: LateFixRejectReason,
  ): string {
    switch (reason) {
      case "day-missing":
        return `Late fix not allowed: ${chatId}/${dayKey} was never opened — nothing to fix.`;
      case "day-open":
        return `Late fix not allowed: ${chatId}/${dayKey} is still open — use recordCheckIn (T14), not correctCheckIn.`;
      case "past-fence":
        return `Late fix not allowed: ${chatId}/${dayKey} is past the late-fix window (ADR 0005 — next Reminder already reached).`;
    }
  }
}

/**
 * Thrown by {@link correctCheckIn} when no Check-in row exists yet for
 * `(chatId, memberId, dayKey)` — see module doc "T17.2 — correctCheckIn"
 * gate 4.
 */
export class CheckInNotFoundError extends Error {
  override readonly name = "CheckInNotFoundError";

  constructor(
    readonly chatId: string,
    readonly memberId: string,
    readonly dayKey: DayKey,
  ) {
    super(
      `No Check-in to correct: ${chatId}/${memberId}/${dayKey}. Late fix corrects an existing Check-in; record one first (T14 recordCheckIn / T16 Deadline auto-slip) before the Day closes.`,
    );
  }
}

/**
 * Correct a Check-in's stored status on a **closed** Day during the
 * late-fix window (T17.2, ADR 0005) — see module doc "T17.2 —
 * correctCheckIn" for the full write behavior and gate order.
 *
 * Requires Checklist membership (same as `recordCheckIn`), the late-fix
 * window still open at `now` per {@link isLateFixAllowed}, and an
 * existing Check-in row for `(chatId, memberId, dayKey)`. Correcting to
 * `sober` refunds a spent Grace Token via {@link writeSober}; correcting
 * to `slip` re-resolves Grace Token rules via {@link resolveSlip} +
 * {@link writeSlip}, same as an open-Day slip write.
 *
 * `now` defaults to `new Date()` but is always injectable — passed
 * straight through to {@link isLateFixAllowed}.
 */
export function correctCheckIn(
  store: Store,
  chatId: string,
  memberId: string,
  dayKey: DayKey,
  intent: CheckInIntent,
  now: Date = new Date(),
): CheckIn {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  const key = requireDayKey(dayKey);

  const run = store.db.transaction((): CheckIn => {
    if (!isOnChecklist(store, chat, member)) {
      throw new NotOnChecklistError(chat, member);
    }

    if (!isLateFixAllowed(store, chat, key, now)) {
      const day = getDay(store, chat, key);
      const reason: LateFixRejectReason = !day
        ? "day-missing"
        : day.status === "open"
          ? "day-open"
          : "past-fence";
      throw new LateFixNotAllowedError(chat, key, reason);
    }

    if (!getCheckIn(store, chat, member, key)) {
      throw new CheckInNotFoundError(chat, member, key);
    }

    if (intent === "slip") {
      const resolution = resolveSlip(store, chat, member);
      return writeSlip(store, chat, member, key, resolution);
    }
    return writeSober(store, chat, member, key);
  });
  return run();
}
