# T22 — askWithOptions (core, no Grammy)

Status: ready-for-agent

**Problem:** Closed choices are channel-agnostic; Telegram only renders buttons later. Caption length must be limited.

**Done when:** Core type/verb describes options + optional skip/reject; **caption max locked** (numeric constant in core); Reminder default labels **Красавчик** / **Оступился** available as defaults; validation rejects over-long captions. No Grammy keyboards here.

**Depends on:** none beyond package (can parallel early)

**Spec / arch links:** [CONTEXT.md](../../../CONTEXT.md) (askWithOptions), [spec/telegram-ux.md](../../../spec/telegram-ux.md), [spec/agent.md](../../../spec/agent.md), [architecture.md](../../../tech/architecture.md) (tool rule)

**Out of scope:** Inline keyboard; callback handling; parse_mode

**Tasks:**

- [ ] **T22.1** Lock caption max length constant in `@sobri/core` (document number next to constant)
- [ ] **T22.2** `askWithOptions` input/result types: options[], optional skip/reject, caption validation
- [ ] **T22.3** Reminder default option labels constant: Красавчик / Оступился
- [ ] **T22.4** Tests: over-long caption rejected; defaults exported
