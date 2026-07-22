/**
 * Grace Token (заморозка) rules (T15). See tech/core-tasks.md T15,
 * ADR 0001 (docs/adr/0001-grace-token.md), spec/stats.md, CONTEXT.md
 * (Grace Token).
 *
 * A visible per-member shield, cap 1, stored in `grace_tokens` (T10.5):
 * one row per (chatId, memberId); `present` 0|1. This module owns the
 * token-state primitives (T15.1) and the three rule verbs built on top —
 * spend (T15.2), earn (T15.3), refund (T15.4). It does not write
 * `check_ins` rows (T14 owns Check-in writes) and does not walk Check-in
 * history to compute Streak (T18 owns the Streak algorithm) — the earn
 * verb takes the caller's already-computed sober Streak count as a
 * parameter (tech/core-tasks.md T15 Depends on T18.1; see T15.3 doc).
 */
import type { Store } from "./store.ts";
import { getOrCreateChat } from "./settings.ts";

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

type GraceTokenRow = {
  chat_id: string;
  member_id: string;
  present: number;
};

function readRow(
  store: Store,
  chatId: string,
  memberId: string,
): GraceTokenRow | null {
  return store.db
    .query(
      "SELECT chat_id, member_id, present FROM grace_tokens WHERE chat_id = ? AND member_id = ?",
    )
    .get(chatId, memberId) as GraceTokenRow | null;
}

function writePresent(
  store: Store,
  chatId: string,
  memberId: string,
  present: 0 | 1,
): void {
  getOrCreateChat(store, chatId);
  store.db
    .query(
      `INSERT INTO grace_tokens (chat_id, member_id, present, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(chat_id, member_id) DO UPDATE SET
         present = excluded.present,
         updated_at = excluded.updated_at`,
    )
    .run(chatId, memberId, present);
}

/**
 * Whether `memberId` currently holds a Grace Token (T15.1 read). Cap 1 is
 * a flag, not a counter — an absent row reads as `false`, mirroring
 * {@link isOnChecklist}'s "no row = not present" convention.
 */
export function hasGraceToken(
  store: Store,
  chatId: string,
  memberId: string,
): boolean {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  return readRow(store, chat, member)?.present === 1;
}

/**
 * Unconditionally set the token present for `memberId` (T15.1 write
 * primitive). Ensures the chat exists first (mirrors {@link
 * joinChecklist} / {@link ensureOpenDay}). Idempotent — granting when
 * already present is a no-op observable effect (still exactly 1 token;
 * no double-stack, tech/core-tasks.md T15 Out of scope).
 *
 * Low-level primitive: prefer {@link maybeEarnGraceToken} (T15.3, gated
 * by Streak/N) or {@link refundGraceToken} (T15.4, late-fix rule) at the
 * call site — this export exists for T15.1's read/write pairing and
 * direct tests.
 */
export function grantGraceToken(
  store: Store,
  chatId: string,
  memberId: string,
): void {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  writePresent(store, chat, member, 1);
}

/**
 * Unconditionally clear the token for `memberId` (T15.1 write
 * primitive). Idempotent — consuming an absent token is a safe no-op.
 */
export function consumeGraceToken(
  store: Store,
  chatId: string,
  memberId: string,
): void {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  writePresent(store, chat, member, 0);
}
