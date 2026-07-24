# T56 — Reminder voice + askWithOptions defaults

Status: ready-for-agent

**Problem:** Reminder Session wake needs short human Reminder copy and default buttons Красавчик / Оступился unless special chrome is truly needed.

**Done when:** Reminder text + default buttons come from the **core Reminder Session turn** — `runTurn` with `kind: reminder` — using **core default labels** Красавчик / Оступился; special labels only when prompt policy allows "truly needed"; caption max via core T22/T24. No Antistreak in Reminder. **Telegram T35 only posts** that turn result (minimal stub allowed **until T56**).

**Depends on:** T52 ([03-session-turn-loop-tools.md](03-session-turn-loop-tools.md)), core T22, T24 ([../core/issues/13-askwithoptions-core.md](../../core/issues/13-askwithoptions-core.md), [../core/issues/15-mastra-tool-bindings.md](../../core/issues/15-mastra-tool-bindings.md)); telegram T35 posts the result ([../telegram/issues/06-reminder-delivery.md](../../telegram/issues/06-reminder-delivery.md))

**Spec / arch links:** [CONTEXT.md](../../../CONTEXT.md) (askWithOptions), [spec/daily-rhythm.md](../../../spec/daily-rhythm.md), [spec/agent.md](../../../spec/agent.md), [spec/character.md](../../../spec/character.md)

**Out of scope:** Telegram keyboard render / authoring Reminder product copy in the adapter after T56; mid-evening nudge beat

**Tasks:**

- [ ] **T56.1** Core Reminder Session turn: `runTurn(..., { kind: reminder })` produces Reminder text + default askWithOptions (telegram only posts)
- [ ] **T56.2** Default askWithOptions labels from core constants (Красавчик / Оступился)
- [ ] **T56.3** Prompt: prefer defaults; special chrome rare and justified
- [ ] **T56.4** Prompt: Reminder must not lead with Antistreak or shame silence
- [ ] **T56.5** Smoke: Reminder turn result includes both default options
