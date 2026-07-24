# T52 — Session turn loop + core T24 tools

Status: ready-for-agent

**Problem:** Each Session turn must run the agent with durable tools under per-chat serialization.

**Done when:** **`runTurn` lives in `@sobri/core` Session path** (serialized by core T20): attaches core T24 tools, runs Mastra generate, returns outbound text/askWithOptions turn results; overlapping turns blocked by core T20 mutex; no invented statuses outside tool results. **Telegram only feeds events and sends turn results** — **no Mastra/generate import in `@sobri/telegram`**.

**Depends on:** T50 ([01-mastra-agent-bootstrap.md](01-mastra-agent-bootstrap.md)), T51 ([02-character-and-authority-prompts.md](02-character-and-authority-prompts.md)), core T20, core T24 ([../core/issues/11-session-hub.md](../../core/issues/11-session-hub.md), [../core/issues/15-mastra-tool-bindings.md](../../core/issues/15-mastra-tool-bindings.md))

**Spec / arch links:** [spec/session.md](../../../spec/session.md), [ADR 0004](../../../docs/adr/0004-agentic-session-vs-day.md), [architecture.md](../../../tech/architecture.md) (Session hub; durable verbs vs agent; Mastra placement)

**Out of scope:** Grammy send (telegram board); Mastra/generate inside `@sobri/telegram`; reimplementing Grace Token math; Profile/Diary tools

**Tasks:**

- [ ] **T52.1** Register core T24 tool list on agent for Session turns
- [ ] **T52.2** Implement `runTurn(chatId, event)` **in `@sobri/core`** (text / callback / scheduler kind + chat/member ids) — telegram must not own generate
- [ ] **T52.3** Call `runTurn` only via core T20 serialized Session path; telegram feeds the event, then posts the returned turn result
- [ ] **T52.4** Map tool/`askWithOptions` results to adapter-facing turn result shape (text + optional options)
- [ ] **T52.5** Smoke: mocked model or tool-forced path records Check-in via tool → row in temp DB
