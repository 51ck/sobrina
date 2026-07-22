import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getCheckIn, NotOnChecklistError, recordCheckIn } from "./checkin.ts";
import { joinChecklist } from "./checklist.ts";
import { closeDay, ensureOpenDay, getDay } from "./day.ts";
import { closeDayAtDeadline } from "./deadline.ts";
import { grantGraceToken, hasGraceToken } from "./grace.ts";
import {
  CheckInNotFoundError,
  correctCheckIn,
  isLateFixAllowed,
  LateFixFenceUnknownError,
  LateFixNotAllowedError,
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

describe("T17.2 — correctCheckIn", () => {
  const { freshStore } = useMigratedStore();

  async function setUpClosedDayChat(store: Store): Promise<void> {
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    joinChecklist(store, "chat-1", "amy");
  }

  test("auto-slip (spent token) corrected to sober: status updates and token refunds", async () => {
    const store = await freshStore();
    await setUpClosedDayChat(store);
    grantGraceToken(store, "chat-1", "amy");

    const { checkIns } = closeDayAtDeadline(store, "chat-1", "2026-07-22");
    expect(checkIns).toHaveLength(1);
    expect(checkIns[0]?.status).toBe("minor_slip");
    expect(checkIns[0]?.spentGraceToken).toBe(true);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(false);

    const now = new Date("2026-07-22T22:00:00Z"); // after Deadline, before next Reminder
    const corrected = correctCheckIn(store, "chat-1", "amy", "2026-07-22", "sober", now);

    expect(corrected.status).toBe("sober");
    expect(corrected.spentGraceToken).toBe(false);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(true);

    const stored = getCheckIn(store, "chat-1", "amy", "2026-07-22");
    expect(stored?.status).toBe("sober");
    expect(stored?.spentGraceToken).toBe(false);
  });

  test("auto-slip (no token) corrected to sober: status updates, no token appears", async () => {
    const store = await freshStore();
    await setUpClosedDayChat(store);
    // No grantGraceToken — silence should resolve to major_slip.

    const { checkIns } = closeDayAtDeadline(store, "chat-1", "2026-07-22");
    expect(checkIns[0]?.status).toBe("major_slip");
    expect(checkIns[0]?.spentGraceToken).toBe(false);

    const now = new Date("2026-07-22T22:00:00Z");
    const corrected = correctCheckIn(store, "chat-1", "amy", "2026-07-22", "sober", now);

    expect(corrected.status).toBe("sober");
    expect(corrected.spentGraceToken).toBe(false);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(false);
  });

  test("correcting to slip re-resolves Grace Token rules (no refund on slip-to-slip)", async () => {
    const store = await freshStore();
    await setUpClosedDayChat(store);
    grantGraceToken(store, "chat-1", "amy");

    closeDayAtDeadline(store, "chat-1", "2026-07-22"); // minor_slip, token spent
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(false);

    const now = new Date("2026-07-22T22:00:00Z");
    const corrected = correctCheckIn(store, "chat-1", "amy", "2026-07-22", "slip", now);

    // No token available this time → major_slip, still no refund.
    expect(corrected.status).toBe("major_slip");
    expect(corrected.spentGraceToken).toBe(false);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(false);
  });

  test("rejects correction on an open Day (use recordCheckIn/T14 instead)", async () => {
    const store = await freshStore();
    await setUpClosedDayChat(store);
    ensureOpenDay(store, "chat-1", "2026-07-22");
    // No Day close — still open.

    const now = new Date("2026-07-22T12:00:00Z");
    expect(() =>
      correctCheckIn(store, "chat-1", "amy", "2026-07-22", "sober", now),
    ).toThrow(LateFixNotAllowedError);
  });

  test("rejects correction past the late-fix fence (next Reminder already reached)", async () => {
    const store = await freshStore();
    await setUpClosedDayChat(store);
    grantGraceToken(store, "chat-1", "amy");
    closeDayAtDeadline(store, "chat-1", "2026-07-22");

    const pastFence = new Date("2026-07-23T09:00:00Z"); // exactly the next Reminder
    expect(() =>
      correctCheckIn(store, "chat-1", "amy", "2026-07-22", "sober", pastFence),
    ).toThrow(LateFixNotAllowedError);

    // No mutation on the rejected attempt.
    const stored = getCheckIn(store, "chat-1", "amy", "2026-07-22");
    expect(stored?.status).toBe("minor_slip");
    expect(stored?.spentGraceToken).toBe(true);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(false);
  });

  test("rejects correction on a Day that was never opened", async () => {
    const store = await freshStore();
    await setUpClosedDayChat(store);

    const now = new Date("2026-07-22T12:00:00Z");
    expect(() =>
      correctCheckIn(store, "chat-1", "amy", "2026-07-22", "sober", now),
    ).toThrow(LateFixNotAllowedError);
  });

  test("rejects when no Check-in row exists yet for the closed Day", async () => {
    const store = await freshStore();
    await setUpClosedDayChat(store);
    ensureOpenDay(store, "chat-1", "2026-07-22");
    closeDay(store, "chat-1", "2026-07-22"); // closed, but amy never checked in

    const now = new Date("2026-07-22T22:00:00Z");
    expect(() =>
      correctCheckIn(store, "chat-1", "amy", "2026-07-22", "sober", now),
    ).toThrow(CheckInNotFoundError);
  });

  test("rejects correction from a member not on the Checklist", async () => {
    const store = await freshStore();
    await setUpClosedDayChat(store);
    closeDayAtDeadline(store, "chat-1", "2026-07-22");

    const now = new Date("2026-07-22T22:00:00Z");
    expect(() =>
      correctCheckIn(store, "chat-1", "stranger", "2026-07-22", "sober", now),
    ).toThrow(NotOnChecklistError);
  });

  test("rejects blank chatId, memberId, or dayKey", async () => {
    const store = await freshStore();
    expect(() =>
      correctCheckIn(store, "  ", "amy", "2026-07-22", "sober"),
    ).toThrow();
    expect(() =>
      correctCheckIn(store, "chat-1", "  ", "2026-07-22", "sober"),
    ).toThrow();
    expect(() =>
      correctCheckIn(store, "chat-1", "amy", "  ", "sober"),
    ).toThrow();
  });
});

/**
 * T17.3 — adds the reject-after-fence depth T17.2's own tests don't yet
 * have, exercised through {@link correctCheckIn} (not just the pure
 * {@link isLateFixAllowed} helper T17.1 already covers). This is
 * additive, not a T16.4-style full re-walk of the same-verb matrix:
 * exact-at-fence and open-Day rejection are already covered by T17.2's
 * "rejects correction past the late-fix fence" / "rejects correction on
 * an open Day" tests above and are intentionally not duplicated here.
 * New here: the overnight-Deadline-Day shape through `correctCheckIn`
 * (T17.2's tests only used same-calendar settings), and a
 * sustained-past-fence check (well after, not just the boundary
 * instant) so the reject isn't only a boundary-flicker artifact. No
 * production gap surfaced: `correctCheckIn`'s gate 3 already delegates
 * straight to `isLateFixAllowed`, so the strict-`<` fence, the
 * overnight-vs-same-calendar derivation, and the no-mutation-before-
 * throw ordering were already correct (see latefix.ts module doc
 * "Reject cases").
 */
describe("T17.3 — reject after late-fix fence (correctCheckIn)", () => {
  const { freshStore } = useMigratedStore();

  async function setUpClosedSlipDay(
    store: Store,
    settings: { reminderTime: string; deadlineTime: string },
  ): Promise<void> {
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", { timezone: "UTC", ...settings });
    joinChecklist(store, "chat-1", "amy");
    grantGraceToken(store, "chat-1", "amy");
    closeDayAtDeadline(store, "chat-1", "2026-07-22"); // silent → minor_slip, token spent
  }

  test("same-calendar: now well after next Reminder → rejected, no mutation (past the boundary instant T17.2 already covers)", async () => {
    const store = await freshStore();
    await setUpClosedSlipDay(store, { reminderTime: "09:00", deadlineTime: "21:00" });
    const before = getCheckIn(store, "chat-1", "amy", "2026-07-22");

    const wellAfter = new Date("2026-07-25T12:00:00Z"); // days past the fence
    expect(() =>
      correctCheckIn(store, "chat-1", "amy", "2026-07-22", "sober", wellAfter),
    ).toThrow(LateFixNotAllowedError);

    expect(getCheckIn(store, "chat-1", "amy", "2026-07-22")).toEqual(before);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(false);
  });

  test("overnight Deadline Day (ADR 0002 shape): late fix still OK right after the overnight close", async () => {
    const store = await freshStore();
    await setUpClosedSlipDay(store, { reminderTime: "21:00", deadlineTime: "01:00" });

    const rightAfterClose = new Date("2026-07-23T01:00:01Z"); // just past the overnight Deadline
    const corrected = correctCheckIn(
      store,
      "chat-1",
      "amy",
      "2026-07-22",
      "sober",
      rightAfterClose,
    );

    expect(corrected.status).toBe("sober");
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(true); // refunded
  });

  test("overnight Deadline Day (ADR 0002 shape): rejected once that Day's next Reminder has passed, no mutation", async () => {
    const store = await freshStore();
    await setUpClosedSlipDay(store, { reminderTime: "21:00", deadlineTime: "01:00" });
    const before = getCheckIn(store, "chat-1", "amy", "2026-07-22");

    const atNextReminder = new Date("2026-07-23T21:00:00Z"); // that Day's next Reminder
    expect(() =>
      correctCheckIn(store, "chat-1", "amy", "2026-07-22", "sober", atNextReminder),
    ).toThrow(LateFixNotAllowedError);

    expect(getCheckIn(store, "chat-1", "amy", "2026-07-22")).toEqual(before);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(false);
  });
});

/**
 * T17.4 — theme close-out. T17.1–T17.3 above already cover fence
 * helpers, correctCheckIn write/refund, and reject-after-fence depth
 * (Standards pushed back on re-cloning that matrix in T17.3). This
 * block only closes Done-when gaps at the product seams the board
 * names: (1) `closeDayAtDeadline` auto-slip → late sober
 * `correctCheckIn` refunds when the auto-slip spent a token, and the
 * Day stays closed; (2) open Day ordinary Check-in still goes through
 * T14 `recordCheckIn` (succeeds) while `correctCheckIn` is rejected —
 * proving the late-fix verb is not the open-Day path. The
 * "correction after next Reminder rejected, no mutation" cell is
 * intentionally not re-walked here — T17.2's exact-at-fence + T17.3's
 * well-after/overnight `correctCheckIn` rejects already lock it
 * end-to-end (same skip pattern as T16.4's empty-Checklist cell).
 */
describe("T17.4 — late-fix close-out matrix", () => {
  const { freshStore } = useMigratedStore();

  test("auto-slip (Deadline, token spent) → sober correctCheckIn refunds; Day stays closed", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    joinChecklist(store, "chat-1", "amy");
    grantGraceToken(store, "chat-1", "amy");

    const { checkIns, day } = closeDayAtDeadline(store, "chat-1", "2026-07-22");
    expect(day.status).toBe("closed");
    expect(checkIns).toHaveLength(1);
    expect(checkIns[0]?.status).toBe("minor_slip");
    expect(checkIns[0]?.spentGraceToken).toBe(true);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(false);

    const now = new Date("2026-07-22T22:00:00Z"); // after Deadline, before next Reminder
    const corrected = correctCheckIn(
      store,
      "chat-1",
      "amy",
      "2026-07-22",
      "sober",
      now,
    );

    expect(corrected.status).toBe("sober");
    expect(corrected.spentGraceToken).toBe(false);
    expect(hasGraceToken(store, "chat-1", "amy")).toBe(true);
    expect(getCheckIn(store, "chat-1", "amy", "2026-07-22")?.status).toBe(
      "sober",
    );
    // Late fix must not reopen the Day — ordinary open-Day writes stay T14.
    expect(getDay(store, "chat-1", "2026-07-22")?.status).toBe("closed");
  });

  test("open Day: ordinary record still via T14 recordCheckIn; correctCheckIn rejected", async () => {
    const store = await freshStore();
    getOrCreateChat(store, "chat-1");
    updateSettings(store, "chat-1", {
      timezone: "UTC",
      reminderTime: "09:00",
      deadlineTime: "21:00",
    });
    joinChecklist(store, "chat-1", "amy");
    ensureOpenDay(store, "chat-1", "2026-07-22");

    const now = new Date("2026-07-22T12:00:00Z");
    const recorded = recordCheckIn(store, "chat-1", "amy", "2026-07-22", "sober");
    expect(recorded.status).toBe("sober");
    expect(getDay(store, "chat-1", "2026-07-22")?.status).toBe("open");

    try {
      correctCheckIn(store, "chat-1", "amy", "2026-07-22", "slip", now);
      expect.unreachable("correctCheckIn should reject on an open Day");
    } catch (err) {
      expect(err).toBeInstanceOf(LateFixNotAllowedError);
      expect((err as LateFixNotAllowedError).reason).toBe("day-open");
    }

    // Reject left the T14 row and Day status untouched.
    expect(getCheckIn(store, "chat-1", "amy", "2026-07-22")).toEqual(recorded);
    expect(getDay(store, "chat-1", "2026-07-22")?.status).toBe("open");
  });
});
