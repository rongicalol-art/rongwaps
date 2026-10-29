# B3-L03 author — GPT-6, 2026-10-29

Verdict: FIXES NEEDED — L03 content gates pass; G6 cue-card inline previews need engine support outside the permitted files. Global validation fails only on L02 G5.

## Checked

- Six Chinese/English explanations match `materials/book3/L03/grammar.md` verbatim. All 18 numbered Chinese examples match, including the four previously missing second-speaker turns, printed ellipses and six dialogue stars. Token reconstruction matches every example exactly.
- Scans pp.78–84 and 88–91 checked; p.80 checked at full resolution for the V掉 bank and both dialogue examples.
- Twenty core-clause table rows contain only source-example words in source order. Pattern parts have separate accent columns; no `exampleId` links. Full examples remain in the Examples card. A few essential cells exceed six characters.
- Identities, audio references, dialogue and other existing page fields retained. Re-derived all paired simplified fields, including both dialogue copies; the consistency test passes. Contextual 乾淨 → 干净 and 放著 → 放着 checked.
- All 31 printed tasks appear in book order; no own exercises. Separate cards handle both blanks in G2 練習1 #3 and G4 練習1 #2. Three G3 fill-ins are builds; three explicitly self-authored bank-group replies and all twelve situations use pick → build.
- Phrase banks stay verbatim. Multi-part fills are ordered lists. Correct cards have full sentence/pinyin/English; wrong cards and trap tiles have individual repairs. All docks have at most six tiles, each at most four Han characters.
- Accepted alternatives include G1 試用/試坐, 試用/試擦 and 試用/試戴; G2 both expense cards and both future/completed-drink cards; G4 both self-directed hospital decisions; G5 and G6 both appropriate bank cards.
- G3 open fill-ins use explicitly labeled practice cues where the printed dialogue leaves the exception open. Printed words alone enter `allowWords`; no authored vocabulary bypasses the gate.

| Point | Book tasks | reply-pick | order-build | Total |
| --- | ---: | ---: | ---: | ---: |
| 試 V | 5 | 5 | 2 | 7 |
| V 掉 | 5 | 6 | 2 | 8 |
| 什麼…都…，就是… | 5 | 2 | 5 | 7 |
| 別再…了 / 不再…了 | 5 | 6 | 2 | 8 |
| 不僅…還 / 也 / 而且… | 5 | 5 | 3 | 8 |
| 一 M 比一 M | 6 | 6 | 4 | 10 |
| Total | 31 | 30 | 18 | 48 |

## Issues

- `content/grammar/b3LessonThree.json` — restored source explanations, omitted example turns, stars and source-based core tables; corrected simplified text.
- `content/grammar-practice/b3LessonThree.json` — replaced the old practice with all printed tasks, source banks, Chinese contexts and situations, scoped traps and feedback.
- BOOK-ERRATA: G1 English explanation prints `There "V" are often monosyllable verbs`; retained verbatim rather than silently correcting it.
- Export PASS: `node --import tsx/esm scripts/content/exportAuthoredContent.ts` → `All authored content packs exported successfully.`
- Global validation FAIL, other lesson only: `node --import tsx/esm scripts/content/validateLessons.ts`. Exact output:

```text
B3L02-P02-D02 grammar 5 practice b3l2g5-book-01: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-02: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-03: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-04: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-05: reply-pick needs 2–8 options.
B3L02-P02-D02 grammar 5 practice b3l2g5-book-06: reply-pick needs 2–8 options.
```

- L03 validation PASS: the same validator on the complete exported Book 3 registry returns zero issues at L03 locations. No L02 edits made.
- Tests PASS: `node --import tsx/esm --test tests/content/*.test.ts tests/unit/grammarPracticeCheck.test.ts tests/unit/grammarReplyPick.test.ts`:

```text
ℹ tests 260
ℹ suites 0
ℹ pass 260
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 67394.379
```

- Tests ran separately after global validation failed, so the unrelated L02 failures did not skip the test gate. Source/token/table/dock/situation audit also passes.
- Generated packs restored byte-for-byte to the pre-gate working-tree state, preserving existing uncommitted pack work. Only the two L03 authored files and this review remain changed by this task. No secrets read; no commit. Browser rendering was not checked.

## Unsure

- G1 練習1 #3: accepted broad 試用 as well as the more natural 試戴 for the hat, respecting the book's multiple-choice allowance; a teacher may prefer only 試戴.
- G6 練習1 #1 card d: accepted the printed 教授的要求，個，多 cue as 教授的要求一個比一個多, comparing successive professors' requirements. The printed cue does not spell out that comparison's referent.
- The scans do not print pinyin for these sentences. New readings are authored and reviewed, not scan-verified; existing readings are retained except where the source sentence changed.

## NEEDS-ENGINE

- NEEDS-ENGINE: G6 練習1 #1–2 use printed cue triples, e.g. 課程內容，門，難, with no ～ markers. Keeping these cards verbatim means the current reply-pick inline preview inserts the raw cue triple; the correct feedback already contains the full expanded B sentence. A per-option preview/completion field is needed to show the grammatical completion inside the blank without rewriting the book's cue cards. No engine/type/test files changed.
