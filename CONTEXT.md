# Sobrina

Telegram group sobriety companion: conversational Check-ins, Reminder + Deadline Days, Grace Token, chat memory, agentic Sessions.

## Language

**Check-in**:
One member’s recorded status for one calendar date in a chat. Stored as `sober` | `minor_slip` | `major_slip`.
_Avoid_: window, poll, check-in day (as the record); missed/absent as a first-class status
_RU_: отметка · action: отметиться · speech: трезв / оступился

**Day**:
A calendar date in the chat’s timezone identifying one evening’s ledger; accumulates Check-ins; closes at the Deadline (which may be next morning). Keyed to the Reminder cycle’s evening date when Deadline crosses midnight.
_Avoid_: window, Check-in Day; using Deadline’s clock date as the Day key
_RU_: день

**Grace Token**:
A per-member shield (cap 1). Earned when sober Streak reaches N Days (chat setting, default 3). Spent on explicit slip or Deadline silence → `minor_slip`. No token → `major_slip`. Late sober fix refunds a token spent by that Check-in.
_Avoid_: invisible grace threshold gate; stacking tokens; mute to save token
_RU_: заморозка

**Reminder**:
Scheduled prompt to Check-in, set via group `/settings`.
_RU_: напоминание

**Deadline**:
Scheduled close of the Day; auto-slip for silent Checklist members; then Day Summary. May fall next clock morning; Day key stays evening/Reminder date.
_RU_: дедлайн · «время закрытия дня»

**Day resolution**:
Which Day a Check-in targets when speech is ambiguous: explicit day → open Day → fixable previous Day → current/upcoming; Sobrina asks if unclear.

**Late fix**:
Correcting a Check-in after Deadline until the chat’s next Reminder. Sober correction refunds a spent Grace Token.

**Checklist**:
Tracked members in a chat. Only they get Deadline auto-slip and streak accounting. Self join/leave; admin can remove; Reminder button or conversational Check-in joins and records.
_Avoid_: Roster as primary term; nightly ad-hoc subset
_RU_: список

**Streak**:
Current consecutive sober Days for a member (`minor_slip` non-counting, non-breaking). Derived on read.
_RU_: серия (трезвости)

**Antistreak**:
Current consecutive slip Days. Computed under the hood; do not lead with it unless asked or full stats requested.
_RU_: антисерия · «серия срывов»

**Longest Streak**:
All-time best sober Streak for a member.
_RU_: лучшая серия · рекорд

**Full stats**:
Read bundle for a Checklist member: Streak, Antistreak, Longest Streak, Grace Token, totals. Not dumped unsolicited.

**Session**:
One in-flight agentic conversation runtime per chat. Idle-timeout close; turns serialized. Distinct from Day.
_Avoid_: equating with Day or Reminder→Deadline span
_RU_: сессия (mostly internal)

**Chat Profile**:
Stable free-form markdown about how the chat works (tone, nicknames, manners, lore pointers).
_RU_: профиль чата

**Diary**:
Dated/continuity free-form markdown; append + refactor. Short digest injected each turn; full text via recall.
_RU_: дневник

**Day Summary**:
Post after Deadline: heroes and support; soft line if quiet; no Antistreak scoreboard.
_RU_: итог дня

**askWithOptions**:
Channel-agnostic closed choice (buttons). Caption length limited. Reminder defaults to Красавчик / Оступился unless special chrome is truly needed. Free text still wins for Check-in intent.

**Sobrina**:
The agent person in the group — character, memory, conversational Check-ins; not a timed poll form.
