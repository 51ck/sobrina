# T50 — Mastra agent bootstrap

Status: ready-for-agent

**Problem:** Agent runtime must live in `@sobri/core` with model env, not in the Grammy package.

**Done when:** Mastra agent (or equivalent Mastra agent construct) constructed in core; reads `MODEL_ID` + provider key(s) from env; fails clearly if required model env missing when generate is invoked; no Telegram imports in agent module.

**Depends on:** foundation T4 (env names) ([../foundation/issues/04-env-naming-and-config-load.md](../../foundation/issues/04-env-naming-and-config-load.md)); core package from foundation T1

**Spec / arch links:** [architecture.md](../../../tech/architecture.md) (Mastra placement; Models), [spec/agent.md](../../../spec/agent.md)

**Out of scope:** Grammy; character prose (T51); tool list completeness (core T24 + T52)

**Tasks:**

- [ ] **T50.1** Add Mastra dependency to `@sobri/core`; agent module path documented
- [ ] **T50.2** Wire `MODEL_ID` + provider API key env into model router
- [ ] **T50.3** `createSobriAgent(...)` (name may vary) factory with empty/minimal instructions stub
- [ ] **T50.4** Fail-fast or clear error when model env missing on first generate
- [ ] **T50.5** Assert agent package graph: no `@sobri/telegram` / grammy import from agent module
