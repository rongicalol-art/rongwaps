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
- A hook must render at least one emphasis run (`tests/memoryHookWordQuality.test.ts`).
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

## Phonetics

- Approved sound-cue characters: 媽 爸 請 客 喝 城 湖 花 問.
- Phrase naturally: "…lends the sound (hē)", "as the sound cue (qīng → qǐng)".
  Banned: "calls with", "is the sound component (…):".
- 喝 keeps the pilot scene: a cup tips toward 口(mouth) and leads to
  喝(drink); 曷 stays a quiet word cue, never a speaking character.

## Meaning and honesty

- Real, checkable origins only (東西, 馬上); otherwise no history claims.
- No grammar metalanguage in prose (particle, measure word, classifier …).
- Characters: at least 55 characters of prose. Words: 12–220 characters,
  at most 30 words, at most 2 sentences.

## Review and edit workflow

- Word edits: decisions file → `applyWordReview.ts` → `exportHookPack.ts`.
- Character edits: decisions file → `applyCharacterReview.ts` → `exportHookPack.ts`.
- Before shipping: `strictHookAudit.ts`, `checkHookQuality.ts --all`,
  `checkComponentLabelAlignment.ts`, and `tests/memoryHook*.test.ts`.
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
