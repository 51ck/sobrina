/**
 * SQLite store shell (T5) — open/close in T5.2; migrations in T5.3+.
 *
 * Access choice (T5.1): Bun built-in `bun:sqlite` (`Database`).
 * - Zero npm SQLite driver; stays on `@sobrina/core` only
 * - Rejected for now: `better-sqlite3` (Node native), remote libsql clients
 */
import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export const SQLITE_ACCESS = "bun:sqlite" as const;

export type Store = {
  readonly path: string;
  readonly db: Database;
  close(): void;
};

/**
 * Open SQLite at `path`: create parent dirs if needed, enable foreign_keys.
 * Caller must `close()` when done.
 */
export async function openStore(path: string): Promise<Store> {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error("openStore: path must be non-empty");
  }
  if (trimmed !== ":memory:") {
    await mkdir(dirname(trimmed), { recursive: true });
  }
  const db = new Database(trimmed, { create: true });
  db.exec("PRAGMA foreign_keys = ON;");
  return {
    path: trimmed,
    db,
    close() {
      db.close();
    },
  };
}
