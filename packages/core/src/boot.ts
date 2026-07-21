/**
 * Foundation boot entry (T6.1): config → openStore → migrate → log → close → exit 0.
 * Root script wiring is T6.2 (`bun run boot`).
 */
import { loadFoundationConfig } from "./config.ts";
import { migrate } from "./migrate.ts";
import { openStore } from "./store.ts";

export async function boot(
  env: Record<string, string | undefined> = Bun.env,
): Promise<void> {
  const config = loadFoundationConfig(env);
  const store = await openStore(config.databasePath);
  try {
    migrate(store);
    console.log(
      `sobrina boot ok database=${config.databasePath} migrations=applied`,
    );
  } finally {
    store.close();
  }
}

if (import.meta.main) {
  boot().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
