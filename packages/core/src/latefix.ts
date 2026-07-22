/**
 * Late fix fence (T17.1). See tech/core-tasks.md T17, ADR 0005
 * (docs/adr/0005-late-fix-until-next-reminder.md), spec/daily-rhythm.md
 * (Late fix), spec/stats.md (Late fix).
 *
 * This module owns exactly one question, pure(ish) against the store —
 * "may this closed Day still be corrected at `now`?" — via
 * {@link isLateFixAllowed}. It does **not** write a correction
 * (`correctCheckIn` is T17.2) and does not implement a reject-after-
 * window write path (T17.3); those verbs call this helper (or its
 * {@link nextReminderAfterDay} fence) rather than duplicating the rule.
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
 * | Day `closed`, `now` at/after next Reminder | `false` | Past the ADR 0005 fence. |
 * | Day `closed`, `now` strictly before next Reminder | `true` | Allowed. |
 * | Blank `chatId` / `dayKey` | throws plain `Error` | Same "trim then require non-empty" guard used across `@sobri/core` (day.ts, checklist.ts, grace.ts, settings.ts, checkin.ts). |
 *
 * `now` defaults to `new Date()` but is always an injectable parameter —
 * never hardcoded inside the decision — so tests can pin an instant.
 */
import type { Store } from "./store.ts";
import {
  getDay,
  instantFromLocalClock,
  shiftDayKey,
  type DayKey,
} from "./day.ts";
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
