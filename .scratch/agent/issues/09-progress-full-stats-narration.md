# T58 — Progress and full stats narration

Status: ready-for-agent

**Problem:** Progress questions must use tool-backed full stats; Antistreak only when asked or inside full stats delivery.

**Done when:** Agent calls `fullStats` (core T18/T24) before numbers; narrates Streak, заморозка есть/нет, Longest, totals as returned; includes Antistreak when user asked for full stats or explicitly asks about slips series — not in unsolicited greetings/Summary.

**Depends on:** T52 ([03-session-turn-loop-tools.md](03-session-turn-loop-tools.md)), T53 ([04-conflict-rule-tools-win.md](04-conflict-rule-tools-win.md)), core T18.4, T24 ([../core/issues/09-streak-and-full-stats.md](../../core/issues/09-streak-and-full-stats.md), [../core/issues/15-mastra-tool-bindings.md](../../core/issues/15-mastra-tool-bindings.md))

**Spec / arch links:** [spec/stats.md](../../../spec/stats.md), [spec/agent.md](../../../spec/agent.md), [CONTEXT.md](../../../CONTEXT.md) (Full stats, Antistreak)

**Out of scope:** Fabricating totals; dumping full stats unsolicited

**Tasks:**

- [ ] **T58.1** Prompt: progress/streak questions → `fullStats` (or progress read) tool first
- [ ] **T58.2** Narrate bundle fields faithfully; заморозка from tool
- [ ] **T58.3** Antistreak: only if requested or part of explicit full-stats ask
- [ ] **T58.4** Smoke: mocked fullStats → reply contains tool numbers only
