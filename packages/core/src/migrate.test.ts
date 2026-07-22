import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "./migrate.ts";
import { openStore, type Store } from "./store.ts";

/** Shared temp DB harness for migration slice tests. */
function useMigratedStore() {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function freshStore(): Promise<Store> {
    dir = mkdtempSync(join(tmpdir(), "sobri-migrate-"));
    const path = join(dir, "test.db");
    const s = await openStore(path);
    migrate(s);
    store = s;
    return s;
  }

  return { freshStore };
}

describe("T10.1 — chats + chat_settings migration", () => {
  const { freshStore } = useMigratedStore();

  test("creates chats + chat_settings tables", async () => {
    const store = await freshStore();
    const tables = store.db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('chats', 'chat_settings')",
      )
      .all() as Array<{ name: string }>;
    expect(tables.map((t) => t.name).sort()).toEqual([
      "chat_settings",
      "chats",
    ]);
  });

  test("chat_settings.grace_token_n defaults to 3", async () => {
    const store = await freshStore();
    store.db.query("INSERT INTO chats (id) VALUES (?)").run("chat-1");
    store.db
      .query("INSERT INTO chat_settings (chat_id) VALUES (?)")
      .run("chat-1");

    const row = store.db
      .query("SELECT grace_token_n, timezone FROM chat_settings WHERE chat_id = ?")
      .get("chat-1") as { grace_token_n: number; timezone: string };

    expect(row.grace_token_n).toBe(3);
    expect(row.timezone).toBe("UTC");
  });

  test("chat_settings row is removed when chat is deleted (ON DELETE CASCADE)", async () => {
    const store = await freshStore();
    store.db.query("INSERT INTO chats (id) VALUES (?)").run("chat-1");
    store.db
      .query("INSERT INTO chat_settings (chat_id) VALUES (?)")
      .run("chat-1");

    store.db.query("DELETE FROM chats WHERE id = ?").run("chat-1");

    const row = store.db
      .query("SELECT 1 AS ok FROM chat_settings WHERE chat_id = ?")
      .get("chat-1");
    expect(row).toBeNull();
  });
});

describe("T10.2 — checklist_members migration", () => {
  const { freshStore } = useMigratedStore();

  test("creates checklist_members table", async () => {
    const store = await freshStore();
    const row = store.db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'checklist_members'",
      )
      .get() as { name: string } | null;
    expect(row?.name).toBe("checklist_members");
  });

  test("stores chat + member with join/leave timestamps", async () => {
    const store = await freshStore();
    store.db.query("INSERT INTO chats (id) VALUES (?)").run("chat-1");
    store.db
      .query(
        "INSERT INTO checklist_members (chat_id, member_id) VALUES (?, ?)",
      )
      .run("chat-1", "member-1");

    const row = store.db
      .query(
        "SELECT chat_id, member_id, joined_at, left_at FROM checklist_members WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as {
      chat_id: string;
      member_id: string;
      joined_at: string;
      left_at: string | null;
    };

    expect(row.chat_id).toBe("chat-1");
    expect(row.member_id).toBe("member-1");
    expect(row.joined_at).toBeTruthy();
    expect(row.left_at).toBeNull();

    store.db
      .query(
        "UPDATE checklist_members SET left_at = datetime('now') WHERE chat_id = ? AND member_id = ?",
      )
      .run("chat-1", "member-1");

    const left = store.db
      .query(
        "SELECT left_at FROM checklist_members WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as { left_at: string };
    expect(left.left_at).toBeTruthy();
  });
});

describe("T10.3 — days migration", () => {
  const { freshStore } = useMigratedStore();

  test("creates days table", async () => {
    const store = await freshStore();
    const row = store.db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'days'",
      )
      .get() as { name: string } | null;
    expect(row?.name).toBe("days");
  });

  test("stores chat + day_key with open/closed status and cycle metadata", async () => {
    const store = await freshStore();
    store.db.query("INSERT INTO chats (id) VALUES (?)").run("chat-1");
    store.db
      .query(
        "INSERT INTO days (chat_id, day_key, reminder_at, deadline_at) VALUES (?, ?, ?, ?)",
      )
      .run("chat-1", "2026-07-21", "2026-07-21T21:00:00Z", "2026-07-22T09:00:00Z");

    const row = store.db
      .query(
        "SELECT chat_id, day_key, status, reminder_at, deadline_at, closed_at FROM days WHERE chat_id = ? AND day_key = ?",
      )
      .get("chat-1", "2026-07-21") as {
      chat_id: string;
      day_key: string;
      status: string;
      reminder_at: string;
      deadline_at: string;
      closed_at: string | null;
    };

    expect(row.chat_id).toBe("chat-1");
    expect(row.day_key).toBe("2026-07-21");
    expect(row.status).toBe("open");
    expect(row.reminder_at).toBe("2026-07-21T21:00:00Z");
    expect(row.deadline_at).toBe("2026-07-22T09:00:00Z");
    expect(row.closed_at).toBeNull();

    store.db
      .query(
        "UPDATE days SET status = 'closed', closed_at = datetime('now') WHERE chat_id = ? AND day_key = ?",
      )
      .run("chat-1", "2026-07-21");

    const closed = store.db
      .query(
        "SELECT status, closed_at FROM days WHERE chat_id = ? AND day_key = ?",
      )
      .get("chat-1", "2026-07-21") as { status: string; closed_at: string };
    expect(closed.status).toBe("closed");
    expect(closed.closed_at).toBeTruthy();
  });

  test("rejects status outside open|closed", async () => {
    const store = await freshStore();
    store.db.query("INSERT INTO chats (id) VALUES (?)").run("chat-1");
    expect(() => {
      store.db
        .query(
          "INSERT INTO days (chat_id, day_key, status) VALUES (?, ?, ?)",
        )
        .run("chat-1", "2026-07-21", "pending");
    }).toThrow();
  });
});

describe("T10.4 — check_ins migration", () => {
  const { freshStore } = useMigratedStore();

  async function seedDay(store: Store): Promise<void> {
    store.db.query("INSERT INTO chats (id) VALUES (?)").run("chat-1");
    store.db
      .query("INSERT INTO days (chat_id, day_key) VALUES (?, ?)")
      .run("chat-1", "2026-07-21");
  }

  test("creates check_ins table", async () => {
    const store = await freshStore();
    const row = store.db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'check_ins'",
      )
      .get() as { name: string } | null;
    expect(row?.name).toBe("check_ins");
  });

  test("stores sober|minor_slip|major_slip with token-spend flag", async () => {
    const store = await freshStore();
    await seedDay(store);

    store.db
      .query(
        "INSERT INTO check_ins (chat_id, member_id, day_key, status, spent_grace_token) VALUES (?, ?, ?, ?, ?)",
      )
      .run("chat-1", "member-1", "2026-07-21", "minor_slip", 1);

    const row = store.db
      .query(
        "SELECT status, spent_grace_token FROM check_ins WHERE chat_id = ? AND member_id = ? AND day_key = ?",
      )
      .get("chat-1", "member-1", "2026-07-21") as {
      status: string;
      spent_grace_token: number;
    };

    expect(row.status).toBe("minor_slip");
    expect(row.spent_grace_token).toBe(1);

    store.db
      .query(
        "INSERT INTO check_ins (chat_id, member_id, day_key, status) VALUES (?, ?, ?, ?)",
      )
      .run("chat-1", "member-2", "2026-07-21", "sober");
    store.db
      .query(
        "INSERT INTO check_ins (chat_id, member_id, day_key, status) VALUES (?, ?, ?, ?)",
      )
      .run("chat-1", "member-3", "2026-07-21", "major_slip");

    const sober = store.db
      .query(
        "SELECT status, spent_grace_token FROM check_ins WHERE member_id = ?",
      )
      .get("member-2") as { status: string; spent_grace_token: number };
    const major = store.db
      .query(
        "SELECT status, spent_grace_token FROM check_ins WHERE member_id = ?",
      )
      .get("member-3") as { status: string; spent_grace_token: number };

    expect(sober.status).toBe("sober");
    expect(sober.spent_grace_token).toBe(0);
    expect(major.status).toBe("major_slip");
    expect(major.spent_grace_token).toBe(0);
  });

  test("rejects missed/absent and other non-status values", async () => {
    const store = await freshStore();
    await seedDay(store);
    for (const bad of ["missed", "absent", "soberish"]) {
      expect(() => {
        store.db
          .query(
            "INSERT INTO check_ins (chat_id, member_id, day_key, status) VALUES (?, ?, ?, ?)",
          )
          .run("chat-1", "member-1", "2026-07-21", bad);
      }).toThrow();
    }
  });
});
