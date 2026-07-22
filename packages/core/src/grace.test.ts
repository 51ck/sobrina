import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  consumeGraceToken,
  grantGraceToken,
  hasGraceToken,
  maybeEarnGraceToken,
  refundGraceToken,
  resolveSlip,
} from "./grace.ts";
import { migrate } from "./migrate.ts";
import { openStore, type Store } from "./store.ts";

/** Shared temp DB harness — mirrors checklist.test.ts / day.test.ts pattern. */
function useMigratedStore() {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function freshStore(): Promise<Store> {
    dir = mkdtempSync(join(tmpdir(), "sobri-grace-"));
    const path = join(dir, "test.db");
    const s = await openStore(path);
    migrate(s);
    store = s;
    return s;
  }

  return { freshStore };
}

describe("T15.1 — hasGraceToken / grantGraceToken / consumeGraceToken", () => {
  const { freshStore } = useMigratedStore();

  test("hasGraceToken is false for a member with no row yet", async () => {
    const store = await freshStore();
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("grantGraceToken creates the chat and sets present, creating the row if needed", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
    const chat = store.db
      .query("SELECT 1 AS ok FROM chats WHERE id = ?")
      .get("chat-1");
    expect(chat).not.toBeNull();
  });

  test("consumeGraceToken clears a previously granted token", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");
    consumeGraceToken(store, "chat-1", "member-1");

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("consumeGraceToken on an absent token is a safe no-op", async () => {
    const store = await freshStore();
    expect(() =>
      consumeGraceToken(store, "chat-1", "member-1"),
    ).not.toThrow();
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("grantGraceToken is idempotent — repeated grants stay a single present flag", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");
    grantGraceToken(store, "chat-1", "member-1");
    grantGraceToken(store, "chat-1", "member-1");

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM grace_tokens WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("token state is scoped per chat and per member", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");

    expect(hasGraceToken(store, "chat-2", "member-1")).toBe(false);
    expect(hasGraceToken(store, "chat-1", "member-2")).toBe(false);
  });

  test("rejects blank chatId or memberId", async () => {
    const store = await freshStore();
    expect(() => hasGraceToken(store, "  ", "member-1")).toThrow();
    expect(() => hasGraceToken(store, "chat-1", "  ")).toThrow();
    expect(() => grantGraceToken(store, "  ", "member-1")).toThrow();
    expect(() => grantGraceToken(store, "chat-1", "  ")).toThrow();
    expect(() => consumeGraceToken(store, "  ", "member-1")).toThrow();
    expect(() => consumeGraceToken(store, "chat-1", "  ")).toThrow();
  });
});

describe("T15.2 — resolveSlip", () => {
  const { freshStore } = useMigratedStore();

  test("with a token present → minor_slip, token spent", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");

    const outcome = resolveSlip(store, "chat-1", "member-1");

    expect(outcome).toEqual({ status: "minor_slip", spentToken: true });
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("without a token → major_slip, nothing to spend", async () => {
    const store = await freshStore();

    const outcome = resolveSlip(store, "chat-1", "member-1");

    expect(outcome).toEqual({ status: "major_slip", spentToken: false });
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("a second slip right after a spend is unshielded (no lingering spend)", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");

    const first = resolveSlip(store, "chat-1", "member-1");
    const second = resolveSlip(store, "chat-1", "member-1");

    expect(first.status).toBe("minor_slip");
    expect(second).toEqual({ status: "major_slip", spentToken: false });
  });

  test("creates the chat if needed, like other verbs", async () => {
    const store = await freshStore();
    resolveSlip(store, "chat-1", "member-1");

    const chat = store.db
      .query("SELECT 1 AS ok FROM chats WHERE id = ?")
      .get("chat-1");
    expect(chat).not.toBeNull();
  });

  test("resolveSlip is scoped per chat and per member", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");

    expect(resolveSlip(store, "chat-2", "member-1")).toEqual({
      status: "major_slip",
      spentToken: false,
    });
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
  });

  test("rejects blank chatId or memberId", async () => {
    const store = await freshStore();
    expect(() => resolveSlip(store, "  ", "member-1")).toThrow();
    expect(() => resolveSlip(store, "chat-1", "  ")).toThrow();
  });
});

describe("T15.3 — maybeEarnGraceToken", () => {
  const { freshStore } = useMigratedStore();

  test("streak below N grants nothing", async () => {
    const store = await freshStore();
    const granted = maybeEarnGraceToken(store, "chat-1", "member-1", 2, 3);

    expect(granted).toBe(false);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("streak reaching N grants a token when none is held", async () => {
    const store = await freshStore();
    const granted = maybeEarnGraceToken(store, "chat-1", "member-1", 3, 3);

    expect(granted).toBe(true);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
  });

  test("streak past N also grants (>= N, not only ==)", async () => {
    const store = await freshStore();
    const granted = maybeEarnGraceToken(store, "chat-1", "member-1", 5, 3);
    expect(granted).toBe(true);
  });

  test("cap 1 — already holding a token stays a no-op even at streak >= N", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");

    const granted = maybeEarnGraceToken(store, "chat-1", "member-1", 10, 3);

    expect(granted).toBe(false);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM grace_tokens WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("re-earn after spend by reaching N again", async () => {
    const store = await freshStore();
    maybeEarnGraceToken(store, "chat-1", "member-1", 3, 3);
    resolveSlip(store, "chat-1", "member-1");
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);

    const rearned = maybeEarnGraceToken(store, "chat-1", "member-1", 3, 3);

    expect(rearned).toBe(true);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
  });

  test("repeated calls at streak >= N do not double-stack", async () => {
    const store = await freshStore();
    maybeEarnGraceToken(store, "chat-1", "member-1", 3, 3);
    maybeEarnGraceToken(store, "chat-1", "member-1", 4, 3);
    maybeEarnGraceToken(store, "chat-1", "member-1", 5, 3);

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM grace_tokens WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("rejects blank chatId or memberId", async () => {
    const store = await freshStore();
    expect(() => maybeEarnGraceToken(store, "  ", "member-1", 3, 3)).toThrow();
    expect(() => maybeEarnGraceToken(store, "chat-1", "  ", 3, 3)).toThrow();
  });
});

describe("T15.4 — refundGraceToken", () => {
  const { freshStore } = useMigratedStore();

  test("restores a token spent by resolveSlip, for a late fix to sober", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");
    const spent = resolveSlip(store, "chat-1", "member-1");
    expect(spent.spentToken).toBe(true);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);

    refundGraceToken(store, "chat-1", "member-1");

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
  });

  test("creates the chat if needed, like other verbs", async () => {
    const store = await freshStore();
    refundGraceToken(store, "chat-1", "member-1");

    const chat = store.db
      .query("SELECT 1 AS ok FROM chats WHERE id = ?")
      .get("chat-1");
    expect(chat).not.toBeNull();
  });

  test("cap 1 — refunding when a token is already present (re-earned since) does not double-stack", async () => {
    const store = await freshStore();
    grantGraceToken(store, "chat-1", "member-1");

    refundGraceToken(store, "chat-1", "member-1");

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM grace_tokens WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("rejects blank chatId or memberId", async () => {
    const store = await freshStore();
    expect(() => refundGraceToken(store, "  ", "member-1")).toThrow();
    expect(() => refundGraceToken(store, "chat-1", "  ")).toThrow();
  });
});

describe("T15.5 — Grace Token rule matrix (ADR 0001 end-to-end)", () => {
  const { freshStore } = useMigratedStore();
  const N = 3;

  test("full lifecycle: earn at N -> spend on slip -> major_slip without token -> re-earn at N -> late-fix refund", async () => {
    const store = await freshStore();
    const chat = "chat-1";
    const member = "member-1";

    // Sober streak below N: no token yet.
    expect(maybeEarnGraceToken(store, chat, member, 2, N)).toBe(false);
    expect(hasGraceToken(store, chat, member)).toBe(false);

    // Streak reaches N: token earned (cap 1).
    expect(maybeEarnGraceToken(store, chat, member, 3, N)).toBe(true);
    expect(hasGraceToken(store, chat, member)).toBe(true);

    // Explicit slip while holding a token: shielded, token spent.
    const shielded = resolveSlip(store, chat, member);
    expect(shielded).toEqual({ status: "minor_slip", spentToken: true });
    expect(hasGraceToken(store, chat, member)).toBe(false);

    // Next slip with no token held: unshielded.
    const unshielded = resolveSlip(store, chat, member);
    expect(unshielded).toEqual({ status: "major_slip", spentToken: false });

    // Sober progress resumes and reaches N again: re-earn.
    expect(maybeEarnGraceToken(store, chat, member, 3, N)).toBe(true);
    expect(hasGraceToken(store, chat, member)).toBe(true);

    // Spend it again via Deadline-silence-class slip.
    const spentAgain = resolveSlip(store, chat, member);
    expect(spentAgain.spentToken).toBe(true);
    expect(hasGraceToken(store, chat, member)).toBe(false);

    // Late fix corrects that Check-in to sober: refund.
    refundGraceToken(store, chat, member);
    expect(hasGraceToken(store, chat, member)).toBe(true);
  });

  test("cap 1 holds across earn/refund overlap: never more than one token, ever", async () => {
    const store = await freshStore();
    const chat = "chat-1";
    const member = "member-1";

    maybeEarnGraceToken(store, chat, member, N, N);
    // Same-Day double earn attempt (e.g. re-evaluated twice) does not stack.
    maybeEarnGraceToken(store, chat, member, N, N);
    // A refund while already holding one (e.g. re-earned before a late fix
    // resolves) also does not stack.
    refundGraceToken(store, chat, member);

    expect(hasGraceToken(store, chat, member)).toBe(true);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM grace_tokens WHERE chat_id = ? AND member_id = ?",
      )
      .get(chat, member) as { n: number };
    expect(rows.n).toBe(1);
  });

  test("Grace Token state does not leak across members or chats sharing the rule matrix", async () => {
    const store = await freshStore();
    maybeEarnGraceToken(store, "chat-1", "member-1", N, N);
    resolveSlip(store, "chat-1", "member-1");

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
    expect(hasGraceToken(store, "chat-1", "member-2")).toBe(false);
    expect(hasGraceToken(store, "chat-2", "member-1")).toBe(false);

    // member-2 independently earns and keeps their own token.
    maybeEarnGraceToken(store, "chat-1", "member-2", N, N);
    expect(hasGraceToken(store, "chat-1", "member-2")).toBe(true);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });
});
