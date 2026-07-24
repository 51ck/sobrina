# T6 — Runnable process boot

Status: resolved

**Problem:** Need a single local command that proves config + DB path work before domain or Telegram boards start.

**Done when:** Root script (e.g. `bun run boot` or `bun run packages/core/...`) loads config, opens SQLite, runs migrations, logs a one-line healthy boot, and exits 0 (or stays up with a no-op idle — prefer exit 0 for foundation). Telegram package not required to listen yet.

**Depends on:** T3 (verify gate) ([03-lint-and-typecheck-gate.md](03-lint-and-typecheck-gate.md)), T4 ([04-env-naming-and-config-load.md](04-env-naming-and-config-load.md)), T5 ([05-sqlite-store-shell.md](05-sqlite-store-shell.md))

**Spec / arch links:** [tech/architecture.md](../../../tech/architecture.md) (module layout, SQLite ownership)

**Out of scope:** Grammy long polling/webhook, Mastra agent start, Reminder scheduler loop, Docker Compose

**Tasks:**

- [x] **T6.1** Core boot entry (`packages/core/src/boot.ts` or equivalent): config → `openStore` → migrate → log success → `close` → exit 0
- [x] **T6.2** Root package script wiring the boot entry
- [x] **T6.3** Manual verify steps in board or README: copy `.env.example` → set `DATABASE_PATH` → `bun run boot` succeeds
- [x] **T6.4** Boot fails clearly when `DATABASE_PATH` unset (integrates T4.3)
