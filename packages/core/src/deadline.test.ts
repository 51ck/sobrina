import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isOnChecklist, joinChecklist, leaveChecklist } from "./checklist.ts";
import { recordCheckIn } from "./checkin.ts";
import { closeDay, ensureOpenDay } from "./day.ts";
import {
  autoSlipSilentMembers,
  closeDayAtDeadline,
  listSilentChecklistMembers,
} from "./deadline.ts";
import { grantGraceToken, hasGraceToken } from "./grace.ts";
import { migrate } from "./migrate.ts";
import { openStore, type Store } from "./store.ts";

/** Shared temp DB harness — mirrors checklist.test.ts / checkin.test.ts pattern. */
function useMigratedStore() {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function freshStore(): Promise<Store> {
    dir = mkdtempSync(join(tmpdir(), "sobri-deadline-"));
    const path = join(dir, "test.db");
    const s = await openStore(path);
    migrate(s);
    store = s;
    return s;
  }

  return { freshStore };
}

describe("T16.1 — listSilentChecklistMembers", () => {
  const { freshStore } = useMigratedStore();

  test("empty Checklist → empty list", async () => {
    const store = await freshStore();
    expect(listSilentChecklistMembers(store, "chat-1", "2024-01-01")).toEqual(
      [],
    );
  });

  test("no Check-ins yet → every active Checklist member is silent", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-1", "member-2");

    const silent = listSilentChecklistMembers(store, "chat-1", "2024-01-01");
    expect(silent).toEqual(["member-1", "member-2"]);
  });

  test("mixed: Checked-in members are excluded, silent members remain", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-1", "member-2");
    joinChecklist(store, "chat-1", "member-3");
    recordCheckIn(store, "chat-1", "member-2", "2024-01-01", "sober");

    const silent = listSilentChecklistMembers(store, "chat-1", "2024-01-01");
    expect(silent).toEqual(["member-1", "member-3"]);
  });

  test("all members checked in → empty list", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    recordCheckIn(store, "chat-1", "member-1", "2024-01-01", "sober");

    expect(listSilentChecklistMembers(store, "chat-1", "2024-01-01")).toEqual(
      [],
    );
  });

  test("a Check-in on a different Day does not silence a member for this Day", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    recordCheckIn(store, "chat-1", "member-1", "2023-12-31", "sober");

    expect(listSilentChecklistMembers(store, "chat-1", "2024-01-01")).toEqual(
      ["member-1"],
    );
  });

  test("a member who left the Checklist is excluded even if never checked in", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-1", "member-2");
    leaveChecklist(store, "chat-1", "member-2");

    expect(listSilentChecklistMembers(store, "chat-1", "2024-01-01")).toEqual(
      ["member-1"],
    );
  });

  test("Day row need not exist yet — silence check works without ensureOpenDay", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");

    expect(() =>
      listSilentChecklistMembers(store, "chat-1", "2099-01-01"),
    ).not.toThrow();
    expect(
      listSilentChecklistMembers(store, "chat-1", "2099-01-01"),
    ).toEqual(["member-1"]);
  });

  test("does not leak members or Check-ins from another chat", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-2", "member-1");
    recordCheckIn(store, "chat-2", "member-1", "2024-01-01", "sober");

    expect(listSilentChecklistMembers(store, "chat-1", "2024-01-01")).toEqual(
      ["member-1"],
    );
    expect(listSilentChecklistMembers(store, "chat-2", "2024-01-01")).toEqual(
      [],
    );
  });

  test("rejects blank chatId or dayKey", async () => {
    const store = await freshStore();
    expect(() => listSilentChecklistMembers(store, "  ", "2024-01-01")).toThrow();
    expect(() => listSilentChecklistMembers(store, "chat-1", "  ")).toThrow();
  });
});

describe("T16.2 — autoSlipSilentMembers", () => {
  const { freshStore } = useMigratedStore();

  test("empty Checklist → no-op, returns [] and writes nothing", async () => {
    const store = await freshStore();

    const written = autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    expect(written).toEqual([]);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(0);
    // No Day row created as a side effect of a no-op auto-slip.
    const day = store.db
      .query("SELECT COUNT(*) AS n FROM days WHERE chat_id = ? AND day_key = ?")
      .get("chat-1", "2024-01-01") as { n: number };
    expect(day.n).toBe(0);
  });

  test("silent member holding a Grace Token → minor_slip, token spent", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    grantGraceToken(store, "chat-1", "member-1");

    const written = autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    expect(written).toHaveLength(1);
    expect(written[0]?.memberId).toBe("member-1");
    expect(written[0]?.status).toBe("minor_slip");
    expect(written[0]?.spentGraceToken).toBe(true);
    expect(hasGraceToken(store, "chat-1", "member-1")).toBe(false);
  });

  test("silent member without a Grace Token → major_slip", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");

    const written = autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    expect(written).toHaveLength(1);
    expect(written[0]?.status).toBe("major_slip");
    expect(written[0]?.spentGraceToken).toBe(false);
  });

  test("mixed silent/checked-in: only silent members get auto-slipped, the existing Check-in is untouched", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-1", "member-2");
    joinChecklist(store, "chat-1", "member-3");
    const before = recordCheckIn(store, "chat-1", "member-2", "2024-01-01", "sober");

    const written = autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    expect(written.map((c) => c.memberId)).toEqual(["member-1", "member-3"]);
    for (const checkIn of written) {
      expect(checkIn.status).toBe("major_slip");
    }
    const after = store.db
      .query(
        `SELECT status, spent_grace_token AS spentGraceToken, created_at AS createdAt, updated_at AS updatedAt
         FROM check_ins WHERE chat_id = ? AND member_id = ? AND day_key = ?`,
      )
      .get("chat-1", "member-2", "2024-01-01") as {
      status: string;
      spentGraceToken: number;
      createdAt: string;
      updatedAt: string;
    };
    expect(after.status).toBe("sober");
    expect(after.spentGraceToken).toBe(0);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.updatedAt).toBe(before.updatedAt);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins WHERE chat_id = ?")
      .get("chat-1") as { n: number };
    expect(rows.n).toBe(3);
  });

  test("does not double-slip or double-spend on a re-run for a member already auto-slipped", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    grantGraceToken(store, "chat-1", "member-1");

    const first = autoSlipSilentMembers(store, "chat-1", "2024-01-01");
    expect(first).toHaveLength(1);
    expect(first[0]?.status).toBe("minor_slip");

    const second = autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    expect(second).toEqual([]);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(1);
  });

  test("opens the Day itself when it was never opened before Deadline", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");

    autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    const day = store.db
      .query("SELECT status FROM days WHERE chat_id = ? AND day_key = ?")
      .get("chat-1", "2024-01-01") as { status: string };
    expect(day.status).toBe("open");
  });

  test("does not write a Check-in for a member who left the Checklist", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-1", "member-2");
    leaveChecklist(store, "chat-1", "member-2");

    const written = autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    expect(written.map((c) => c.memberId)).toEqual(["member-1"]);
  });

  test("does not close the Day (T16.3 is a later slice)", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");

    autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    const day = store.db
      .query("SELECT status FROM days WHERE chat_id = ? AND day_key = ?")
      .get("chat-1", "2024-01-01") as { status: string };
    expect(day.status).toBe("open");
  });

  test("throws DayClosedError-style rejection when the Day was already closed", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2024-01-01");
    closeDay(store, "chat-1", "2024-01-01");

    expect(() => autoSlipSilentMembers(store, "chat-1", "2024-01-01")).toThrow();
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(0);
  });

  test("rejects blank chatId or dayKey", async () => {
    const store = await freshStore();
    expect(() => autoSlipSilentMembers(store, "  ", "2024-01-01")).toThrow();
    expect(() => autoSlipSilentMembers(store, "chat-1", "  ")).toThrow();
  });

  test("does not leak members or Check-ins across chats", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-2", "member-1");

    autoSlipSilentMembers(store, "chat-1", "2024-01-01");

    expect(isOnChecklist(store, "chat-2", "member-1")).toBe(true);
    const chat2Rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins WHERE chat_id = ?")
      .get("chat-2") as { n: number };
    expect(chat2Rows.n).toBe(0);
  });
});

describe("T16.3 — closeDayAtDeadline", () => {
  const { freshStore } = useMigratedStore();

  test("empty Checklist → safe: no Check-ins written, Day still closed", async () => {
    const store = await freshStore();

    const result = closeDayAtDeadline(store, "chat-1", "2024-01-01");

    expect(result.checkIns).toEqual([]);
    expect(result.day.status).toBe("closed");
    expect(result.day.chatId).toBe("chat-1");
    expect(result.day.dayKey).toBe("2024-01-01");
    const day = store.db
      .query("SELECT status FROM days WHERE chat_id = ? AND day_key = ?")
      .get("chat-1", "2024-01-01") as { status: string };
    expect(day.status).toBe("closed");
  });

  test("after auto-slips, every silent member is slipped and the Day is closed", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    grantGraceToken(store, "chat-1", "member-1");
    joinChecklist(store, "chat-1", "member-2");

    const result = closeDayAtDeadline(store, "chat-1", "2024-01-01");

    expect(result.checkIns.map((c) => c.memberId)).toEqual([
      "member-1",
      "member-2",
    ]);
    expect(result.checkIns[0]?.status).toBe("minor_slip");
    expect(result.checkIns[1]?.status).toBe("major_slip");
    expect(result.day.status).toBe("closed");
  });

  test("already-checked-in members are untouched through the composed verb", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    joinChecklist(store, "chat-1", "member-2");
    const before = recordCheckIn(
      store,
      "chat-1",
      "member-2",
      "2024-01-01",
      "sober",
    );

    const result = closeDayAtDeadline(store, "chat-1", "2024-01-01");

    expect(result.checkIns.map((c) => c.memberId)).toEqual(["member-1"]);
    const after = store.db
      .query(
        `SELECT status, spent_grace_token AS spentGraceToken, created_at AS createdAt, updated_at AS updatedAt
         FROM check_ins WHERE chat_id = ? AND member_id = ? AND day_key = ?`,
      )
      .get("chat-1", "member-2", "2024-01-01") as {
      status: string;
      spentGraceToken: number;
      createdAt: string;
      updatedAt: string;
    };
    expect(after.status).toBe("sober");
    expect(after.spentGraceToken).toBe(0);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(result.day.status).toBe("closed");
  });

  test("idempotent re-run: everyone already slipped → no new writes, Day still closed", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");

    const first = closeDayAtDeadline(store, "chat-1", "2024-01-01");
    expect(first.checkIns).toHaveLength(1);

    const second = closeDayAtDeadline(store, "chat-1", "2024-01-01");

    expect(second.checkIns).toEqual([]);
    expect(second.day.status).toBe("closed");
    expect(second.day.closedAt).toBe(first.day.closedAt);
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM check_ins")
      .get() as { n: number };
    expect(rows.n).toBe(1);
  });

  test("Day never opened before Deadline is still created and left closed", async () => {
    const store = await freshStore();

    closeDayAtDeadline(store, "chat-1", "2099-06-15");

    const day = store.db
      .query("SELECT status FROM days WHERE chat_id = ? AND day_key = ?")
      .get("chat-1", "2099-06-15") as { status: string } | null;
    expect(day?.status).toBe("closed");
  });

  test("a genuinely silent member against an already-closed Day rejects like autoSlipSilentMembers", async () => {
    const store = await freshStore();
    joinChecklist(store, "chat-1", "member-1");
    ensureOpenDay(store, "chat-1", "2024-01-01");
    closeDay(store, "chat-1", "2024-01-01");

    expect(() => closeDayAtDeadline(store, "chat-1", "2024-01-01")).toThrow();
  });

  test("rejects blank chatId or dayKey", async () => {
    const store = await freshStore();
    expect(() => closeDayAtDeadline(store, "  ", "2024-01-01")).toThrow();
    expect(() => closeDayAtDeadline(store, "chat-1", "  ")).toThrow();
  });
});
