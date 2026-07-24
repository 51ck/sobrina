# T1 — Bun workspace monorepo

Status: resolved

**Problem:** Without a workspace layout, later boards have nowhere safe to put core vs adapter code.

**Done when:** `packages/core` and `packages/telegram` are Bun workspace packages named `@sobri/core` and `@sobri/telegram`; root can install with Bun; telegram may declare a dependency on core; no product domain logic yet.

**Depends on:** none

**Spec / arch links:** [tech/architecture.md](../../../tech/architecture.md) (Phase 1 module layout)

**Out of scope:** Mastra agent, Grammy bot, schema tables for Days/Check-ins, Docker

**Tasks:**

- [x] **T1.1** Root `package.json`: private workspaces `packages/*`, `"type": "module"`, placeholder root scripts
- [x] **T1.2** `packages/core`: `@sobri/core` package.json + minimal `src/index.ts` export stub
- [x] **T1.3** `packages/telegram`: `@sobri/telegram` package.json depending on `@sobri/core` + minimal `src/index.ts` stub
- [x] **T1.4** Root README status line: monorepo scaffold exists; point to `tech/` for architecture/tickets (no product rewrite)
- [x] **T1.5** `bun install` succeeds on a clean checkout; `bun.lock` committed
