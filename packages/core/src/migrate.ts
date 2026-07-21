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
