# B3-L04 author — Codex (GPT-6), 2026-10-29

Verdict: PASS — all requested gates green; judgment calls listed under Unsure.

## Checked

- Seven bilingual explanations match `materials/book3/L04/grammar.md` verbatim; all 21 examples restored in source order, including complete dialogue turns and omitted clauses. Seven first examples have `fromDialogue: true`.
- All 21 table rows use only their example's words in source order, with short core clauses, separate pattern-part columns and no `exampleId` links. Existing page/example IDs, audio references and dialogue fields retained; dialogue simplified text re-derived.
- All 38 numbered book tasks covered, in book order; no extra items. 終於 練習1 #1 has two picks for its two speaker blanks, giving 39 answer targets. Other printed blanks remain visible while each pick targets exactly one slot.
- All six cards retained verbatim in each bank. Accepted cards: G1 #1 b/c, #2 a/f, #3 d/e; G2 #1 b/f, #2 c/e, #3 a/c/d/e; G3 #1 A b/c/d, #1 B d/f, #2 a/e.
- All 15 printed situations appear verbatim in both pick and build steps. Open replies have three choices, distinct form/meaning errors and individual repairs. Builds separate pattern parts, stay within six tiles/four characters per tile and repair every trap.
- G4 fill-ins accept both 不停 and 沒完. Long replies keep their fixed ending visible in `sub`, build only the target opening, and retain the complete model in feedback. Printed starts use `lead`; printed suffixes remain in the Chinese context.
- Simplified text re-derived throughout both files, including 計畫 → 计划 and 妳 → 你. Consistency and vocabulary gates pass; allowances contain only locally printed exercise words.
- Scan checks: pp.106–107 confirm the two speaker blanks and that 終於 練習2 #2 is on p.106; p.115 confirms the printed English wording noted below.

| Point | Book tasks | reply-pick | order-build | Total |
| --- | ---: | ---: | ---: | ---: |
| 好 Vs 的 N（啊）！ | 6 | 6 | 3 | 9 |
| V 來 V 去，還是…… | 6 | 6 | 3 | 9 |
| 終於 | 6 | 7 | 4 | 11 |
| V 個不停 / V 個沒完 | 5 | 2 | 5 | 7 |
| 不 Vs₁ 不 Vs₂ | 5 | 2 | 5 | 7 |
| 除了……（以外），就是…… | 5 | 2 | 5 | 7 |
| 不是……，就是…… | 5 | 2 | 5 | 7 |
| Total | 38 | 27 | 30 | 57 |

## Issues

- `content/grammar/b3LessonFour.json` — replaced mixed/shortened explanations and examples with the transcript, restored dialogue stars, rebuilt compact example-based tables and corrected simplified fields.
- `content/grammar-practice/b3LessonFour.json` — replaced all old exercises; restored banks, Chinese dialogue context, missing printed tasks and situation pick → build pairs. Initial vocabulary failures fixed with printed-word allowances; replaced untaught authored 該 with 要.
- BOOK-ERRATA: p.115 prints “This grammer” and uses 學習中文 in its English explanation's Chinese example, while the Chinese explanation uses 學中文. Both explanation fields preserve their respective printed wording.
- PASS: `node --import tsx/esm scripts/content/exportAuthoredContent.ts` → `All authored content packs exported successfully.`
- PASS: `node --import tsx/esm scripts/content/validateLessons.ts` → `Interactive lesson content valid.`
- PASS: `node --import tsx/esm --test tests/content/*.test.ts tests/unit/grammarPracticeCheck.test.ts tests/unit/grammarReplyPick.test.ts` → 260 tests, 260 pass, 0 fail. Includes simplified consistency, taught vocabulary, structural checks and reply-pick behavior.
- PASS: source audit — seven bilingual explanations, 21 examples, 21 source-ordered table cores, verbatim banks, 15 doubled situations, retained page/example identities and audio references.
- Other-lesson failures: none.
- Generated packs restored byte-for-byte to their pre-task state, preserving pre-existing modifications rather than resetting them to HEAD. Only the two Lesson 4 JSON files and this review remain changed by this task. No commit.

## Unsure

- G3 練習1 #1 A: card d is accepted alongside b/c because a long-awaited return home can be the dream fulfilled; the printed line does not explicitly call it a dream. No official answer key was supplied.
- G2 練習1 #3: c/e are accepted alongside a/d because the unspecified shop can be a food shop; B's return-to-this-shop reply supports either personal tasting or others' recommendations. No official answer key was supplied.
- The scans do not print sentence pinyin. Readings were authored and checked for context, neutral tones and 一/不 sandhi; they are not claimed as scan-verified readings.
