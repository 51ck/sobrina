# T3 — Lint and typecheck gate

Status: resolved

**Problem:** Agents need a single, local verification command before marking slices done.

**Done when:** From repo root, `bun run lint` and `bun run typecheck` succeed on the scaffold; contributors know the gate (README or tech note one-liner). Optional: git hooks path runs both.

**Depends on:** T2 ([02-shared-typescript-baseline.md](02-shared-typescript-baseline.md))

**Spec / arch links:** [tech/architecture.md](../../../tech/architecture.md) (Tooling)

**Out of scope:** CI cloud pipeline, format wars beyond one linter choice

**Tasks:**

- [x] **T3.1** Add **oxlint** as root/dev dependency; `bun run lint` runs oxlint on `packages`
- [x] **T3.2** Lint clean on current stubs; document `bun run lint` + `bun run typecheck` as the local gate
- [x] **T3.3** Optional `.githooks`: pre-commit runs lint + typecheck; root `prepare` enables hooksPath when desired
- [x] **T3.4** Tiny intentional lint/type smoke: confirm scripts fail on a deliberate break, then revert (do not leave breakage)
