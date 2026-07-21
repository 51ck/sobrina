/** Foundation env load — names from `.env.example` / tech/foundation-tasks T4. */

export type FoundationConfig = {
  /** Absolute or relative SQLite path (`DATABASE_PATH`). */
  databasePath: string;
};

/**
 * Read foundation-required env into a typed config.
 * Required today: `DATABASE_PATH` only (telegram/model keys later).
 * Pass `Bun.env` or `process.env` from the boot entry.
 */
export function loadFoundationConfig(
  env: Record<string, string | undefined>,
): FoundationConfig {
  const databasePath = env["DATABASE_PATH"]?.trim();
  if (!databasePath) {
    throw new Error(
      "Missing required env DATABASE_PATH. Copy .env.example to .env and set DATABASE_PATH to the SQLite file path.",
    );
  }
  return { databasePath };
}
