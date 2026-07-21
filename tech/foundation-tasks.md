# Foundation — ticket board

Board under the [in-repo ticket system](tickets.md). Phase 1 MVP scaffold before domain verbs or live Telegram. Spec: [roadmap.md](../spec/roadmap.md) Phase 1. Arch: [architecture.md](architecture.md).

## Why

No application packages exist yet. Before Check-in verbs, Session hub, or Grammy can land, the repo needs a Bun workspace, shared TypeScript baseline, lint/typecheck gate, env naming, SQLite ownership in `@sobrina/core`, and a process that boots cleanly. This board is that scaffold only.

## Themes

1. **Bun workspace monorepo** — root + `@sobrina/core` + `@sobrina/telegram` packages exist
2. **Shared TypeScript baseline** — base tsconfig and package scripts typecheck
3. **Lint and typecheck gate** — `bun run lint` / `bun run typecheck` from root; optional pre-commit
4. **Env naming and config load** — documented names, example file, fail-fast load
5. **SQLite store shell** — core owns DB path, connection, migration runner skeleton
6. **Runnable process boot** — one entry opens config + DB and exits/stays healthy without product features

---

## T1 — Bun workspace monorepo

**Problem:** Without a workspace layout, later boards have nowhere safe to put core vs adapter code.

**Done when:** `packages/core` and `packages/telegram` are Bun workspace packages named `@sobrina/core` and `@sobrina/telegram`; root can install with Bun; telegram may declare a dependency on core; no product domain logic yet.

**Depends on:** none

**Spec / arch links:** [architecture.md](architecture.md) (Phase 1 module layout), [tech/AGENTS.md](AGENTS.md)

**Out of scope:** Mastra agent, Grammy bot, schema tables for Days/Check-ins, Docker

**Tasks:**

- [x] **T1.1** Root `package.json`: private workspaces `packages/*`, `"type": "module"`, placeholder root scripts
- [x] **T1.2** `packages/core`: `@sobrina/core` package.json + minimal `src/index.ts` export stub
- [x] **T1.3** `packages/telegram`: `@sobrina/telegram` package.json depending on `@sobrina/core` + minimal `src/index.ts` stub
- [x] **T1.4** Root README status line: monorepo scaffold exists; point to `tech/` for architecture/tickets (no product rewrite)
- [ ] **T1.5** `bun install` succeeds on a clean checkout; `bun.lock` committed

---

## T2 — Shared TypeScript baseline

**Problem:** Packages need one TypeScript baseline so typecheck is uniform before real code lands.

**Done when:** Base tsconfig exists; both packages extend it; `bun run typecheck` typechecks all workspace packages with zero errors on stubs.

**Depends on:** T1

**Spec / arch links:** [architecture.md](architecture.md) (Tooling)

**Out of scope:** Strict domain types for Check-in/Day, path aliases beyond what stubs need

**Tasks:**

- [ ] **T2.1** Root `tsconfig.base.json` (strict baseline, ESM-friendly) shared by packages
- [ ] **T2.2** Per-package `tsconfig.json` extending base; include only that package’s `src`
- [ ] **T2.3** Each package `typecheck` script (`tsc --noEmit`); root `typecheck` runs all via Bun filter/workspaces
- [ ] **T2.4** Verify stub packages typecheck clean after T1 stubs

---

## T3 — Lint and typecheck gate

**Problem:** Agents need a single, local verification command before marking slices done.

**Done when:** From repo root, `bun run lint` and `bun run typecheck` succeed on the scaffold; contributors know the gate (README or tech note one-liner). Optional: git hooks path runs both.

**Depends on:** T2

**Spec / arch links:** [architecture.md](architecture.md) (Tooling), [tickets.md](tickets.md) (agent loop verify step)

**Out of scope:** CI cloud pipeline, format wars beyond one linter choice

**Tasks:**

- [ ] **T3.1** Add **oxlint** as root/dev dependency; `bun run lint` runs oxlint on `packages`
- [ ] **T3.2** Lint clean on current stubs; document `bun run lint` + `bun run typecheck` as the local gate
- [ ] **T3.3** Optional `.githooks`: pre-commit runs lint + typecheck; root `prepare` enables hooksPath when desired. Closeout: optional — leave `[ ]` until chosen, or mark cancelled per [tickets.md](tickets.md) if skipped
- [ ] **T3.4** Tiny intentional lint/type smoke: confirm scripts fail on a deliberate break, then revert (do not leave breakage)

---

## T4 — Env naming and config load

**Problem:** Boot and later boards need stable env **names** without committing secrets.

**Done when:** `.env.example` lists Phase 1 foundation names; `@sobrina/core` (or thin shared config module in core) loads and validates required vars; missing required vars fail with a clear error; no secrets in git.

**Depends on:** T1

**Spec / arch links:** [architecture.md](architecture.md) (Env / secrets), [spec/telegram-ux.md](../spec/telegram-ux.md) (install/settings — names only here)

**Out of scope:** Live Telegram token usage, model calls, `/settings` UI, real Reminder schedule values

**Suggested names (lock in `.env.example` during this theme):**

| Name | Required for foundation boot? | Purpose |
|------|-------------------------------|---------|
| `DATABASE_PATH` | yes | SQLite file path |
| `TELEGRAM_BOT_TOKEN` | no for T4/T5 DB boot; yes before live bot | Grammy |
| `MODEL_ID` | no until agent board | Mastra model |
| Provider API key(s) | no until agent board | Model provider |
| Bot admin allowlist | no until settings | Env bot admins |

**Tasks:**

- [ ] **T4.1** `.env.example` with names only (empty values / placeholders); ensure `.env` gitignored
- [ ] **T4.2** Core config module: read `DATABASE_PATH` (and any other foundation-required names); typed result
- [ ] **T4.3** Fail fast with actionable message when required foundation env missing
- [ ] **T4.4** Document optional vs required names for foundation vs later boards (short comment in `.env.example` or config module)

---

## T5 — SQLite store shell in core

**Problem:** Core must own persistence before ledger verbs exist; need a migration-ready shell, not domain tables yet.

**Done when:** `@sobrina/core` opens SQLite at `DATABASE_PATH`, runs a versioned migration runner, applies a minimal schema_migrations (or equivalent) table, and exposes `openStore(path)` / `close` for boot. No Check-in/Day product tables yet.

**Depends on:** T1, T4

**Spec / arch links:** [architecture.md](architecture.md) (SQLite ownership), [spec/roadmap.md](../spec/roadmap.md) (clean-slate; no V1 import)

**Out of scope:** Days, Check-ins, Checklist, Grace Token, Profile/Diary tables (Phase 2); sushkobot import; multi-process writers

**Tasks:**

- [ ] **T5.1** Choose SQLite access approach for Bun (document choice in a short code comment or `packages/core` note); add dependency on `@sobrina/core` only
- [ ] **T5.2** `openStore(path)`: create parent dir if needed; open file; basic pragma hygiene (e.g. foreign_keys on) as appropriate; pair with `close`
- [ ] **T5.3** Migration runner skeleton on the store from `openStore`: ordered migrations list + applied-versions table
- [ ] **T5.4** Migration `001`: empty product schema placeholder + runner metadata only (or no-op product tables) — prove migrate-up works
- [ ] **T5.5** Unit/smoke test: temp DB path → `openStore` → migrate → versions table present → `close` (`bun test` in core)

---

## T6 — Runnable process boot

**Problem:** Need a single local command that proves config + DB path work before domain or Telegram boards start.

**Done when:** Root script (e.g. `bun run boot` or `bun run packages/core/...`) loads config, opens SQLite, runs migrations, logs a one-line healthy boot, and exits 0 (or stays up with a no-op idle — prefer exit 0 for foundation). Telegram package not required to listen yet.

**Depends on:** T3 (verify gate), T4, T5

**Spec / arch links:** [architecture.md](architecture.md) (module layout, SQLite ownership)

**Out of scope:** Grammy long polling/webhook, Mastra agent start, Reminder scheduler loop, Docker Compose

**Tasks:**

- [ ] **T6.1** Core boot entry (`packages/core/src/boot.ts` or equivalent): config → `openStore` → migrate → log success → `close` → exit 0
- [ ] **T6.2** Root package script wiring the boot entry
- [ ] **T6.3** Manual verify steps in board or README: copy `.env.example` → set `DATABASE_PATH` → `bun run boot` succeeds
- [ ] **T6.4** Boot fails clearly when `DATABASE_PATH` unset (integrates T4.3)

---

## Suggested build order

```text
T1.1 → T1.2 → T1.3 → T1.5 → T1.4
  → T2.1 → T2.2 → T2.3 → T2.4
  → T3.1 → T3.2 → T3.3 → T3.4
  → T4.1 → T4.2 → T4.3 → T4.4
  → T5.1 → T5.2 → T5.3 → T5.4 → T5.5
  → T6.1 → T6.2 → T6.3 → T6.4
```

Parallelism note: T4 can start after T1 (before T3 finishes) if needed; T5 must wait for T4; T6 waits for T5 + T3.

## Non-goals

- Product durable verbs (Check-in, Deadline, Grace Token, Checklist)
- Session hub / idle timeout / Mastra agent loop
- Live Grammy group bot or `/settings`
- Day / Check-in / memory schema
- Deploy, GHCR, Docker Compose
- sushkobot V1 database import
- core-tasks / telegram-tasks / agent-tasks boards (written after this board is reviewed)

## Related

- Process: [tickets.md](tickets.md)
- Architecture: [architecture.md](architecture.md)
- Roadmap Phase 1: [spec/roadmap.md](../spec/roadmap.md)
- DOX: [AGENTS.md](AGENTS.md)
