# Book 3 lessons (batch): pages + book exercises (for Codex)

**Approved reference: Lesson 1.** `content/grammar/b3LessonOne.json` and `content/grammar-practice/b3LessonOne.json` are owner-approved. Match their shape, tone and level of care exactly.

Read first:
- `.claude/skills/grammar-author/SKILL.md`
- `docs/grammar/briefs/B3-L01.md` (the format mapping table)
- `docs/grammar/reviews/B3-L01-author.md`, especially both "Claude review" sections. **Every problem listed there must not appear again.**

Per lesson N:
- Source: `materials/book3/L0N/grammar.md`. The scans are `materials/book3/pages/page_NNN_*.webp`, with NNN = printed page − 16.
- Edit only `content/grammar/b3Lesson<N>.json`, `content/grammar-practice/b3Lesson<N>.json` and the review `docs/grammar/reviews/B3-L0N-author.md`.

## Pages

- `explanationEnglish` = the book's English, verbatim.
- `explanation` = the book's Chinese, verbatim.
- `examples` = the 例句, verbatim and in order, with `fromDialogue: true` on the ★ one.
- `focusTerms` include every printed form of the pattern (e.g. 可以說是 and 可說是).
- **Tables:**
  - A row is the *core clause* of each example: drop the lead-in and the trailing extra clause, keep words in their order, invent nothing.
  - Each pattern part gets its own accent column (因為 | Cause | 而 | Result).
  - Cells ≤6 characters where possible, with no punctuation inside cells. No `exampleId` links.
- Keep ids, audio and dialogue fields.

## Exercises

Every book item, in book order, with `source`. No extra items. Map them as `B3-L01.md` says:
- phrase bank → `reply-pick`
- "answer yourself" and 練習2 situations → `reply-pick`, then `order-build` with "Now say it yourself."
- fill-in → `order-build` with `lead`

Hard rules (from the L1 review):
1. **Simplified:** derive it character by character from `traditional` (是 stays 是; never 事). The new test `simplified is consistent` must pass.
2. **Two-part patterns** (～ appears twice in a card): `fill` is a list in order (e.g. [不僅, 也], [一會兒, 一會兒]); the nth ～ takes the nth part.
3. **Wrong replies are real, different misuses** a learner might pick: a near-synonym with another meaning, the wrong logic (reason vs result), the right pattern in the wrong situation, a wrong word order a learner really makes. Never the same mechanical mistake in every item, and never a repeat within one point.
4. **Wrong notes are true.** Never state a rule the grammar doesn't have; if unsure, use a meaning-based note ("That says he is your fan…").
5. **`order-build` splits the pattern into its parts** (可以 · 說 · 是). One trap tile that is a real alternative in scope, not the trap the pick step just tested. ≤6 tiles, ≤4 characters each.
6. **Taught words only:** Book 1 + Book 2 + Book 3 up to this lesson part + grammar examples so far + `allowWords` (only words the book prints at that exercise).
7. Phrase banks: mark every card that fits as `ok`, exactly as the book allows. Put doubtful calls under Unsure.
8. Replace all old items in the lesson.

## Gates (per lesson)

```
node --import tsx/esm scripts/content/exportAuthoredContent.ts && node --import tsx/esm scripts/content/validateLessons.ts && node --import tsx/esm --test tests/content/*.test.ts tests/unit/grammarPracticeCheck.test.ts tests/unit/grammarReplyPick.test.ts
```

Afterwards, restore `public/data` (`git checkout public/data`; if the sandbox blocks it, say so). Write the review in the skill's format, with item counts per point and an Unsure list.

Note: the `simplified is consistent` test also covers the dialogue lines in each lesson's grammar file. Fix whatever it flags there as well (L2 has 軟 left unconverted and 的 changed to 得).
