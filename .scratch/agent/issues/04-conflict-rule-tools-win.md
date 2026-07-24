# T53 — Conflict rule (tools win)

Status: ready-for-agent

**Problem:** Narrative must not override ledger/tool results.

**Done when:** Prompt + turn policy state conflict rule from [agent.md](../../../spec/agent.md); agent instructed to call tools before asserting Check-in/streak/заморозка facts; test or eval fixture shows assistant does not claim a status without a tool result in the turn trace (lightweight).

**Depends on:** T51 ([02-character-and-authority-prompts.md](02-character-and-authority-prompts.md)), T52 ([03-session-turn-loop-tools.md](03-session-turn-loop-tools.md))

**Spec / arch links:** [spec/agent.md](../../../spec/agent.md) (Conflict rule), [spec/stats.md](../../../spec/stats.md), [spec/character.md](../../../spec/character.md)

**Out of scope:** Perfect jailbreak resistance; re-coding streak walk in the prompt

**Tasks:**

- [ ] **T53.1** Prompt clause: ledger and tool results win over guess/narrative
- [ ] **T53.2** Prompt clause: do not bypass Grace Token / status rules; never invent numbers
- [ ] **T53.3** Fixture/smoke: turn that answers "какой у меня streak?" must call `fullStats` (or equivalent) before numeric claim — or refuse if tools unavailable
