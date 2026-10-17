# L08 independent final review — GPT-6, 2026-10-16
Verdict: FIXES NEEDED

## Checked

- Transcript against all seven supplied scans first: Chinese, printed English, blanks, glossary, clocks (8:35→8:40; 11:50→12:00), calendars and captions match. No transcript edit.
- Both grammar-author copies agree. Checked scope list, lesson template, relevant decisions and verify-change rules. Current task overrides the skill’s practice pause and npm gates; no engine/pack edits.
- All five pages and embedded copies: all 16 好/難 table cells, eight attached sentences, other three printed tables, brand sentence and twelve numbered examples checked individually against transcript/scans. Added sentence pinyin is editorial; only 台北/桃園 pinyin is printed. Checked tokens, simplified forms, English, 一/不 sandhi, neutral reduplication, explanations, clarifiers and optional labs.
- All 18 original practice items: printed order/instructions, kind fit, taught words/grammar through the point, tile limits, alternatives, distractors, repairs and feedback. No later grammar needed; printed 先 and 再 do not introduce the later 先…再 sequence pattern. 台北/桃園 alone need the existing allowlist.

| Practice item | Decision |
| --- | --- |
| l8g1-p1, p4, p5 | Keep slot-build; one whole quality choice, opposite-quality trap, context-specific repair. Replaces unrelated verb elimination. |
| l8g1-p2 | Defer: bicycle riding and appearance, positive and negative, all possible. |
| l8g1-p3 | Defer: both 好學 and 難學 fit wanting to learn. |
| l8g1-p6 | Defer: remoteness does not determine the other quality. |
| l8g2-p1 | Defer: printed 因為 is supplied; reason-only blank cannot become two connector blanks. |
| l8g2-p2 | Keep slot-build; preserve model question whole except 為什麼; contrast question/reason/result words. |
| l8g2-p3 | Keep slot-build; connector placement in a labeled model answer, no clause building. |
| l8g3-p1–p3 | Keep slot-build; fixed labeled model statement, only 吧 placed, contrasting 呢. Country/drink/sport selection no longer distracts from checking a guess. |
| l8g4-p1–p3 | Keep slot-build; VV + 看 order, short tiles, single-verb trap with neutral reduplication. Printed dialogue/cues retained. |
| l8g5-p1 | Defer: April 3→5 supplies no event. |
| l8g5-p2–p3 | Keep countdown slot-build; fix event text, place only 快要/了, reject 明天 from the displayed clock/calendar. Label supplied model answers. |

## Issues

- Five deferred items leave book coverage incomplete; see `L08-needs.md`. The task explicitly permits removal when forced; this overrides the skill’s conflicting no-omissions rule. No extra invented book items added.
- The skill’s open-answer/accepted-equivalents rules and newer context-decides-one-answer rule conflict on these open prompts. No context or official answer key was invented to conceal that conflict.
- Unmounted legacy `questions` remain one-tile placeholders, per the existing project decision; they do not meet current exercise-design rules and must not be enabled as practice.

### Second-model flags

| Flag | Judgment |
| --- | --- |
| l8g2-e0 | Accept: removed duplicate example; dialogues now numbered 1–3, brand sentence remains in pattern row. |
| Practice l8g2-p1 | Accept: added 所以 clause is not printed; forced adaptation removed and deferred. |
| l8d2-3 穿穿 | Accept: sentence and word pinyin changed to chuān chuan. |
| l8g1-e4 English | Accept BOOK-ERRATA; retained verbatim. |
| l8g1-e1 English | Accept BOOK-ERRATA; retained verbatim. |
| l8g1-e3 English | Accept BOOK-ERRATA; retained verbatim. |

## Fixed

- Grammar: duplicate/numbering and 穿穿 fixes above; eight G1 rows now link their printed example immediately beneath the corresponding pair; five clarifier titles standardized to “Don't mix these up”. All embedded page copies synchronized.
- G2 clarifier: replaced potentially valid result-before-reason reversal with the actual placement error of stacking 因為所以 at the start; the book says reason first *usually*, not always.
- Practice: five forced items deferred; retained thirteen simplified as listed above; removed obsolete alternatives, added exact printed item sources and labeled open-blank models. No arbitrary word allowlisting.

## Unsure

- Dialogue 2’s source pages 188–190 were not supplied. Only flagged 穿穿 pronunciation was corrected; its wider transcript fidelity is not certified.
- G5 teaching clocks occur only in optional sentence-spine notes; live visual presentation needs owner/engine review. Retained practice countdowns match the scans.
- No UI execution; visual/runtime behavior is not certified.
- PASS: JSON parsing; five embedded page copies equal canonical pages; 30 tokenized page texts reconstruct in both scripts.
- PASS: thirteen retained items have sources, ≤4-character tiles, ≤6-tile docks, one accepted combination, rejected tiles with repairs, and exact matching Chinese feedback in both scripts.
- PASS: static retained-practice vocabulary check against Book 1 through each part and grammar examples through each point, plus printed 台北/桃園 glossary.
- SKIPPED: npm export, validation and tests, explicitly prohibited by task. No command output exists for these gates; static checks do not replace them.

## BOOK-ERRATA

- p.185 / l8g1-e1: “The beef noodles is delicious from this restaurant” has agreement/word-order errors; preserved.
- p.185 / l8g1-e3: “The color … is good” obscures attractive appearance; preserved.
- p.185 / l8g1-e4: “Can you do it now?” omits singing one song; preserved.
- p.194: “mono-syllable” is awkward terminology; printed sense retained in the simpler explanation.
- p.195 #1: no Japanese-friend event is pictured. An open completion, not a recoverable official answer.

## NEEDS-ENGINE

- NEEDS-ENGINE: five source-specific interaction requirements in `docs/grammar/reviews/L08-needs.md`; restore their book coverage after resolving open-answer grading/context.
