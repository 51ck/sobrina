# Core — ticket board

Board under the [in-repo ticket system](tickets.md). Phase 1 ledger + Session + scheduler in `@sobri/core`. Spec: [roadmap.md](../spec/roadmap.md) Phase 1. Arch: [architecture.md](architecture.md). Glossary: [`CONTEXT.md`](../CONTEXT.md).

IDs **T10–T25** (foundation T1–T6; cross-board uniqueness per [tickets.md](tickets.md)).

## Why

Foundation gives packages, lint/typecheck, env, and `openStore` / migrations. Phase 1 MVP still needs the channel-agnostic fairness ledger (Day, Check-in, Checklist, Grace Token / заморозка, streaks), durable settings, Session hub (Session ≠ Day), Reminder/Deadline scheduler wake points, and verb surfaces the agent/adapter can call — without Grammy I/O and without Profile/Diary tables (Phase 2).

## Themes

1. **Ledger schema** — chats, settings, Checklist, Days, Check-ins, Grace Token state in SQLite
2. **Chat settings verbs** — Reminder, Deadline, TZ, N (default 3)
3. **Checklist membership** — join / leave / admin remove; Check-in joins
4. **Day identity + lifecycle** — evening Day key; open / closed (ADR 0002)
5. **Record Check-in** — sober / slip intent → stored status via rules
6. **Grace Token (заморозка)** — cap 1; earn / spend / refund (ADR 0001)
7. **Deadline close Day** — auto-slip silent Checklist; Day closed
8. **Late fix** — correct until next Reminder; refund rules (ADR 0005)
9. **Stats reads** — Streak, Antistreak, Longest, full stats (derived on read)
10. **Day resolution helper** — which Day a Check-in targets; ask if unclear
11. **Session hub** — `getOrStart`, mutex, idle close (ADR 0004)
12. **Scheduler** — Reminder / Deadline due evaluation → Session wake hooks
13. **askWithOptions (core)** — channel-agnostic closed choice + caption max
14. **Day Summary fact bundle** — ledger facts for narration (no Telegram post)
15. **Mastra tool bindings** — tools wrap durable verbs (no character prompt)
16. **Chat Character setting** — durable `unset | pan|artemis|apollo|hestia` (after Character SPEC T70)

---

## T10 — Ledger schema (no memory tables)

**Problem:** Durable verbs need SQLite tables for chats, settings, Checklist, Days, Check-ins, and Grace Token state — still no Profile/Diary.

**Done when:** Migrations after foundation shell create the Phase 1 ledger tables; `openStore` + migrate on a temp DB succeeds; no Profile/Diary columns/tables.

**Depends on:** foundation T5 (`openStore` / migrations), T6 boot path usable for migrate

**Spec / arch links:** [architecture.md](architecture.md) (SQLite ownership; Profile/Diary Phase 2), [CONTEXT.md](../CONTEXT.md), [spec/stats.md](../spec/stats.md), [spec/checklist.md](../spec/checklist.md), [spec/daily-rhythm.md](../spec/daily-rhythm.md)

**Out of scope:** Profile/Diary schema; Grammy id mapping tables beyond a thin `chat_id` / `member_id` opaque string; sushkobot import

**Tasks:**

- [x] **T10.1** Migration: `chats` (stable core chat id) + chat settings columns/table (Reminder time, Deadline time, timezone, N; N default **3**)
- [x] **T10.2** Migration: Checklist membership (chat + member; join/leave timestamps as needed)
- [x] **T10.3** Migration: `days` (chat + Day key date + open/closed + Reminder/Deadline cycle metadata as needed)
- [x] **T10.4** Migration: `check_ins` (chat, member, Day key, status `sober` | `minor_slip` | `major_slip`, token-spend flag for refund)
- [x] **T10.5** Migration: Grace Token state per Checklist member (cap 1; present/absent) — or equivalent columns documented in schema
- [x] **T10.6** Tests: migrate fresh DB → expected tables exist; no memory tables

---

## T11 — Chat settings durable verbs

**Problem:** Reminder, Deadline, TZ, and N must be readable/writable in core before `/settings` chrome exists.

**Done when:** Core can create/get a chat, get/update settings with validation (times + TZ + N ≥ 1); default N = 3; unit tests cover defaults and updates. No Telegram admin checks here (adapter later).

**Depends on:** T10.1

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md) (settings table), [CONTEXT.md](../CONTEXT.md) (Reminder, Deadline, Grace Token N)

**Out of scope:** Grammy `/settings` UI; who-is-admin authorization; posting Reminder copy

**Tasks:**

- [x] **T11.1** `getOrCreateChat(chatId)` + `getSettings(chatId)`
- [x] **T11.2** `updateSettings(chatId, patch)` — Reminder time, Deadline time, timezone, N; reject invalid values
- [x] **T11.3** Defaults: N = **3** when unset; document time/TZ representation chosen in core
- [x] **T11.4** Tests: create chat → defaults → patch N/times/TZ → read back

---

## T12 — Checklist membership verbs

**Problem:** Only Checklist members get Deadline auto-slip and streak accounting.

**Done when:** Join / leave / admin-remove verbs work; idempotent join; non-members excluded from Checklist reads used by Deadline; tests cover membership matrix from [spec/checklist.md](../spec/checklist.md).

**Depends on:** T10.2, T11.1

**Spec / arch links:** [spec/checklist.md](../spec/checklist.md), [CONTEXT.md](../CONTEXT.md) (Checklist)

**Out of scope:** Slash command parsing; Telegram admin role detection (adapter passes “admin remove” intent)

**Tasks:**

- [x] **T12.1** `joinChecklist(chatId, memberId)` — idempotent
- [x] **T12.2** `leaveChecklist(chatId, memberId)`
- [ ] **T12.3** `removeFromChecklist(chatId, memberId)` (admin path; same durable remove)
- [ ] **T12.4** `listChecklist(chatId)` / `isOnChecklist(...)`
- [ ] **T12.5** Tests: join/leave/remove; double-join safe; leave when absent is safe no-op or clear error (pick one; document)

---

## T13 — Day identity + lifecycle

**Problem:** Day is keyed to the Reminder-cycle evening date in chat TZ; Deadline may fall next clock morning without changing the Day key.

**Done when:** Core can compute Day key for a cycle, open/ensure a Day, mark Day closed; overnight Deadline fixture proves Day key ≠ Deadline clock date ([ADR 0002](../docs/adr/0002-overnight-deadline-day-key.md)).

**Depends on:** T11

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md), [ADR 0002](../docs/adr/0002-overnight-deadline-day-key.md), [CONTEXT.md](../CONTEXT.md) (Day), [architecture.md](architecture.md) (Session ≠ Day)

**Out of scope:** Auto-slip contents (T16); Session hub; Reminder message text

**Tasks:**

- [ ] **T13.1** Pure helper: Day key from chat TZ + Reminder cycle (evening date rules per ADR 0002)
- [ ] **T13.2** `ensureOpenDay(chatId, dayKey)` / get Day state (open vs closed)
- [ ] **T13.3** `closeDay(chatId, dayKey)` — state transition only (no auto-slip yet)
- [ ] **T13.4** Tests: same-calendar Deadline; overnight Deadline keeps evening Day key; close is idempotent or well-defined

---

## T14 — Record Check-in verb

**Problem:** Sober / slip intent must become a stored Check-in via rules — not LLM invention. No check-in **window**.

**Done when:** `recordCheckIn` (name may vary) writes `sober` | `minor_slip` | `major_slip` for a target **open** Day; Check-in from non-member **joins Checklist then records**; **T14 rejects writes on closed Days** — late corrections only via **T17**; tests without Telegram. No check-in **window**.

**Depends on:** T12, T13, T15 (Grace Token rules on slip writes — implement T15 first or same PR series; T14.3+ blocked on T15)

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md), [spec/stats.md](../spec/stats.md), [spec/checklist.md](../spec/checklist.md) (join + record), [spec/agent.md](../spec/agent.md), [CONTEXT.md](../CONTEXT.md) (Check-in)

**Out of scope:** Free-text NLP; button chrome; Day resolution dialogue (T19 helper feeds the agent); **any write to a closed Day** (that is T17 late fix only)

**Tasks:**

- [ ] **T14.1** Intent → write API: record sober for member + Day key (creates/updates Check-in per product “one status per member per Day”) on an **open** Day
- [ ] **T14.2** Record slip intent → status via Grace Token rules (calls into T15)
- [ ] **T14.3** Non-member Check-in: join Checklist then record (single verb or documented composition)
- [ ] **T14.4** Reject writes when Day is **closed** (caller must use T17); document other reject cases; tests
- [ ] **T14.5** Tests: sober write; slip with/without token; join+record; closed Day rejected; no `missed`/`absent` status invented

---

## T15 — Grace Token (заморозка) rules

**Problem:** Visible token (cap 1) replaces V1 invisible grace gate; earn/spend/refund must be rule-owned on write.

**Done when:** Earn when sober Streak reaches N; spend on explicit slip or Deadline silence → `minor_slip`; no token → `major_slip`; late sober fix refunds if that Check-in spent a token; cap 1 enforced; tests match [ADR 0001](../docs/adr/0001-grace-token.md) + [spec/stats.md](../spec/stats.md).

**Depends on:** T10.4–T10.5, T11 (N), T13, **T18.1** (earn path needs Streak walk)

**Spec / arch links:** [ADR 0001](../docs/adr/0001-grace-token.md), [spec/stats.md](../spec/stats.md), [CONTEXT.md](../CONTEXT.md) (Grace Token)

**Out of scope:** Agent “remind about заморозка” copy; stacking tokens; mute-to-save-token behavior

**Tasks:**

- [ ] **T15.1** Read/write token present (0|1) per Checklist member
- [ ] **T15.2** Spend path: with token → `minor_slip` + token gone; without → `major_slip`
- [ ] **T15.3** Earn path: after sober progress, when Streak reaches N → grant token if none (cap 1)
- [ ] **T15.4** Refund path helper used by late fix: if Check-in spent token and corrected to sober → restore token
- [ ] **T15.5** Tests: cap 1; earn at N; re-earn after spend by reaching N again; spend on slip; no double-stack

---

## T16 — Deadline close Day (auto-slip)

**Problem:** At Deadline, silent Checklist members get slip-class Check-ins; then Day closes. Summary facts are T23.

**Done when:** `closeDayAtDeadline(chatId, dayKey)` (or equivalent) auto-slips each Checklist member without a Check-in for that Day using Grace Token rules; Day marked closed; members who already Check-in-ed are untouched; tests cover mixed silent/checked.

**Depends on:** T12, T13, T14, T15

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md) (Deadline), [spec/stats.md](../spec/stats.md), [ADR 0001](../docs/adr/0001-grace-token.md)

**Out of scope:** Posting Day Summary text; Telegram send; scheduler timer (T21 wires the call)

**Tasks:**

- [ ] **T16.1** Identify silent Checklist members for Day (no Check-in row yet)
- [ ] **T16.2** Write slip-class Check-in per silent member via Grace Token rules
- [ ] **T16.3** Close Day after auto-slips; safe if Checklist empty (document: no Summary obligation at verb layer — product Summary when Checklist exists is T23/agent)
- [ ] **T16.4** Tests: all silent; partial Check-ins; token spend on silence; Day closed afterward

---

## T17 — Late fix until next Reminder

**Problem:** After Deadline, members may correct a Check-in until the chat’s next Reminder; sober fix may refund Grace Token.

**Done when:** `correctCheckIn` (or equivalent) allowed only during the **late-fix period** (after Day closed, **until next Reminder**); updates stored status; refunds per T15.4 when applicable; streaks recompute from history on read; tests for allowed vs past-next-Reminder rejection ([ADR 0005](../docs/adr/0005-late-fix-until-next-reminder.md)). No check-in **window**.

**Depends on:** T14, T15, T16, T11 (Reminder schedule for “next Reminder” boundary)

**Spec / arch links:** [ADR 0005](../docs/adr/0005-late-fix-until-next-reminder.md), [spec/daily-rhythm.md](../spec/daily-rhythm.md), [spec/stats.md](../spec/stats.md)

**Out of scope:** Forever-editable history; freeze-at-midnight-only rule; inventing a check-in window

**Tasks:**

- [ ] **T17.1** Helper: is late fix still allowed now? (after Day closed, **until next Reminder** in chat TZ)
- [ ] **T17.2** `correctCheckIn` → new status; apply refund when correcting to sober if token was spent
- [ ] **T17.3** Reject corrections after the late-fix period ends (once next Reminder has passed)
- [ ] **T17.4** Tests: auto-slip → sober refund; correction after next Reminder rejected; open-Day ordinary record still via T14 not late-fix

---

## T18 — Streak and full stats (derived on read)

**Problem:** Streak / Antistreak / Longest are derived — never stored as source of truth that can drift from Check-in history.

**Done when:** Pure (or store-backed read) functions compute Streak (`minor_slip` non-counting, non-breaking), Antistreak, Longest Streak, Grace Token presence, and a full-stats bundle; tests lock the walk algorithm ([spec/stats.md](../spec/stats.md)).

**Depends on:** T10.4, T14/T15 writes available for fixtures (can start pure walk tests with in-memory fixture lists)

**Spec / arch links:** [spec/stats.md](../spec/stats.md), [CONTEXT.md](../CONTEXT.md) (Streak, Antistreak, Longest Streak, Full stats)

**Out of scope:** Unsolicited Antistreak in Summary copy (agent board); dumping full stats unsolicited

**Tasks:**

- [ ] **T18.1** Pure Streak walk over ordered Check-in history (`minor_slip` non-counting, non-breaking)
- [ ] **T18.2** Antistreak walk (consecutive slip Days)
- [ ] **T18.3** Longest Streak (all-time best sober Streak)
- [ ] **T18.4** `fullStats(chatId, memberId)` bundle: Streak, Antistreak, Longest, Grace Token есть/нет, totals stub/minimal (totals detail open in spec — pick minimal documented set)
- [ ] **T18.5** Tests: fixtures for shielded slip preserving Streak; major_slip breaks; Antistreak counts both slip classes

---

## T19 — Day resolution helper

**Problem:** When speech is ambiguous, core should expose deterministic resolution order; agent asks only when helper returns unclear.

**Done when:** Pure helper implements order from [spec/daily-rhythm.md](../spec/daily-rhythm.md): explicit fixable Day → open Day → previous fixable Day → current/upcoming; returns target Day key or `unclear`; unit tests for each branch. No LLM inside helper.

**Depends on:** T13, T17 (fixable = still within late-fix period until next Reminder)

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md) (Day resolution), [CONTEXT.md](../CONTEXT.md) (Day resolution), [spec/agent.md](../spec/agent.md)

**Out of scope:** Natural-language date parsing (adapter/agent supplies structured “explicit day” when known); asking the clarifying question text

**Tasks:**

- [ ] **T19.1** Input shape: chat settings + now + optional explicit day + open Day + previous Day fixability
- [ ] **T19.2** Implement resolution order → `{ dayKey }` or `{ unclear: true }`
- [ ] **T19.3** Tests: each of the four branches + unclear case

---

## T20 — Session hub

**Problem:** One in-flight Session per chat; serialized turns; idle close. Distinct from Day.

**Done when:** `getOrStart(chatId)`, per-chat mutex/queue, idle timeout reset on activity, idle → close → drop ephemeral history; process restart loses RAM Session only; optional 1–2s coalesce hook stub for button spam (no answer delay). Exact idle minutes locked in this theme.

**Depends on:** foundation packages; no hard depend on ledger for hub itself (may call refactor no-op hook)

**Spec / arch links:** [spec/session.md](../spec/session.md), [ADR 0004](../docs/adr/0004-agentic-session-vs-day.md), [architecture.md](architecture.md) (Session hub)

**Out of scope:** Profile/Diary refactor implementation (Phase 2 — provide empty/no-op hook); Grammy wiring; Mastra generate body (T24/agent)

**Tasks:**

- [ ] **T20.1** Lock idle timeout minutes in core constant (within spec ~5–10; document choice)
- [ ] **T20.2** `getOrStart(chatId)` — at most one Session per chat; create if none
- [ ] **T20.3** Per-chat turn serialization (mutex/queue) — overlapping turns cannot interleave generates
- [ ] **T20.4** Activity resets idle timer; idle fires → close Session → invoke memory-refactor hook (no-op in Phase 1) → drop ephemeral history
- [ ] **T20.5** Optional coalesce window 1–2s for burst events — not used to delay ordinary answers; document
- [ ] **T20.6** Tests: single Session; mutex ordering; idle close; restart has no durable Session row required

---

## T21 — Scheduler (Reminder / Deadline wakes)

**Problem:** Core owns when Reminder and Deadline are due in chat TZ; each due event should wake a short Session.

**Done when:** Given “now” + chat settings, core detects due Reminder / due Deadline for the correct Day key; exposes a tick/scan API that returns wake intents; integrating with Session `getOrStart` is tested with a fake clock. No Telegram send inside scheduler.

**Depends on:** T11, T13, T16 (Deadline action), T20 (Session wake)

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md), [spec/session.md](../spec/session.md) (scheduler wakes Session), [architecture.md](architecture.md) (Scheduler), [ADR 0002](../docs/adr/0002-overnight-deadline-day-key.md)

**Out of scope:** OS cron; Reminder button labels posting; Day Summary narration; choosing webhook vs polling (telegram board)

**Tasks:**

- [ ] **T21.1** Pure due-check: Reminder due? Deadline due? for one chat at instant `now`
- [ ] **T21.2** Day key association for each due event (evening key rules)
- [ ] **T21.3** Tick/scan across chats → list of wake intents `{ chatId, kind: reminder|deadline, dayKey }`
- [ ] **T21.4** Reminder intent order (no Telegram I/O): resolve evening Day key → `ensureOpenDay` (T13) for that key → Session wake `reminder` via `getOrStart` with `{ kind: reminder, dayKey }`
- [ ] **T21.5** Deadline intent order (no Telegram I/O): resolve evening Day key → **T16** `closeDayAtDeadline` → Session wake `deadline` via `getOrStart` with `{ kind: deadline, dayKey }` (dayKey available for T23 Summary facts); tests with fake clock / overnight Deadline

---

## T22 — askWithOptions (core, no Grammy)

**Problem:** Closed choices are channel-agnostic; Telegram only renders buttons later. Caption length must be limited.

**Done when:** Core type/verb describes options + optional skip/reject; **caption max locked** (numeric constant in core); Reminder default labels **Красавчик** / **Оступился** available as defaults; validation rejects over-long captions. No Grammy keyboards here.

**Depends on:** none beyond package (can parallel early)

**Spec / arch links:** [CONTEXT.md](../CONTEXT.md) (askWithOptions), [spec/telegram-ux.md](../spec/telegram-ux.md), [spec/agent.md](../spec/agent.md), [architecture.md](architecture.md) (tool rule)

**Out of scope:** Inline keyboard; callback handling; parse_mode

**Tasks:**

- [ ] **T22.1** Lock caption max length constant in `@sobri/core` (document number next to constant)
- [ ] **T22.2** `askWithOptions` input/result types: options[], optional skip/reject, caption validation
- [ ] **T22.3** Reminder default option labels constant: Красавчик / Оступился
- [ ] **T22.4** Tests: over-long caption rejected; defaults exported

---

## T23 — Day Summary fact bundle

**Problem:** After Deadline, product needs Summary facts (heroes/support/quiet) without Antistreak scoreboard — core supplies data; agent narrates later.

**Done when:** Given a closed Day, core returns a structured fact bundle: sober members, slip members, quiet Day flag, Checklist empty flag; **does not** include Antistreak leaderboard fields; tests lock shape.

**Depends on:** T16

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md) (Day Summary), [spec/stats.md](../spec/stats.md) (voice), [CONTEXT.md](../CONTEXT.md) (Day Summary)

**Out of scope:** Russian prose generation; Telegram post/thread; agent tone (agent board)

**Tasks:**

- [ ] **T23.1** `daySummaryFacts(chatId, dayKey)` from Check-ins + Checklist
- [ ] **T23.2** When Checklist exists, expose a soft-line / quiet flag for Summary consumers per [spec/daily-rhythm.md](../spec/daily-rhythm.md) (“soft line if quiet”) — **no invented numeric “few sobers” threshold**; agent may interpret quiet from the fact bundle later
- [ ] **T23.3** Assert bundle omits Antistreak rankings
- [ ] **T23.4** Tests: heroes/support partition; empty Checklist; soft-line flag present when Checklist exists (shape only — no threshold invention)

---

## T24 — Mastra tool bindings (verbs only)

**Problem:** Agent must call durable verbs through tools; narrative cannot bypass ledger.

**Done when:** Mastra tools in `@sobri/core` wrap record/correct Check-in, Checklist, settings read/update, full stats, Day resolution helper, askWithOptions, daySummaryFacts, Deadline/Reminder actions as appropriate; tools return verb results; smoke test that a tool invokes store (no live model required if Mastra allows mocked tool exec). Character prompt / MODEL_ID wiring left to agent board where needed.

**Depends on:** T11–T23 as applicable; foundation env for `MODEL_ID` optional for this theme’s smoke

**Spec / arch links:** [architecture.md](architecture.md) (Mastra placement; durable verbs vs agent), [spec/agent.md](../spec/agent.md) (conflict rule)

**Out of scope:** Character.md prompt pack; Day Summary prose; Telegram adapter; Profile/Diary tools (Phase 2)

**Tasks:**

- [ ] **T24.1** Tool module layout under `@sobri/core` (register list)
- [ ] **T24.2** Tools: Check-in record + correct; Checklist join/leave/remove
- [ ] **T24.3** Tools: settings get/update; fullStats; day resolution
- [ ] **T24.4** Tools: askWithOptions passthrough; daySummaryFacts
- [ ] **T24.5** Smoke: invoke one write tool against temp DB → row visible; lint/typecheck clean

---

## T25 — Chat Character durable setting

**Problem:** Each chat needs one persistent Character face (`unset` until admin chooses) before telegram/agent can force-choose or load voice.

**Done when:** Chat settings (or sibling column) store Character as `unset` | `pan` | `artemis` | `apollo` | `hestia`; get/set verbs with validation; default on create = `unset`; unit tests cover set/get/reject unknown id. No Telegram title sync here.

**Depends on:** T11; character board **T70** (catalog locked in SPEC/glossary)

**Spec / arch links:** [character-tasks.md](character-tasks.md) (T70), [spec/character.md](../spec/character.md), [`CONTEXT.md`](../CONTEXT.md) (Character), [architecture.md](architecture.md) (chat settings)

**Out of scope:** `/settings` UI; `setChatAdministratorCustomTitle`; prompt cards (T61); Diary mark (T62); package rename (T71)

**Tasks:**

- [ ] **T25.1** Migration: Character field on chat settings (`unset` + four catalog ids)
- [ ] **T25.2** `getCharacter` / `setCharacter` (or settings update path) with catalog validation
- [ ] **T25.3** New chat defaults to `unset`
- [ ] **T25.4** Tests: set each id; reject unknown; read round-trip
- [ ] **T25.5** Expose Character on settings get used by T24 tools / telegram (no title side effects)

---

## Suggested build order

```text
foundation T5–T6 (done gate)
  → T10 schema
  → T11 settings
  → T12 Checklist
  → T13 Day identity
  → T18.1 Streak walk (pure) ∥ early
  → T15 Grace Token
  → T14 Record Check-in
  → T16 Deadline auto-slip
  → T17 Late fix
  → T18.2–T18.5 remaining stats
  → T19 Day resolution
  → T20 Session hub          ∥ can start after foundation
  → T21 Scheduler (needs T16 + T20)
  → T22 askWithOptions       ∥ anytime after foundation
  → T23 Day Summary facts
  → T24 Mastra tool bindings
  → T25 Character setting    (needs T70 + T11)
```

Suggested first three core slices once foundation boot works:

1. **T10.1** — chats + settings migration  
2. **T10.2** — Checklist migration  
3. **T10.3** — Days migration  

## Non-goals

- Grammy / Telegram I/O, `/settings` UI, inline keyboards (telegram board)
- Character prompt, Summary prose tone, manners copy (agent board T61)
- Telegram Character picker / admin title (telegram T44)
- Profile / Diary tables, digest injection, recall/refactor implementation (Phase 2)
- Spec Character lock / package rename (character board T70–T71)
- Check-in **window** / live poll as source of truth
- sushkobot V1 DB import
- Per-person Reminder times
- Monetization; admin HTTP client
- Inventing statuses (`missed` / `absent`) or bypassing Grace Token rules

## Related

- Process: [tickets.md](tickets.md)
- Architecture: [architecture.md](architecture.md)
- Foundation: [foundation-tasks.md](foundation-tasks.md)
- Character: [character-tasks.md](character-tasks.md) (T70, T25 depends)
- Spec: [daily-rhythm.md](../spec/daily-rhythm.md), [stats.md](../spec/stats.md), [checklist.md](../spec/checklist.md), [session.md](../spec/session.md), [agent.md](../spec/agent.md), [character.md](../spec/character.md)
- ADRs: [0001](../docs/adr/0001-grace-token.md), [0002](../docs/adr/0002-overnight-deadline-day-key.md), [0004](../docs/adr/0004-agentic-session-vs-day.md), [0005](../docs/adr/0005-late-fix-until-next-reminder.md)
- DOX: [AGENTS.md](AGENTS.md)
