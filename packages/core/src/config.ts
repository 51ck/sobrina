/** Foundation env load — names from `.env.example` / tech/foundation-tasks T4. */

export type FoundationConfig = {
  /** Absolute or relative SQLite path (`DATABASE_PATH`). */
  databasePath: string;
};

/** Thrown when a foundation-required env name is missing or blank. */
export class MissingFoundationEnvError extends Error {
  override readonly name = "MissingFoundationEnvError";

  constructor(readonly envName: string) {
    super(
      `Missing required env ${envName}. Copy .env.example to .env and set ${envName} to a non-empty value (see tech/foundation-tasks.md T4).`,
    );
  }
}

/**
 * Read foundation-required env into a typed config.
 * Required today: `DATABASE_PATH` only (telegram/model keys later).
 * Pass `Bun.env` or `process.env` from the boot entry.
 * Fail-fast: missing/blank required names throw {@link MissingFoundationEnvError}.
 */
export function loadFoundationConfig(
  env: Record<string, string | undefined>,
): FoundationConfig {
  const databasePath = env["DATABASE_PATH"]?.trim();
  if (!databasePath) {
    throw new MissingFoundationEnvError("DATABASE_PATH");
  }
  return { databasePath };
}
