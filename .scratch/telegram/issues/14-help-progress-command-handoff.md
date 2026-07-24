# T43 — Help + progress command handoff

Status: ready-for-agent

**Problem:** Minimum command surface includes help and progress/stats entry points.

**Done when:** Locked `/help` (or equivalent) posts short Russian usage; progress/stats command or mention hands off to Session → core `fullStats` / agent (no fabricated numbers). Exact names locked with T38.1 menu.

**Depends on:** T32 ([03-inbound-event-session-hub.md](03-inbound-event-session-hub.md)), T33 ([04-outbound-send-path.md](04-outbound-send-path.md)), core T18.4 ([../core/issues/09-streak-and-full-stats.md](../../core/issues/09-streak-and-full-stats.md)); agent optional for narration

**Spec / arch links:** [spec/telegram-ux.md](../../../spec/telegram-ux.md) (Commands), [spec/stats.md](../../../spec/stats.md), [spec/agent.md](../../../spec/agent.md)

**Out of scope:** Full stats dump unsolicited; Antistreak-leading greetings

**Tasks:**

- [ ] **T43.1** Lock `/help` text (commands + "talk to Sobri" pointer)
- [ ] **T43.2** Progress/stats entry → Session + `fullStats` tool path (or stub "ask Sobri" until agent board)
- [ ] **T43.3** Register commands with Bot API command menu
