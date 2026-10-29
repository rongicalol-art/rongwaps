# B2 L03 FIX — deepseek-v4.1-flash, 2026-10-28
Verdict: PASS

## Checked
- Transcript and dialogue against OCR p067–p069 and page images p067, p069 (printed page = PDF page − 1).
- The p.77 table and p.76 exercise on p077/p078.png; p.78 example and exercise on p079.png; p.84 English continuation on p084/p085.png; G08/G09 pages on p087/p088.png.
- All seven fidelity findings reproduced against the book/pack, then re-checked in the exported Book 2 packs.
- The changed practice items (G01 p5, G02 p6, G03 p4–p6, G04 p1/p3/p5, G07 p3/p6, G08 p3–p5, G09 p2–p5) against their printed cues; all other items left untouched.
- Readings R01 l2/l22 and R02 page span; grammar dialogue l2/l22 and D02 page span; transcript line 13.
- Gates: `npm run content:export`, `npm run content:validate`, content tests (248 pass), plus the grammar-practice quality/kinds/vocabulary tests (18 pass). No `src/`, `tests/` or wiring changes.

## Issues
Fixed (fidelity)
- `content/grammar/b2LessonThree.json` `B2L03-G02-P77` — four invented combination rows replaced with the book's 2-column grid: `走、跑、帶、放、拿、搬、站` | `上來/上去、下來/下去、進來/進去、出來/出去、回來/回去、過來/過去`; `拿、搬、站` | `起來`.
- `content/readings/book-2.json` `B2L03-R01` l2, `content/grammar/b2LessonThree.json` `b2l03d1-l2`, `materials/book2/L03/transcript.md` line 13 — 這位是我的朋友山本良介; pinyin `wǒ de péngyou`.
- `B2L03-G01-P75` `b2l03g1-ex1` — 我的房間, pinyin `Wǒ de fángjiān`; word 1 is 我的 / `wǒ de`.
- `B2L03-G03-P78` `b2l03g3-ex3` — 危險 now `wéixiǎn` in the sentence and word token, matching B2L01-2-05 and the L02 fix.
- `b2l03d1-l22` in grammar and readings — 星期一 now `xīngqíyī`.
- `content/grammar-practice/b2LessonThree.json` `b2l03g9-p3` — the comment tile is now 很漂亮 / `hěn piàoliàng` (the old 漂亮/piàoliang tile no longer exists after the split below).
- `B2L03-R02` and `B2L03-P02-D02` — `printedPages` now `[82,84]`; the printed English runs to p.84.
- `B2L03-G08-P86` — all `xǐhuan` in the page's pinyin changed to `xǐhuān` (10 occurrences), matching the pack and practice.
- `B2L03-G09-P87` `allowWords` — added 難看, printed at p.87 #2.

Fixed (teaching)
- `b2l03g8-p4` — recast as a noun complement: `我/除了/茶/還喜歡/咖啡/但是`; both 我除了茶，還喜歡咖啡 and 除了茶，我還喜歡咖啡 accepted.
- `b2l03g8-p5` — recast as a different-subject slot-build: `這家餐廳除了 [菜很好吃] ，[環境] 還很好。`; tiles 菜很好吃/環境/天氣/很安靜, answers 菜很好吃/環境.
- `b2l03g4-p3` — added the reverse order `我要擦桌子，請你把杯子拿起來。`
- `b2l03g1-p5` — added `請進來。` as a second accepted answer.
- `b2l03g2-p6` — added `沙發很重，我們搬上去。`; fallback now says 一起 is optional.
- `b2l03g3-p4/p5` — prompts now say 用「去」說; `p6` says 用「來」說.
- `b2l03g4-p1` — `sub` is now 你昨天的書還在學校 (no 沒 giveaway); `p5` prompt is now the completed state 水果在樓下，現在在樓上了。
- `b2l03g9-p5` — promptZh now 你叫他不要再弄, matching the 請你 answer.
- `b2l03g7-p3` — prompt now 弟弟不想寫作業，請你寫他的作業; `p6` now 朋友不會裝網路，你來裝 (no 替他/替朋友).
- `b2l03g8-p3` — prompt now the messy-roommate situation (室友晚上不睡覺，房間也弄得很髒，聲音很大), so the learner infers 生活習慣/很吵.
- `b2l03g9-p4` — prompt now 球跑到很遠的地方 (no 得 cue).
- `b2l03g9-p2/p3` — 得 is now its own tile and slot: p2 `寫 / 得 / 那麼難看` with 寫得 and 寫了 as traps; p3 `弄 / 得 / 很漂亮` with 弄得 and 弄了 as traps. The literal six-tile order-build is all-correct tiles and would fail the validator's "every tile is right" rule; the 3-slot frame keeps the book sentence, removes the pre-solved 得, and gives every wrong tile a repair.

Rejected
- None: every listed finding reproduced against the book. The only literal wording not followed is the six-tile order-build form of g9-p2/p3, for the validator reason above.

## Unsure
- `B2L03-G01-P75` still renders the printed 詞/圖 table as a 13-row 上/來 decomposition: all 13 words are present, but the 13 picture cells cannot be shown (no Book 2 picture crops).
- `B2L03-G02-P77`'s second header is shortened to `DV + 來/去` for the 6-unit header cap; the page title/pattern keeps the full directional-verb wording.
- `B2L03-G05-P79` `b2l03g5-p1` keeps three tiles (認識認識/認識一下/認識); the book's five-word bank and the six-tile cap would allow 歡迎歡迎/練習練習, but the current traps already test the form and the ≥3 rule is met.
- `b2l03g8-p5` says 菜很不錯/裡面很舒服, so 菜很好吃/環境 must be inferred. The tiles make the pattern answer unique; no second content answer is offered.
- `b2l03g9-p2/p3` show three adjacent slots, which reveals that the pattern has three parts; this is the price of keeping a real wrong tile without gluing 得 to the verb.
- G04's six-tile merges (我昨天, 帶回家去, 請你, 把杯子) still pre-solve some internal compound order; the 把/沒 order and the distractor remain the test, the same trade-off L02 accepted.

## NEEDS-ENGINE
- `commaAfter` in `OrderBuildExercise` uses `accepted[0]`, so the alternate accepted orders in `b2l03g4-p3` (我要擦桌子，請你把…) and `b2l03g8-p4` (除了茶，我還…) show the comma hint after the wrong word. Compute the comma from the matched accepted answer.

## Chinese instruction lines used
- 把句子排好。
- 用「把」說。 / 用「把」和「得」說。
- 用「去」說。 / 用「來」說。
- 用「除了…還…」說。 / 用「除了…還…」回答。
- 用「認識」說兩次 (existing G05 pattern).
- 你問他為什麼。 / 你叫他不要再弄。
- Situation lines: 你昨天的書還在學校。 / 水果在樓下，現在在樓上了。 / 室友晚上不睡覺，房間也弄得很髒，聲音很大。 / 弟弟不想寫作業，請你寫他的作業。哥哥說什麼？ / 朋友不會裝網路，你來裝。 / 他寫自己的名字，看起來很難看。 / 這家餐廳的菜很不錯，裡面也很舒服。 / 你喜歡喝茶，也喜歡喝咖啡。 / 弟弟踢足球，球跑到很遠的地方。
