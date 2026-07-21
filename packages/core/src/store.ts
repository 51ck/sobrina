/**
 * SQLite store shell (T5) — opens in T5.2+.
 *
 * Access choice (T5.1): Bun built-in `bun:sqlite` (`Database`).
 * - Zero npm SQLite driver; stays on `@sobrina/core` only
 * - Rejected for now: `better-sqlite3` (Node native), remote libsql clients
 */
export const SQLITE_ACCESS = "bun:sqlite" as const;
