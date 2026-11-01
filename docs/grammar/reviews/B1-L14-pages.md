# B1 L14 exercise pages — author notes (2026-11-01)

File: `content/grammar-practice/lessonFourteen.json`. All items `slot-build`, A/B speakers, no prompt/sub/glossary/gaps. ≤6 tiles each.
Gate: `BOOK1_LESSON=lessonFourteen npx tsx --test tests/content/grammarPracticeBookOne.test.ts` → 11/11 pass.

**No L14 scans exist** (`materials/book1/L14/` has only `exercises.json` + `transcript.md`; `materials/book1/pages/` is empty). Items follow the transcript; pictures were judged from the existing generated illustrations (all 12 boxes kept, so every illustration still shows). A scan check is still owed.

## G01 Time-duration with single 了 (pp.319–321) — 9 book, 0 own
- p.319 #1 `[我][運動][了][半個小時]` — duration after V了 (fallback for 半個小時運動); traps 七點半 (clock time for 多久), 過.
- p.319 #2 `[我][走][了][十分鐘]` — traps 十分 (clock minute vs 分鐘), 十點.
- p.319 #3 `[他][教][了][兩個小時]` — traps 二個小時 (兩 before 個), 兩年 (昨天 = one day).
- p.320 #1 swim (clocks 6→8) `他今天早上[游泳][游][了][兩個小時]` — verb repeat; traps 八個小時, 八點.
- p.320 #2 computer 7:00→7:30 `她昨天晚上[用電腦][用][了][半個小時]` — traps 三十分, 七點半.
- p.320 #3 singers `他們上週末[唱歌][唱][了][三個小時]` — trap 歌 (repeat the verb, not the object), 三年.
- p.321 #1 reading 2→4 `她昨天下午看了[兩個小時][的][書]` — 的/得, 四個小時, 四點; object-before-duration → fallback.
- p.321 #2 study 8:00→9:30 `他前天晚上[看][了][一個半][小時][書]` — the key 看書了… mistake → fallback; trap 半個. (一個半小時 split because tiles ≤4 chars.)
- p.321 #3 driving 7:00→9:10 `她上週末上午開了[兩個小時][十分鐘]的[車]` — 十分, 九點; hours/minutes order → fallback.

## G02 Time-duration with double 了 (pp.322–324) — 9 book, 0 own
- p.322 #1 `我們[等][了][一個小時][了]` — 兩點, 過.
- p.322 #2 `我在台灣住了[三][年][了]` — 個 (三個年), 點, 天.
- p.322 #3 `我們已經[玩][了][五個小時][了]，應該回家了` — 在 (progressive), 過.
- p.323 #1–3: each starts with the line `現在是晚上九點。` (shortened from the printed 如果現在是晚上九點，那麼他們做這些事做了多久了？). #1 `[十二][個小時][了]` (traps 九, 點, 過); #2 `騎腳踏車[騎][了][兩個小時][了]` (腳踏車, 九個小時); #3 `[跳舞][跳][了][一個小時][了]` (八點).
- p.324 #1 `已經下了[一個星期][的][雨][了]` — 星期一 vs 一個星期, 得.
- p.324 #2 `我已經寫[了][三年][中文字][了]` — 得 (echo of A's 寫得), 三點.
- p.324 #3 `你已經[看][了][三個小時][書][了]，不累嗎？` — 看書了… → fallback; 三點.

## G03 比 (pp.332–333) — 6 book, 1 own
- p.332 #1 `我喜歡喝茶，因為[茶][比][咖啡][好喝]` — 很, 跟; 咖啡比茶 contradicts B → fallback.
- p.332 #2 `我想去看電影，因為看電影[比][打球][有意思]` — 累 (logic), 很, 跟.
- p.332 #3 `因為做飯[比][在外面吃][便宜][多了]` — 很, 貴 (logic); 多了便宜 → fallback.
- p.333 #1 `我的英文書[比][弟弟的][多]` — 很多 (copy of line 1), 少.
- p.333 #2 `牛肉餃子比豬肉餃子[貴][三塊錢]` — 便宜, 八/五塊錢 (price vs difference), 很.
- p.333 #3 `哥哥吃[得][比][我][多]` — uses the p.332 (2) V得比 pattern; 少, 很.
- own 1: phones 5,000 vs 5,100 → `他的手機[比]我的[貴][一點兒]` — 一點兒 vs 多了 decided by the numbers (no book item tests degree choice); 便宜, 很.

## Deviations from print
- Open "Answer the question" items get fixed values (半個小時, 十分鐘, 兩個小時, 一個小時, 三年, 五個小時, 一個星期, 三個小時): only one duration tile fits, so the value is the item's, not decided by context. The traps are clock times, wrong units, 二/兩 and logic.
- p.322 #3, p.324 #1–3: verbs/durations supplied (玩, 下雨, 寫中文字, 看書).
- p.332 #1: the book's first blank (我喜歡____) is filled as 喝茶 so one order is right. #2/#3/p.333 #2: the first noun is fixed so the comparison has one direction.
- p.323 printed prompt shortened to 現在是晚上九點。
- Page titles left as they were (G01/G02 cover three book instructions under one title).
- allowWords: digits 二/八/九 (not single vocab entries; same as L2), 下雨/雨 (printed gloss p.324), 跳 (from 跳舞), 豬肉 (printed gloss p.333).

## Unsure
- No scans: the subjects (他/她/他們) follow the generated illustrations; the book may use 我 or a name. Durations on p.320 #3 and p.324 aren't printed.
- p.322 #1/#2 and p.319 answers mirror A's question (V了…多久(了)) — the book's design; the traps carry the item.
- 看了一個半小時書 / 看了三個小時書 / 寫了三年中文字了 drop the optional 的; natural, but the reviewer should confirm.
- 我的英文書比弟弟的多: the book may expect 我的英文書比弟弟多.

## Review (fresh reviewer, 2026-11-01) — FIXED 4 items + 2 simplified strings
Checked every item against the scans `public/data/book-pages/modern-chinese-1/page-319…324, 331–333.webp` and all 12 L14 illustrations. All 24 book items present, in order, faithful. Subjects match the pictures (swimmer/man/boy 他, reader/driver/writer 她, pairs 他們); clock 6:00→8:00, 7:00→7:30, 9–9, 7–9, 8–9, 2–4, 8–9:30, 7–9:10 all shown.
- p.321 #2 (l14g1-8): the printed pattern is "SV了+Time-duration+**的**O"; answer dropped 的. Now `看[了][一個半][小時][的][書]` (看 fixed to stay ≤6 tiles; 半個 trap kept). English "studied".
- p.324 #2 (l14g2-8) and #3 (l14g2-9): printed pattern "SV了+Time-duration+**的**O了"; both dropped 的. Now `寫[了][三年][的][中文字][了]` (得 trap, note rewritten to be true in either slot; 三點 dropped for tile limit) and `看[了][三個小時][的][書][了]` (看 fixed).
- p.321 #3 (l14g1-9): English "…one morning" → "Last weekend, she drove for two hours and ten minutes in the morning."
- Simplified: 应該 → 应该 (l14g2-3), 一点兒 → 一点儿 (own item).
Gate: 11/11 pass.

### Unsure
- Open items' durations (半個小時, 十分鐘, 兩個小時, 三個小時 for the singers, 一個星期 rain, 三年) are fixed by the only duration-sized tile, not by context; the item really tests placement + clock-vs-duration traps. Acceptable given the book leaves them open.
- l14g2-6 (dance) has a single trap (八點); l14g2-5 copies 騎 from the line (that's the V-repeat pattern itself).
- 我的英文書比弟弟的多: fine; 比弟弟多 also natural but not offered as a tile, so no ambiguity.
- No PICTURE-NEEDED.
