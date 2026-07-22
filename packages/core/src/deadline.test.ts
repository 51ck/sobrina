import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { joinChecklist, leaveChecklist } from "./checklist.ts";
import { recordCheckIn } from "./checkin.ts";
import { listSilentChecklistMembers } from "./deadline.ts";
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
