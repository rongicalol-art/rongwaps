# B3-L08 author — Claude Haiku 5.5, 2026-10-30
Verdict: FIXES NEEDED (self-check passes; the owner should check the Unsure list)

## Checked
- Scans printed pp.210–223 (scan NNN = printed − 16) against `materials/book3/L08/grammar.md`. All six points, all 例句, all 練習1/練習2 items and banks match the scans. Items were checked for 209–223 only; the 短文 pages 215–218 are not part of the grammar.
- Every example text matches the transcript after stripping 「……」 ellipses and whitespace. Each example's word breakdown rebuilds the sentence exactly. ★ (book example 1) carries `fromDialogue: true` on all six points.
- Explanations (zh and en) are verbatim from the book, including NP₁/NP₂ subscripts.
- Tables: each row is the core clause of a book example, in order, with no invented words. Rows have no `exampleId`. Accent column set per point.
- Build script: `scratchpad/build_b3_L08_full.py` writes both JSON files. Every `simplified` field is set by `t2s` (scratchpad/t2s.py). No hand-written simplified.
- Lesson 5 shape: top-level `LESSON_EIGHT_DIALOGUE_ONE/TWO` line arrays, `LESSON_EIGHT_PART_ONE/TWO` with embedded dialogue and `grammarPages`. Dialogue, ids and audio fields kept from the old file.
- Gates: `tests/content/b3SimplifiedConsistency.test.ts`, `grammarPracticeQuality`, `grammarPracticeKinds`, `grammarPracticeContext`, `grammarPracticeVocabulary`, `tests/unit/grammarPracticeCheck`, `grammarReplyPick`: 38 tests, 38 pass, 0 fail. Lesson 8 simplified check (same logic as the consistency test, which only lists One–Five): no conflicts. Both JSON files parse.
- Export, validate and `public/data` were not run or touched, per the brief.

## Issues
- `content/grammar/b3LessonEight.json` — rewritten to the Lesson 5 shape. Previous file had invented or altered text in examples (G1 ex2/3, G3 ex1/3, G4 ex1/3, G5 ex1/3, G6 ex1/3), dropped speakers in the dialogue examples, and added clauses that are not in the book. All fixed to scan text.
- Tables: old rows used invented words (東西, 平價衣服, 別太在意, 修改舊衣服) and non-contiguous cuts. Rebuilt from the examples.
- `content/grammar-practice/b3LessonEight.json` — old `slot-build` items replaced with 50 items: 23 `reply-pick` and 27 `order-build` (book source on every item). Book tasks: G1 6, G2 5, G3 6, G4 5, G5 5, G6 5 = 32; the "answer yourself" tasks and situations got a pick then a build.
- Long cells kept (book phrase, no shorter faithful core): 應該找到自己的風格 (9), 把舊衣服修改 (6), 只是一時的流行 (7).

## Unsure
- G1 練習1 #1/#2: the book's V stays literal in the cards ("V成" kept); I used fill [把, 成], so the card reads 把…V成….
- G1 練習2 #1 build: the sentence is clipped to the pattern clause 把糖看成鹽了 (no subject), because six tiles and a trap leave no room for 你.
- G1 練習2 #2 uses 當成 (not in the 說明) as the correct verb. The vocabulary test passes, but check it is a taught pattern.
- G4 練習1 #2: I marked 想法也太保守了 ok as well as 愛抱怨又常遲到; the book may intend only 愛抱怨又常遲到.
- G6 練習1 #3 wrong card "我想先試試看，畢竟…": judged as misplacing 畢竟 after its conclusion; the grammar may allow it.
- G2 練習1 #2 and #3: 也/都 are both accepted (the book allows either). Check the lead for "不愛吃甜點" is not too close a copy.
- All pinyin and English glosses (examples, practice sentences, tile meanings) are authored, not printed. The scans have no pinyin. Tones should be checked by a human.
- Confusion and questions fields on each page were kept from the old file. They were not re-checked against the book.
- G4 explanation uses the book's "況且" and "也、還、又" forms. No BOOK-ERRATA found.

## NEEDS-ENGINE
- None.
