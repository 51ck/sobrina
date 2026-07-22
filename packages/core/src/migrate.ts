import type { Database } from "bun:sqlite";
import type { Store } from "./store.ts";

/** Ordered migration unit. IDs are stable version keys (e.g. `001`). */
export type Migration = {
  readonly id: string;
  up(db: Database): void;
};

/**
 * Migration list (T5.3 skeleton; T5.4 adds `001`).
 * Keep ordered: runner applies pending IDs in array order.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    id: "001",
    up(db) {
      // Placeholder only — Days/Check-ins/etc. land on later boards.
      db.exec(`
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`);
      db.query(
        "INSERT INTO schema_meta (key, value) VALUES (?, ?)",
      ).run("product_schema", "001-empty");
    },
  },
  {
    // T10.1 — chats (stable core chat id) + chat_settings (Reminder, Deadline,
    // timezone, Grace Token N). See tech/core-tasks.md T10.1, spec/daily-rhythm.md
    // Settings table, CONTEXT.md Grace Token (N default 3).
    id: "002",
    up(db) {
      db.exec(`
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_settings (
  chat_id TEXT PRIMARY KEY NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  reminder_time TEXT,
  deadline_time TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  grace_token_n INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
    },
  },
  {
    // T10.2 — Checklist membership (chat + member). See tech/core-tasks.md T10.2,
    // spec/checklist.md, CONTEXT.md Checklist.
    id: "003",
    up(db) {
      db.exec(`
CREATE TABLE IF NOT EXISTS checklist_members (
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  left_at TEXT,
  PRIMARY KEY (chat_id, member_id)
);
`);
    },
  },
  {
    // T10.3 — days (chat + Day key + open/closed). Day key = Reminder-cycle
    // evening date (ADR 0002). See tech/core-tasks.md T10.3, CONTEXT.md Day.
    id: "004",
    up(db) {
      db.exec(`
CREATE TABLE IF NOT EXISTS days (
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  reminder_at TEXT,
  deadline_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT,
  PRIMARY KEY (chat_id, day_key)
);
`);
    },
  },
];

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function ensureMigrationsTable(db: Database): void {
  db.exec(MIGRATIONS_TABLE);
}

function isApplied(db: Database, id: string): boolean {
  const row = db
    .query("SELECT 1 AS ok FROM schema_migrations WHERE id = ?")
    .get(id) as { ok: number } | null;
  return row !== null;
}

function recordApplied(db: Database, id: string): void {
  db.query("INSERT INTO schema_migrations (id) VALUES (?)").run(id);
}

/**
 * Apply pending migrations in order. Creates `schema_migrations` if needed.
 * Idempotent: already-applied IDs are skipped.
 */
export function migrate(store: Store): void {
  const { db } = store;
  ensureMigrationsTable(db);
  for (const migration of MIGRATIONS) {
    if (isApplied(db, migration.id)) continue;
    const run = db.transaction(() => {
      migration.up(db);
      recordApplied(db, migration.id);
    });
    run();
  }
}
