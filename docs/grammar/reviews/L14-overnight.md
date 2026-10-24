# L14 overnight — independent reviewer, 2026-10-24

Final revision:
- grammar `cb99dc86ffa4a85903fffc3c0112367dd8095b059d1388631ad595b219d01540`
- practice `c29aa316b208af37bd6c5a5e20f7b0921673e703f1d3790a5432ec2a8c498a86`

Verdict: PASS (content). Automated gate FAIL (4 suite-level). UI partial PASS.

## Verdicts

- Content review: **PASS** — 24/24 printed items; three pattern corrections verified; p.320 #1 crop tightened.
- Automated gate: **FAIL** — same exact final suite evidence as L09: `content:export`/`content:validate` pass; targeted tests exit 1, 1140 pass / 5 fail (5th aggregate `tests/content`); full `npm test` exit 1, 1140 pass / 4 fail: `tests/content/grammarTrackClips.test.ts` L09 G05 clip uses `exampleId: l9g5-e1` for table row `l9g5-p1`; `tests/content/lessonNine.test.ts` fails examples>=5, `pages[0].liveSceneLab`, and pattern shapes `[3,0,6,0,4]` vs `[3,2,2,3,3]`. No lesson-specific failure for this lesson. Exact evidence: `docs/grammar/reviews/L09-L16-gate-evidence.md`.
- UI: **partial PASS** — Chrome 390×844/1600 and 1440×1000; all 8 picture items/prompts inspected; L14 feedback flow works; post-crop screenshot pending only because Claude hit its limit; crop box `[0.19,0.535,0.18,0.14]` was verified by Claude round-trip. At 390 the mobile dock clips a second tile row. Safari unverified.

## Checked

- Read pp.319–324/331–333 with my own Claude reads, OCR, transcript, ledger and JSON.
- Printed items 24/24 in order; examples 24; tables 8; parity true; keys 3/3.
- `p.321 #3` 的 pattern; `p.323 #2` repeat-verb; `p.323 #3` repeated 跳; p.320 #1 present with an editorial-model sub; p.323 #3 crop verified.
- p.331 row 4 BOOK-ERRATA recorded.

## Issues

- None in reviewed text/keys.
- UI: mobile dock clips a second tile row at 390; p.320 #1 crop screenshot pending.

## BOOK-ERRATA / Unsure / NEEDS-ENGINE

- BOOK-ERRATA: p.331 row 4 `我比他大兩歲` with printed English “He is two years older than me” (recorded).
- Unsure: p.320 #1 exact clock times (editorial model).
- NEEDS-ENGINE: none.

## Scores

Source/table 10; Chinese/pinyin/English 10; taught scope 10; coverage 10; key/feedback 9; teaching value 9; clarity 9.
