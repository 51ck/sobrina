import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "./migrate.ts";
import {
  getOrCreateChat,
  getSettings,
  ChatNotFoundError,
  DEFAULT_GRACE_TOKEN_N,
  DEFAULT_TIMEZONE,
} from "./settings.ts";
import { openStore, type Store } from "./store.ts";

/** Shared temp DB harness — mirrors migrate.test.ts pattern. */
function useMigratedStore() {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function freshStore(): Promise<Store> {
    dir = mkdtempSync(join(tmpdir(), "sobri-settings-"));
    const path = join(dir, "test.db");
    const s = await openStore(path);
    migrate(s);
    store = s;
    return s;
  }

  return { freshStore };
}

describe("T11.1 — getOrCreateChat + getSettings", () => {
  const { freshStore } = useMigratedStore();

  test("getOrCreateChat creates a chat with default settings", async () => {
    const store = await freshStore();
    const settings = getOrCreateChat(store, "chat-1");

    expect(settings).toEqual({
      chatId: "chat-1",
      reminderTime: null,
      deadlineTime: null,
      timezone: DEFAULT_TIMEZONE,
      graceTokenN: DEFAULT_GRACE_TOKEN_N,
    });
  });

  test("getOrCreateChat is idempotent — second call returns same chat, no duplicate row", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    const again = getOrCreateChat(store, "chat-1");

    expect(again.chatId).toBe("chat-1");
    const rows = store.db
      .query("SELECT COUNT(*) AS n FROM chats WHERE id = ?")
      .get("chat-1") as { n: number };
    expect(rows.n).toBe(1);
  });

  test("getSettings reads back an existing chat's settings", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");

    expect(getSettings(store, "chat-1")).toEqual({
      chatId: "chat-1",
      reminderTime: null,
      deadlineTime: null,
      timezone: DEFAULT_TIMEZONE,
      graceTokenN: DEFAULT_GRACE_TOKEN_N,
    });
  });

  test("getSettings throws ChatNotFoundError for an unknown chat", async () => {
    const store = await freshStore();
    expect(() => getSettings(store, "ghost")).toThrow(ChatNotFoundError);
  });

  test("getOrCreateChat rejects a blank chatId", async () => {
    const store = await freshStore();
    expect(() => getOrCreateChat(store, "  ")).toThrow();
  });
});
