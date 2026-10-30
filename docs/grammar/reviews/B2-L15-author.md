# B2-L15 grammar references — Codex, 2026-10-30
Verdict: FIXES NEEDED

## Checked
- Compared grammar headings and all 15 numbered examples with transcript pages 341–343 and 351, and scans `p341.png`–`p343.png` and `p352.png`.
- Copied both complete part dialogues from `B2L15-R01` and `B2L15-R02`; verified line arrays match.
- Reviewed contextual pinyin, translations, simplified forms, and word tokens; token joins reproduce every traditional example.
- Confirmed grammar numbering is contiguous (1–5), IDs are unique, audio references follow the dialogue/reading records, all book-page flags are false, and there is no literal `undefined` in simplified text.

## Issues
- `p.351 #1` — `materials/book2/L15/transcript.md` omits 很 from `你不是很早就出門了嗎？`; scan `materials/book2/ocr/p352.png` includes it. Authored from the scan.
- `validateInteractiveLessons` requires grammar-usage entries for the five new page IDs in `src/data/grammarUsageRules.ts`, outside this task's scope.
- After filtering usage-rule and unknown-page issues, the validator still reports a pre-existing simplified-text mismatch in `B2L14-P01-D01 grammar 2`; no L15 non-usage issues remain.

## Unsure
- None.
