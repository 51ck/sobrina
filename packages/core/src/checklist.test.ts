import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { joinChecklist } from "./checklist.ts";
import { migrate } from "./migrate.ts";
import { openStore, type Store } from "./store.ts";

/** Shared temp DB harness — mirrors migrate.test.ts / settings.test.ts pattern. */
function useMigratedStore() {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function freshStore(): Promise<Store> {
    dir = mkdtempSync(join(tmpdir(), "sobri-checklist-"));
    const path = join(dir, "test.db");
    const s = await openStore(path);
    migrate(s);
    store = s;
    return s;
  }

  return { freshStore };
}

describe("T12.1 — joinChecklist", () => {
  const { freshStore } = useMigratedStore();

  test("joins a new member, creating the chat if needed", async () => {
    const store = await freshStore();
    const membership = joinChecklist(store, "chat-1", "member-1");

    expect(membership.chatId).toBe("chat-1");
    expect(membership.memberId).toBe("member-1");
    expect(membership.joinedAt).toBeTruthy();

    const chat = store.db
      .query("SELECT 1 AS ok FROM chats WHERE id = ?")
      .get("chat-1");
    expect(chat).not.toBeNull();
  });

  test("is idempotent — double join keeps one row and original joinedAt", async () => {
    const store = await freshStore();
    const first = joinChecklist(store, "chat-1", "member-1");
    const second = joinChecklist(store, "chat-1", "member-1");

    expect(second.joinedAt).toBe(first.joinedAt);
    const rows = store.db
      .query(
        "SELECT COUNT(*) AS n FROM checklist_members WHERE chat_id = ? AND member_id = ?",
      )
      .get("chat-1", "member-1") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("rejects blank chatId or memberId", async () => {
    const store = await freshStore();
    expect(() => joinChecklist(store, "  ", "member-1")).toThrow();
    expect(() => joinChecklist(store, "chat-1", "  ")).toThrow();
  });
});
