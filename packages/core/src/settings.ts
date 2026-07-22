/**
 * Chat settings durable verbs (T11). See tech/core-tasks.md T11,
 * spec/daily-rhythm.md Settings table, CONTEXT.md (Reminder, Deadline,
 * Grace Token N).
 *
 * Defaults on create (migration + verbs): timezone `UTC`, graceTokenN `3`,
 * reminder/deadline times unset (`null`). Time/TZ string representation
 * locked in T11.3.
 *
 * No Telegram admin checks here (tech/core-tasks.md T11 Out of scope).
 */
import type { Store } from "./store.ts";

export const DEFAULT_TIMEZONE = "UTC";
export const DEFAULT_GRACE_TOKEN_N = 3;

export type ChatSettings = {
  readonly chatId: string;
  readonly reminderTime: string | null;
  readonly deadlineTime: string | null;
  readonly timezone: string;
  readonly graceTokenN: number;
};

/** Thrown by {@link getSettings} for an unknown chat. */
export class ChatNotFoundError extends Error {
  override readonly name = "ChatNotFoundError";

  constructor(readonly chatId: string) {
    super(`Chat not found: ${chatId}. Call getOrCreateChat first.`);
  }
}

type SettingsRow = {
  chat_id: string;
  reminder_time: string | null;
  deadline_time: string | null;
  timezone: string;
  grace_token_n: number;
};

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
      .query("INSERT OR IGNORE INTO chat_settings (chat_id) VALUES (?)")
      .run(id);
  });
  run();
  // Present immediately after the transaction above — non-null by construction.
  return readSettingsRow(store, id) as ChatSettings;
}

/** Read settings for an existing chat. Throws {@link ChatNotFoundError} otherwise. */
export function getSettings(store: Store, chatId: string): ChatSettings {
  const id = requireChatId(chatId);
  const settings = readSettingsRow(store, id);
  if (!settings) {
    throw new ChatNotFoundError(id);
  }
  return settings;
}
