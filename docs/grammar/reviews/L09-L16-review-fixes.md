# L09–L16 review fixes — Codex, 2026-10-24

Verdict: PASS for the six reported exercise defects. This does not certify complete L16 source coverage.

## Checked

- Preserved every existing item ID, source reference, picture crop and printed-item order across all eight practice files.
- Speech exercises retain the book's 跟 construction without offering grammatical 對…說 as an incorrect answer; repaired the overgeneralized explanations.
- L11 accepts 沒 and 沒有 in both the question ending and the negative reply, with enough tiles and a matching sentence/reading/translation for all four combinations. No engine change was necessary.
- Added meaning-preserving temporal, equality, simultaneous-action and distance orders. The book model remains first; required grammar stays required.
- 的時候 feedback now explains when/before/after, with no copied phone or conditional-pattern advice.
- 用, longer duration constructions, 多/少 and immediate-sequence frames use the existing tap-where interaction to require producing/placing the grammar. Removed internal author/reviewer notes from learner-facing context.
- Replaced the malformed word-bank fragments with taught forms and context-specific repairs.
- Added regressions for answer fairness, feedback, target production and malformed banks. Replaced outdated L9 minimum-example/lab/table assertions with explicit printed example counts, exercise sources/order and printed table shapes.

## Audio source links

- Relinked 27 existing clips to their exact current source row/example after the overnight rebuild changed IDs and grouping. Recording files, timing, onset and score data are unchanged.
- Seven previous entries no longer match a complete source row/example. Removed those stale entries from the active index; preserved their full metadata locally in `.audit/grammar-fixes-20261024/unmatched-audio.json`. The recordings themselves are untouched. These need source rematching before reinstatement; remaining own/lab uses fall back to the existing audio path.
- Unmatched text: 他們在騎腳踏車; 他本來沒有車後來買車了; 你明天要記得帶毛筆來學校好我會帶毛筆來; 坐飛機比坐火車快多了; 我明天從早上到晚上都沒有空後天可以嗎; 現在去吃飯的人太多了我想先寫功課等人少了再去吃; 等我先生也喝了我們再決定買不買.

## Verification

- Content export and validation: pass.
- Typecheck and lint: pass.
- Full tests: 1,150 passed, zero failures, including six new regression tests.
- Jev lint: zero violations; no semantic rule applies to these authored content paths.
- Chrome: eight corrected cases at both 390×844 and 1440×1000, plus wrong → retry → correct at both sizes, passed. The inert DEV preview was isolated at viewport size to avoid the debug gallery header clipping its sample. No learner progress/SRS/sync was recorded. Evidence: `.audit/grammar-fixes-20261024/preview.log` and screenshots.

## Unsure / remaining source work

- L16 pp.384/386/388/390 remain unavailable. No missing book exercises were invented.
- Existing L15 part/registry order and previously recorded shell/dock layout issues are outside these content corrections. This pass does not certify Safari or the production shell.
