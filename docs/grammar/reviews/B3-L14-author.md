# B3-L14 author — Haiku 5.5, 2026-10-31

Verdict: PASS for `check_b3.ts Fourteen` (prints OK). Pages only; no exercises, no pack export, no git. Human review needed on the Unsure list.

## Checked

- Scan footers: printed 360–365 and 369–372. Pages in each point: G1 360–362, G2 362–363, G3 363–365, G4 369–370, G5 371–372.
- Grammar pages (5): titles, `explanation` (zh) and `explanationEnglish` (en) copied from the scans (which match the transcript for these pages). Example 1 of each point is `fromDialogue: true` (the ★ one).
- Every example's traditional text is asserted verbatim against the printed 例句 in the build script (3 per point, two-speaker examples as `A：` / `B：` lines).
- Simplified: generated from `t2s.py`; warned 麼 → 么 applied in context (怎麼 → 怎么, 什麼 → 什么).
- `text.words` tokens on every example; `questions` (1 per point, reused from the old file, converted to the Lesson 5 blank/tile shape); `confusion` (2 items per point).
- Kept from the old file: part ids, dialogue objects, page ids, audio references, lesson titles, learner promises and title English.
- The old file's `grammarNumber`/`bookPage` values are unchanged.

## Issues

- `content/grammar/b3LessonFourteen.json` — full rebuild from `docs/grammar/briefs/b3-kit/source/L14.md` after scan review. Two page titles changed to match the book: G1 `（這）就要從……說起了` and G3 `幸虧……，要不然……`. G5 title now `按照/按/照 NP + V`.
- Pattern table: several cells are longer than 6 characters because the printed clause has no clean split (G3 row 1 `他們一生都不能團圓了`; G4 row 1 `農曆七月初七是所謂的七夕`; G5 row 1 kept to `送給朋友` for the Action cell). Flagged rather than cut, since cutting would change the clause.
- Pinyin for words, example sentences, tiles and confusion items is authored, not scan-verified (the grammar scans print no pinyin).
- English for example sentences, confusion items, tile meanings and blank hints is authored by me, not from the book.
- Book typos kept verbatim: G4 English has the missing comma in "了解 看法".

## Unsure

- G1 confusion #1 treats 說明 (two syllables) as not fitting the pattern. The book says "single-syllable verb", so the wrong form follows the rule; confirm the teaching point.
- G3 confusion #1 wrong form `幸虧他沒帶傘，要不然就淋濕了。` reverses the logic of the lucky event on purpose. Confirm it is a fair learner mistake.
- G4 confusion #2 uses 按照 with a conclusion (臺灣的升學制度) as the wrong form. This relies on the book's own contrast in the 按照 explanation; confirm it reads as a real misuse.
- G5 confusion #1 uses 根據 with a price-setting sentence as the wrong form. Confirm.
- G5 example 2 and 3 are two-speaker examples; the speaker labels stay as printed (A/B, 助理/老闆).
- Lesson-level `titleEnglish` and `learnerPromise` were kept from the old file and not re-checked against the book.
