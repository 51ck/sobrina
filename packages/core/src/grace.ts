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

/** Outcome of {@link resolveSlip} — the status T14/T16 should write to `check_ins`. */
export type SlipResolution = {
  readonly status: "minor_slip" | "major_slip";
  readonly spentToken: boolean;
};

/**
 * Resolve a slip write against Grace Token rules (T15.2, ADR 0001,
 * spec/stats.md): a token present shields the slip (`minor_slip`) and is
 * spent; no token leaves it unshielded (`major_slip`). Read+spend runs in
 * one transaction so concurrent slip writes for the same member cannot
 * both observe and spend the same token.
 *
 * This resolves the *status* only — it does not touch `check_ins` (T14
 * "Record Check-in" / T16 "Deadline auto-slip" own that write and pass
 * `spentToken` into their `spent_grace_token` column for T15.4 refund).
 */
export function resolveSlip(
  store: Store,
  chatId: string,
  memberId: string,
): SlipResolution {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  getOrCreateChat(store, chat);
  const run = store.db.transaction((): SlipResolution => {
    if (hasGraceToken(store, chat, member)) {
      writePresent(store, chat, member, 0);
      return { status: "minor_slip", spentToken: true };
    }
    return { status: "major_slip", spentToken: false };
  });
  return run();
}

/**
 * Grant a Grace Token when sober Streak reaches `graceTokenN` and none is
 * held yet (T15.3, ADR 0001, spec/stats.md "earn ... re-earn after spent
 * by reaching N again"). Cap 1: a no-op when a token is already present —
 * this also makes repeated calls at `currentStreak >= graceTokenN`
 * idempotent (no double-stack, tech/core-tasks.md T15 Out of scope).
 *
 * `currentStreak` is caller-supplied: this module does not walk Check-in
 * history to compute Streak (that pure algorithm is T18.1 — see
 * tech/core-tasks.md T15 "Depends on ... T18.1"). Callers pass a T18.1
 * Streak walk result once it lands, or their own interim sober-run count
 * until then; this stays correct either way since the rule only compares
 * the count to `graceTokenN`.
 *
 * Returns `true` when a token was newly granted this call.
 */
export function maybeEarnGraceToken(
  store: Store,
  chatId: string,
  memberId: string,
  currentStreak: number,
  graceTokenN: number,
): boolean {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  if (currentStreak < graceTokenN) return false;

  const run = store.db.transaction((): boolean => {
    if (hasGraceToken(store, chat, member)) return false;
    writePresent(store, chat, member, 1);
    return true;
  });
  return run();
}

/**
 * Restore a Grace Token after a late fix (T15.4, ADR 0005, spec/stats.md
 * "Late fix to sober: refund token if that Check-in spent one"). T17
 * ("Late fix") is the intended caller: it should invoke this only when
 * the Check-in being corrected has `spentGraceToken` true (its
 * `check_ins.spent_grace_token` column, T10.4) *and* the correction's new
 * status is `sober` — this helper trusts that decision and just restores
 * the flag. Cap 1: if a token is already present (e.g. re-earned since
 * the spend), stays present — no double-stack.
 */
export function refundGraceToken(
  store: Store,
  chatId: string,
  memberId: string,
): void {
  const chat = requireChatId(chatId);
  const member = requireMemberId(memberId);
  writePresent(store, chat, member, 1);
}
