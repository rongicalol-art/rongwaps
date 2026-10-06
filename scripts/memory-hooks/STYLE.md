# Memory-hook style guide (Book 1)

Source of truth for hooks shipped in `public/data/memory-hooks/book-1.json`.
Generated and edited through `scripts/memory-hooks/`; this file records the
rules the corpus is reviewed against. Update it whenever a review round
settles a new rule.

## Emphasis and token format

- Every hook carries `字(label)` tokens; every hook lands on its target as
  `字(meaning)` so the target itself bolds.
- Multi-character word hooks name every character of the word. No bare
  "X means Y" restatement.
- A hook must render at least one emphasis run (`tests/content/memoryHookWordQuality.test.ts`).
- Legacy `(字)` references and `**…**` still render, but new content uses tokens.

## Component labels: taught meanings win

- If a component is itself a taught character/vocab (又, 用, 了, 而, 中 …),
  gloss it with its taught meaning.
- Never invent a shape or etymology sense for a taught glyph. Banned examples
  from review: `又(hand)`, `用(barred frame)`, `了(swaddle)`, `而(beard)`,
  `中(stack)`.
- Bridge glosses are banned too (`hand — also 'again'`); rewrite the sentence
  so the taught sense works naturally, e.g. "A hand dips a 勹(wrap) into the
  氵(water), and 又(again) comes up empty → 沒(not) there."
- Reading labels are allowed for phono-semantic components: `青(qīng)`,
  `曷(hé)`, `而(ér)`, `巴(bā)`.
- Genuine contextual senses of a glyph stay when the dictionary documents them
  (子 "noun suffix" in 包子/句子, 公 "metric" in 公里, 會 "gathering" in
  演唱會, 上 "go to" in 上班, 車 "bus" in 公共汽車, 機 "cell phone" in 手機,
  小 "young" in 小姐); the alignment checker lists them for review but they
  are not errors.
- A sense the character does **not** document is rejected even if it reads
  well: review removed 生("student") in 女生/男生, 打("do") in 打開/打算,
  章("piece") in 文章, and 生("produce") in 生病, replacing them with the
  documented sense (生 birth/grow, 打 hit, 章 section).
- Reading labels are the safe fallback for transliteration syllables — never
  claim a meaning for a sound-only component.

### Review refinement (2026-09-16, round 3)

- Every gloss must be a sense the character's dictionary documents. Review
  rejected `以("use")`, `快("pleased")`, `代("stand in")`, `許("perhaps")`,
  `點("o'clock"/"touch")`, `天("season")`, `容("easy")`, `平("ordinary")`.
- When the word uses a sense the character does not carry (快 in 快樂), build
  the story from the documented sense instead of relabeling: `快(quick) +
  樂(joy) → a quick burst of joy → 快樂(happy)`.
- Purely functional glyphs take their reading: `以(yǐ)`, `而(ér)`, `英(Yīng)`.
- The alignment checker skips multi-glyph tokens (`大家(everyone)`,
  `手機(cell phone)`) — those are word-level glosses, not component labels.

## Sound lives in the parts index

- Hooks carry meaning work only. Sound never appears in a hook: no pinyin, no
  "lends the sound", no sound shifts, no pronunciation notes.
- The parts index (`public/data/relations/parts.json`, `npm run relations:build`)
  holds the character → phonetic part link and each part's graded sound
  family; pinyin and the tone shift are derived at runtime. It is purely
  phonetic — no mnemonic, scene, or story.
- The sound pass (`memory-hooks:sound:decide`) is
  Jev-lean and decoupled from hook review:
  - Code accepts a unique full match (initial + final, tone ignored) with no
    API call; the rest go to one batched Jev pass (20 characters per request,
    one Choice per character).
  - Code verifies every Jev pick against ledger readings with sibilant and
    nasal equivalence (j/zh/z, q/ch/c, x/sh/s; ing/eng, in/en); initial-only
    links count as loose, and a confident (≥ 0.7) structural pick with no
    modern-pinyin link is trusted as loose (historical phonetics like 尔/你 or
    生/姓). Rejected or low-confidence picks become pinyin-only and land on the
    needs-human list.
  - Decisions cache by input hash (`review/sound-choice-cache-v1.json`), so
    reruns and later books only pay for deltas. A previously accepted pick is
    kept unless the new pass is confident (≥ 0.6) about a different glyph.
  - `confidence` and `loose` ride along in the pack for tooling; the block
    itself shows pinyin-only when there is no verified piece.

## Meaning and honesty

- Real, checkable origins only (東西, 馬上); otherwise no history claims.
- No variant/etymology framing: never write variant, archaic, ancient, old
  form, old version, or "the name of".
- No grammar metalanguage in prose (particle, measure word, classifier …).
- Characters: one sentence, 25–170 characters of hook text, at most 15 words
  of prose, at most two commas. Words: 12–220 characters, at most 30 words,
  at most 2 sentences.

## Review and edit workflow

- Word edits: decisions file → `applyWordReview.ts` → `exportHookPack.ts`.
- Character edits: decisions file → `applyCharacterReview.ts` → `exportHookPack.ts`.
- Before shipping: `strictHookAudit.ts`, `checkHookQuality.ts --all`,
  `checkComponentLabelAlignment.ts`, and `tests/content/memoryHook*.test.ts`.
- Meaning-only review round (2026-09-22):
  - `memory-hooks:ledger` builds the component ledger (`component-ledger-v1.json`);
    `component-ledger-overrides-v1.json` holds curated corrections (archaic
    pieces carry a sourceRef).
  - `memory-hooks:jev:all` judges every character hook with TypeSafe Jev
    (thresholds in `review/typesafe-thresholds-v1.json`, calibrated on
    `review/gold-set-v1.json`).
  - `memory-hooks:triage` writes `review/char-triage-v1.json`;
    `memory-hooks:repair` rewrites flagged hooks and re-verifies them.
  - `memory-hooks:review:chars` writes `review/char-review.html`; decisions
    export as `char-review-feedback.json`.
  - `applyCharReview.ts` applies the outcome, strips sound mechanically, and
    logs per-record decision sources to `review/char-decision-log-v1.json`.
  - `buildSoundData.ts` writes the Book 1 sound scratch file only; the shipped
    sound data is `relations:build`.
- Human review: `npm run memory-hooks:review:page` writes
  `output/memory-hooks/review/hook-review.html` — every hook triaged
  high/medium/low with reasons, component breakdowns, and Agree/Change/Decline
  feedback exporting as JSON for the next decisions pass.

### Review refinement (2026-09-16, round 4) — component order

- A hook walks its components in the order the breakdown shows them:
  top/left/outer first, then bottom/right/inner (the `字(label)` tokens in the
  prose follow the tree order). Never jump backwards — e.g. 服 must start with
  `月(moon)`, then `卩(seal)`, then `又(again)`.
- Enforced by `scripts/memory-hooks/checkComponentOrder.ts`
  (`memory-hooks:check:order`, `--strict` exits non-zero) and surfaced as a
  `⚠ order` chip on the review page. Repeated components count once.
- Doubled words (弟弟, 謝謝 …) mention their character once and say "said
  twice"; that is the accepted pattern.

### Review refinement (2026-09-16, round 5) — the scene must add up

- Every prop and action in a hook must come from the character's own parts.
  No dangling props: 右 once said a hand and a mouth "hold the spoon" although
  no component supplies a spoon. The replacement explains the meaning through
  the parts: "The 𠂇(hand) that brings food to your 口(mouth) is your eating
  hand → the 右(the right side)."
- The chain parts → action → meaning must be one a learner can retell without
  inventing anything. If a step is missing, rewrite the sentence until it is
  there; do not paper over it with a prop.
- A component label should stay consistent across hooks: 𠂇 is "left hand" only
  where the story is about the left (左, 友); elsewhere it is "hand" (右, 有).
- A regex-based prop checker was tried and rejected (too noisy); coherence is a
  human review item — after every content pass, retell a few random hooks
  aloud and fix any that need a missing step.

## Formula v3 — meaning-only (2026-09-22)

The prompt-ready version lives in `hookFormula.ts` (`HOOK_FORMULA_RULES`) and is
embedded in every generation, critic, and repair prompt. The checklist:

1. **Tokens**: `字(label)` everywhere; end on `字(meaning)` exactly once, as the
   final token. The app bolds only labels.
2. **Short and simple**: one sentence, one action, 25–170 characters of hook
   text, at most 15 words of prose, at most two commas.
3. **Ledger labels only**: taught meanings win; sound-only pieces take a reading
   or a plainly visible shape description; no invented senses, no re-describing
   a piece in your own words.
4. **Breakdown order** — top/left/outer → bottom/right/inner; repeated parts
   count once; doubled words say "said twice".
5. **No dangling props** — every prop and action traces to a part.
6. **Meaning-only** — no pinyin, no sound cues, no pronunciation notes; the
   Sound block owns all phonetics.
7. **No variant/etymology framing** — variant, archaic, ancient, old form,
   old version, "the name of" are banned.
8. **Honesty** — real origins only (東西, 馬上); no invented history.
9. **Language hygiene** — no grammar metalanguage, one arrow before the target,
   matching articles (`An 矢(arrow)`), words 12–220 / ≤30 words / ≤2 sentences
   for word hooks, no stray Han.

Every line is enforced by machine where possible: `strictHookAudit.ts` (prose),
`checkHookQuality.ts` (coverage), `checkComponentOrder.ts` (order),
`checkComponentLabelAlignment.ts` (labels, advisory), the acceptance suite
(`tests/acceptance/memory_hooks.test.ts`), `tests/content/memoryHookPack.test.ts`, and
the auto-ship gate (`runHookGates.ts`).
