# B3-L02 author — GPT-6, 2026-10-29

Verdict: FIXES NEEDED — export and all 260 requested tests pass; six faithful ten-option V開 bank cards exceed the existing validator’s eight-option limit. This cannot be made green while preserving the complete printed bank and editing only the authorized files.

## Checked

- Compared all seven bilingual explanations and 21 examples with `materials/book3/L02/grammar.md`: verbatim, in order, with seven dialogue stars. Dictionary tokens reconstruct each complete example, including speaker labels and punctuation.
- All 21 table rows retain core words from their corresponding printed example in source order, with separate pattern columns, no punctuation in cells and no `exampleId` links. Page/part ids, dialogue fields, audio references and other existing page fields retained.
- All 35 printed tasks covered in book order; no `own` items. V開 練習1 has six blanks across three numbered tasks, represented as six picks. Each situation and each bank-group open response has pick → build. Fill-in groups have three builds each.
- All printed banks retained verbatim, including all ten a–j cards on each V開 pick. 用…來 uses an ordered two-part `fill`; nth ～ receives nth part. V開 #2 A uses 開了 for the completed opening.
- Every wrong reply has its own explanation; every trap tile has a `placed` repair. All builds have at most six tiles, each at most four characters; grammar-bearing parts are separate.
- Accepted alternative orders for independent 一會兒 clauses; optional 來 accepted in the applicable 用 builds. Printed lead-ins and trailing clauses remain in Chinese context and full feedback.
- Simplified fields re-derived from traditional, including retained dialogue text: corrected 軟 → 软 and 的 mistranscribed as 得. The consistency test passes. Contextual 計畫 → 计划 retained.
- Vocabulary gate passes. Allowances contain only words/short phrases actually printed in that point’s exercises; untaught authored distractors were replaced rather than whitelisted.

| Point | Printed tasks | reply-pick | order-build | App items |
| --- | ---: | ---: | ---: | ---: |
| 早就……了 | 5 | 2 | 5 | 7 |
| 順便 | 5 | 5 | 3 | 8 |
| 一會兒……，一會兒…… | 5 | 2 | 5 | 7 |
| 算了 | 5 | 5 | 3 | 8 |
| V開 | 5 | 8 | 2 | 10 |
| 經過 | 5 | 2 | 5 | 7 |
| 用 NP（來）V | 5 | 5 | 3 | 8 |
| Total | 35 | 29 | 26 | 55 |

## Issues

- `content/grammar/b3LessonTwo.json` — replaced unrelated/altered numbered examples and mixed/paraphrased explanations with the transcript; rebuilt core-clause tables. Fixed stale preview labels referring to 不是…嗎 and 就是. Corrected the retained 用 confusion note: omitting 來 does **not** change the meaning; replaced its misleading “wrong” omission example with an actual reversal of means/action.
- `content/grammar-practice/b3LessonTwo.json` — replaced all old practice items with the printed tasks, full phrase banks and situations. Other blanks in the same V開 dialogue remain visible as ellipses while the current blank is answered.
- BOOK-ERRATA: 經過’s printed English says it “can also show the results of a certain action”; the Chinese specifically describes the process undergone. Both printed explanations retained verbatim.
- Export PASS: `node --import tsx/esm scripts/content/exportAuthoredContent.ts` → `All authored content packs exported successfully.`
- Validation FAIL: `node --import tsx/esm scripts/content/validateLessons.ts` → exactly the six lines below. No other validation failures remain.
- Tests PASS, run separately because the requested `&&` chain stops at validation: `node --import tsx/esm --test tests/content/*.test.ts tests/unit/grammarPracticeCheck.test.ts tests/unit/grammarReplyPick.test.ts` → exact final summary below. This includes vocabulary, simplified consistency, answer keys and reply-pick checks.
- Source/table audit PASS: seven bilingual explanations, 21 exact examples, 21 source-derived rows and seven stars; example tokens reconstruct the source; no row links hide examples.
- Other-lesson failures: none.
- Generated export files restored byte-for-byte from a pre-run backup of all nine affected files, preserving existing uncommitted pack changes. Did not run `git checkout public/data`, which would discard those existing changes. No commit. No secrets read. No engine/test files edited.

Exact final validation output:

```text
B3L02-P02-D02 grammar 5 practice b3l2g5-book-01: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-02: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-03: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-04: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-05: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-06: reply-pick needs 2–8 options.
```

Exact final test summary:

```text
ℹ tests 260
ℹ suites 0
ℹ pass 260
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9482.557541
```

## Unsure

- 順便 練習1 #1: b/c are the expected errand requests. Also accepted d: the printed start produces the grammatical offer 你需不需要我順便買一份給你. The object/second trip is implicit; the book does not explicitly forbid B offering food to the person coming home.
- 算了 練習1 #1: accepted a/c/d. Card d adds an unstated time constraint and a fallback to yesterday’s cookies; it is a coherent alternative to waiting, though less directly suggested than a/c.
- V開 練習1 #2 B: accepted e/h/j; e explains why pushing rather than pulling is needed, h is direct advice, j adds 應該. #2 A models successful 推開了. #3 B’s final blank accepts a/h: moving the desk aside or pushing it aside. These are contextual judgments rather than a printed answer key.
- The grammar scans do not supply sentence pinyin. New readings are authored/contextually reviewed against existing course readings, not claimed as scan-verified pinyin.

## NEEDS-ENGINE

- NEEDS-ENGINE: `src/utils/grammar/validateGrammarPractice.ts` → `validateReplyPick` currently rejects more than eight options. The p.63 bank genuinely prints ten (confirmed against `materials/book3/pages/page_047_ebfd322518da3fc7c967dc6e7e913f0a.webp`). All six blanks need the complete a–j bank. Raise/support the limit for this printed bank and verify its tray; do not drop options, split a bank into invented tasks, or weaken a test from the content files. That change is outside the authorized three-file scope, so validation remains explicitly blocked.
