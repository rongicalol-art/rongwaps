# L16 overnight — independent reviewer, 2026-10-24

Final revision:
- grammar `e09147071d5969dd3a7dd49f3a301f41c99ec35bdf4d5e257a1e7b8c98dfd703`
- practice `dbac226f629d59048b3fbd043320b7c712246967ee5de3af27a7f8201bee07e6`

Verdict: PASS (available pages) + SOURCE-BLOCKED G02–G05.

## Verdicts

- Content review: **PASS for available pages** — p.374 6/6; p.385/p.389 tables carry the printed 的; p.373/383/387/389 examples match.
- Automated gate: **FAIL** — same exact final suite evidence as L09: `content:export`/`content:validate` pass; targeted tests exit 1, 1140 pass / 5 fail (5th aggregate `tests/content`); full `npm test` exit 1, 1140 pass / 4 fail: `tests/content/grammarTrackClips.test.ts` L09 G05 clip uses `exampleId: l9g5-e1` for table row `l9g5-p1`; `tests/content/lessonNine.test.ts` fails examples>=5, `pages[0].liveSceneLab`, and pattern shapes `[3,0,6,0,4]` vs `[3,2,2,3,3]`. No lesson-specific failure for this lesson. Exact evidence: `docs/grammar/reviews/L09-L16-gate-evidence.md`.
- UI: **partial PASS** — Chrome 390×844/1600 and 1440×1000; all 8 picture items/prompts inspected; Safari unverified.

## Checked

- My own Sonnet reads: pp.371, 373, 374, 381, 383, 385, 387, 389, 397. pp.384/386/388/390 are absent (confirmed).
- p.374 has no map; its six text items I#1–4 and II#1–2 are all authored. p.374 I#1–#3 use editorial 近/遠 models (no printed key).
- G02–G05 printed exercise pages are absent; practice is own items only.

## Issues

- SOURCE-BLOCKED: G02–G05 printed coverage cannot be verified; no complete coverage claim.
- p.374 instruction mentions a map not printed on the page (recorded).

## BOOK-ERRATA / Unsure / NEEDS-ENGINE

- BOOK-ERRATA: p.374 instruction mentions a map absent from the page.
- Unsure: G02–G05 exercise pages; p.374 open distances.
- NEEDS-ENGINE: none.

## Scores

Source/table 7; Chinese/pinyin/English 10; taught scope 9; coverage 7; key/feedback 8; teaching value 7; clarity 8.
