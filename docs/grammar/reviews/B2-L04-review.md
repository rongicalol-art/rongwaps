# B2 L04 FIX — deepseek-v4.1-flash, 2026-10-28
Verdict: PASS

## Checked
- OCR p100–p114 and page images p101 (printed 100), p111 (printed 110), p112 (printed 111), p113 (printed 112), p114 (printed 113); printed page = PDF page − 1.
- Both fidelity findings reproduced: the 就 練習 is on printed p.100 (PDF p101); the V起 練習 is on printed p.112 (PDF p113).
- All 11 teaching findings checked against the printed exercise, the p111 pictures, and the p.100–p.113 items. Fixed below; rejected/partly rejected findings noted.
- Readings B2L04-R01/R02 compared with the L04 transcript, and the transcript with the OCR; no reading or transcript change was needed, so neither was touched.
- All 55 practice items are present: 32 book items (p.100–p.113) in book order, each group followed by its 23 own items; ids unique.
- Gates: `npm run content:export` (Book 2 grammar 8 parts), `npm run content:validate` (“Interactive lesson content valid.”), `npm test` (1240 pass, 0 fail). No `src/`, `tests/` or wiring changes.

## Issues
Fixed (fidelity)
- `content/grammar/b2LessonFour.json` `B2L04-G01-P99` — `printedPages` `[99,99]` → `[99,100]`; the 就 練習 is printed on p.100, same convention as B2L03-G05-P79.
- `content/grammar/b2LessonFour.json` `B2L04-G06-P111` — `printedPages` `[111,111]` → `[111,112]`; the V起 練習 is printed on p.112.

Fixed (teaching)
- `b2l04g1-p4` — promptZh 你就是王先生 → 你是王先生 (no longer prints the target 就是); English unchanged and faithful.
- `b2l04g1-p3` — accepted added 那個就是長頭髮的小姐。 / 長頭髮的小姐就是那個。 (reviewer) plus 就是長頭髮的那個小姐。 (same tiles, natural answer), each with pinyin/English.
- `b2l04g2-p6` — promptZh/prompt recast to 你想知道他能不能找到那家店 / “whether he can find that shop”, so 你找不到那家店嗎？ is no longer a second right answer.
- `b2l04g3-p1` — promptZh/prompt no longer print 聽不聽得懂; now 朋友問你日文歌的事 / “A friend asks about Japanese songs.”
- `b2l04g3-p4` — promptZh/prompt no longer cue 說; now 這個電影沒有中文。你不想看。 / “You do not want to watch it.”
- `b2l04g3-p5` — removed the tail ，可是我沒學過中文。 from the chunks and result; result is now 我聽不懂他的話。; hint now “His words were too hard for you.”
- `b2l04g4-p4` — promptZh/prompt now 大家聽了她的歌，都很高興 / “Everyone listened to her song and was happy”, matching the p111 picture (three smiling listeners).
- `b2l04g4-p6` — promptZh/prompt now 他打籃球，球進了 / “the ball went in”, matching the p111 picture; 好/不好 is decided without printing 打得好.
- `B2L04-G04-P108` `allowWords` — added 唱, 好聽, 難聽 (all printed at p.109–p.110), alongside 鞋.
- `b2l04g6-p1` — promptZh/prompt now 我想買那個牌子的錶，可是太貴了 / “I want to buy …”, so 租不起 is no longer possible.
- `b2l04g6-p3` — tiles 買不起/買得起 replaced with 吃不起/吃得起; both placed repairs now say “Coffee is something you drink, not eat.”
- `b2l04g5-p1` — accepted added 天氣越來越冷了，冬天到了。 with pinyin/English.
- `b2l04g6-p7` — accepted added 他很有錢，這間公寓當然住得起。 with pinyin/English.
- Own-item order now easy → hard: G1 p6 before p5; G6 p6, p7, p5; G7 p6, p4, p5; G8 p6 before p5.

Rejected / adjusted
- `b2l04g2-p5` (teaching #7a) rejected: 「，所以很高興」 is the chunk `tail`, not an unlisted addition; the result is exactly the repaired chunks, and 所以 is the correct connector here.
- `b2l04g3-p5` finding’s reason partly rejected: the clause was the chunk `tail`, not a missing chunk; the real defect was the wrong 可是 connector, fixed as above.
- `b2l04g4-p6` exact wording rejected: 「他打籃球打得很好」 would print the target 打得好; the picture cue 球進了 gives one right answer without the giveaway.

## Unsure
- `b2l04g4-p6` uses 球進了 (Book 1 vocabulary) rather than the reviewer’s 打得好; a human should confirm the cue reads clearly enough.
- `b2l04g3-p4` keeps the reviewer’s 你不想看; the answer 我看不懂 is then the reason for not wanting to watch. A more direct cause would be 你看了，可是不了解.
- `b2l04g6-p3` uses 吃不起/吃得起 as the near-miss for coffee; 吃 with coffee is clearly wrong, but a human may prefer another real learner error.
- G7 keeps the spot-fix p5 last per the reviewer; if the two-clause build p4 is judged harder, swap p4/p5.
- `allowWords` now lists 好聽/難聽 as well as 唱; both are printed at p110 #1.
- p115–p116 are classroom-activity pages; they were not re-opened as images because they carry no grammar/practice item.
- The g5-p1 alternate order will show the comma hint after the first canonical tile rather than after 了; see NEEDS-ENGINE.

## NEEDS-ENGINE
- `commaAfter` in `src/features/grammar-practice/exercises/OrderBuildExercise.tsx` uses `accepted[0]`; the new alternate in `b2l04g5-p1` (天氣越來越冷了，冬天到了) will show the comma after the wrong tile. Compute comma positions from the matched accepted answer. Same issue as B2-L03 review; the component is outside this run’s write list.
- Book 2 practice vocabulary gate: `tests/content/grammarPracticeVocabulary.test.ts` loads Book 1 only, so Book 2 `allowWords` is metadata, not enforced (already noted in B2-L01 review).

## Chinese instruction lines used
- 用「…」回答。 / 用「…」說。 / 用「…」說新的句子。
- 句子要說這個意思。 / 請說對。 / 這兩個句子一樣嗎？
- 用「得不得了」回答。 / 用「極了」回答。 / 用「極了」說。
- 用「越來越」說。 / 用「越來越」說新的句子。
- 用「租」和「起」說。 / 用「住」和「起」說。
- 用「吃飽」說。 / 用「對…有興趣」說。 / 用「不但…也…」說。
- 用「陳先生」和「做家事」說。用「有一點兒」。
- 你問他。 / 你是王先生。你怎麼回答？
- Situation lines: 你想知道他能不能找到那家店。 / 你沒學過日文。朋友問你日文歌的事。 / 這個電影沒有中文。你不想看。 / 大家聽了她的歌，都很高興。 / 他打籃球，球進了。 / 我想買那個牌子的錶，可是太貴了。
