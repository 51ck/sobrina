import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isOnChecklist, joinChecklist, leaveChecklist } from "./checklist.ts";
import {
  DayClosedError,
  NotOnChecklistError,
  joinAndRecordCheckIn,
  recordCheckIn,
} from "./checkin.ts";
import { closeDay, ensureOpenDay } from "./day.ts";
import { grantGraceToken, hasGraceToken } from "./grace.ts";
import { migrate } from "./migrate.ts";
import { updateSettings } from "./settings.ts";
import { openStore, type Store } from "./store.ts";

/** Shared temp DB harness — mirrors day.test.ts / grace.test.ts pattern. */
function useMigratedStore() {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function freshStore(): Promise<Store> {
    dir = mkdtempSync(join(tmpdir(), "sobri-checkin-"));
    const path = join(dir, "test.db");
    const s = await openStore(path);
    migrate(s);
    store = s;
    return s;
  }

  return { freshStore };
}

describe("T14.1 — recordCheckIn (sober, open Day)", () => {
  const { freshStore } = useMigratedStore();

  test("writes a sober Check-in for a Checklist member on an open Day", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const checkIn = recordCheckIn(
      store,
      "chat-1",
      "member-1",
      "2026-07-22",
      "sober",
    );

    expect(checkIn.chatId).toBe("chat-1");
    expect(checkIn.memberId).toBe("member-1");
    expect(checkIn.dayKey).toBe("2026-07-22");
    expect(checkIn.status).toBe("sober");
    expect(checkIn.spentGraceToken).toBe(false);
    expect(checkIn.createdAt).toBeTruthy();
    expect(checkIn.updatedAt).toBeTruthy();
  });

  test("early Check-in opens the Day itself (no prior ensureOpenDay call needed)", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");

    const checkIn = recordCheckIn(
      store,
      "chat-1",
      "member-1",
      "2026-07-22",
      "sober",
    );

    expect(checkIn.status).toBe("sober");
    const rows = store.db
      .query(
        "SELECT status FROM days WHERE chat_id = ? AND day_key = ?",
      )
      .get("chat-1", "2026-07-22") as { status: string };
    expect(rows.status).toBe("open");
  });

  test("a second sober Check-in for the same Day updates the row, not a second row", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const first = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober");
    const second = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober");

    expect(second.status).toBe("sober");
    expect(second.createdAt).toBe(first.createdAt);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM check_ins WHERE chat_id = ? AND member_id = ? AND day_key = ?",
      )
      .get("chat-1", "member-1", "2026-07-22") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("Check-ins are scoped per chat, member, and Day key", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-1", "member-2");
    joinChecklist(store, "chat-2", "member-1");

    recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober");

    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(1);

    // Neither a different member in the same chat, a different chat for
    // the same member, nor a different Day key picked up the write.
    const other = store.db
      .query(
        "SELECT chat_id, member_id, day_key FROM check_ins WHERE chat_id != ? OR member_id != ? OR day_key != ?",
      )
      .all("chat-1", "member-1", "2026-07-22");
    expect(other).toEqual([]);

    recordCheckIn(store, "chat-1", "member-2", "2026-07-22", "sober");
    recordCheckIn(store, "chat-2", "member-1", "2026-07-22", "sober");
    recordCheckIn(store, "chat-1", "member-1", "2026-07-23", "sober");

    const total = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(total.n).toBe(4);
  });

  test("throws NotOnChecklistError for a member who left the Checklist", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    leaveChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");

    expect(() =>
      recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober"),
    ).toThrow(NotOnChecklistError);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(0);
  });

  test("throws NotOnChecklistError when the member has not joined", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");

    expect(() =>
      recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober"),
    ).toThrow(NotOnChecklistError);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(0);
  });

  test("throws DayClosedError when the target Day is already closed", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    expect(() =>
      recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober"),
    ).toThrow(DayClosedError);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(0);
  });

  test("does not reopen a closed Day as a side effect of a rejected write", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    expect(() =>
      recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober"),
    ).toThrow(DayClosedError);

    const day = store.db
      .query("SELECT status FROM days WHERE chat_id = ? AND day_key = ?")
      .get("chat-1", "2026-07-22") as { status: string };
    expect(day.status).toBe("closed");
  });

  test("does not grant a Grace Token via the T15 interim currentStreak = 0 call", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    updateSettings(store, "chat-1", { graceTokenN: 1 });
    ensureOpenDay(store, "chat-1", "2026-07-22");

    recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober");

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("rejects blank chatId, memberId, or dayKey", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");

    expect(() =>
      recordCheckIn(store, "  ", "member-1", "2026-07-22", "sober"),
    ).toThrow();
    expect(() =>
      recordCheckIn(store, "chat-1", "  ", "2026-07-22", "sober"),
    ).toThrow();
    expect(() =>
      recordCheckIn(store, "chat-1", "member-1", "  ", "sober"),
    ).toThrow();
  });
});

describe("T14.2 — recordCheckIn (slip, via Grace Token rules)", () => {
  const { freshStore } = useMigratedStore();

  test("slip with a Grace Token held writes minor_slip and spends the token", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    grantGraceToken(store, "chat-1", "member-1");

    const checkIn = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");

    expect(checkIn.status).toBe("minor_slip");
    expect(checkIn.spentGraceToken).toBe(true);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("slip without a Grace Token writes major_slip", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const checkIn = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");

    expect(checkIn.status).toBe("major_slip");
    expect(checkIn.spentGraceToken).toBe(false);
  });

  test("a second slip Check-in for the same Day updates the row, not a second row", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const first = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");
    const second = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");

    expect(second.status).toBe("major_slip");
    expect(second.createdAt).toBe(first.createdAt);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM check_ins WHERE chat_id = ? AND member_id = ? AND day_key = ?",
      )
      .get("chat-1", "member-1", "2026-07-22") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("re-slipping after the token was already spent by the first slip upgrades minor_slip to major_slip (documented — one resolveSlip call per slip write, no double-spend)", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    grantGraceToken(store, "chat-1", "member-1");

    const first = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");
    expect(first.status).toBe("minor_slip");
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);

    const second = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");

    expect(second.status).toBe("major_slip");
    expect(second.spentGraceToken).toBe(false);
    // No double-spend: the token was already gone, not spent a second time.
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("slip overwriting a prior sober Check-in resolves fresh — spends a held token", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    grantGraceToken(store, "chat-1", "member-1");

    recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober");
    const slip = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");

    expect(slip.status).toBe("minor_slip");
    expect(slip.spentGraceToken).toBe(true);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("sober overwriting a prior slip that spent a token refunds the token (T14.1 note)", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    grantGraceToken(store, "chat-1", "member-1");

    const slip = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");
    expect(slip.spentGraceToken).toBe(true);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);

    const sober = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober");

    expect(sober.status).toBe("sober");
    expect(sober.spentGraceToken).toBe(false);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
  });

  test("does not grant a Grace Token on a slip write, even at graceTokenN = 1", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    updateSettings(store, "chat-1", { graceTokenN: 1 });

    recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip");

    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("throws NotOnChecklistError for a slip from a non-member", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");

    expect(() =>
      recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip"),
    ).toThrow(NotOnChecklistError);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(0);
  });

  test("throws DayClosedError for a slip on an already-closed Day, without spending a held token", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");
    grantGraceToken(store, "chat-1", "member-1");

    expect(() =>
      recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "slip"),
    ).toThrow(DayClosedError);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(0);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(true);
  });
});

describe("T14.3 — joinAndRecordCheckIn (non-member joins then records)", () => {
  const { freshStore } = useMigratedStore();

  test("non-member sober Check-in ends on the Checklist with a Check-in row", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const checkIn = joinAndRecordCheckIn(
      store,
      "chat-1",
      "member-1",
      "2026-07-22",
      "sober",
    );

    expect(isOnChecklist(store, "chat-1", "member-1")).toBe(true);
    expect(checkIn.status).toBe("sober");
    expect(checkIn.dayKey).toBe("2026-07-22");
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM check_ins WHERE chat_id = ? AND member_id = ? AND day_key = ?",
      )
      .get("chat-1", "member-1", "2026-07-22") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("non-member slip Check-in ends on the Checklist with a Check-in row", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const checkIn = joinAndRecordCheckIn(
      store,
      "chat-1",
      "member-1",
      "2026-07-22",
      "slip",
    );

    expect(isOnChecklist(store, "chat-1", "member-1")).toBe(true);
    expect(checkIn.status).toBe("major_slip");
    expect(checkIn.spentGraceToken).toBe(false);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM check_ins WHERE chat_id = ? AND member_id = ? AND day_key = ?",
      )
      .get("chat-1", "member-1", "2026-07-22") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("already-member Check-in behaves exactly like recordCheckIn (no extra join side effect)", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const viaDirect = recordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober");
    const membershipRow = store.db
      .query(
        "SELECT joined_at FROM checklist_members WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as { joined_at: string };

    const viaJoinAndRecord = joinAndRecordCheckIn(
      store,
      "chat-1",
      "member-1",
      "2026-07-23",
      "sober",
    );
    const membershipRowAfter = store.db
      .query(
        "SELECT joined_at FROM checklist_members WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as { joined_at: string };

    expect(viaDirect.status).toBe("sober");
    expect(viaJoinAndRecord.status).toBe("sober");
    // joinChecklist is a no-op for an already-active member — joinedAt unchanged.
    expect(membershipRowAfter.joined_at).toBe(membershipRow.joined_at);
  });

  test("throws DayClosedError for a non-member joining onto an already-closed Day (join happens, write rejected)", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    expect(() =>
      joinAndRecordCheckIn(store, "chat-1", "member-1", "2026-07-22", "sober"),
    ).toThrow(DayClosedError);
    // Join still lands — closed-Day rejection is recordCheckIn's write-side
    // check, not a reason to withhold Checklist membership.
    expect(isOnChecklist(store, "chat-1", "member-1")).toBe(true);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(0);
  });
});
