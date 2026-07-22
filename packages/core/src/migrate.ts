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
  {
    // T10.4 — check_ins (chat, member, Day key, status, token-spend flag).
    // Statuses: sober | minor_slip | major_slip only (CONTEXT.md Check-in).
    // See tech/core-tasks.md T10.4, spec/stats.md.
    id: "005",
    up(db) {
      db.exec(`
CREATE TABLE IF NOT EXISTS check_ins (
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  day_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sober', 'minor_slip', 'major_slip')),
  spent_grace_token INTEGER NOT NULL DEFAULT 0 CHECK (spent_grace_token IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, member_id, day_key),
  FOREIGN KEY (chat_id, day_key) REFERENCES days(chat_id, day_key) ON DELETE CASCADE
);
`);
    },
  },
  {
    // T10.5 — Grace Token state per Checklist member (cap 1 = present 0|1).
    // See tech/core-tasks.md T10.5, ADR 0001, CONTEXT.md Grace Token.
    id: "006",
    up(db) {
      db.exec(`
CREATE TABLE IF NOT EXISTS grace_tokens (
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  present INTEGER NOT NULL DEFAULT 0 CHECK (present IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, member_id)
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
