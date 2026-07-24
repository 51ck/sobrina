# T24 — Mastra tool bindings (verbs only)

Status: ready-for-agent

**Problem:** Agent must call durable verbs through tools; narrative cannot bypass ledger.

**Done when:** Mastra tools in `@sobri/core` wrap record/correct Check-in, Checklist, settings read/update, full stats, Day resolution helper, askWithOptions, daySummaryFacts, Deadline/Reminder actions as appropriate; tools return verb results; smoke test that a tool invokes store (no live model required if Mastra allows mocked tool exec). Character prompt / MODEL_ID wiring left to agent board where needed.

**Depends on:** T11–T23 as applicable ([02](02-chat-settings-durable-verbs.md)–[14](14-day-summary-fact-bundle.md)); foundation env for `MODEL_ID` optional for this theme's smoke

**Spec / arch links:** [architecture.md](../../../tech/architecture.md) (Mastra placement; durable verbs vs agent), [spec/agent.md](../../../spec/agent.md) (conflict rule)

**Out of scope:** Character.md prompt pack; Day Summary prose; Telegram adapter; Profile/Diary tools (Phase 2)

**Tasks:**

- [ ] **T24.1** Tool module layout under `@sobri/core` (register list)
- [ ] **T24.2** Tools: Check-in record + correct; Checklist join/leave/remove
- [ ] **T24.3** Tools: settings get/update; fullStats; day resolution
- [ ] **T24.4** Tools: askWithOptions passthrough; daySummaryFacts
- [ ] **T24.5** Smoke: invoke one write tool against temp DB → row visible; lint/typecheck clean
