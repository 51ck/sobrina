# T5 — SQLite store shell in core

Status: resolved

**Problem:** Core must own persistence before ledger verbs exist; need a migration-ready shell, not domain tables yet.

**Done when:** `@sobri/core` opens SQLite at `DATABASE_PATH`, runs a versioned migration runner, applies a minimal schema_migrations (or equivalent) table, and exposes `openStore(path)` / `close` for boot. No Check-in/Day product tables yet.

**Depends on:** T1 ([01-bun-workspace-monorepo.md](01-bun-workspace-monorepo.md)), T4 ([04-env-naming-and-config-load.md](04-env-naming-and-config-load.md))

**Spec / arch links:** [tech/architecture.md](../../../tech/architecture.md) (SQLite ownership), [spec/roadmap.md](../../../spec/roadmap.md) (clean-slate; no V1 import)

**Out of scope:** Days, Check-ins, Checklist, Grace Token, Profile/Diary tables (Phase 2); sushkobot import; multi-process writers

**Tasks:**

- [x] **T5.1** Choose SQLite access approach for Bun (document choice in a short code comment or `packages/core` note); add dependency on `@sobri/core` only
- [x] **T5.2** `openStore(path)`: create parent dir if needed; open file; basic pragma hygiene (e.g. foreign_keys on) as appropriate; pair with `close`
- [x] **T5.3** Migration runner skeleton on the store from `openStore`: ordered migrations list + applied-versions table
- [x] **T5.4** Migration `001`: empty product schema placeholder + runner metadata only (or no-op product tables) — prove migrate-up works
- [x] **T5.5** Unit/smoke test: temp DB path → `openStore` → migrate → versions table present → `close` (`bun test` in core)
