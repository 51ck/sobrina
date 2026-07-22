import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate, MIGRATIONS } from "./migrate.ts";
import { openStore, type Store } from "./store.ts";

describe("openStore + migrate", () => {
  let dir: string;
  let store: Store | undefined;

  afterEach(() => {
    store?.close();
    store = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  test("temp path → openStore → migrate → versions present → close", async () => {
    dir = mkdtempSync(join(tmpdir(), "sobri-store-"));
    const path = join(dir, "nested", "test.db");
    store = await openStore(path);
    migrate(store);

    const versions = store.db
      .query("SELECT id FROM schema_migrations ORDER BY id")
      .all() as Array<{ id: string }>;
    expect(versions.map((r) => r.id)).toEqual(
      MIGRATIONS.map((m) => m.id).sort(),
    );

    const meta = store.db
      .query("SELECT value FROM schema_meta WHERE key = ?")
      .get("product_schema") as { value: string } | null;
    expect(meta?.value).toBe("001-empty");

    migrate(store);
    const again = store.db
      .query("SELECT COUNT(*) AS n FROM schema_migrations")
      .get() as { n: number };
    expect(again.n).toBe(MIGRATIONS.length);

    store.close();
    store = undefined;
  });
});
