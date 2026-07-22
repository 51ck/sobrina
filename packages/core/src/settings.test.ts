import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "./migrate.ts";
import {
  getOrCreateChat,
  getSettings,
  updateSettings,
  ChatNotFoundError,
  InvalidSettingsError,
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

describe("T11.2 — updateSettings", () => {
  const { freshStore } = useMigratedStore();

  test("patches Reminder, Deadline, timezone, and N", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");

    const updated = updateSettings(store, "chat-1", {
      reminderTime: "21:00",
      deadlineTime: "09:00",
      timezone: "Europe/Moscow",
      graceTokenN: 5,
    });

    expect(updated).toEqual({
      chatId: "chat-1",
      reminderTime: "21:00",
      deadlineTime: "09:00",
      timezone: "Europe/Moscow",
      graceTokenN: 5,
    });
    expect(getSettings(store, "chat-1")).toEqual(updated);
  });

  test("partial patch leaves other fields unchanged", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      reminderTime: "20:30",
      timezone: "Europe/Berlin",
    });

    const updated = updateSettings(store, "chat-1", { graceTokenN: 4 });
    expect(updated.reminderTime).toBe("20:30");
    expect(updated.timezone).toBe("Europe/Berlin");
    expect(updated.graceTokenN).toBe(4);
    expect(updated.deadlineTime).toBeNull();
  });

  test("null clears Reminder or Deadline time", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      reminderTime: "21:00",
      deadlineTime: "09:00",
    });

    const updated = updateSettings(store, "chat-1", {
      reminderTime: null,
      deadlineTime: null,
    });
    expect(updated.reminderTime).toBeNull();
    expect(updated.deadlineTime).toBeNull();
  });

  test("rejects invalid HH:MM times", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    for (const bad of ["25:00", "9:00", "21:60", "ab:cd", ""]) {
      expect(() =>
        updateSettings(store, "chat-1", { reminderTime: bad }),
      ).toThrow(InvalidSettingsError);
      expect(() =>
        updateSettings(store, "chat-1", { deadlineTime: bad }),
      ).toThrow(InvalidSettingsError);
    }
  });

  test("rejects invalid IANA timezone", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    expect(() =>
      updateSettings(store, "chat-1", { timezone: "Not/AZone" }),
    ).toThrow(InvalidSettingsError);
    expect(() => updateSettings(store, "chat-1", { timezone: "" })).toThrow(
      InvalidSettingsError,
    );
  });

  test("rejects N < 1 or non-integer N", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        updateSettings(store, "chat-1", { graceTokenN: bad }),
      ).toThrow(InvalidSettingsError);
    }
  });

  test("throws ChatNotFoundError for unknown chat", async () => {
    const store = await freshStore();
    expect(() =>
      updateSettings(store, "ghost", { graceTokenN: 4 }),
    ).toThrow(ChatNotFoundError);
  });
});

describe("T11.3 — defaults + representation", () => {
  const { freshStore } = useMigratedStore();

  test("DEFAULT_GRACE_TOKEN_N is 3 (CONTEXT.md / daily-rhythm)", () => {
    expect(DEFAULT_GRACE_TOKEN_N).toBe(3);
  });

  test("new chat gets N=3, UTC, null times from verb defaults", async () => {
    const store = await freshStore();
    const settings = getOrCreateChat(store, "chat-defaults");
    expect(settings.graceTokenN).toBe(3);
    expect(settings.timezone).toBe("UTC");
    expect(settings.reminderTime).toBeNull();
    expect(settings.deadlineTime).toBeNull();
  });

  test("accepts zero-padded HH:MM local times and IANA timezone", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    const updated = updateSettings(store, "chat-1", {
      reminderTime: "00:00",
      deadlineTime: "23:59",
      timezone: "Asia/Tokyo",
    });
    expect(updated.reminderTime).toBe("00:00");
    expect(updated.deadlineTime).toBe("23:59");
    expect(updated.timezone).toBe("Asia/Tokyo");
  });
});
