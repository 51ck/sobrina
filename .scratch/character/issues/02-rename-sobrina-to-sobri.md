# T71 — Rename Sobrina → Sobri (expand–contract)

Status: resolved

**Problem:** Repo, packages, and docs still say Sobrina / `@sobrina/*` after product locks Sobri.

**Done when:** Human-facing product name is **Sobri**; workspace packages are `@sobri/core` and `@sobri/telegram` (or locked equivalent); README, architecture, boards, and code imports use new names; old `@sobrina/*` / Sobrina-person strings removed in contract step; `bun run lint` + `bun run typecheck` green after each migrate batch. GitHub repo rename out of scope unless asked later.

**Depends on:** T70 ([01-spec-character-sobri.md](01-spec-character-sobri.md))

**Spec / arch links:** [architecture.md](../../../tech/architecture.md), root README

**Out of scope:** GitHub org/repo rename; Telegram BotFather display-name ops; Character schema/UI (T25/T44); prompt prose (T61)

**Rename exceptions (post-contract, grep-gate-safe):** target names locked as `Sobri` / `@sobri/core` / `@sobri/telegram` / root `sobri`, no runtime alias used (packages are `private`, workspace-only, never published). The grep gate targets *live* `@sobrina/*` package refs and Sobrina-as-product/-person usage — not every substring "Sobrina" ever written. Historically exempt (not gate failures) while the legacy board still existed: this ticket's own text narrating the rename; the legacy board index entry; `CONTEXT.md`'s `_Avoid_: Sobrina as the agent person` glossary guidance.

**Tasks:**

- [x] **T71.1** Expand: document target names (`Sobri`, `@sobri/core`, `@sobri/telegram`); lock migration strategy (atomic batches, no runtime alias needed) so migrate batches stay green
- [x] **T71.2** Migrate package names + imports + root workspace scripts (batch; lint/typecheck green)
- [x] **T71.3** Migrate architecture, AGENTS, ticket boards, README, env docs strings Sobrina → Sobri / `@sobrina` → `@sobri`
- [x] **T71.4** Contract: remove aliases/old package names; grep gate no stale `@sobrina/` or Sobrina-as-product in owned trees
- [x] **T71.5** Smoke: clean install + lint + typecheck on renamed workspace
