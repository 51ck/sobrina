# T18 — Streak and full stats (derived on read)

Status: ready-for-agent

**Problem:** Streak / Antistreak / Longest are derived — never stored as source of truth that can drift from Check-in history.

**Done when:** Pure (or store-backed read) functions compute Streak (`minor_slip` non-counting, non-breaking), Antistreak, Longest Streak, Grace Token presence, and a full-stats bundle; tests lock the walk algorithm ([spec/stats.md](../../../spec/stats.md)).

**Depends on:** T10.4 ([01-ledger-schema.md](01-ledger-schema.md)), T14/T15 writes available for fixtures (can start pure walk tests with in-memory fixture lists) ([05-record-check-in-verb.md](05-record-check-in-verb.md), [06-grace-token-rules.md](06-grace-token-rules.md))

**Spec / arch links:** [spec/stats.md](../../../spec/stats.md), [CONTEXT.md](../../../CONTEXT.md) (Streak, Antistreak, Longest Streak, Full stats)

**Out of scope:** Unsolicited Antistreak in Summary copy (agent board); dumping full stats unsolicited

**Tasks:**

- [ ] **T18.1** Pure Streak walk over ordered Check-in history (`minor_slip` non-counting, non-breaking)
- [ ] **T18.2** Antistreak walk (consecutive slip Days)
- [ ] **T18.3** Longest Streak (all-time best sober Streak)
- [ ] **T18.4** `fullStats(chatId, memberId)` bundle: Streak, Antistreak, Longest, Grace Token есть/нет, totals stub/minimal (totals detail open in spec — pick minimal documented set)
- [ ] **T18.5** Tests: fixtures for shielded slip preserving Streak; major_slip breaks; Antistreak counts both slip classes
