# T2 — Shared TypeScript baseline

Status: resolved

**Problem:** Packages need one TypeScript baseline so typecheck is uniform before real code lands.

**Done when:** Base tsconfig exists; both packages extend it; `bun run typecheck` typechecks all workspace packages with zero errors on stubs.

**Depends on:** T1 ([01-bun-workspace-monorepo.md](01-bun-workspace-monorepo.md))

**Spec / arch links:** [tech/architecture.md](../../../tech/architecture.md) (Tooling)

**Out of scope:** Strict domain types for Check-in/Day, path aliases beyond what stubs need

**Tasks:**

- [x] **T2.1** Root `tsconfig.base.json` (strict baseline, ESM-friendly) shared by packages
- [x] **T2.2** Per-package `tsconfig.json` extending base; include only that package's `src`
- [x] **T2.3** Each package `typecheck` script (`tsc --noEmit`); root `typecheck` runs all via Bun filter/workspaces
- [x] **T2.4** Verify stub packages typecheck clean after T1 stubs
