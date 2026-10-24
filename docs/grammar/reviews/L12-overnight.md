# L12 overnight — independent reviewer, 2026-10-24

Final revision:
- grammar `a73bbb3038f1c2533ac23c8564630344a8844228e05cd88178c819fb2d405d16`
- practice `6964ac33936e70fc4fcb6e1d36d3cd60abe31b70d5fdfd36e42a585946f231e8`

Verdict: PASS (content). Automated gate FAIL (4 suite-level). UI partial PASS.

## Verdicts

- Content review: **PASS** — 27/27 printed items; article, p.281 chunks and picture-source handling verified.
- Automated gate: **FAIL** — same exact final suite evidence as L09: `content:export`/`content:validate` pass; targeted tests exit 1, 1140 pass / 5 fail (5th aggregate `tests/content`); full `npm test` exit 1, 1140 pass / 4 fail: `tests/content/grammarTrackClips.test.ts` L09 G05 clip uses `exampleId: l9g5-e1` for table row `l9g5-p1`; `tests/content/lessonNine.test.ts` fails examples>=5, `pages[0].liveSceneLab`, and pattern shapes `[3,0,6,0,4]` vs `[3,2,2,3,3]`. No lesson-specific failure for this lesson. Exact evidence: `docs/grammar/reviews/L09-L16-gate-evidence.md`.
- UI: **partial PASS** — Chrome 390×844/1600 and 1440×1000; all 8 picture items/prompts inspected; Safari unverified.

## Checked

- Read pp.271–276/281–284 with my own Claude reads, OCR, transcript, ledger and JSON.
- Printed items 27/27 in order; own 7; examples 31; tables 7; parity true; keys 5/5.
- p.272 #1 has no scene: the editorial prompt is the source-limited model; the printed ○/× marks would reveal the answer, so they are correctly not shown. It is not explicitly labeled source-limited in JSON; record here. Other 10 scene items are present and were inspected in the UI pass.
- Before/after: 27 printed items; article `有名的記者`; p.281 `不方便對/我們`; p.281 #4 BOOK-ERRATA; p.274 認識的; explanation complete.

## Issues

- None in reviewed text/keys.
- UI: p.272 #1 source-limited, no ○/×; other 10 crops confirmed in the coordinator UI pass (no post-crop screenshot required for p.272 #1).

## BOOK-ERRATA / Unsure / NEEDS-ENGINE

- BOOK-ERRATA: p.281 #4 prints `常常要他` where the context requires 她 (recorded). p.283 article `有名的記者`.
- Unsure: p.275/p.276 models are editorial; p.273 prompts state the picture answer.
- NEEDS-ENGINE: none.

## Scores

Source/table 9; Chinese/pinyin/English 10; taught scope 10; coverage 10; key/feedback 9; teaching value 9; clarity 9.
