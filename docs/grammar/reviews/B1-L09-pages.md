# B1 L09 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonNine.json`. All items `slot-build`, A/B speakers, 4–6 tiles, no prompt/sub/glossary/gaps/successNote. Gate `BOOK1_LESSON=lessonNine npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 11/11 pass.
Book scans for L09 are not in `materials/book1/L09` (only `exercises.json` + `transcript.md`); items follow the transcript, and every scene keeps its existing box, which has a generated illustration (all 21 checked by eye). No crops changed, no PICTURE-NEEDED.

## G01 在V (p.206) — 3 book
- #1 `[他們][在][唱歌]`. Traps 要 (plan vs now), 是, 跳舞 (picture).
- #2 A builds `[他們][在][做][什麼]？` before B's 他們在跳日本舞. Traps 嗎 (with 什麼), 要.
- #3 `[他][在][畫畫]`. Traps 再 (homophone), 要, 做功課 (picture).
- No own: position, 要/在, 在/再, 是 already covered.

## G02 從…到… (p.207) — 3 book + 1 own
- #1 `這家餐廳[從][二月五號][到][二十號][休息]` (printed cue "(二月五號～二月二十號)" dropped from the line; the picture shows 2/5~2/20). 休息 is a tile so English order 休息從… is buildable → fallback. Trap 在.
- #2 `[從][下午][一點][到][四點]`; 下午從一點到四點 also accepted. Trap 上午 (13:00).
- #3 DEVIATION: book answer is open. B：`是，[從]2013年[到]2017年，[他][都]在法國學畫畫。` (time-first, not A's order). Traps 也 (vs 都), 在.
- own1: A：你星期幾有中文課？ B：我[從][星期一][到][星期五]都有中文課，週末沒有。 Mistake: days stretch + 和 for 到; 星期天 trap ruled out by 週末沒有.

## G03 先…再… (p.208) — 3 book + 1 own
- #1 DEVIATION: book prints 先/再 and blanks only the activities; blanked 先/再 too: `我[先]上[畫畫]課，[再]上[網球]課`. Traps 在 (homophone), 籃球.
- #2 `[我們][先]去[圖書館]，[再]去山上，好不好？` (先/再/我們 blanked too; 山上 fixed). Traps 在, 百貨公司. 先我們 → fallback.
- #3 `我[先][游泳]，[再][去]吃晚飯`. Traps 在, 不.
- own1: A：你和哥哥，誰先吃？ B：[哥哥][先]吃，[我][再]吃，因為他很餓。 Mistake: two different subjects each keep their own (book table row 1); reason clause decides who goes first.

## G04 能 (p.213–215) — 9 book, no own
- p.213 #1 `他現在[不][能][說話]`. Traps 會 (skill vs physical), 沒, 要.
- p.213 #2 `[不][能]。` Traps 沒, 會, 是/有.
- p.213 #3 DEVIATION (open): `我一天[只][能][喝][一杯]` from the one-cup picture. Traps 一個 (measure), 多少.
- p.214 #1 `[不][可以]，我今天要用。` Only 可以 offered: "不能" would be printed in A's 能不能 (test fails), and the book note says permission 能 = 可以 (book ex. 2 answers 能嗎 with 不可以). Added "，我今天要用" to decide no (matches the raised palm). Traps 沒, 會, 是.
- p.214 #2 `[不][能]，別人[在][看書]。` Added clause mixes in 在V. Traps 再, 會.
- p.214 #3 `因為[樓下][有人][在][睡覺]`; 因為有人在樓下睡覺 also accepted. Traps 樓上, 再.
- p.215 #1 `…，[不][能][跟][你]去。` Traps 我 (echoing A's 跟我), 沒.
- p.215 #2 `…，[不][能][坐][計程車]。` Traps 開, 公車.
- p.215 #3 A builds `你[能][不][能][幫]我寄信？` Traps 沒 (能沒能), 給 (給我寄信 = to me).

## G05 比較 (p.216–217) — 3 book, no own
- #1 `我覺得[友美]跳[得][比較]好。` Only 友美 offered (opinion item; no name decided by the picture). Traps 誰, 的, 很.
- #2 `我覺得[短/長][的][比較]好看。` Both accepted (opinion). Traps 得, 很.
- #3 `[國安]的[比較][大]。` Picture (top room bigger) decides. Traps 中明, 很, 還是.

## Unsure
- Answers mirror the book question in G01 #1/#3, G02 #3, G04 #1/#2, G05 #1 (B's frame copies A's). That is the book's Q&A shape; traps carry the thinking. G02 #3 is weakest (從/到 copyable; it really tests 都 vs 也 and 他 before 都).
- G04 #2 is a two-blank short answer; maybe thin.
- G05 #1: dropping 元真 makes the name blank a 友美-vs-誰 choice only.
- G05 #2: 長的/短的 for long/short-sleeved tops; check it reads naturally.
- G03 #2: 山上 vs the picture (river under mountains).
- G04 page title stays the combined "Answer the following questions. / Complete the following dialogues with 能." (p.215 has a different instruction).

## Review (fresh reviewer, 2026-11-01)
Verdict: FIXED 6 items. Checked every item against scans p.206–208, 213–217 and the generated illustrations; tried every tile in every blank. Gate 11/11.

Fixes:
- G03 #1/#2/#3/own1: 在 note said only "the 'then' is 再", false when 在 lands in the 先 blank (我在上畫畫課 is grammatical). Now: 在 = right now; first step 先, next 再.
- G03 #1: 籃球 note pointed at 網球 even when dropped in the painting blank. Now names the picture order.
- G04 p.214 #1: 會 note ("she never learned how") was muddled about who 會 refers to; now "knowing how to drive vs refusing permission". Alt text described the book's three-picture row; now describes the illustration (owner with keys, raised palm).
- G05 #1: opinion item forced 友美 (only name tile, 誰 as a weak trap). Swapped 誰 for 元真, both accepted (+alternative, 元真 in allowWords); traps 的/很 carry the grammar.

Checked OK: p.214 #1 不可以 — 能 not offered (it is in A's line), book note equates them; no correct answer rejected. p.216 #2 長的/短的 both accepted, natural with the picture. Room picture: 國安's (top) clearly bigger. p.214 #3 picture: sleepers downstairs.

Unsure:
- G02 #3: A's question holds the whole answer; 從/到/都 copyable. Tiles can't hold "2013年" (5 chars), so no better build. Weakest item.
- p.213 #2 [不][能] repeats p.213 #1's 不能 vs 不會/沒 test in a thinner form; kept (book item).
- p.213 #3: 只 is forced by blank count (我一天能喝一杯 is also fine Mandarin); 只能 is the natural limit reading and the book's own example, kept.
- p.215 #3: 給我寄信 can mean "mail for me" colloquially in Taiwan; note says "to me". Low risk with B's 幫你寄.
- G03 #2 山上 vs a lakeside-with-mountains picture: acceptable.
