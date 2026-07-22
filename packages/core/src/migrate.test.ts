import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "./migrate.ts";
import { openStore, type Store } from "./store.ts";

describe("T10.1 — chats + chat_settings migration", () => {
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
    return s;
  }

  test("creates chats + chat_settings tables", async () => {
    store = await freshStore();
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
    store = await freshStore();
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
    store = await freshStore();
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
