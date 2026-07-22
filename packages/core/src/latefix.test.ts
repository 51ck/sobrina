import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDay, ensureOpenDay } from "./day.ts";
import {
  isLateFixAllowed,
  LateFixFenceUnknownError,
  nextReminderAfterDay,
} from "./latefix.ts";
import { migrate } from "./migrate.ts";
import { getOrCreateChat, updateSettings } from "./settings.ts";
import { openStore, type Store } from "./store.ts";

/** Shared temp DB harness — mirrors day.test.ts / deadline.test.ts pattern. */
function useMigratedStore() {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function freshStore(): Promise<Store> {
    dir = mkdtempSync(join(tmpdir(), "sobri-latefix-"));
    const path = join(dir, "test.db");
    const s = await openStore(path);
    migrate(s);
    store = s;
    return s;
  }

  return { freshStore };
}

describe("T17.1 — nextReminderAfterDay (pure)", () => {
  test("same-calendar cycle: next Reminder is the following calendar date at reminderTime", () => {
    const settings = { timezone: "UTC", reminderTime: "09:00" };
    const fence = nextReminderAfterDay(settings, "2026-07-22");
    expect(fence.toISOString()).toBe("2026-07-23T09:00:00.000Z");
  });

  test("overnight cycle: next Reminder is dayKey + 1 at reminderTime, unaffected by the overnight Deadline time", () => {
    const settings = { timezone: "UTC", reminderTime: "21:00" };
    const fence = nextReminderAfterDay(settings, "2026-07-22");
    expect(fence.toISOString()).toBe("2026-07-23T21:00:00.000Z");
  });

  test("respects chat timezone (UTC+14, no DST — deterministic offset)", () => {
    const settings = { timezone: "Pacific/Kiritimati", reminderTime: "09:00" };
    const fence = nextReminderAfterDay(settings, "2026-07-22");
    // 2026-07-23T09:00 local in UTC+14 is 2026-07-22T19:00 UTC.
    expect(fence.toISOString()).toBe("2026-07-22T19:00:00.000Z");
  });

  test("crosses a month boundary", () => {
    const settings = { timezone: "UTC", reminderTime: "22:00" };
    const fence = nextReminderAfterDay(settings, "2026-07-31");
    expect(fence.toISOString()).toBe("2026-08-01T22:00:00.000Z");
  });

  test("throws LateFixFenceUnknownError when reminderTime is unset", () => {
    const settings = { timezone: "UTC", reminderTime: null };
    expect(() => nextReminderAfterDay(settings, "2026-07-22")).toThrow(
      LateFixFenceUnknownError,
    );
  });
});

describe("T17.1 — isLateFixAllowed", () => {
  const { freshStore } = useMigratedStore();

  test("closed Day, now strictly before next Reminder → true", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    const now = new Date("2026-07-22T22:00:00Z"); // after Deadline, well before next Reminder
    expect(isLateFixAllowed(store, "chat-1", "2026-07-22", now)).toBe(true);
  });

  test("closed Day, now exactly at next Reminder → false (not strictly before)", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    const now = new Date("2026-07-23T09:00:00Z"); // exactly the next Reminder instant
    expect(isLateFixAllowed(store, "chat-1", "2026-07-22", now)).toBe(false);
  });

  test("closed Day, now after next Reminder → false", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    const now = new Date("2026-07-24T00:00:00Z");
    expect(isLateFixAllowed(store, "chat-1", "2026-07-22", now)).toBe(false);
  });

  test("open Day → false (late fix is for closed Days; open Day uses T14)", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const now = new Date("2026-07-22T12:00:00Z");
    expect(isLateFixAllowed(store, "chat-1", "2026-07-22", now)).toBe(false);
  });

  test("missing Day (never opened) → false", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });

    const now = new Date("2026-07-22T12:00:00Z");
    expect(isLateFixAllowed(store, "chat-1", "2026-07-22", now)).toBe(false);
  });

  test("missing Day → false even for an unknown chat (never read settings)", async () => {
    const store = await freshStore();
    expect(
      isLateFixAllowed(store, "never-seen-chat", "2026-07-22"),
    ).toBe(false);
  });

  test("closed Day but reminderTime unset → throws LateFixFenceUnknownError", async () => {
    const store = await freshStore();
    // getOrCreateChat via ensureOpenDay leaves reminderTime at its null default.
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    expect(() =>
      isLateFixAllowed(store, "chat-1", "2026-07-22", new Date()),
    ).toThrow(LateFixFenceUnknownError);
  });

  test("overnight Deadline fixture (ADR 0002 shape): late fix allowed right after the overnight close, rejected at next Reminder", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "21:00",
      deadlineTime: "01:00",
    });
    ensureOpenDay(store, "chat-1", "2026-07-22"); // opened by the 2026-07-22T21:00Z Reminder
    closeDay(store, "chat-1", "2026-07-22"); // closed by the 2026-07-23T01:00Z Deadline

    const rightAfterClose = new Date("2026-07-23T01:00:01Z");
    expect(
      isLateFixAllowed(store, "chat-1", "2026-07-22", rightAfterClose),
    ).toBe(true);

    const atNextReminder = new Date("2026-07-23T21:00:00Z");
    expect(
      isLateFixAllowed(store, "chat-1", "2026-07-22", atNextReminder),
    ).toBe(false);

    const justBeforeNextReminder = new Date("2026-07-23T20:59:59Z");
    expect(
      isLateFixAllowed(store, "chat-1", "2026-07-22", justBeforeNextReminder),
    ).toBe(true);
  });

  test("same-calendar Deadline fixture (mirrors day.test.ts T13.4 shape)", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    const rightAfterClose = new Date("2026-07-22T21:00:01Z");
    expect(
      isLateFixAllowed(store, "chat-1", "2026-07-22", rightAfterClose),
    ).toBe(true);

    const nextReminder = new Date("2026-07-23T09:00:00Z");
    expect(
      isLateFixAllowed(store, "chat-1", "2026-07-22", nextReminder),
    ).toBe(false);
  });

  test("respects chat timezone, not UTC calendar date", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "Pacific/Kiritimati", // UTC+14, no DST — deterministic offset
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    // Next Reminder (2026-07-23T09:00 local) is 2026-07-22T19:00:00Z.
    const justBefore = new Date("2026-07-22T18:59:59Z");
    const atFence = new Date("2026-07-22T19:00:00Z");
    expect(isLateFixAllowed(store, "chat-1", "2026-07-22", justBefore)).toBe(
      true,
    );
    expect(isLateFixAllowed(store, "chat-1", "2026-07-22", atFence)).toBe(
      false,
    );
  });

  test("Days and settings are scoped per chat", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");

    const now = new Date("2026-07-22T22:00:00Z");
    expect(isLateFixAllowed(store, "chat-1", "2026-07-22", now)).toBe(true);
    expect(isLateFixAllowed(store, "chat-2", "2026-07-22", now)).toBe(false);
  });

  test("rejects blank chatId or dayKey", async () => {
    const store = await freshStore();
    expect(() => isLateFixAllowed(store, "  ", "2026-07-22")).toThrow();
    expect(() => isLateFixAllowed(store, "chat-1", "  ")).toThrow();
  });
});
