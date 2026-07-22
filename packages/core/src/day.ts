/**
 * Day identity + lifecycle (T13). See tech/core-tasks.md T13,
 * spec/daily-rhythm.md (Day), ADR 0002
 * (docs/adr/0002-overnight-deadline-day-key.md), CONTEXT.md (Day),
 * architecture.md (Session ≠ Day).
 *
 * A Day is one Reminder-cycle's evening ledger: it accumulates Check-ins
 * and closes at Deadline. When Deadline crosses midnight the Day key
 * stays the Reminder's evening date, not Deadline's clock date (ADR
 * 0002) — {@link computeDayKey} implements that rule; {@link
 * ensureOpenDay} / {@link getDay} / {@link closeDay} own the `days` row
 * lifecycle (T10.3 schema). Auto-slip on close is T16 — closeDay here is
 * a state transition only.
 */
import type { Store } from "./store.ts";
import {
  getOrCreateChat,
  type ChatSettings,
  type ClockTime,
} from "./settings.ts";

/** Calendar date `"YYYY-MM-DD"` in the chat's timezone. */
export type DayKey = string;

export type DayStatus = "open" | "closed";

export type Day = {
  readonly chatId: string;
  readonly dayKey: DayKey;
  readonly status: DayStatus;
  readonly createdAt: string;
  readonly closedAt: string | null;
};

/** Thrown by {@link closeDay} when the Day was never opened via {@link ensureOpenDay}. */
export class DayNotFoundError extends Error {
  override readonly name = "DayNotFoundError";

  constructor(
    readonly chatId: string,
    readonly dayKey: DayKey,
  ) {
    super(`Day not found: ${chatId}/${dayKey}. Call ensureOpenDay first.`);
  }
}

/** Settings {@link computeDayKey} needs — a subset of {@link ChatSettings}. */
export type DayKeySettings = Pick<
  ChatSettings,
  "timezone" | "reminderTime" | "deadlineTime"
>;

function localDateAndClock(
  timezone: string,
  instant: Date,
): { date: DayKey; clock: ClockTime } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    clock: `${get("hour")}:${get("minute")}`,
  };
}

/** Shift a `"YYYY-MM-DD"` key by `deltaDays` (pure calendar arithmetic, no TZ). */
function shiftDayKey(dayKey: DayKey, deltaDays: number): DayKey {
  const [year, month, day] = dayKey.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  const y = String(shifted.getUTCFullYear()).padStart(4, "0");
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Day key for `instant` under `settings` (T13.1, ADR 0002).
 *
 * - **Same-calendar cycle** (`deadlineTime > reminderTime`, or either is
 *   unset — no full cycle configured yet): Day key = today's calendar
 *   date in `settings.timezone`.
 * - **Overnight cycle** (`deadlineTime <= reminderTime`, i.e. Deadline's
 *   clock time is earlier than or equal to Reminder's, so Deadline lands
 *   on the *next* calendar date): while the local clock is at or before
 *   `deadlineTime`, `instant` is still the tail of *yesterday's* cycle —
 *   the Reminder that opened it fired yesterday evening — so Day key =
 *   yesterday. This includes the Deadline instant itself, so the Day key
 *   at Deadline is the Reminder's evening date, never Deadline's own
 *   clock date. Otherwise (daytime gap before today's Reminder, or
 *   today's Reminder has already fired) Day key = today.
 *
 * Pure — no store access; deterministic given `settings` and `instant`.
 */
export function computeDayKey(
  settings: DayKeySettings,
  instant: Date = new Date(),
): DayKey {
  const { date, clock } = localDateAndClock(settings.timezone, instant);
  const { reminderTime, deadlineTime } = settings;

  if (reminderTime === null || deadlineTime === null) {
    return date;
  }

  const crossesMidnight = deadlineTime <= reminderTime;
  if (crossesMidnight && clock <= deadlineTime) {
    return shiftDayKey(date, -1);
  }
  return date;
}

type DayRow = {
  chat_id: string;
  day_key: string;
  status: DayStatus;
  created_at: string;
  closed_at: string | null;
};

function toDay(row: DayRow): Day {
  return {
    chatId: row.chat_id,
    dayKey: row.day_key,
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}

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

function readDayRow(
  store: Store,
  chatId: string,
  dayKey: DayKey,
): Day | null {
  const row = store.db
    .query(
      "SELECT chat_id, day_key, status, created_at, closed_at FROM days WHERE chat_id = ? AND day_key = ?",
    )
    .get(chatId, dayKey) as DayRow | null;
  return row ? toDay(row) : null;
}

/**
 * Ensure a Day row exists and is at least present as `open` (T13.2).
 * Idempotent: an existing Day (open or closed) is returned unchanged —
 * this never re-opens a closed Day. Ensures the chat exists first via
 * {@link getOrCreateChat}, mirroring {@link joinChecklist}'s pattern so
 * the Day lifecycle does not require `/settings` to have run first.
 */
export function ensureOpenDay(
  store: Store,
  chatId: string,
  dayKey: DayKey,
): Day {
  const chat = requireChatId(chatId);
  const key = requireDayKey(dayKey);
  getOrCreateChat(store, chat);

  store.db
    .query(
      "INSERT OR IGNORE INTO days (chat_id, day_key) VALUES (?, ?)",
    )
    .run(chat, key);

  // Present immediately after the statement above — non-null by construction.
  return readDayRow(store, chat, key) as Day;
}

/** Read Day state (open vs closed) for `chatId` / `dayKey`, or `null` if never opened (T13.2). */
export function getDay(
  store: Store,
  chatId: string,
  dayKey: DayKey,
): Day | null {
  const chat = requireChatId(chatId);
  const key = requireDayKey(dayKey);
  return readDayRow(store, chat, key);
}

/**
 * Close a Day (T13.3) — state transition only, no auto-slip (that is
 * T16). Throws {@link DayNotFoundError} if the Day was never opened via
 * {@link ensureOpenDay} (mirrors {@link ChatNotFoundError}: closing
 * something never opened is a caller bug, not a silent no-op).
 * Idempotent once opened: closing an already-closed Day returns the
 * existing row unchanged (original `closedAt` kept) rather than erroring
 * or bumping the timestamp again.
 */
export function closeDay(
  store: Store,
  chatId: string,
  dayKey: DayKey,
): Day {
  const chat = requireChatId(chatId);
  const key = requireDayKey(dayKey);
  const current = readDayRow(store, chat, key);
  if (!current) {
    throw new DayNotFoundError(chat, key);
  }
  if (current.status === "closed") {
    return current;
  }

  store.db
    .query(
      "UPDATE days SET status = 'closed', closed_at = datetime('now') WHERE chat_id = ? AND day_key = ?",
    )
    .run(chat, key);

  return readDayRow(store, chat, key) as Day;
}
