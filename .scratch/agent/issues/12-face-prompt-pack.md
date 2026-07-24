# T61 — Face prompt pack (Character catalog)

Status: ready-for-agent

**Problem:** Chat Character face must drive voice/gender; other faces are alternate faces of the same Sobri instance, not other people.

**Done when:** Prompt pack loads **active** Character full card (Pan / Artemis / Apollo / Hestia) from SPEC; injects short blurbs for the other three as same-instance faces (for admin switch awareness only); agent must not "notice" or roleplay other faces in chat; Sobri continuous self (no kinship self-claim; no "я Пан" costume spam); **no user-facing narration when Character changes**; gender/grammar follows active face; smoke with mocked Character id.

**Depends on:** T50 ([01-mastra-agent-bootstrap.md](01-mastra-agent-bootstrap.md)), T51 ([02-character-and-authority-prompts.md](02-character-and-authority-prompts.md)); character board **T70** (resolved — [../character/issues/01-spec-character-sobri.md](../../character/issues/01-spec-character-sobri.md)); core **T25** for reading active Character (or test fixture) ([../core/issues/16-chat-character-durable-setting.md](../../core/issues/16-chat-character-durable-setting.md))

**Spec / arch links:** [spec/character.md](../../../spec/character.md), [character spec.md](../../character/spec.md) (T70), [CONTEXT.md](../../../CONTEXT.md) (Character, Sobri)

**Out of scope:** Telegram title sync (telegram T44); Diary append (T62); package rename (character T71); inventing fifth faces

**Tasks:**

- [ ] **T61.1** Prompt files: four face cards + shared foundation (from T70 character.md)
- [ ] **T61.2** Turn injection: active face full; other faces short same-instance blurbs
- [ ] **T61.3** Encode: no kinship claim; no noticing other faces in speech; no switch announcement
- [ ] **T61.4** Wire agent factory to chat Character from core T25 (unset → do not run personality path; telegram T44 gates)
- [ ] **T61.5** Smoke: apollo vs pan fixtures → different voice cues in instructions; lint/typecheck clean
