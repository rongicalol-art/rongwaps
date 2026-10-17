# L03 author — Claude, 2026-10-16
Verdict: PASS (with engine-gap noted)

## Checked
- Transcript pp.73–75 and 81–85 against all five pages in `content/grammar/lessonThreePartOne.json` / `PartTwo.json` (both the standalone-page copies and the part copies, kept deep-equal).
- Every example traces to a transcript line; all 18 numbered sentences stay segmented with pinyin, English, and word meanings.
- Confusion blocks rebuilt: every `right` form is now a printed table row or transcript sentence; each trap is grounded in the book's own note (measure word required / 二→兩 / 幾 + measure word; receiver before gift / 誰 vs 什麼; 這–那 proximity / 哪 in answers / 兩 at two; 的 kept when the noun drops / multi-syllableVs + 的 / one-syllable drop; 都 after the group / 都 before 不要). Ungrounded items from the previous draft's clarifiers and labs were removed (想 vs 要 duplication, 都-return trap, singular-only trap); lab repairs now re-show book sentences (我想送他一本中文書；他們都喜歡喝珍珠奶茶嗎；他要買大的).
- Book tables mirrored exactly in `patternRows`: left only the printed rows on G02 (2 rows) and G05 (2 rows); G01/G03 keep the printed 3-row tables. G04 keeps its three (1)/(2)/(3) subsections (`l3g4-s1/s2/s3`), per the existing structure.
- Pinyin follows the book's 一 sandhi: 一個蛋糕 yí, 一個禮物 yí, 一本中文書 yì, 這（一）種筆 yì, 這兩本中文書… unchanged prints.
- `teachingGlossary` extended to cover every token shown per page: added 二 (G01, G03), 一 and the （的）/（蛋糕） omission tokens plus 幾個 / 三個 / 那朵 (G03, G04).
- `content/grammar-practice/lessonThree.json` authored keyed by grammar page id for all five pages: p.74 (2 of 3 items — see NEEDS-ENGINE), p.75, p.82, p.84, p.85, every book item in order, one decision per item, docks ≤ 6 tiles, tiles ≤ 4 characters, one tempting wrong tile with a one-sentence repair each, alternatives with their own sentences for every accepted fill (checker-verified against the mirror of `validateGrammarPractice` and `grammarPracticeCheck`), `四` and the book-printed 舊 in `allowWords` per the type comment.
- Practice vocabulary scope verified programmatically against the taught set that `tests/content/grammarPracticeVocabulary.test.ts` builds (Book 1 vocabulary ≤ 3 plus grammar-example tokens ≤ 3): all strings decompose cleanly.
- Grammar scope: nothing beyond Lesson 3's five points; patterns in clarifiers and drills are L1–L3 only (想/要 + verb from L2, 是/有 from L1–L2).
- JSON parses on all three files; duplicated page copies identical; unique ids throughout.

## Issues
- Page drills (`questions`) kept as authored app content (template keeps per-page questions unmounted but requires the field); they carry the invented answer tiles the exercise check format needs, labeled `exerciseNote` where relevant.
- Not run (task prohibits npm): `content:export`, `content:validate`, `npm test`. The round-trip test will fail until `npm run content:export` regenerates `public/data/grammar/book-1.json` and merges the new practice.

## Unsure
- G01 exercise item 2 and 3 are open completions; I modeled B's answers (我要買五本書 / 你有幾本英文書) from the book's surrounding sentences. Flag if the reproduce-from-scan step disagrees with the field-freeze.
- p.85 item 2 has no picture; both 這 four people reading and the word order are unambiguous, so it is authored without a scene.

## BOOK-ERRATA
- p.73 "when there is a measure word used", p.74 missing "the" before "direct object", p.81 awkwardly phrased 兩 note, p.83 "Nouns, mentioned previously", p.84 "in Chinese sentence" — as already listed in the transcript's BOOK-ERRATA section; not silently fixed in the printed English.

## NEEDS-ENGINE
- See `L03-needs.md` (p.74 item 1, the two-flowers picture).
