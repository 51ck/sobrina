# T19 — Day resolution helper

Status: ready-for-agent

**Problem:** When speech is ambiguous, core should expose deterministic resolution order; agent asks only when helper returns unclear.

**Done when:** Pure helper implements order from [spec/daily-rhythm.md](../../../spec/daily-rhythm.md): explicit fixable Day → open Day → previous fixable Day → current/upcoming; returns target Day key or `unclear`; unit tests for each branch. No LLM inside helper.

**Depends on:** T13 ([04-day-identity-lifecycle.md](04-day-identity-lifecycle.md)), T17 (fixable = still within late-fix period until next Reminder) ([08-late-fix-until-next-reminder.md](08-late-fix-until-next-reminder.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (Day resolution), [CONTEXT.md](../../../CONTEXT.md) (Day resolution), [spec/agent.md](../../../spec/agent.md)

**Out of scope:** Natural-language date parsing (adapter/agent supplies structured "explicit day" when known); asking the clarifying question text

**Tasks:**

- [ ] **T19.1** Input shape: chat settings + now + optional explicit day + open Day + previous Day fixability
- [ ] **T19.2** Implement resolution order → `{ dayKey }` or `{ unclear: true }`
- [ ] **T19.3** Tests: each of the four branches + unclear case
