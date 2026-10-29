# B3-L05 author — GPT-6, 2026-10-29

Verdict: FIXES NEEDED — all content gates pass; printed write-in bank blanks need engine support outside the permitted files.

## Checked

- Compared both Lesson 5 JSON files against `materials/book3/L05/grammar.md` and the B3 batch/L1 mapping and reviews. Source transcript unchanged.
- Seven Chinese/English explanations and all 22 examples restored verbatim, in book order; seven first examples marked `fromDialogue: true`. Existing page/example IDs, dialogue text and audio references retained; added the missing fourth 一連 example.
- All 22 table rows use core clauses from their corresponding book examples, in source order, without punctuation or `exampleId` links. Pattern parts have separate accent columns. One eight-character cell preserves the first 以為 example's incomplete printed news clause; other cells are at most six characters.
- All 36 book tasks covered in order; no extra/own exercises. Phrase banks remain verbatim, including ～ and write-in blanks. Multi-part fills use ordered arrays: 以為/沒想到 and 還是/吧.
- All correct bank cards have complete B-line feedback, readings and translations. Every wrong card and every build trap has its own repair. Open replies and situations use pick → build; printed situations remain verbatim in both steps.
- All 16 builds separate grammar-bearing parts, have at most six tiles, and use tiles of at most four characters. Fixed trailing clauses remain visible in context. Accepted alternatives include 明天/萬一 placement, three recipient placements with 一連, and the symmetric east/west order.
- Re-derived simplified fields throughout both files, including dialogue lines, without regional vocabulary substitution. Vocabulary allowances contain only words printed in the point's exercises; removed untaught authored alternatives rather than granting allowances for them.

| Point | Book tasks | reply-pick | order-build | Total |
| --- | ---: | ---: | ---: | ---: |
| 萬一 | 5 | 5 | 2 | 7 |
| 一連 | 5 | 5 | 2 | 7 |
| 以為…沒想到… | 5 | 5 | 2 | 7 |
| 還是…吧 | 5 | 5 | 2 | 7 |
| 結果 | 6 | 6 | 3 | 9 |
| 甚至 | 5 | 5 | 2 | 7 |
| 以＋方向 | 5 | 5 | 3 | 8 |
| Total | 36 | 36 | 16 | 52 |

## Issues

- `content/grammar/b3LessonFive.json` — replaced shortened/altered examples and mixed-language explanations with the source; rebuilt the tables from the source examples, including the missing fourth 一連 example. Simplified dialogue 印度尼西亚 now follows printed 印尼 character by character.
- `content/grammar-practice/b3LessonFive.json` — replaced all old items with the complete book exercises. Added only printed-word allowances; full feedback preserves printed starts and endings. Cross-page exercise sources use page ranges where the transcript does not specify the individual item's page.
- Export PASS: `node --import tsx/esm scripts/content/exportAuthoredContent.ts` → `All authored content packs exported successfully.`
- Validation PASS: `node --import tsx/esm scripts/content/validateLessons.ts` → `Interactive lesson content valid.`
- Tests PASS: `node --import tsx/esm --test tests/content/*.test.ts tests/unit/grammarPracticeCheck.test.ts tests/unit/grammarReplyPick.test.ts` → 260 tests, 260 pass, 0 fail, 0 skipped. Includes taught vocabulary, simplified consistency, answer keys and reply-fill tests.
- Source audit PASS: seven bilingual explanations, 22 verbatim examples, seven dialogue stars, 22 source-order table cores, verbatim banks and complete coverage of 36 book tasks / 52 app items.
- Other-lesson failures: none.
- Generated packs restored byte-for-byte to their pre-task state, preserving existing unrelated pack edits. No commit; no application/engine/test changes.

## Unsure

- G3 練習1 #2: accepted c and d. Card d answers why the speaker delayed medical care only if anticipated cost discouraged the earlier visit; that motive is plausible but not explicit.
- G1 練習1 #3: accepted a and d. They intentionally offer opposite arrival recommendations, as the multiple-choice book permits; d assumes the host might need help.
- G7's open questions have many valid country-specific answers. The picks/builds provide model descriptions, not exhaustive grading of the learner's actual country. The Taiwan weather model and a country with different food habits across a mountain region are explicit practice choices.
- Grammar scans do not supply sentence pinyin in this transcript. Readings use course lexical readings with contextual review and 一/不 sandhi; they are not claimed as scan-verified pinyin.

## NEEDS-ENGINE

- NEEDS-ENGINE: nine phrase-bank items (G1/G4/G5 練習1 #1–3) contain the book's `______` write-in blanks. The current reply-pick fills ～ but offers no interaction to complete these additional blanks. Cards and selected previews therefore retain the blanks; correct feedback supplies a complete model. Support a completion step for the chosen card while retaining its verbatim source wording. No extra app items or unsupported fields were invented to hide this limitation.
