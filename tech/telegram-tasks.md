# Telegram — ticket board

Board under the [in-repo ticket system](tickets.md). Phase 1 group adapter in `@sobri/telegram`. Spec: [telegram-ux.md](../spec/telegram-ux.md), [daily-rhythm.md](../spec/daily-rhythm.md), [checklist.md](../spec/checklist.md). Arch: [architecture.md](architecture.md) (adapter I/O only; channel tools call core verbs). Glossary: [`CONTEXT.md`](../CONTEXT.md).

IDs **T30–T44** (foundation T1–T6, core T10–T25; cross-board uniqueness per [tickets.md](tickets.md)).

## Why

Core owns the ledger, Session hub, scheduler due-checks, and `askWithOptions` types. Phase 1 still needs a live **group** Grammy path: map Telegram ids → core, deliver Reminder / Day Summary, render buttons with caption limits, run `/settings` for group admins + env bot admins, and hand Check-in / Checklist intents to durable verbs. Free text always wins for Check-in intent. No DM-primary surface; no product rule invention in the adapter.

## Themes

1. **Grammy group boot** — token, long-polling (or webhook later), process entry
2. **Identity bridge** — Telegram chat/user → core chat/member ids
3. **Inbound → Session** — group messages/callbacks wake `getOrStart`
4. **Outbound send** — readable Russian; chosen parse mode; safe send
5. **askWithOptions chrome** — inline keyboard; enforce core caption max
6. **Reminder delivery** — post Reminder + default Красавчик / Оступился
7. **Button Check-in** — callback → join + record via core
8. **Free-text Check-in handoff** — speech path to Session/core; wins over buttons
9. **`/settings`** — Reminder, Deadline, TZ, N; admins only
10. **Character pick + admin title** — force-choose face; `setChatAdministratorCustomTitle` best-effort
11. **Checklist commands** — join/leave handoff to core
12. **Day Summary delivery** — post after Deadline using core facts (+ agent prose when ready)
13. **Scheduler loop in process** — call core tick → consume intents → T35 / T40 I/O only
14. **Hygiene** — edit-in-place Reminder chrome; no proactive user-message deletes

---

## T30 — Grammy group boot

**Problem:** Without a running group bot entry, no Telegram MVP path is real.

**Done when:** `@sobri/telegram` starts with `TELEGRAM_BOT_TOKEN`, connects via Grammy, and can receive an update from a group (log or echo stub). Privacy Mode off called out in install notes (README or package note). No ledger writes yet.

**Depends on:** foundation T4 (env), T6 (boot patterns); package `@sobri/telegram` from T1

**Spec / arch links:** [spec/telegram-ux.md](../spec/telegram-ux.md) (Install), [architecture.md](architecture.md) (`@sobri/telegram`)

**Out of scope:** DM-primary UX; webhook vs polling final ops choice beyond a working local default; character prompt

**Tasks:**

- [ ] **T30.1** Grammy bot factory reading `TELEGRAM_BOT_TOKEN`; fail fast if missing
- [ ] **T30.2** Process entry / root script (e.g. `bun run bot`) starts the bot
- [ ] **T30.3** Receive group message update → structured log (chat id, user id, text) — no core yet
- [ ] **T30.4** Install note: Privacy Mode off; bot needs post/edit in group ([spec/telegram-ux.md](../spec/telegram-ux.md))

---

## T31 — Identity bridge

**Problem:** Core verbs use opaque chat/member ids; Telegram supplies numeric chat/user ids.

**Done when:** Stable mapping Telegram group chat → core `chatId`, Telegram user → core `memberId`; `getOrCreateChat` on first sight; no cross-chat leakage; unit tests on mapping helpers.

**Depends on:** T30, core T11.1

**Spec / arch links:** [architecture.md](architecture.md) (adapters map ids), [CONTEXT.md](../CONTEXT.md)

**Out of scope:** Multi-bot sharding; importing sushkobot ids

**Tasks:**

- [ ] **T31.1** `toChatId(telegramChatId)` / `toMemberId(telegramUserId)` (document format; stable strings OK)
- [ ] **T31.2** On inbound group event: ensure core chat exists via T11
- [ ] **T31.3** Tests: same Telegram ids → same core ids; different chats isolated

---

## T32 — Inbound event → Session hub

**Problem:** Group messages and callbacks must wake the one Session per chat and serialize turns.

**Depends on:** T31, core T20

**Done when:** Inbound group text/callback enters `getOrStart(chatId)` under per-chat mutex; activity resets idle; adapter does not bypass Session for agent turns. Stub handler may no-op reply until later themes.

**Spec / arch links:** [spec/session.md](../spec/session.md), [ADR 0004](../docs/adr/0004-agentic-session-vs-day.md), [architecture.md](architecture.md) (Session hub)

**Out of scope:** Full Mastra dialogue; Profile/Diary; coalesce tuning beyond calling core hook if exposed

**Tasks:**

- [ ] **T32.1** Wire group `message` → Session `getOrStart` + turn queue
- [ ] **T32.2** Wire `callback_query` → same Session path (distinct event kind)
- [ ] **T32.3** Drop/ignore non-group chats for Phase 1 (or reply once “group only”) — document choice
- [ ] **T32.4** Tests or smoke: two rapid messages same chat serialize; two chats independent

---

## T33 — Outbound send path

**Problem:** Outbound must be readable Russian-capable text with a locked parse mode and safe failure.

**Done when:** Adapter send helper always applies chosen `parse_mode` (lock HTML or plain in this theme — document); never forwards raw unsafe markup unchecked; parse failure falls back to plain text without crashing.

**Depends on:** T30

**Spec / arch links:** [spec/telegram-ux.md](../spec/telegram-ux.md) (Hygiene — readable Russian outbound), [architecture.md](architecture.md)

**Out of scope:** Heavy markdown tables; Mini Apps; deleting user messages

**Tasks:**

- [ ] **T33.1** Lock Phase 1 outbound `parse_mode` (document choice in package note)
- [ ] **T33.2** `sendMessage(chat, text, extras?)` applies parse mode + sanitize/escape as needed
- [ ] **T33.3** Fallback: send failure / parse error → plain text retry once
- [ ] **T33.4** `editMessage` helper for Reminder chrome updates (used by T42)

---

## T34 — askWithOptions → inline keyboard

**Problem:** Core `askWithOptions` must render as Telegram buttons; adapter enforces caption max from core.

**Done when:** Options become inline keyboard; over-long labels are **rejected/blocked** per core max (T22.1) — **do not silently truncate** product labels; optional skip/reject mapped if present; callback payload round-trips to Session without inventing ledger outcomes. Reminder defaults available from core constants.

**Depends on:** T32, T33, core T22

**Spec / arch links:** [CONTEXT.md](../CONTEXT.md) (askWithOptions), [spec/telegram-ux.md](../spec/telegram-ux.md), [architecture.md](architecture.md) (tool rule)

**Out of scope:** Core validation rewrite; essays on buttons; forcing buttons-only Check-in; silent truncation of labels

**Tasks:**

- [ ] **T34.1** Map `askWithOptions` → Grammy inline keyboard builder
- [ ] **T34.2** Before send: **reject/block** any label over core caption max (defense in depth; no silent truncate)
- [ ] **T34.3** Callback data encoding/decoding → option id / reject / skip → Session event
- [ ] **T34.4** Expire/replace keyboard after answer when practical (edit or disable); document behavior
- [ ] **T34.5** Tests: over-long label blocked; default labels Красавчик / Оступился render

---

## T35 — Reminder delivery

**Problem:** When core scheduler wakes Reminder, the group must see Reminder text + Check-in buttons.

**Done when:** On Reminder intent, adapter **posts the core Reminder Session turn result** (`runTurn` / `kind: reminder` from agent **T56**) — text + askWithOptions (defaults Красавчик / Оступился unless turn supplies special chrome); no ledger writes in the post itself. Until T56: **minimal stub** post only. Free text still accepted afterward (T37).

**Depends on:** T34, core T21.4; agent **T56** for product Reminder copy (stub OK before T56)

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md) (Reminder), [spec/telegram-ux.md](../spec/telegram-ux.md), [agent-tasks.md](agent-tasks.md) (T56)

**Out of scope:** Mid-evening nudge beat; **authoring product Reminder copy in the adapter after T56** (core turn owns it); Mastra/generate in telegram

**Tasks:**

- [ ] **T35.1** Handler: Reminder wake → post core `runTurn` Reminder result (text + options); until T56 use minimal stub — **do not author product Reminder after T56**
- [ ] **T35.2** Send Reminder message + keyboard to mapped Telegram chat (from turn/stub result)
- [ ] **T35.3** Store message id for optional edit-in-place (T42)
- [ ] **T35.4** Smoke: Reminder intent → posted message has two default buttons (from turn result or stub)

---

## T36 — Button Check-in → core verbs

**Problem:** Button tap must join Checklist if needed and record Check-in via durable verbs — adapter does not invent status.

**Done when:** Callback for Красавчик / Оступился (or mapped option) calls core join+record / recordCheckIn with correct Day (via Day resolution or open Day from Reminder context); answers callback; updates chrome if needed. Tests with temp DB / mocked core.

**Depends on:** T34, T35, core T14, T12, T19 as needed

**Spec / arch links:** [spec/checklist.md](../spec/checklist.md) (button = join + record), [spec/daily-rhythm.md](../spec/daily-rhythm.md), [spec/stats.md](../spec/stats.md)

**Out of scope:** Bypass Grace Token; writing closed Days via T14 (use T17 path when late)

**Tasks:**

- [ ] **T36.1** Map default buttons → sober / slip intent
- [ ] **T36.2** Call core join+record (or composition) with bridged ids + Day key from Reminder/Session context
- [ ] **T36.3** Closed Day / late-fix period (until next Reminder): call T17 **`correctCheckIn` only** — never T14 write on a closed Day
- [ ] **T36.4** Ack callback; optional confirm edit on Reminder message
- [ ] **T36.5** Tests: new member joins+records; existing member records; core rejection surfaced without crash

---

## T37 — Free-text Check-in handoff

**Problem:** Free text always wins for Check-in intent; speech must reach Session → core verbs (agent may classify intent later).

**Done when:** Group text is delivered to Session turn (+ T24 tools when ready); **no adapter NLU/heuristic that invents statuses**; temporary path is **handoff only** (same as T37.3); button state must not block free-text Check-in. No buttons-only product.

**Depends on:** T32, core T14/T17/T19; agent tools T24 optional for intent classification

**Spec / arch links:** [CONTEXT.md](../CONTEXT.md) (askWithOptions — free text wins), [spec/telegram-ux.md](../spec/telegram-ux.md), [spec/daily-rhythm.md](../spec/daily-rhythm.md)

**Out of scope:** Adapter NLU/heuristics that invent Check-in statuses; inventing ledger without verbs

**Tasks:**

- [ ] **T37.1** Group text → Session turn payload (raw text + member/chat ids)
- [ ] **T37.2** Wire Session turn to Mastra/core tools when available (T24) for Check-in intent
- [ ] **T37.3** Temporary until agent board: explicit Session handoff only — no adapter status invention
- [ ] **T37.4** Verify free text works even while Reminder keyboard still visible (product: free text wins)

---

## T38 — `/settings` (admins)

**Problem:** Group Telegram admins + env bot admins configure Reminder, Deadline, TZ, N — not arbitrary Checklist members.

**Done when:** `/settings` (or locked slash name) readable/writable only for Telegram group admins or env bot-admin allowlist; updates core T11 settings; rejects others with short Russian notice. Exact slash menu names locked in this theme.

**Depends on:** T31, T33, core T11; foundation env for bot-admin allowlist name (lock in `.env.example` if not already)

**Spec / arch links:** [spec/telegram-ux.md](../spec/telegram-ux.md) (`/settings`), [spec/daily-rhythm.md](../spec/daily-rhythm.md) (settings fields), [architecture.md](architecture.md) (env bot admins)

**Out of scope:** Per-person Reminder times; Checklist membership UI inside settings; Character picker (T44)

**Tasks:**

- [ ] **T38.1** Lock slash command name(s) for settings + help entry in bot command list
- [ ] **T38.2** Env bot-admin allowlist parse (names only in `.env.example`); combine with Telegram `getChatAdministrators` / message sender admin check
- [ ] **T38.3** Authorized flow: show current Reminder, Deadline, TZ, N (**заморозка**); accept updates → `updateSettings`
- [ ] **T38.4** Unauthorized → short reject; no settings leak beyond “no access”
- [ ] **T38.5** Tests: admin allowed; non-admin rejected; N default 3 visible

---

## T39 — Checklist join / leave commands

**Problem:** Members need join/leave without requiring a Check-in; admin remove path optional via command or agent later.

**Done when:** Locked slash (or menu) commands call core `joinChecklist` / `leaveChecklist`; conversational join via Check-in remains T36/T37. Confirmations in Russian.

**Depends on:** T31, T33, core T12; T38.1 for command registration pattern

**Spec / arch links:** [spec/checklist.md](../spec/checklist.md), [spec/telegram-ux.md](../spec/telegram-ux.md) (Commands)

**Out of scope:** Admin remove UI polish (may be agent-mediated); Roster as a separate product term

**Tasks:**

- [ ] **T39.1** Lock `/join` + `/leave` (or chosen names) in bot commands
- [ ] **T39.2** Handlers → core join/leave with bridged ids; Russian ack
- [ ] **T39.3** Optional `/remove` or admin-only remove → core `removeFromChecklist` — or document deferred to agent
- [ ] **T39.4** Tests: join idempotent; leave when absent safe per core contract

---

## T40 — Day Summary delivery

**Problem:** After Deadline, Summary is a normal group post — not an Antistreak scoreboard.

**Done when:** On Deadline Session wake (after core T16), adapter obtains T23 fact bundle (+ agent prose when agent board lands); posts Summary to group; soft line when quiet flag / Checklist exists per facts; does not lead with Antistreak. Reply threading optional — lock choice here.

**Depends on:** T33, core T16, T21.5, T23; agent narration optional stub

**Spec / arch links:** [spec/daily-rhythm.md](../spec/daily-rhythm.md) (Day Summary), [spec/stats.md](../spec/stats.md) (voice), [spec/telegram-ux.md](../spec/telegram-ux.md) (Hygiene)

**Out of scope:** Inventing quiet thresholds; Antistreak leaderboard posts

**Tasks:**

- [ ] **T40.1** Deadline wake → load `daySummaryFacts` for `dayKey`
- [ ] **T40.2** Build outbound text: use agent Summary tool/prose when available; else minimal factual Russian stub from bundle (heroes/support/soft-line) — no Antistreak list
- [ ] **T40.3** Lock threading: normal post vs reply-to Reminder (document)
- [ ] **T40.4** Smoke: closed Day with fixtures → one Summary message; empty Checklist → no shame parade (per core empty flag)

---

## T41 — Scheduler loop in telegram process

**Problem:** Core due-checks need a process tick so the adapter can deliver Reminder / Day Summary I/O.

**Done when:** Bot process periodically calls **core tick** (core owns due-check + T16 + Session wake); telegram **only consumes returned intents** → T35 (Reminder) / T40 (Summary) I/O; **no second Deadline/Reminder rule engine** in the adapter; fake-clock or integration smoke documented. No Telegram I/O inside `@sobri/core`.

**Depends on:** T35, T36, T40, core T21

**Spec / arch links:** [architecture.md](architecture.md) (Scheduler), [spec/daily-rhythm.md](../spec/daily-rhythm.md)

**Out of scope:** External cron service; multi-instance leader election; re-implementing due-check / T16 / Session wake in the adapter

**Tasks:**

- [ ] **T41.1** Interval/timer in telegram (or shared runtime) calling core tick only
- [ ] **T41.2** Consume returned Reminder intents → T35 I/O (no adapter due-check)
- [ ] **T41.3** Consume returned Deadline intents → T40 Summary I/O (T16 + Session wake already done inside core tick)
- [ ] **T41.4** Dedup / “already fired” guard so a tick does not double-post (document strategy; prefer core-owned if possible)
- [ ] **T41.5** Smoke with injected `now` or short test schedule

---

## T42 — Reminder chrome hygiene

**Problem:** Prefer edit-in-place for Reminder updates; never proactively delete user messages.

**Done when:** After button Check-in (and similar), adapter can edit Reminder message chrome instead of spamming new keyboards when message id known; no code path deletes arbitrary user messages.

**Depends on:** T33.4, T35.3, T36

**Spec / arch links:** [spec/telegram-ux.md](../spec/telegram-ux.md) (Hygiene)

**Out of scope:** Moderating / deleting member content; aggressive keyboard wipe of unrelated messages

**Tasks:**

- [ ] **T42.1** On successful button Check-in: edit Reminder reply markup or caption chrome when message id stored
- [ ] **T42.2** Audit: no `deleteMessage` on user messages in adapter paths
- [ ] **T42.3** Fallback if edit fails: send short ack instead of deleting anything

---

## T43 — Help + progress command handoff

**Problem:** Minimum command surface includes help and progress/stats entry points.

**Done when:** Locked `/help` (or equivalent) posts short Russian usage; progress/stats command or mention hands off to Session → core `fullStats` / agent (no fabricated numbers). Exact names locked with T38.1 menu.

**Depends on:** T32, T33, core T18.4; agent optional for narration

**Spec / arch links:** [spec/telegram-ux.md](../spec/telegram-ux.md) (Commands), [spec/stats.md](../spec/stats.md), [spec/agent.md](../spec/agent.md)

**Out of scope:** Full stats dump unsolicited; Antistreak-leading greetings

**Tasks:**

- [ ] **T43.1** Lock `/help` text (commands + “talk to Sobri” pointer)
- [ ] **T43.2** Progress/stats entry → Session + `fullStats` tool path (or stub “ask Sobri” until agent board)
- [ ] **T43.3** Register commands with Bot API command menu

---

## T44 — Character `/settings` + force-choose + admin title

**Problem:** Chat must pick one Character face before personality runs; Telegram should show the face code name as Sobri’s admin custom title when possible.

**Done when:** Admins (same gate as T38) set Character via `/settings` or askWithOptions picker to `pan|artemis|apollo|hestia`; until not `unset`, bot only does setup/choose (no Check-in personality); on set/change calls `setChatAdministratorCustomTitle` with code name in chat language (Пан / Артемида / Аполлон / Гестия or EN equivalents); soft-fail + one Russian warn if not admin / API fail; Character still saved via core T25; retry title sync when admin rights appear. No user-facing “face switched” narration from adapter.

**Depends on:** T38, core **T25**; character board **T70**

**Spec / arch links:** [spec/telegram-ux.md](../spec/telegram-ux.md), [spec/character.md](../spec/character.md), [character-tasks.md](character-tasks.md) (T70), [CONTEXT.md](../CONTEXT.md) (Character)

**Out of scope:** Prompt cards (T61); Diary mark (T62); package rename (T71); changing BotFather display name

**Tasks:**

- [ ] **T44.1** Admin Character picker in `/settings` (or linked askWithOptions) → core `setCharacter`
- [ ] **T44.2** Force-choose gate: if Character `unset`, setup/choose path only — no Check-in personality Session voice
- [ ] **T44.3** On set/change: `setChatAdministratorCustomTitle` to code name for chat language
- [ ] **T44.4** Soft-fail: warn once if not admin / API error; Character persist still succeeds
- [ ] **T44.5** Retry title sync when Sobri gains admin rights (or documented re-trigger)
- [ ] **T44.6** Tests/smoke: admin can set; non-admin rejected; unset blocks personality path; title failure does not roll back Character

---

## Suggested build order

```text
core T11, T20, T21, T22, T14, T16, T17, T23 (as needed per theme)
  → T30 Grammy boot
  → T31 identity bridge
  → T33 outbound send          ∥ early after T30
  → T32 Session inbound
  → T34 askWithOptions chrome  (needs T22)
  → T38 /settings              (needs T11)
  → T44 Character + title      (needs T25 + T38)
  → T39 join/leave
  → T35 Reminder delivery
  → T36 button Check-in
  → T37 free-text handoff
  → T40 Day Summary delivery
  → T41 scheduler loop         (handlers first; loop last)
  → T42 Reminder hygiene
  → T43 help/progress
```

Suggested first three slices:

1. **T30.1** — Grammy bot factory + token fail-fast  
2. **T30.2** — `bun run bot` (or equivalent) entry  
3. **T30.3** — group message receive → log  

## Non-goals

- DM as primary Phase 1 surface
- Web UI / Mini Apps
- Ledger fairness or Grace Token rules inside the adapter
- Profile / Diary implementation (Phase 2)
- Character prompt / Summary literary tone (agent board)
- Character SPEC lock / package rename (character board T70–T71)
- sushkobot DB import
- Buttons-only Check-in
- Proactive deletion of user messages
- Per-person Reminder times

## Related

- Process: [tickets.md](tickets.md)
- Architecture: [architecture.md](architecture.md)
- Core board: [core-tasks.md](core-tasks.md) (esp. T25 Character)
- Character: [character-tasks.md](character-tasks.md) (T70)
- Foundation: [foundation-tasks.md](foundation-tasks.md)
- Spec: [telegram-ux.md](../spec/telegram-ux.md), [daily-rhythm.md](../spec/daily-rhythm.md), [checklist.md](../spec/checklist.md), [character.md](../spec/character.md)
- DOX: [AGENTS.md](AGENTS.md)
