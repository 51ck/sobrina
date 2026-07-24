# T57 — Day Summary narration

Status: ready-for-agent

**Problem:** After Deadline, Summary must celebrate/support from core T23 facts — soft line if quiet; never Antistreak scoreboard.

**Done when:** On `kind: deadline` (or Summary) turn, agent reads `daySummaryFacts` tool and narrates Russian Summary: heroes/support; soft line when quiet/soft-line flag; **does not** lead with or list Antistreak; auto-slip framed as fair ledger not moral verdict ([character.md](../../../spec/character.md)).

**Depends on:** T52 ([03-session-turn-loop-tools.md](03-session-turn-loop-tools.md)), core T23, T24 ([../core/issues/14-day-summary-fact-bundle.md](../../core/issues/14-day-summary-fact-bundle.md), [../core/issues/15-mastra-tool-bindings.md](../../core/issues/15-mastra-tool-bindings.md)); telegram T40 posts ([../telegram/issues/11-day-summary-delivery.md](../../telegram/issues/11-day-summary-delivery.md))

**Spec / arch links:** [spec/daily-rhythm.md](../../../spec/daily-rhythm.md) (Day Summary), [spec/stats.md](../../../spec/stats.md) (Voice), [spec/character.md](../../../spec/character.md), [CONTEXT.md](../../../CONTEXT.md) (Day Summary)

**Out of scope:** Inventing quiet numeric thresholds; Antistreak rankings; Grammy send

**Tasks:**

- [ ] **T57.1** Summary turn loads facts via tool only (no guessed Check-ins)
- [ ] **T57.2** Prompt constraints: no Antistreak lead; no shame parade; soft line when quiet flag
- [ ] **T57.3** Matter-of-fact kindness for Deadline auto-slip context if mentioned
- [ ] **T57.4** Fixture: facts with slips → Summary text omits Antistreak leaderboard language
