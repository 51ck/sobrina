import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  closeDay,
  computeDayKey,
  DayNotFoundError,
  ensureOpenDay,
  getDay,
} from "./day.ts";
import { migrate } from "./migrate.ts";
import { openStore, type Store } from "./store.ts";

/** Shared temp DB harness — mirrors settings.test.ts / checklist.test.ts pattern. */
function useMigratedStore() {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function freshStore(): Promise<Store> {
    dir = mkdtempSync(join(tmpdir(), "sobri-day-"));
    const path = join(dir, "test.db");
    const s = await openStore(path);
    migrate(s);
    store = s;
    return s;
  }

  return { freshStore };
}

describe("T13.1 — computeDayKey (same-calendar cycle)", () => {
  const settings = {
    timezone: "UTC",
    reminderTime: "09:00",
    deadlineTime: "21:00",
  };

  test("at Reminder instant → today", () => {
    expect(computeDayKey(settings, new Date("2026-07-22T09:00:00Z"))).toBe(
      "2026-07-22",
    );
  });

  test("at Deadline instant (same calendar date) → today", () => {
    expect(computeDayKey(settings, new Date("2026-07-22T21:00:00Z"))).toBe(
      "2026-07-22",
    );
  });

  test("midday between Reminder and Deadline → today", () => {
    expect(computeDayKey(settings, new Date("2026-07-22T12:00:00Z"))).toBe(
      "2026-07-22",
    );
  });

  test("before Reminder (early morning) → today (upcoming Day)", () => {
    expect(computeDayKey(settings, new Date("2026-07-22T03:00:00Z"))).toBe(
      "2026-07-22",
    );
  });

  test("after Deadline (late night, same calendar date) → today", () => {
    expect(computeDayKey(settings, new Date("2026-07-22T23:30:00Z"))).toBe(
      "2026-07-22",
    );
  });
});

describe("T13.1 — computeDayKey (overnight Deadline, ADR 0002)", () => {
  const settings = {
    timezone: "UTC",
    reminderTime: "21:00",
    deadlineTime: "01:00",
  };

  test("at Reminder instant (evening) → today", () => {
    expect(computeDayKey(settings, new Date("2026-07-22T21:00:00Z"))).toBe(
      "2026-07-22",
    );
  });

  test("just before midnight → still today's (Reminder's) Day key", () => {
    expect(computeDayKey(settings, new Date("2026-07-22T23:59:00Z"))).toBe(
      "2026-07-22",
    );
  });

  test("at Deadline instant next clock morning → Reminder's evening Day key, not Deadline's clock date", () => {
    const deadlineInstant = new Date("2026-07-23T01:00:00Z");
    const dayKey = computeDayKey(settings, deadlineInstant);
    expect(dayKey).toBe("2026-07-22");
    expect(dayKey).not.toBe("2026-07-23");
  });

  test("just after Deadline → new upcoming Day (today's own date)", () => {
    expect(computeDayKey(settings, new Date("2026-07-23T01:01:00Z"))).toBe(
      "2026-07-23",
    );
  });

  test("daytime gap before next Reminder → upcoming Day (today's own date)", () => {
    expect(computeDayKey(settings, new Date("2026-07-23T14:00:00Z"))).toBe(
      "2026-07-23",
    );
  });

  test("across a month boundary", () => {
    const settingsCrossMonth = {
      timezone: "UTC",
      reminderTime: "22:00",
      deadlineTime: "02:00",
    };
    expect(
      computeDayKey(settingsCrossMonth, new Date("2026-08-01T02:00:00Z")),
    ).toBe("2026-07-31");
  });
});

describe("T13.1 — computeDayKey (fallback + timezone)", () => {
  test("falls back to today's date when reminderTime is unset", () => {
    expect(
      computeDayKey(
        { timezone: "UTC", reminderTime: null, deadlineTime: "21:00" },
        new Date("2026-07-22T23:00:00Z"),
      ),
    ).toBe("2026-07-22");
  });

  test("falls back to today's date when deadlineTime is unset", () => {
    expect(
      computeDayKey(
        { timezone: "UTC", reminderTime: "09:00", deadlineTime: null },
        new Date("2026-07-22T23:00:00Z"),
      ),
    ).toBe("2026-07-22");
  });

  test("respects chat timezone, not UTC calendar date", () => {
    const settings = {
      timezone: "Pacific/Kiritimati", // UTC+14, no DST — deterministic offset
      reminderTime: "09:00",
      deadlineTime: "21:00",
    };
    // 2026-07-22T23:30:00Z is 2026-07-23T13:30 local in UTC+14.
    expect(computeDayKey(settings, new Date("2026-07-22T23:30:00Z"))).toBe(
      "2026-07-23",
    );
  });
});

describe("T13.2 — ensureOpenDay / getDay", () => {
  const { freshStore } = useMigratedStore();

  test("creates an open Day, creating the chat if needed", async () => {
    const store = await freshStore();
    const day = ensureOpenDay(store, "chat-1", "2026-07-22");

    expect(day.chatId).toBe("chat-1");
    expect(day.dayKey).toBe("2026-07-22");
    expect(day.status).toBe("open");
    expect(day.createdAt).toBeTruthy();
    expect(day.closedAt).toBeNull();

    const chat = store.db
      .query("SELECT 1 AS ok FROM chats WHERE id = ?")
      .get("chat-1");
    expect(chat).not.toBeNull();
  });

  test("is idempotent — second call returns the same row, does not reset status", async () => {
    const store = await freshStore();
    const first = ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22");
    const second = ensureOpenDay(store, "chat-1", "2026-07-22");

    expect(second.status).toBe("closed");
    expect(second.createdAt).toBe(first.createdAt);
  });

  test("getDay returns null for a Day never opened", async () => {
    const store = await freshStore();
    expect(getDay(store, "chat-1", "2026-07-22")).toBeNull();
  });

  test("getDay reflects state after ensureOpenDay", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");
    expect(getDay(store, "chat-1", "2026-07-22")?.status).toBe("open");
  });

  test("Days are scoped per chat", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");
    expect(getDay(store, "chat-2", "2026-07-22")).toBeNull();
  });

  test("rejects blank chatId or dayKey", async () => {
    const store = await freshStore();
    expect(() => ensureOpenDay(store, "  ", "2026-07-22")).toThrow();
    expect(() => ensureOpenDay(store, "chat-1", "  ")).toThrow();
  });
});

describe("T13.3 — closeDay", () => {
  const { freshStore } = useMigratedStore();

  test("transitions an open Day to closed", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");
    const closed = closeDay(store, "chat-1", "2026-07-22");

    expect(closed.status).toBe("closed");
    expect(closed.closedAt).toBeTruthy();
  });

  test("throws DayNotFoundError for a Day that was never opened", async () => {
    const store = await freshStore();
    expect(() => closeDay(store, "chat-1", "2026-07-22")).toThrow(
      DayNotFoundError,
    );
  });

  test("is idempotent — closing an already-closed Day keeps the original closedAt", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-22");
    const first = closeDay(store, "chat-1", "2026-07-22");
    const second = closeDay(store, "chat-1", "2026-07-22");

    expect(second.closedAt).toBe(first.closedAt);
  });

  test("closing one Day does not affect another Day in the same chat", async () => {
    const store = await freshStore();
    ensureOpenDay(store, "chat-1", "2026-07-21");
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-21");

    expect(getDay(store, "chat-1", "2026-07-21")?.status).toBe("closed");
    expect(getDay(store, "chat-1", "2026-07-22")?.status).toBe("open");
  });

  test("rejects blank chatId or dayKey", async () => {
    const store = await freshStore();
    expect(() => closeDay(store, "  ", "2026-07-22")).toThrow();
    expect(() => closeDay(store, "chat-1", "  ")).toThrow();
  });
});

describe("T13.4 — overnight Deadline fixture (ADR 0002 end-to-end)", () => {
  const { freshStore } = useMigratedStore();

  test("Reminder opens a Day keyed to the evening date; Deadline next morning closes that same key", async () => {
    const store = await freshStore();
    const settings = {
      timezone: "UTC",
      reminderTime: "21:00",
      deadlineTime: "01:00",
    };

    const reminderInstant = new Date("2026-07-22T21:00:00Z");
    const openKey = computeDayKey(settings, reminderInstant);
    expect(openKey).toBe("2026-07-22");
    const opened = ensureOpenDay(store, "chat-1", openKey);
    expect(opened.status).toBe("open");

    const deadlineInstant = new Date("2026-07-23T01:00:00Z");
    const closeKey = computeDayKey(settings, deadlineInstant);
    expect(closeKey).toBe(openKey);
    expect(closeKey).not.toBe("2026-07-23");

    const closed = closeDay(store, "chat-1", closeKey);
    expect(closed.dayKey).toBe("2026-07-22");
    expect(closed.status).toBe("closed");
  });

  test("same-calendar Deadline: Reminder and Deadline share one Day key", async () => {
    const store = await freshStore();
    const settings = {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    };

    const openKey = computeDayKey(settings, new Date("2026-07-22T09:00:00Z"));
    const closeKey = computeDayKey(
      settings,
      new Date("2026-07-22T21:00:00Z"),
    );
    expect(openKey).toBe(closeKey);

    ensureOpenDay(store, "chat-1", openKey);
    const closed = closeDay(store, "chat-1", closeKey);
    expect(closed.dayKey).toBe("2026-07-22");
  });
});
