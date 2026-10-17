# L04 author — opencode (GLM), 2026-10-16
Verdict: PASS

## Checked
- Transcript pp.95–99 and 104–107 against all five pages in `content/grammar/lessonFourPartOne.json` / `lessonFourPartTwo.json` (standalone-page copies and part copies kept deep-equal, asserted programmatically).
- Every example traces to a transcript line (checker against the normalized transcript). Scans p.99 / p.106 / p.107 were opened directly to settle picture facts.
- Invented sentences removed from G1–G5: lab "repair" choices (G1 我蛋糕喜歡 → …, G2 也他買書 → …, G3 太熱 → 太熱了), the ungrounded confusion items (G1 missing-pause + 都不喜歡, G2 也-不 order, G3 太好/太大 word choice, G4 三十千), and the book-table mirror in G4 replaced the previous four invented restructurings (blocks/split/drop/wan rows used numbers the book never prints, e.g. 九千萬 for 90,000,000 → replaced by the printed 九千零九萬 row).
- Confusion blocks now contain only items grounded in the book's note/table: G1 都 needs a plural topic (note 2) and 都 placement (table S+都+V); G2 也 before the repeated verb and after the new subject (note + table); G3 了 closes the frame and 太 precedes the adjective (table, rights = book sentences); G4 零 bridges an empty place (book row 105) and 二 vs 兩 (book exercise noun). G5 多 after the round number vs after the unit (both forms printed), 多 after time/age units.
- G5 examples 1–8 (二十多朵花 … 十二塊多（錢）) now fully segmented word-by-word like Lesson 8; G1–G3 examples already were. G4 keeps `examples: []` (the book prints no numbered sentences there).
- Book tables mirrored: G2 (1)/(2) tables, G3 太 table, G5 (1)/(2) tables, G4 the single 11-reading numerical table as one subsection.
- Word scope, grammar scope: nothing beyond L4 per `.audit/grammar-run/scope.md`; every shown Chinese word decomposes to the page's `teachingGlossary` (checker); additions per page listed in Issues.
- Model answers to open book blanks kept natural and taught: 太小了 (scan confirms the shirt is too small, not too big), 十多個人 (15 faces), 一百多塊錢 / 兩千多塊錢 / 十二點多 / 八塊多, 五千零八十, phone digit reading, 兩千兩百位老師, 四歲多 (stable model, see Unsure).

## Issues
- lessonFourPartOne.json (G1, G2, G3): single-decision pages drills (topic blank only, comment fixed); G3 q1 answer 太大了→太小了 with cue detail corrected per scan; confusion/lab trims above; glossary added 這兩種, 那種鉛筆, 生日, 花, 小, 和, 朋友.
- lessonFourPartTwo.json (G4, G5): G4 rebuilt (see above), questions reduced to one tempting wrong tile each (五千八十 missing 零; digits-with-no-zero phone; 兩千兩百老師 missing 位); G5 examples segmented, time confusion re-based to the printed 十一點多; glossary added 二十, 三千, 一百, 五百, 六萬, 九萬, 兩千, 兩百, 十一, 十二, 有, 多少, plus the printed short readings 八百五（十）/六千五（百）/七萬八（千）， 五十萬, 九百萬, 九千零九萬, and the shown wrong-form words 一百五, 二千兩百位老師, 九三六六八四九三, 兩千兩百老師, 五千八十, 不說.
- `exerciseNote` authoring meta remarks removed from all five pages (rule 14: learner-facing text only).
- Book English kept where printed: 太好了！ = "Awesome!", 書、筆，我都有。 = "The book and the pen, I have them both." (awkward, BOOK-ERRATA).
- **Practice NOT authored.** The task asked for `content/grammar-practice/lessonFour.json`, but the skill carries a same-day owner pause ("PRACTICE PAUSED (owner, 2026-10-16): do not create or edit any `content/grammar-practice/` file. Do grammar pages only."). Grammar pages only; no `L04-needs.md` written since no exercise was skipped.
- Not run (task prohibits npm): `content:export`, `content:validate`, tests. JSON validity, type-required fields, transcript trace, gloss coverage and page-copy equality were all checked by local script instead.

## Unsure
- G5 drill 5 keeps the stable 四歲多 model with caption "older than four, not yet five" because the printed 2016.1.1→今天 prompt drifts with the date (it would be 十歲多 today). Confirm at the exercise pass.
- p.107 clock is roughly XII + small minute offset (transcript marks the time [UNCLEAR]); 十二點多 kept as the model.

## BOOK-ERRATA
- p.96 "The book and the pen, I have them both." and p.97 "and(I bought)", p.105 "express the number is in excess of a certain amount.", p.106 vague-amount note — already listed in the transcript; English prints kept as-is.

## NEEDS-ENGINE
- None (practice pass intentionally not started per the owner pause).
