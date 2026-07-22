/**
 * Checklist membership verbs (T12). See tech/core-tasks.md T12,
 * spec/checklist.md, CONTEXT.md (Checklist).
 *
 * Only Checklist members get Deadline auto-slip and streak accounting
 * (spec/checklist.md). Membership is tracked in `checklist_members`
 * (T10.2): one row per (chatId, memberId); `left_at IS NULL` means the
 * member is currently active on the Checklist. A member who left keeps
 * their row (history), and rejoining resets `joined_at` and clears
 * `left_at` rather than inserting a second row.
 *
 * No Telegram admin-role checks here — the adapter passes an "admin
 * remove" intent and core performs the same durable remove as a self
 * leave (tech/core-tasks.md T12 Out of scope).
 */
import type { Store } from "./store.ts";
import { getOrCreateChat } from "./settings.ts";

export type ChecklistMembership = {
  readonly chatId: string;
  readonly memberId: string;
  readonly joinedAt: string;
};

type ChecklistRow = {
  chat_id: string;
  member_id: string;
  joined_at: string;
};

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

function readActiveRow(
  store: Store,
  chatId: string,
  memberId: string,
): ChecklistRow | null {
  return store.db
    .query(
      `SELECT chat_id, member_id, joined_at FROM checklist_members
       WHERE chat_id = ? AND member_id = ? AND left_at IS NULL`,
    )
    .get(chatId, memberId) as ChecklistRow | null;
}

function toMembership(row: ChecklistRow): ChecklistMembership {
  return {
    chatId: row.chat_id,
    memberId: row.member_id,
    joinedAt: row.joined_at,
  };
}

/**
 * Add a member to the Checklist (T12.1). Idempotent:
 * - Already active → no-op, `joinedAt` unchanged.
 * - Never joined → new row, `joinedAt` = now.
 * - Previously left → `joinedAt` resets to now, `left_at` cleared (no
 *   second row; history of the original join is not preserved).
 *
 * Ensures the chat exists first via {@link getOrCreateChat} (T11.1) so
 * self-serve join works even before `/settings` has run for the chat.
 */
export function joinChecklist(
  store: Store,
  chatId: string,
  memberId: string,
): ChecklistMembership {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  getOrCreateChat(store, chat);

  store.db
    .query(
      `INSERT INTO checklist_members (chat_id, member_id, joined_at, left_at)
       VALUES (?, ?, datetime('now'), NULL)
       ON CONFLICT(chat_id, member_id) DO UPDATE SET
         joined_at = CASE
           WHEN checklist_members.left_at IS NOT NULL THEN datetime('now')
           ELSE checklist_members.joined_at
         END,
         left_at = NULL`,
    )
    .run(chat, member);

  // Just wrote it active — present by construction.
  return toMembership(readActiveRow(store, chat, member) as ChecklistRow);
}

/**
 * Remove a member from the Checklist (T12.2). Sets `left_at`; the row is
 * kept (join history), and {@link joinChecklist} can later reset it.
 *
 * Safe no-op when the member is absent or already left (T12.5 — chosen
 * over throwing, since "leave" from a state that already satisfies the
 * caller's intent should not be an error).
 */
export function leaveChecklist(
  store: Store,
  chatId: string,
  memberId: string,
): void {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);

  store.db
    .query(
      `UPDATE checklist_members SET left_at = datetime('now')
       WHERE chat_id = ? AND member_id = ? AND left_at IS NULL`,
    )
    .run(chat, member);
}
