# L13 overnight — independent reviewer, 2026-10-24

Final revision:
- grammar `dff09c6b67bd112c73908809fea172d5130a72618a693d4fca86fc4809995ccd`
- practice `2135f2180e1229679170f69331367b95084cc4b51d52fc7ba3774fd9061cc3cb`

Verdict: PASS (content). Automated gate FAIL (4 suite-level). UI partial PASS.

## Verdicts

- Content review: **PASS** — 23/23 printed items; routeLab is book-based; p.296 crops verified.
- Automated gate: **FAIL** — same exact final suite evidence as L09: `content:export`/`content:validate` pass; targeted tests exit 1, 1140 pass / 5 fail (5th aggregate `tests/content`); full `npm test` exit 1, 1140 pass / 4 fail: `tests/content/grammarTrackClips.test.ts` L09 G05 clip uses `exampleId: l9g5-e1` for table row `l9g5-p1`; `tests/content/lessonNine.test.ts` fails examples>=5, `pages[0].liveSceneLab`, and pattern shapes `[3,0,6,0,4]` vs `[3,2,2,3,3]`. No lesson-specific failure for this lesson. Exact evidence: `docs/grammar/reviews/L09-L16-gate-evidence.md`.
- UI: **partial PASS** — Chrome 390×844/1600 and 1440×1000; all 8 picture items/prompts inspected; L13 post-crop screenshot pending only because Claude hit its limit; the crop box `[0.163,0.571,0.213,0.144]` was verified by Claude round-trip. Safari unverified.

## Checked

- Read pp.295–297/303–306 with my own Claude reads, OCR, transcript, ledger and JSON.
- Printed items 23/23 in order; examples 22 + model; tables; parity true; keys 5/5.
- p.296 #1–#3 crops: Taipei 101/camera, car window, school→post-office map with cat; complete, no answer marks.
- G1 table 5 columns `Lead-in | Verb | 一 | Verb | Object`; frames p3/p8 print the clauses and prompt names the target; p5/p6/p7 `sub` disclose the frame.
- RouteLab uses p.296 examples only.

## Issues

- None in reviewed text/keys.
- UI: post-crop screenshot pending; coordinate the crop/visual pass.

## BOOK-ERRATA / Unsure / NEEDS-ENGINE

- BOOK-ERRATA: none confirmed.
- Unsure: p.304/305 timeline context; p.306 #3/#4 model.
- NEEDS-ENGINE: none.

## Scores

Source/table 10; Chinese/pinyin/English 10; taught scope 10; coverage 10; key/feedback 9; teaching value 9; clarity 9.
