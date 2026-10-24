# L11 overnight — independent reviewer, 2026-10-24

Final revision:
- grammar `c182eac2c64389aae23da86e13f775eaea39769f8079e2c15de7c1fb7705a384`
- practice `3facb5c912c83ff6e95927083af3da5a5825bd677cc5a2e002b8b023afbec8cb`

Verdict: PASS (content) + NEEDS-ENGINE (p.250 #3).

## Verdicts

- Content review: **PASS** — 20/20 printed items; 9 scenes present and crop-verified.
- Automated gate: **FAIL** — same exact final suite evidence as L09: `content:export`/`content:validate` pass; targeted tests exit 1, 1140 pass / 5 fail (5th aggregate `tests/content`); full `npm test` exit 1, 1140 pass / 4 fail: `tests/content/grammarTrackClips.test.ts` L09 G05 clip uses `exampleId: l9g5-e1` for table row `l9g5-p1`; `tests/content/lessonNine.test.ts` fails examples>=5, `pages[0].liveSceneLab`, and pattern shapes `[3,0,6,0,4]` vs `[3,2,2,3,3]`. No lesson-specific failure for this lesson. Exact evidence: `docs/grammar/reviews/L09-L16-gate-evidence.md`.
- UI: **partial PASS** — Chrome 390×844/1600 and 1440×1000; all 8 picture items/prompts inspected; Safari unverified.

## Checked

- Read pp.247–252/257–260 with my own Claude reads, OCR, transcript, ledger and JSON.
- Printed items 20/20 in order; examples 32; 11 tables; parity true; keys 5/5.
- Crop checks (Claude): p.248 #1 ticket, #2 one full/one empty bowl, #4 child/dog; p.258 #1 bowls→washing; p.259 #3 café, #4 stomach pain+milk, #5 family meal; p.260 #1 phone/girl, #2 department store with two children in the bubble. No answer marks.
- Headers shortened; p.252 #3 date slot + `跟同學` alternative; p.260 #2 children; take-out note.

## Issues

- None in reviewed text/keys.
- NEEDS-ENGINE: p.250 #3 cannot accept both the book’s 了沒 and 了沒有 with one 沒 tile; app accepts 了沒有.

## BOOK-ERRATA / Unsure / NEEDS-ENGINE

- BOOK-ERRATA: none confirmed.
- Unsure: p.252 #3 final companion model; p.259 #4 source item’s role in the 先…等…再… set.
- NEEDS-ENGINE: p.250 #3 了沒/了沒有 tile multiplicity.

## Scores

Source/table 10; Chinese/pinyin/English 10; taught scope 10; coverage 10; key/feedback 9; teaching value 9; clarity 9.
