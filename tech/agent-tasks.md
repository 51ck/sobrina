# Agent — ticket board

Board under the [in-repo ticket system](tickets.md). Phase 1 Sobrina person: Mastra agent, prompts, Session turns, tool-backed narration. Spec: [agent.md](../spec/agent.md), [character.md](../spec/character.md), [stats.md](../spec/stats.md), [session.md](../spec/session.md), [memory.md](../spec/memory.md) (Phase 2 depth). Arch: [architecture.md](architecture.md) (Mastra in `@sobrina/core`; durable verbs vs agent). Glossary: [`CONTEXT.md`](../CONTEXT.md).

IDs start at **T50** (foundation T1–T6, core T10–T24, telegram T30–T43; cross-board uniqueness per [tickets.md](tickets.md)).

## Why

Core exposes durable verbs + T24 tool bindings; telegram delivers I/O. Phase 1 still needs the **person**: Mastra agent with character, Session-turn generate loop, Check-in conversation via tools, Day resolution asks, Reminder/Summary voice constraints, and full-stats narration — without inventing ledger outcomes, leading with Antistreak, or shipping Profile/Diary (Phase 2).

## Themes

1. **Mastra agent bootstrap** — MODEL_ID / provider wiring in `@sobrina/core`
2. **Character + authority prompts** — from character.md / agent.md
3. **Session turn loop** — tools from T24; mutex via T20
4. **Conflict rule** — ledger/tool results win
5. **Day resolution in dialogue** — T19 helper; ask if unclear
6. **Conversational Check-in** — record / late fix via tools only
7. **Reminder voice + askWithOptions defaults** — Красавчик / Оступился
8. **Day Summary narration** — T23 facts; no Antistreak lead
9. **Progress / full stats narration** — T18 bundle only
10. **Phase 1 memory stub** — no Profile/Diary tables; empty/no-op injection
11. **Integration smoke** — Session + tools + outbound handoff

---

## T50 — Mastra agent bootstrap

**Problem:** Agent runtime must live in `@sobrina/core` with model env, not in the Grammy package.

**Done when:** Mastra agent (or equivalent Mastra agent construct) constructed in core; reads `MODEL_ID` + provider key(s) from env; fails clearly if required model env missing when generate is invoked; no Telegram imports in agent module.

**Depends on:** foundation T4 (env names); core package from foundation T1

**Spec / arch links:** [architecture.md](architecture.md) (Mastra placement; Models), [spec/agent.md](../spec/agent.md)

**Out of scope:** Grammy; character prose (T51); tool list completeness (T24 + T52)

**Tasks:**

- [ ] **T50.1** Add Mastra dependency to `@sobrina/core`; agent module path documented
- [ ] **T50.2** Wire `MODEL_ID` + provider API key env into model router
- [ ] **T50.3** `createSobrinaAgent(...)` (name may vary) factory with empty/minimal instructions stub
- [ ] **T50.4** Fail-fast or clear error when model env missing on first generate
- [ ] **T50.5** Assert agent package graph: no `@sobrina/telegram` / grammy import from agent module

---

## T51 — Character and authority prompts

**Problem:** Sobrina must sound like the locked character and respect authority boundaries.

**Done when:** System/instructions prompt encodes [character.md](../spec/character.md) voice + boundaries and [agent.md](../spec/agent.md) may/may-not; Russian default in group; no therapy/scold framing; no «я сохранила» persistence narration; prompt reviewable as a file under core.

**Depends on:** T50

**Spec / arch links:** [spec/character.md](../spec/character.md), [spec/agent.md](../spec/agent.md), [CONTEXT.md](../CONTEXT.md)

**Out of scope:** Profile nickname injection (Phase 2); long multi-file prompt frameworks

**Tasks:**

- [ ] **T51.1** Prompt source file(s) in `@sobrina/core` derived from character.md (not a product rewrite)
- [ ] **T51.2** Encode authority: may use durable tools; may not invent Check-ins / streaks / заморозка
- [ ] **T51.3** Encode voice: short, human, dry humor; celebrate sober progress; support slips without Antistreak spotlight
- [ ] **T51.4** Encode boundaries: not therapy/crisis; no dossier dump; no shame in Summary
- [ ] **T51.5** Smoke: instructions load into agent factory from T50

---

## T52 — Session turn loop + T24 tools

**Problem:** Each Session turn must run the agent with durable tools under per-chat serialization.

**Done when:** **`runTurn` lives in `@sobrina/core` Session path** (serialized by T20): attaches T24 tools, runs Mastra generate, returns outbound text/askWithOptions turn results; overlapping turns blocked by T20 mutex; no invented statuses outside tool results. **Telegram only feeds events and sends turn results** — **no Mastra/generate import in `@sobrina/telegram`**.

**Depends on:** T50, T51, core T20, core T24

**Spec / arch links:** [spec/session.md](../spec/session.md), [ADR 0004](../docs/adr/0004-agentic-session-vs-day.md), [architecture.md](architecture.md) (Session hub; durable verbs vs agent; Mastra placement)

**Out of scope:** Grammy send (telegram board); Mastra/generate inside `@sobrina/telegram`; reimplementing Grace Token math; Profile/Diary tools

**Tasks:**

- [ ] **T52.1** Register T24 tool list on agent for Session turns
- [ ] **T52.2** Implement `runTurn(chatId, event)` **in `@sobrina/core`** (text / callback / scheduler kind + chat/member ids) — telegram must not own generate
- [ ] **T52.3** Call `runTurn` only via T20 serialized Session path; telegram feeds the event, then posts the returned turn result
- [ ] **T52.4** Map tool/`askWithOptions` results to adapter-facing turn result shape (text + optional options)
- [ ] **T52.5** Smoke: mocked model or tool-forced path records Check-in via tool → row in temp DB

---

## T53 — Conflict rule (tools win)

**Problem:** Narrative must not override ledger/tool results.

**Done when:** Prompt + turn policy state conflict rule from [agent.md](../spec/agent.md); agent instructed to call tools before asserting Check-in/streak/заморозка facts; test or eval fixture shows assistant does not claim a status without a tool result in the turn trace (lightweight).

**Depends on:** T51, T52

**Spec / arch links:** [spec/agent.md](../spec/agent.md) (Conflict rule), [spec/stats.md](../spec/stats.md), [spec/character.md](../spec/character.md)

**Out of scope:** Perfect jailbreak resistance; re-coding streak walk in the prompt

**Tasks:**

- [ ] **T53.1** Prompt clause: ledger and tool results win over guess/narrative
- [ ] **T53.2** Prompt clause: do not bypass Grace Token / status rules; never invent numbers
- [ ] **T53.3** Fixture/smoke: turn that answers “какой у меня streak?” must call `fullStats` (or equivalent) before numeric claim — or refuse if tools unavailable

---

## T54 — Day resolution in dialogue

**Problem:** Ambiguous Check-in day must follow T19 order; agent asks one clarifying question when unclear.

**Done when:** On conversational Check-in, agent uses Day resolution tool (T19); if `{ unclear: true }`, asks one clarifying question (no multi-question grill); if dayKey returned, proceeds to record/correct tools. No LLM-only day picking that skips the helper.

**Depends on:** T52, core T19, core T14/T17

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md) (Day resolution), [CONTEXT.md](../CONTEXT.md) (Day resolution), [spec/agent.md](../spec/agent.md)

**Out of scope:** Natural-language date parser inside core helper; inventing fixability rules in the prompt

**Tasks:**

- [ ] **T54.1** Prompt: always use Day resolution tool before recording when day is not explicit in structured event
- [ ] **T54.2** Unclear → one clarifying question; wait for next turn
- [ ] **T54.3** Clear dayKey → call record or correct tool as appropriate (open Day vs late-fix period)
- [ ] **T54.4** Smoke/fixture: unclear path asks; explicit path records once

---

## T55 — Conversational Check-in (record / late fix)

**Problem:** Speech like «я сегодня трезвый» must become tool-backed Check-in; late fix until next Reminder uses T17.

**Done when:** Agent maps sober/slip intent to `recordCheckIn` / `correctCheckIn` tools only; join via Check-in uses Checklist tools as core composes; acknowledges late sober fix and заморозка refund **from tool result** without drama spiral ([character.md](../spec/character.md)). No closed-Day T14 writes.

**Depends on:** T54, core T14, T15, T17, T12

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md), [spec/stats.md](../spec/stats.md), [spec/character.md](../spec/character.md) (Late fixes), [ADR 0005](../docs/adr/0005-late-fix-until-next-reminder.md)

**Out of scope:** Button chrome (telegram T36); Grace Token arithmetic in agent code

**Tasks:**

- [ ] **T55.1** Prompt examples: sober / slip intents → appropriate tools (`recordCheckIn` / `correctCheckIn`) (Russian)
- [ ] **T55.2** Open Day → `recordCheckIn`; closed Day in late-fix period → `correctCheckIn` only
- [ ] **T55.3** Narrate tool outcomes (including refund) without moral verdict spiral
- [ ] **T55.4** Smoke: slip then late sober fix uses correct tool order against temp DB

---

## T56 — Reminder voice + askWithOptions defaults

**Problem:** Reminder Session wake needs short human Reminder copy and default buttons Красавчик / Оступился unless special chrome is truly needed.

**Done when:** Reminder text + default buttons come from the **core Reminder Session turn** — `runTurn` with `kind: reminder` — using **core default labels** Красавчик / Оступился; special labels only when prompt policy allows “truly needed”; caption max via T22/T24. No Antistreak in Reminder. **Telegram T35 only posts** that turn result (minimal stub allowed **until T56**).

**Depends on:** T52, core T22, T24; telegram T35 posts the result

**Spec / arch links:** [CONTEXT.md](../CONTEXT.md) (askWithOptions), [spec/daily-rhythm.md](../spec/daily-rhythm.md), [spec/agent.md](../spec/agent.md), [spec/character.md](../spec/character.md)

**Out of scope:** Telegram keyboard render / authoring Reminder product copy in the adapter after T56; mid-evening nudge beat

**Tasks:**

- [ ] **T56.1** Core Reminder Session turn: `runTurn(..., { kind: reminder })` produces Reminder text + default askWithOptions (telegram only posts)
- [ ] **T56.2** Default askWithOptions labels from core constants (Красавчик / Оступился)
- [ ] **T56.3** Prompt: prefer defaults; special chrome rare and justified
- [ ] **T56.4** Prompt: Reminder must not lead with Antistreak or shame silence
- [ ] **T56.5** Smoke: Reminder turn result includes both default options

---

## T57 — Day Summary narration

**Problem:** After Deadline, Summary must celebrate/support from T23 facts — soft line if quiet; never Antistreak scoreboard.

**Done when:** On `kind: deadline` (or Summary) turn, agent reads `daySummaryFacts` tool and narrates Russian Summary: heroes/support; soft line when quiet/soft-line flag; **does not** lead with or list Antistreak; auto-slip framed as fair ledger not moral verdict ([character.md](../spec/character.md)).

**Depends on:** T52, core T23, T24; telegram T40 posts

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md) (Day Summary), [spec/stats.md](../spec/stats.md) (Voice), [spec/character.md](../spec/character.md), [CONTEXT.md](../CONTEXT.md) (Day Summary)

**Out of scope:** Inventing quiet numeric thresholds; Antistreak rankings; Grammy send

**Tasks:**

- [ ] **T57.1** Summary turn loads facts via tool only (no guessed Check-ins)
- [ ] **T57.2** Prompt constraints: no Antistreak lead; no shame parade; soft line when quiet flag
- [ ] **T57.3** Matter-of-fact kindness for Deadline auto-slip context if mentioned
- [ ] **T57.4** Fixture: facts with slips → Summary text omits Antistreak leaderboard language

---

## T58 — Progress and full stats narration

**Problem:** Progress questions must use tool-backed full stats; Antistreak only when asked or inside full stats delivery.

**Done when:** Agent calls `fullStats` (T18/T24) before numbers; narrates Streak, заморозка есть/нет, Longest, totals as returned; includes Antistreak when user asked for full stats or explicitly asks about slips series — not in unsolicited greetings/Summary.

**Depends on:** T52, T53, core T18.4, T24

**Spec / arch links:** [spec/stats.md](../spec/stats.md), [spec/agent.md](../spec/agent.md), [CONTEXT.md](../CONTEXT.md) (Full stats, Antistreak)

**Out of scope:** Fabricating totals; dumping full stats unsolicited

**Tasks:**

- [ ] **T58.1** Prompt: progress/streak questions → `fullStats` (or progress read) tool first
- [ ] **T58.2** Narrate bundle fields faithfully; заморозка from tool
- [ ] **T58.3** Antistreak: only if requested or part of explicit full-stats ask
- [ ] **T58.4** Smoke: mocked fullStats → reply contains tool numbers only

---

## T59 — Phase 1 memory stub (no Profile/Diary impl)

**Problem:** Session/architecture mention memory hooks; Phase 1 must not ship Profile/Diary tables or fake persistence theater.

**Done when:** Agent turn injection uses empty/stub Profile + empty digest (or omits); memory write/recall/refactor tools **absent or no-op** with clear Phase 2 TODO; idle Session close refactor hook remains no-op (core T20); prompt does not claim saved memory. No «я сохранила».

**Depends on:** T51, T52, core T20

**Spec / arch links:** [spec/memory.md](../spec/memory.md), [ADR 0003](../docs/adr/0003-memory-markdown-and-injection.md), [architecture.md](architecture.md) (Profile/Diary Phase 2), [spec/roadmap.md](../spec/roadmap.md) Phase 2

**Out of scope:** Profile/Diary schema; hybrid injection caps; manners correction persistence; diary refactor quality

**Tasks:**

- [ ] **T59.1** Turn context: stub/empty memory fields only
- [ ] **T59.2** Do not register real Profile/Diary write tools in Phase 1 (or register no-ops that return “not available yet”)
- [ ] **T59.3** Prompt: no persistence narration; no dossier dump
- [ ] **T59.4** Document Phase 2 follow-up board expectation in theme Out of scope / Related

---

## T60 — Integration smoke (agent + Session + handoff)

**Problem:** Prove agent board slices work together before calling Phase 1 agent path done.

**Done when:** Documented smoke path: Session turn with text Check-in → tool write → Russian ack; Reminder turn → defaults; Summary turn → no Antistreak lead; `bun run lint` + `bun run typecheck` clean for touched packages. Telegram delivery may be stubbed if T35/T40 not running.

**Depends on:** T52–T59 as applicable; telegram T32/T37 optional for full E2E

**Spec / arch links:** [spec/roadmap.md](../spec/roadmap.md) Phase 1, [architecture.md](architecture.md)

**Out of scope:** Declaring product Phase 1 complete; load testing; deploy

**Tasks:**

- [ ] **T60.1** Script or test doc: Check-in conversation smoke against temp DB
- [ ] **T60.2** Reminder + Summary turn smoke (facts fixtures)
- [ ] **T60.3** fullStats narration smoke
- [ ] **T60.4** Lint + typecheck gate on agent-touched packages

---

## Suggested build order

```text
core T20, T24, T19, T14, T17, T18, T22, T23 (gates)
  → T50 Mastra bootstrap
  → T51 character prompts
  → T52 Session turn + tools
  → T53 conflict rule
  → T54 Day resolution dialogue
  → T55 conversational Check-in
  → T56 Reminder voice + defaults
  → T57 Day Summary narration
  → T58 progress / full stats
  → T59 Phase 1 memory stub
  → T60 integration smoke
```

Suggested first three slices:

1. **T50.1** — Mastra dependency + agent module path in `@sobrina/core`  
2. **T50.2** — `MODEL_ID` + provider key wiring  
3. **T50.3** — agent factory stub  

## Non-goals

- Grammy / Telegram I/O inside agent modules
- Reimplementing Grace Token, Streak walk, or Deadline auto-slip in the LLM
- Profile / Diary persistence, injection budgets, recall/refactor quality (Phase 2)
- Leading with Antistreak in Reminder, Summary, or unsolicited greetings
- Inventing Check-in statuses or streak numbers without tools
- Therapy / crisis / diagnosis framing
- sushkobot import; DM-primary UX; web UI

## Related

- Process: [tickets.md](tickets.md)
- Architecture: [architecture.md](architecture.md)
- Core: [core-tasks.md](core-tasks.md) (esp. T19, T22–T24)
- Telegram: [telegram-tasks.md](telegram-tasks.md) (T32, T35, T37, T40 deliver I/O)
- Spec: [agent.md](../spec/agent.md), [character.md](../spec/character.md), [stats.md](../spec/stats.md), [session.md](../spec/session.md), [memory.md](../spec/memory.md)
- DOX: [AGENTS.md](AGENTS.md)
