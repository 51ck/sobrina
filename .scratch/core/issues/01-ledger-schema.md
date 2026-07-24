# T10 — Ledger schema (no memory tables)

Status: resolved

**Problem:** Durable verbs need SQLite tables for chats, settings, Checklist, Days, Check-ins, and Grace Token state — still no Profile/Diary.

**Done when:** Migrations after foundation shell create the Phase 1 ledger tables; `openStore` + migrate on a temp DB succeeds; no Profile/Diary columns/tables.

**Depends on:** foundation T5 (`openStore` / migrations), T6 boot path usable for migrate

**Spec / arch links:** [architecture.md](../../../tech/architecture.md) (SQLite ownership; Profile/Diary Phase 2), [CONTEXT.md](../../../CONTEXT.md), [spec/stats.md](../../../spec/stats.md), [spec/checklist.md](../../../spec/checklist.md), [spec/daily-rhythm.md](../../../spec/daily-rhythm.md)

**Out of scope:** Profile/Diary schema; Grammy id mapping tables beyond a thin `chat_id` / `member_id` opaque string; sushkobot import

**Tasks:**

- [x] **T10.1** Migration: `chats` (stable core chat id) + chat settings columns/table (Reminder time, Deadline time, timezone, N; N default **3**)
- [x] **T10.2** Migration: Checklist membership (chat + member; join/leave timestamps as needed)
- [x] **T10.3** Migration: `days` (chat + Day key date + open/closed + Reminder/Deadline cycle metadata as needed)
- [x] **T10.4** Migration: `check_ins` (chat, member, Day key, status `sober` | `minor_slip` | `major_slip`, token-spend flag for refund)
- [x] **T10.5** Migration: Grace Token state per Checklist member (cap 1; present/absent) — or equivalent columns documented in schema
- [x] **T10.6** Tests: migrate fresh DB → expected tables exist; no memory tables
