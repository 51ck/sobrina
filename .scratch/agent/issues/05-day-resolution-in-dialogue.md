# T54 — Day resolution in dialogue

Status: ready-for-agent

**Problem:** Ambiguous Check-in day must follow core T19 order; agent asks one clarifying question when unclear.

**Done when:** On conversational Check-in, agent uses Day resolution tool (core T19); if `{ unclear: true }`, asks one clarifying question (no multi-question grill); if dayKey returned, proceeds to record/correct tools. No LLM-only day picking that skips the helper.

**Depends on:** T52 ([03-session-turn-loop-tools.md](03-session-turn-loop-tools.md)), core T19, core T14/T17 ([../core/issues/10-day-resolution-helper.md](../../core/issues/10-day-resolution-helper.md), [../core/issues/05-record-check-in-verb.md](../../core/issues/05-record-check-in-verb.md), [../core/issues/08-late-fix-until-next-reminder.md](../../core/issues/08-late-fix-until-next-reminder.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (Day resolution), [CONTEXT.md](../../../CONTEXT.md) (Day resolution), [spec/agent.md](../../../spec/agent.md)

**Out of scope:** Natural-language date parser inside core helper; inventing fixability rules in the prompt

**Tasks:**

- [ ] **T54.1** Prompt: always use Day resolution tool before recording when day is not explicit in structured event
- [ ] **T54.2** Unclear → one clarifying question; wait for next turn
- [ ] **T54.3** Clear dayKey → call record or correct tool as appropriate (open Day vs late-fix period)
- [ ] **T54.4** Smoke/fixture: unclear path asks; explicit path records once
