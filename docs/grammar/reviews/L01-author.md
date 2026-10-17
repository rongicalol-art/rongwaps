# L01 author — grammar-author (Codex), 2026-10-16
Verdict: PASS

## Checked
- `materials/book1/L01/transcript.md` (+ scans p38–p45) vs every authored string: table rows, examples (composed text = word-token concat), confusion `right` forms, discovery-lab and contrast sentences, page-question text, practice printed lines, glossary labels — all trace to the scans (automated check, zero misses). Practice tiles/slot fills/results are model completions for the book's blanks (rule 9), not printed text.
- Scope: pages use only 叫/姓/是, 很/不, 嗎, 呢, SVO (L1 scope list); no invented grammar. Examples verbatim from the book; 不 sandhi as printed (bú shì, bú xìng, bú lèi, bù xǐhuān); `Tā hěn piàoliang`, `Tā hěn kě'ài`, `tóngxué` neutral as printed.
- Confusion blocks grounded in the book's note on every page: G1 (姓 family-name only; 叫 name), G2 (no 是; 不 before the word), G3 (end of statement, unchanged order; answer drops 嗎), G4 (呢 returns the asked question; a new question takes 嗎). G5 prints no prose note — its two items ground in the printed table (S→(Neg)V→O order; the 不 slot). Validator requires 2–4 items on every page, so the G5 block is the table, not an invented note.
- Practice: all 5 pages keyed by page id, book items in order, one fill per line, every accepted alternative has its own sentence, tempting wrong tiles keyed to the pattern (他/誰 on profiles, 很/不 on pictures, 呢/你嗎 on particles, 臺灣人/台灣 on persons-vs-places, 可愛 without 很, drop-嗎 in answers). Tiles ≤4 han, docks ≤6. Vocabulary: replica of `tests/content/grammarPracticeVocabulary.test.ts` over authored data → OK; G1 `allowWords` = 學生, 新學生, 宜文 (printed beside the p.38–39 exercise and its picture labels).
- Validator (esbuild bundle of `validateInteractiveLessons` + `validateGrammarPractice` over a staged pack with my parts and merged practice): `L01 pages pass validateInteractiveLessons`. 15 issues remain, all pre-existing in L07/L08 practice (clause-length tiles, docks >6), untouched by this task.
- Structure: ids, audioReference (01-1-3 / 01-2-3), printedPages, part containers, dialogues, dialogue ids/audio kept. Top-level `LESSON_ONE_GRAMMAR_*` copies are byte-identical to the in-part pages (existing file convention; the exporter reads only the `_PART_` objects).

## Issues
- Invented sentences removed: G1 ruleContrast (她姓張小明 family), G5 completionRecap and confusion's 是-before-verb items, G2 bare-adjective and G3 question-word+嗎 confusions (ungrounded), labs'修复 pointers — labs/contrast/`sentenceSpine` now re-show book sentences only.
- BOOK-ERRATA (kept as printed, per rule 10): p.38 "equate two nouns"; p.44 instruction "Complete or answer the 呢 questions."; p.39 heading "Modifying Intransitive State Verbs" — paraphrased only in app-authored explanation/notes, book lines untouched.
- G1 practice item 1: three fills accepted (她 / 友美 / 小林友美), pronoun default. Book prints no answer key.
- G3 practice item 2's long blank authored as guess + 嗎 with 日本人/美國人/英國人 accepted (B corrects to 臺灣人).
- English for 很: examples render it flat ("She is cute.") per the note's false-friend warning; contrastive 很 keeps "very" (王太太很累).

## Unsure
- None beyond the two authored-fill calls above; scan p40 confirms item 2's single long blank before "？".

## Gates
- `npm run content:export` / `content:validate` / `tests/content` NOT run (task forbids npm). Offline equivalents above reproduce the validator and vocabulary test; the next export will regenerate `public/data/` — commit those manifests with these files.

## NEEDS-ENGINE
- See `L01-needs.md`.
