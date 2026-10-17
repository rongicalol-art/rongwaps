# L02 author — grammar-author (Codex-role), 2026-10-16
Verdict: PASS (static checks; npm gates not run — pipeline instruction says do not run npm)

## Checked
- Every page against `materials/book1/L02/transcript.md` AND the page scans (p.54–62): tables, numbered examples, note wording, exercise items, pictures.
- `content/grammar/lessonTwoPartOne.json` / `lessonTwoPartTwo.json`: pages rebuilt in place (standalone entry + identical embedded `grammarPages` copy), ids / part wrappers / audio references / dialogue data untouched.
- New `content/grammar-practice/lessonTwo.json` keyed by page id; one practice per page, book items in order.
- Static replicas of repo gates (Python, offline): `validateInteractiveLessons` structural rules (confusion 2–4, ids unique, header width, blank-answer-from-tile), `validateGrammarPractice` (tiles ≤6/≤4 han, wrong tile present, slot answers ⊆ tiles, solutions→result/alternatives coverage, simplified length), the `grammarPracticeVocabulary` scan (taught set = vocab L≤2 + grammar-example tokens L≤2 + allowWords), and transcript traceability of examples / pattern tokens / confusion rights. Result: ALL CHECKS PASS.
- Every Chinese word on the pages decomposes into vocab ≤L2 + the page's own `teachingGlossary`; glossary entries added: 四/五/六/星期天 on G02, 是 on G04.
- Practice scope: only tiles/text composed from taught words; `allowWords` per book glosses (手機 p.56, 熱 p.62, 二月二十四號 the printed date in G04's item 1).

## Issues
- `lessonTwoPartOne.json` G02 — patternRows had 3 rows (2 duplicated the examples); reduced to the book's one table row (他 八點 回家。). Same for G03和G05.
- `lessonTwoPartTwo.json` G05 — discoveryLab had the invented repair pair 我喝要茶。→我要喝茶。... removed; labs on G02–G06 now re-show only book sentences.
- `lessonTwoPartTwo.json` G04 — explanation claimed the P68 drop-的-with-family rule, which is not in this lesson's transcript; removed. G04 confusion was built on that P68 rule; rebuilt from p.60's own note/table/examples (drop-的 trap from ex1; 是-vs-的 with the printed exercise completion 媽媽的生日是二月二十四號; 不喜歡 negation from ex3), 3 items.
- G02 — exerciseType: unscramble + unscrambleExercise used the non-book sentence 你幾點去學校； removed (book exercise is Answer-the-questions; unscramble was invented).
- G03 — confusion right-forms were invented (她沒有朋友。/ 我有手機。); replaced with printed sentences (王先生沒有孩子。/ 她有台灣朋友。) with the inadvertent is-vs-have trap grounded in the p.56 note.
- G05 — confusion right 你要吃水果。 was not a printed sentence; replaced with the printed 媽媽喜歡喝奶茶。 / 我愛吃水果，不愛喝珍珠奶茶。 pairs; the 愛-vs-喜歡 semantics item dropped (not grounded in the book note).
- G01 — discoveryLab "Ask with 幾" choice now shows the book's printed 現在幾點（幾分）？ (was the reduced 現在幾點？).
- pinyin: the transcript's added pinyin prints 不 as bù on p.55/p.61, but the scans print sandhi (p.61 ex3: bú ài — verified on the scan). New/edited content follows the scans: 不 + 4th tone → bú (bú qù, bú yào, bú ài, yào bú yào, rè bú rè), 不 elsewhere bù (máng bù máng, xǐ bù xǐhuan, chī bù chī — as the book prints).

## Unsure
- G01 confusion right 今天是星期日。 is composed from the printed calendar's Sunday heading 日 + the printed 星期 (the book never prints 星期日 as a phrase). The 星期七 trap itself is grounded in the book note (numbers 1–6 after 星期 = Mon–Sat).
- Three confusion/exercise rights are unique-completion forms of printed blank items (their blank has exactly one possible fill): 媽媽的生日是二月二十四號。 (p.60 item 1)、你要不要去他家？ (p.62 item 3)、你喜歡台灣的水果嗎？ uses 的 in the printed blank.
- Practice model answers for open personal blanks (e.g. 我今天十點十五分下課。) are authored per rule 9 and labeled on pages as example answers, not a textbook key.

## Gates
- Not run (pipeline instruction: "Do not run npm"). Static replicas all pass; the owner should run `npm run content:export && npm run content:validate && npm test -- tests/content tests/unit/grammarPracticeCheck.test.ts`.

## NEEDS-ENGINE
See `docs/grammar/reviews/L02-needs.md`.
