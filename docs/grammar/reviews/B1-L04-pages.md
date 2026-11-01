# B1 L04 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonFour.json`. All items `slot-build`, A/B speakers (number items have no speaker), 4–6 tiles, no prompt/quiet/sub/glossary/gaps/successNote. Ids renamed to `l4gN-M` / `l4gN-ownM`. Gate `BOOK1_LESSON=lessonFour npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 11/11 pass.

## G01 p.96–97 Transposed objects — 4 book + 1 own
- #1 `[紅色的][衣服]，[我][不][喜歡]，我喜歡白色的。` Added "，我喜歡白色的" so the reply is a no. Trap 沒; English order (我不喜歡，紅色的衣服) → fallback.
- #2 `[這種][鉛筆]，[我][要][買]兩枝。` + pencil illustration (box kept). Added 兩枝 so the reply is a yes. Trap 這枝 (one pencil vs a kind).
- #3 `[蛋糕/牛肉麵]、[…]，我[都][喜歡][吃]。` Both food orders accepted. Trap 咖啡 (喝 not 吃); 都 position → fallback.
- #4 `[花]、[書]、[蛋糕]，我[都][喜歡]。` All 6 gift orders accepted. Trap 有 (copying 書、筆，我都有).
- own1 `咖啡、茶，我[都][不][喜歡]，我喜歡喝水。` Mistake: 不都 vs 都不 (water decides "neither"); trap 沒.

## G02 p.98 也 — 3 book + 1 own
- Deviation on all three: book B lines are fully open; the first clause is printed and the learner builds the 也 clause.
- #1 `我要吃牛肉麵，[也][要][吃][蛋糕]。` Traps 都, 和 (和 joining verb phrases).
- #2 `牛肉麵很好吃，[蛋糕][也][很][好吃]。` Traps 好喝, 不 (也 after a positive clause); 也蛋糕 → fallback.
- #3 `我喜歡買便宜的東西，[他][也][喜歡][買]。` Traps 賣, 都.
- own1 `我不喝咖啡，[也][不][喝]茶。` Mistake: 不也 order; traps 都, 和, 吃.

## G03 p.99 太……了 — 3 book + 1 own
- #1 `[太][小][了]` Picture: **book crop**, new box [0.205,0.338,0.084,0.114] (checked). The generated shirt illustration (small red shirt on a big grey one) does not decide 大 vs 小, so I moved off its box. Traps 大, 很, 的.
- #2 `他[太][累/忙][了]` + generated worker (box kept). 累 and 忙 both accepted (picture shows both). Traps 很, 好.
- #3 `[太][好喝][了]，我和我的朋友都常常喝。` Traps 好吃, 貴 (contradicts "drink it often"), 很.
- own1 `A：這件衣服很好看，你要買嗎？ B：不要，[太][貴][了]。` Mistake: 太…了 as the reason for saying no vs 很; traps 便宜, 好看, 很.
- Dropped old own item (40°C thermometer): it copied page example 1 (今天太熱了).

## G04 p.104–105 Numbers — 3 book + 1 own
- Deviation: the book prints 8 + 4 + 4 numbers; one item per exercise (test needs one `source` per #n, ≤6 tiles), so each item carries the most instructive one.
- #1 800,500 → `[八十萬][零][五百]`; second 零 tile (one 零 covers a run of zeros), traps 八百, 五十.
- #2 0930-252-242 → `[零九三零][二五二][二四二]`; traps 兩五兩 / 兩四兩 (兩 for a digit), 零九三十.
- #3 2,200（老師）→ `[兩千][兩百][個]老師`; traps 二千, 本, 零. Only 兩百 offered (二百 also fine in speech, so no 二百 tile).
- own1 9,400,000 (book number) → `[九百][四十][萬]`; traps 千, 九千 (grouping by 千 / 94,000,000).
- Not covered: 150, 309, 5,080, 630,000, 7,200, 13,000,000; three phone numbers; 201/5,005/512,300 nouns.

## G05 p.106–107 多 — 6 book + 1 own
- p.106 #1 `[十][多][個]人` (15 faces); traps 二十, 塊, 歲. 十幾 not offered (also right).
- p.106 #2 `[一百][多][塊]錢` ($180); traps 兩百, 杯, 個; 一百塊多 → fallback. 八十 not offered (一百八十 exact would be right).
- p.106 #3 `[兩千][多][塊]錢` ($2,200); traps 兩百, 件, 個.
- p.107 #1 `[十一][點][多]` + 11:10 illustration (box kept; the book scan clock differs, illustration decides); traps 十二, 分, 號.
- p.107 #2 `[十][歲][多]` Picture: book crop [0.455,0.312,0.18,0.088] (checked; replaces the drawn `change` scene). Traps 十一, 九, 幾; 十多歲 → fallback. Answer assumes today = 2026-11-01.
- p.107 #3 `[八][塊][多]錢` Book crop [0.68,0.29,0.16,0.11] (checked, pens + rose + US$8.45). Traps 八十, 枝, 朵.
- own1 `A：這枝筆[多少][錢]？ B：三十多塊。` Mistake: 多 vs 多少 vs 幾 when asking a price; trap 歲.
- Dropped: old sort-groups and listen-build own items (not slot-build).

## PICTURE-NEEDED
- PICTURE-NEEDED: picture 107:0.455,0.312,0.18,0.088 — a baby labelled "2016.1.1" → arrow → the same child aged about ten labelled "今天 2026.11.1". Without a fixed today the book crop's "?" does not decide 十 (and real dates drift: from 2027-01-01 the child is 十一歲多).
- PICTURE-NEEDED: picture 99:0.205,0.338,0.084,0.114 — a boy in a T-shirt clearly too small (middle showing), one shirt only (optional; the book crop already decides 小).

## Unsure
- `tests/unit/grammarPracticeCheck.test.ts:80` references old id `l04-g3-book2` (gaps item); it will fail until updated (not touched).
- G03 #2 accepts 累 and 忙, so that blank tests the frame, not the word.
- G01 #1/#2 topics are copyable from A's question; the skill is moving them to the front.
- G05 p.107 #1: the generated `l04-clock-eleven-ten` illustration (11:10) doesn't match the book scan's ornate clock; the illustration is what the learner sees, so the answer follows it.

## Review (fresh reviewer, 2026-11-01)
Verdict: FIXED 1 item. Gate 11/11.
- Checked every item vs scans p.96–107, every tile in every blank, notes, pinyin/sandhi, simplified, crops (99 boy, 107 baby, 107 pens+rose cropped and viewed; worker/clock/pencil illustrations viewed).
- Fixed l4g3-2: the 好 note ("太好了 means things are great") was false when 好 lands in the first blank (他好累了 = "he's so tired" in Taiwan speech). New note: he is not 好; say how he is inside 太…了.
- Numbers page: acceptable. The key trap types are all covered: 零 in the middle (800,500), 二 vs 兩 (phone digits 二 / 兩千兩百), 萬 grouping (800,500, own 9,400,000). 兩百 follows the book (兩百一十五 in the text, 兩千零五 in the table).
- PICTURE-NEEDED (refined): picture 107:0.455,0.312,0.18,0.088. Left: a newborn swaddled, labelled "2016.1.1". Arrow. Right: the same child aged about ten (a primary-school kid), labelled "今天 2026.11.1". No other numbers or candles.
- PICTURE-NEEDED (optional): picture 99:0.205,0.338,0.084,0.114. One boy, worried face, tugging down a T-shirt so small his tummy shows. One shirt only, no size comparison.
### Unsure
- l4g3-2 still accepts 累 and 忙: the picture shows both, and the only extra context would copy page example 2 (太累了，現在很想睡覺). The item tests the 太…了 frame (traps 很, 好), not the adjective.
- l4g5-5 (十歲多) is right only until 2026-12-31 unless the illustration fixes "today".
- own l4g4-own1 reuses a printed number (9,400,000). 13,000,000 → 一千三百萬 (trap 十三百萬, the "thirteen million" calque) would test a mistake #1 doesn't. Taste call, so left as is.
- l4g4-1's second 零 tile can't show its "one 零 per run" lesson, because the 3 blanks force exactly one 零. It's harmless, but it's a weak trap.
