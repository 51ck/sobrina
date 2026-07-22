/**
 * Chat settings durable verbs (T11). See tech/core-tasks.md T11,
 * spec/daily-rhythm.md Settings table, CONTEXT.md (Reminder, Deadline,
 * Grace Token N).
 *
 * ## Representation (T11.3)
 * - `reminderTime` / `deadlineTime`: `"HH:MM"` 24-hour wall clock in the
 *   chat `timezone` (zero-padded; e.g. `"09:00"`, `"21:30"`), or `null`
 *   when unset (no Reminder/Deadline scheduled yet). Not an ISO instant.
 * - `timezone`: IANA name (e.g. `"Europe/Moscow"`, `"UTC"`). Validated via
 *   `Intl.DateTimeFormat({ timeZone })`.
 * - `graceTokenN`: integer ≥ 1 — sober Streak length to earn Grace Token.
 *
 * ## Defaults on create (T11.3)
 * - `timezone` = {@link DEFAULT_TIMEZONE} (`"UTC"`)
 * - `graceTokenN` = {@link DEFAULT_GRACE_TOKEN_N} (`3`, CONTEXT.md / daily-rhythm)
 * - `reminderTime` / `deadlineTime` = `null`
 *
 * No Telegram admin checks here (tech/core-tasks.md T11 Out of scope).
 */
import type { Store } from "./store.ts";

export const DEFAULT_TIMEZONE = "UTC";
export const DEFAULT_GRACE_TOKEN_N = 3;

/** Local wall-clock time `"HH:MM"` (24h) in the chat timezone, or unset. */
export type ClockTime = string;

export type ChatSettings = {
  readonly chatId: string;
  readonly reminderTime: ClockTime | null;
  readonly deadlineTime: ClockTime | null;
  readonly timezone: string;
  readonly graceTokenN: number;
};

/** Partial update for {@link updateSettings}. Omitted keys stay unchanged. */
export type ChatSettingsPatch = {
  readonly reminderTime?: ClockTime | null;
  readonly deadlineTime?: ClockTime | null;
  readonly timezone?: string;
  readonly graceTokenN?: number;
};

/** Thrown by {@link getSettings} / {@link updateSettings} for an unknown chat. */
export class ChatNotFoundError extends Error {
  override readonly name = "ChatNotFoundError";

  constructor(readonly chatId: string) {
    super(`Chat not found: ${chatId}. Call getOrCreateChat first.`);
  }
}

/** Thrown by {@link updateSettings} when a patch field fails validation. */
export class InvalidSettingsError extends Error {
  override readonly name = "InvalidSettingsError";

  constructor(
    readonly field: string,
    readonly value: unknown,
    reason: string,
  ) {
    super(`Invalid settings.${field}: ${reason}`);
  }
}

type SettingsRow = {
  chat_id: string;
  reminder_time: string | null;
  deadline_time: string | null;
  timezone: string;
  grace_token_n: number;
};

const HH_MM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function toSettings(row: SettingsRow): ChatSettings {
  return {
    chatId: row.chat_id,
    reminderTime: row.reminder_time,
    deadlineTime: row.deadline_time,
    timezone: row.timezone,
    graceTokenN: row.grace_token_n,
  };
}

function readSettingsRow(store: Store, chatId: string): ChatSettings | null {
  const row = store.db
    .query(
      "SELECT chat_id, reminder_time, deadline_time, timezone, grace_token_n FROM chat_settings WHERE chat_id = ?",
    )
    .get(chatId) as SettingsRow | null;
  return row ? toSettings(row) : null;
}

function requireChatId(chatId: string): string {
  const trimmed = chatId.trim();
  if (!trimmed) {
    throw new Error("chatId must be non-empty");
  }
  return trimmed;
}

function requireExistingSettings(store: Store, chatId: string): ChatSettings {
  const settings = readSettingsRow(store, chatId);
  if (!settings) {
    throw new ChatNotFoundError(chatId);
  }
  return settings;
}

function validateClockTime(
  field: "reminderTime" | "deadlineTime",
  value: ClockTime | null,
): ClockTime | null {
  if (value === null) return null;
  if (!HH_MM.test(value)) {
    throw new InvalidSettingsError(
      field,
      value,
      'expected "HH:MM" 24-hour local time or null',
    );
  }
  return value;
}

function validateTimezone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new InvalidSettingsError("timezone", value, "must be non-empty IANA name");
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
  } catch {
    throw new InvalidSettingsError(
      "timezone",
      value,
      "must be a valid IANA timezone name",
    );
  }
  return trimmed;
}

function validateGraceTokenN(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new InvalidSettingsError(
      "graceTokenN",
      value,
      "must be an integer >= 1",
    );
  }
  return value;
}

/**
 * Ensure a chat (and its default settings row) exists; return its settings.
 * Idempotent — a second call for the same `chatId` returns the existing
 * chat unchanged (no duplicate rows, no reset to defaults).
 */
export function getOrCreateChat(store: Store, chatId: string): ChatSettings {
  const id = requireChatId(chatId);
  const run = store.db.transaction(() => {
    store.db.query("INSERT OR IGNORE INTO chats (id) VALUES (?)").run(id);
    store.db
      .query(
        "INSERT OR IGNORE INTO chat_settings (chat_id, timezone, grace_token_n) VALUES (?, ?, ?)",
      )
      .run(id, DEFAULT_TIMEZONE, DEFAULT_GRACE_TOKEN_N);
  });
  run();
  // Present immediately after the transaction above — non-null by construction.
  return readSettingsRow(store, id) as ChatSettings;
}

/** Read settings for an existing chat. Throws {@link ChatNotFoundError} otherwise. */
export function getSettings(store: Store, chatId: string): ChatSettings {
  const id = requireChatId(chatId);
  return requireExistingSettings(store, id);
}

/**
 * Patch settings for an existing chat. Omitted keys stay unchanged.
 * Rejects invalid times (`HH:MM` or null), IANA timezone, or N &lt; 1.
 * Throws {@link ChatNotFoundError} / {@link InvalidSettingsError}.
 */
export function updateSettings(
  store: Store,
  chatId: string,
  patch: ChatSettingsPatch,
): ChatSettings {
  const id = requireChatId(chatId);
  const current = requireExistingSettings(store, id);

  const next: ChatSettings = {
    chatId: id,
    reminderTime:
      patch.reminderTime !== undefined
        ? validateClockTime("reminderTime", patch.reminderTime)
        : current.reminderTime,
    deadlineTime:
      patch.deadlineTime !== undefined
        ? validateClockTime("deadlineTime", patch.deadlineTime)
        : current.deadlineTime,
    timezone:
      patch.timezone !== undefined
        ? validateTimezone(patch.timezone)
        : current.timezone,
    graceTokenN:
      patch.graceTokenN !== undefined
        ? validateGraceTokenN(patch.graceTokenN)
        : current.graceTokenN,
  };

  store.db
    .query(
      `UPDATE chat_settings
       SET reminder_time = ?,
           deadline_time = ?,
           timezone = ?,
           grace_token_n = ?,
           updated_at = datetime('now')
       WHERE chat_id = ?`,
    )
    .run(
      next.reminderTime,
      next.deadlineTime,
      next.timezone,
      next.graceTokenN,
      id,
    );

  // Read-after-write (matches getOrCreateChat) — returns the persisted row,
  // not just the in-memory patch result.
  return readSettingsRow(store, id) as ChatSettings;
}
