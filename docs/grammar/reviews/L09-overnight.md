# L09 overnight — independent reviewer, 2026-10-24

Final revision:
- grammar `52c685c285473f6c2d0995de729443c22e6b49c81fe1d863a08ffbab98608737`
- practice `3a6f98a43c754afbf77d3dc1cd996bc941b89455e3be613deef4a45b85184917`

Verdict: PASS (content). Automated gate FAIL (4, suite-level). UI partial PASS.

## Verdicts

- Content review: **PASS** — 21/21 printed items; p.207 #3 giveaway removed; p.214 row crop has the intended left picture.
- Automated gate: **FAIL** — `content:export` and `content:validate` pass; `npm test -- tests/content tests/unit/grammarPracticeCheck.test.ts` exit 1, 1140 pass / 5 fail (5th aggregate `tests/content`); `npm test` exit 1, 1140 pass / 4 fail: (1) `tests/content/grammarTrackClips.test.ts` “grammar-track clips identify source rows or examples and reach the exported pack” uses `exampleId: l9g5-e1` for `今天的天氣比較熱` (now table row `l9g5-p1`; expected `誰比較瘦姊姊比較瘦妹妹比較胖`); (2) `tests/content/lessonNine.test.ts` “Lesson 9 follows two source dialogues with five ordered grammar points” fails `examples.length >= 5`; (3) `tests/content/lessonNine.test.ts` “Lesson 9 gives every grammar point its own visual manipulative” fails `pages[0].liveSceneLab`; (4) `tests/content/lessonNine.test.ts` “Lesson 9 keeps authored pattern shapes compact” actual `[3,0,6,0,4]`, expected `[3,2,2,3,3]`. Source/test conflicts, not content regressions.
- UI: **partial PASS** — Chrome 390×844/1600 and 1440×1000; all 8 picture items/prompts inspected; wrong→repair→retry→correct flow works. At 390 the correct bar overlaps the word bank (clipped leftover tile). Safari unverified.

## Checked

- Read pp.205–208/213–217 with my own Claude reads, OCR, transcript, ledger and JSON.
- Printed items 21/21 in order; examples 21; tables p.205/p.207/p.216; parity true; keys 5/5.
- `l9g2-p3` A line removed; prompt is English only and does not print 從/到/都.
- `l9g4-p4` scene page 214 row crop `[0.125,0.445,0.735,0.20]`; Claude read shows the three pictures, left = two women/car; prompt/alt identify left. The row clips the next question line; UI note.
- Before/after: G3/G1 headers normalized; p.217 piano prompt removed; G5 take-out note; G1 有 repair.

## Issues

- None in reviewed text/keys.
- UI: L09 correct bar overlaps word bank at 390; p.214 row crop includes a clipped question line.

## BOOK-ERRATA / Unsure / NEEDS-ENGINE

- BOOK-ERRATA: none confirmed.
- Unsure: p.214 #2 library picture; p.216 ③.
- NEEDS-ENGINE: none.

## Scores

Source/table 9; Chinese/pinyin/English 10; taught scope 10; coverage 10; key/feedback 10; teaching value 9; clarity 9.
