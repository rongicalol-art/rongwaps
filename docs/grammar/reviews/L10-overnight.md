# L10 overnight — independent reviewer, 2026-10-24

Final revision (round limit; not reopened):
- grammar `f32b7a13d5ff7bfa7c1e7e989b5cdd963f28d50b59b989018f701f50224f42b4`
- practice `9c1abbc8262a971d90ef70d38bdae0ac39529ba61f9649f0c9aa4ff7f841468e`

Verdict: FIXES NEEDED (3-round limit).

## Verdicts

- Content review: **FIXES NEEDED** — 22/22 printed items; two residual notes plus a source-printed later pattern.
- Automated gate: **FAIL** — same exact final suite evidence as L09: `content:export`/`content:validate` pass; targeted tests exit 1, 1140 pass / 5 fail (5th aggregate `tests/content`); full `npm test` exit 1, 1140 pass / 4 fail: `tests/content/grammarTrackClips.test.ts` L09 G05 clip uses `exampleId: l9g5-e1` for table row `l9g5-p1`; `tests/content/lessonNine.test.ts` fails examples>=5, `pages[0].liveSceneLab`, and pattern shapes `[3,0,6,0,4]` vs `[3,2,2,3,3]`. No lesson-specific failure for this lesson. Exact evidence: `docs/grammar/reviews/L09-L16-gate-evidence.md`.
- UI: **partial PASS** — Chrome 390×844/1600 and 1440×1000; all 8 picture items/prompts inspected; L14/L09 feedback flows work. Safari unverified.

## Checked

- 22/22 printed items; 27 examples; tables; parity; keys.
- Prior rounds fixed: picture pages 228/230/236; concise answers; 都; 和; 眼鏡 yǎnjing; G3 多／少; G5 lab; G5 match.

## Residual issues

- `l10g2-p9` still preprints 的; it is a demonstrative+都 comprehension item with a success note, not 的 production.
- G2 (3) header `Dem. + measure` is an accepted width compromise for printed `SP+(Nu)+M`.
- p.231 #3 uses source-printed `快要考試了` (L13); p.230 #3 is a source-printed 是…的-shaped frame. Record as source exceptions, not taught L10 grammar.
- Five L10 crops need the coordinator’s visual/UI pass (Claude limit during authoring).

## BOOK-ERRATA / Unsure / NEEDS-ENGINE

- BOOK-ERRATA: p.236 weather row labels partly illegible; p.228 neutral yǎnjing (followed).
- Unsure: header compromise; source-printed 快要.
- NEEDS-ENGINE: none.

## Scores

Source/table 9; Chinese/pinyin/English 10; taught scope 9; coverage 10; key/feedback 9; teaching value 9; clarity 9.
