# T4 — Env naming and config load

Status: resolved

**Problem:** Boot and later boards need stable env **names** without committing secrets.

**Done when:** `.env.example` lists Phase 1 foundation names; `@sobri/core` (or thin shared config module in core) loads and validates required vars; missing required vars fail with a clear error; no secrets in git.

**Depends on:** T1 ([01-bun-workspace-monorepo.md](01-bun-workspace-monorepo.md))

**Spec / arch links:** [tech/architecture.md](../../../tech/architecture.md) (Env / secrets), [spec/telegram-ux.md](../../../spec/telegram-ux.md) (install/settings — names only here)

**Out of scope:** Live Telegram token usage, model calls, `/settings` UI, real Reminder schedule values

**Names locked in `.env.example` during this theme:**

| Name | Required for foundation boot? | Purpose |
|------|-------------------------------|---------|
| `DATABASE_PATH` | yes | SQLite file path |
| `TELEGRAM_BOT_TOKEN` | no for T4/T5 DB boot; yes before live bot | Grammy |
| `MODEL_ID` | no until agent board | Mastra model |
| Provider API key(s) | no until agent board | Model provider |
| Bot admin allowlist | no until settings | Env bot admins |

**Tasks:**

- [x] **T4.1** `.env.example` with names only (empty values / placeholders); ensure `.env` gitignored
- [x] **T4.2** Core config module: read `DATABASE_PATH` (and any other foundation-required names); typed result
- [x] **T4.3** Fail fast with actionable message when required foundation env missing
- [x] **T4.4** Document optional vs required names for foundation vs later boards (short comment in `.env.example` or config module)
