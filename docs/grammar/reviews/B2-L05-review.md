# B2 L05 FIX — deepseek-v4.1-flash, 2026-10-29
Verdict: PASS

## Checked
- OCR p117–p135 and page images p123 (printed 122), p124 (printed 123), p128 (printed 127), p129 (printed 128), p130 (printed 129), p132 (printed 131); printed page = PDF page − 1.
- Both reviewer lists against the book: readings B2L05-R01/R02, grammar pages B2L05-G01–G08, all 48 practice items (28 book + 20 own).
- Book p.127 prints 二十四小時的超級市場; p.122 #2 has 不寫功課; p.123 #3 has 媽媽說故事給孩子聽; p.128 prints 麻煩 máfán; p.129 prints 真是 zhēnshi, 中秋節 Zhōngqiū Jié.
- Gates: `npm run content:export` (Book 2: 10 grammar parts, 10 readings) and `npm run content:validate` (“Interactive lesson content valid.”).
- `ACCEPTANCE_STRICT=true npx tsx --test tests/content/*.test.ts`: 242 pass, 0 fail.

## Issues
Fixed (fidelity)
- `content/readings/book-2.json` B2L05-R02 `b2l05d2-l2` + `content/grammar/b2LessonFive.json` `BOOK2_LESSON_FIVE_PART_TWO` `b2l05d2-l2` — simplified now `二十四小时的超级市场` (book p.127). The transcript had the same OCR/transcription slip and was corrected.
- `b2l05g2-p3` — the accepted answer now keeps 媽媽. Implemented as a clause build: the unchanged first clause (with 媽媽) is the prompt/context, the learner builds the changed clause, and the model answer is the full book sentence. The reviewer’s single `媽媽說故事` tile was rejected by the content validator (tiles are capped at 4 Han characters); this keeps 媽媽 in the item and keeps 後來 as the required wrong tile.
- `content/vocabulary/book-2-examples.json` / pack `B2L05-1-22` 香味 → 花香 — **rejected**: the task forbids editing the shared vocabulary pack; the lesson keeps the book’s 花香. Recorded under Unsure.
- Book pinyin from the reviewer’s Unsure list: 麻煩 `máfan` → `máfán` and 真是 `zhēn shì` → `zhēnshi` in the L05 dialogue, reading and transcript.
- `content/grammar/b2LessonFive.json` `B2L05-G07-P131` — `repairFeedback` also said 每隔; changed to `每四課一次` so no untaught 隔 remains.

Fixed (teaching)
- `B2L05-G07-P131` — cf2 answer now 「可以，但「每」要放在數量前面，表示每三天一次、每四課一次。」; q1 correctFeedback now 「每四課」表示每四課考一次，所以第十六課會考第四次。
- `B2L05-G03-P124` — cf1 now contrasts 就/才 with the book’s 只要跟老師說就可以了 right side; the 只有 tile in q1 is now 才, with a matching repair. The ungrammatical 只有…就… sentence is gone.
- Spot-fix `promptZh`: g1-p8, g2-p5, g3-p5, g4-p5, g5-p4, g7-p5, g8-p6 now carry the Chinese meaning (朋友想說…句子要說這個意思。), not the old generic line.
- `b2l05g6-p3` — promptZh/prompt now give 兩萬 and 五千 instead of 房租很便宜.
- `b2l05g1-p3` — 把 note now says the shoes would be the doer and the puppy the object.
- `b2l05g1-p6` — 被球打 removed; 把球打到 is the planted wrong tile with a repair.
- `b2l05g5-p4` — 唱起來 removed; 唱起來歌 is the planted wrong tile; 唱了歌 note now names the double 了.
- `b2l05g4-p1` — 也 replaced with a truly wrong 才 (the reviewer’s alternative). The validator rejects an item whose every tile is right, so the 也-accepted option could not stand. `b2l05g4-p4` was recast to 喝咖啡/喝茶 (different objects); `b2l05g4-p5` to a 常常→有時候 spot-fix with different actions.
- `b2l05g4-p1`–`p4` — 有時候-initial orders added, with pinyin/English.
- `b2l05g3-p4` — added `[明天,只要,不下雨,我們,就去露營]`; dropped the 我們-initial alternate.
- `b2l05g1-p2` — added the swapped order 弟弟在玩遊戲，不寫功課，被媽媽看見了。
- `b2l05g5-p2`/`p3` — promptZh now says 開始吃了 / 開始下雨了.
- `b2l05g5-p6` — card 3 restored 四、五點 in text and pinyin.
- `b2l05g7` — own items reordered p6, p4, p5.
- `b2l05g3-p5` — no longer repeats the 才→就 fix; now a 就-placement error (就你 → 你就). The reviewer’s suggested successNote was not used: the item now tests 就 placement, so the note names that error; the page’s cf1 still teaches 就/才.
- Repair notes: g5-p1 很紅 is a state not a banned word; g4-p2/p3 都 notes now say “all of them”, not “both every time”.
- Prompts: g1-p2 adds 不寫功課, g1-p4 adds 發現, g4-p3 names 可欣, g6-p1 drops the invented 已經買到票了, g8-p5 now sources 這杯飲料像果汁，果汁也很甜。

## Unsure
- `B2L05-1-22`: the book prints 花香 huāxiāng; the shared pack still says 香味 xiāngwèi. No practice item uses 花香, so no `allowWords` entry was needed. Owner to fix the pack.
- 真是: the lesson/transcript follow the book’s `zhēnshi`; the pack says `zhēnshì`. Owner may want to align the pack/audio.
- 漂亮: L05 prints no pinyin; the lesson keeps `piàoliang` (the Book 1 content uses it 95 times vs 10 `piàoliàng`). Pack says `piàoliàng`.
- 中秋節: book names table prints `Zhōngqiū Jié`; the lesson/pack use running-text `Zhōngqiū jié`.
- `b2l05g5-p4` uses 唱, which is only a headword inside 唱歌; the item is built from the taught 唱歌. The Book 2 vocabulary gate currently loads Book 1 only.
- `b2l05g2-p3` is a clause build rather than a full-sentence order-build because of the 4-Han tile cap; a human should confirm the prompt reads as a faithful rewrite of p.123 #3.
- `b2l05g4-p1`: the book’s 也 variant is grammatical but could not coexist with the validator’s required wrong tile at 6 tiles. A human may prefer another wrong tile.
- `b2l05g4-p4` uses 每次 as the near-miss; it is grammatical elsewhere, wrong against this prompt.

## NEEDS-ENGINE
- `commaAfter` in `src/features/grammar-practice/exercises/OrderBuildExercise.tsx` still takes comma positions from `accepted[0]`; alternate orders with different punctuation can show the comma after the wrong tile. The g3-p4 alternate that triggered it was removed, but the engine bug remains. Compute positions from the matched accepted answer. Same as B2-L03/L04.

## Chinese instruction lines used
- 用「被」說。 / 用「被」和「發現」說。
- 用「聽著聽著」說。 / 用「走著走著」說。 / 用「看著看著」說。 / 用「說著說著」說。
- 用「只要……就……」回答。 / 用「只要……就……」說。
- 用「有時候……有時候……」回答。 / 用「有時候……有時候……」說。
- 用「起來」說。 / 用「還好……要不然……」說。 / 用「每」說。
- 用「像……一樣」說。 / 用「像……一樣」把句子說好。
- 把「就」放好。 / 這些句子是哪一種「起來」？ / 句子要說這個意思。
- Situation lines: 朋友問你… / 可欣問… / 朋友想說… / 媽媽說故事給孩子聽，後來孩子睡著了。 / 獎學金一個月兩萬塊，房租一個月五千塊。 / 買電影票的人很多。 / 還不到中午，她就開始吃了。 / 早上天氣不錯，沒想到下午開始下雨了。 / 這杯飲料像果汁，果汁也很甜。
