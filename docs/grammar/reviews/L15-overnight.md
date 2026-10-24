# L15 overnight — independent reviewer, 2026-10-24

Final revision:
- grammar `89e6c202577856384d99c89282fa599d46363e6090a14dced3917cd3c05f4f76`
- practice `ca5c80940728c7ee7297bd6d1ee7801568ef3d617479e399616ec4c3268e547e`

Verdict: PASS (content) + NEEDS-ENGINE (part/registry order).

## Verdicts

- Content review: **PASS** — 9/9 printed items; six scenes verified; headers shortened.
- Automated gate: **FAIL** — same exact final suite evidence as L09: `content:export`/`content:validate` pass; targeted tests exit 1, 1140 pass / 5 fail (5th aggregate `tests/content`); full `npm test` exit 1, 1140 pass / 4 fail: `tests/content/grammarTrackClips.test.ts` L09 G05 clip uses `exampleId: l9g5-e1` for table row `l9g5-p1`; `tests/content/lessonNine.test.ts` fails examples>=5, `pages[0].liveSceneLab`, and pattern shapes `[3,0,6,0,4]` vs `[3,2,2,3,3]`. No lesson-specific failure for this lesson. Exact evidence: `docs/grammar/reviews/L09-L16-gate-evidence.md`.
- UI: **partial PASS** — Chrome 390×844/1600 and 1440×1000; all 8 picture items/prompts inspected; Safari unverified.

## Checked

- Read pp.347–349/350–354 with my own Claude reads, OCR, transcript, ledger and JSON.
- Printed items 9/9; examples 15; tables; parity true; keys 3/3.
- Crop checks: p.348 #1 drawing girls, #2 昨天/今天, #3 running sisters; p.354 #1 TV/visitors, #2 cyclist, #3 headphones/sofa/drink; all complete, no answer marks.
- `l15g3-p2` `sub` states the result clause is printed; the line shows `他不是台灣人`.
- Headers shortened; part order preserved.

## Issues

- None in reviewed text/keys.
- NEEDS-ENGINE: printed order G01, G03 (一……就), G02 (著) vs app Part 1 G01, Part 2 G02, Part 3 G03, and Part 3’s reading attached to p.349.

## BOOK-ERRATA / Unsure / NEEDS-ENGINE

- BOOK-ERRATA: none confirmed.
- Unsure: p.354 #3 model; p.349 #2 unnamed speaker.
- NEEDS-ENGINE: L15 part/registry order and Part 3 reading attachment.

## Scores

Source/table 9; Chinese/pinyin/English 10; taught scope 9; coverage 10; key/feedback 9; teaching value 9; clarity 9.
