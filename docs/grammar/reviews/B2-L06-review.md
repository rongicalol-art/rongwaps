# B2 L06 FIX — deepseek-v4.1-flash, 2026-10-29
Verdict: PASS

## Checked
- OCR p136–p157 and page images p144 (printed 143), p145 (144), p146 (145), p147 (146), p148 (147), p154 (153), p155 (154); printed page = PDF page − 1.
- All four reviewer lists against the book: grammar pages B2L06-G01–G08, readings B2L06-R01/R02, every practice item (book + own), and the transcript.
- `npm run content:export` (Book 2: 12 grammar parts, 12 readings) and `npm run content:validate` (“Interactive lesson content valid.”).
- `ACCEPTANCE_STRICT=true npx tsx --test tests/content/*.test.ts`: 242 pass, 0 fail. `npm test`: 1240 pass, 0 fail. `npm run typecheck` and `npm run lint` clean.

## Issues
Fixed (fidelity)
- `content/grammar/b2LessonSix.json` `b2l06g1-r2` — 功課/還沒寫好 → 你/還沒把功課寫好, with pinyin and meaning (book p.143).
- `b2l06g1-r3` — 新語言 → 新的語言.
- `b2l06g5-r1` — 李小姐畢業後 → 李小姐; c2 now 畢業後一定會找到好工作的.
- `b2l06g6-r3` — c2 很多人就先走了 → 就先走了.
- `b2l06g7-r3` — 就教會他了 → 就教會（他）了, pinyin `jiù jiāo huì (tā) le`.
- `b2l06g8-r1` — 朋友送我生日蛋糕 → 朋友送了我一個生日蛋糕.
- `B2L06-G02-P143` ex3 + transcript p.316 — removed the comma: 是下個星期六不是這個星期六 (book p.144).
- Transcript p.73 — 日本KTV裡的機器是做什麼的？ (book p.137 image).
- Transcript simplified p.114/459/461/467 — restored 唱歌的方法, 卡拉OK的機器, 二十四小時的/不同的時間, 很開心的.
- Transcript p.191 + L06 grammar/readings — 差不多 `chàbùduō` (book p.140).
- Transcript p.543 — added the book’s star: 「＊這件衣服只一百塊錢。」.
- `B2L06-G05-P146` printedPages → [146,147]; practice sources → `p.147 V #1-3` and G06 → `p.147 VI #1-3`.

Fixed (teaching G01–G04)
- `b2l06g4-p1`–`p7` — added the second copy of every repeated tile (起床/哪一種/哪一個/怎麼做/哪一班/誰/什麼時候); all docks ≤6. The keys are now buildable.
- `b2l06g4-p2` — `sub` is A’s question only; the printed tail is stated in the prompt and `successNote`, not rendered as a B gloss. The built clause remains 哪一種好喝就喝哪一種; putting the tail in `accepted[0].sentence` would make `commaAfter` print a comma after the last tile with nothing after it.
- G04 prompts p1/p2/p3/p4/p5/p7 — Chinese now carries the cue the English had (你想幾點起床都可以 / 你想買哪一個都可以 / 你想怎麼做都可以 / 你要搭哪一班都可以 / 你什麼時候有空都可以去) and the full pattern.
- `b2l06g3-p1` — dropped the duplicate `sub`; the 學不會 repair now says the task asks for 沒……會, not that 學不會 is ungrammatical.
- `b2l06g3-p5` — recast to a distinct ability context: 這本書對孩子太難了 → 這本書太難，孩子學不會; prompt no longer names 學不會.
- `b2l06g3-p4` — accepts all four grammatical fills (學得會/教得會 × 學得會/學會了) with three alternatives; added the second 學得會 tile so the doubled build exists; repairs for the accepted forms removed.
- `b2l06g1-p4`, `b2l06g3-p5`, `b2l06g3-p6` — prompts use the family line 用「好」說 / 用「會」說; 第一次/太小 decide.
- `b2l06g1-p1` — 好了 replaced by 好嗎 (a declarative-wrong form), with a new note.
- `b2l06g1-p3` — Chinese cue 你覺得一年夠嗎？ added; no English-only cue.
- Minors — `b2l06g3-p3` 可是你會踢; `b2l06g3-p6` aligned to 那個; `b2l06g2-p4` “The husband”; `b2l06g2-p7` 記好了 → 但是; `b2l06g3-p6` now precedes the p5 build.
- `b2l06g3-p3` — accepted the second grammatical order 怎麼/學得會/的; added 學會了 as the wrong tile so the item still has one.

Fixed (teaching G05–G06)
- `b2l06g5-p4` — prompt no longer prints the answer; 一定+會 merged to 一定會; added the 他一定會來的，別擔心 order; fallback updated.
- `b2l06g6-p4` — added 我們等他下課，就去吃飯。as a second accepted order.
- `b2l06g6-p2/p3/p5` — 先 (a correct answer) replaced by 還/又/以前, with matching repairs and pinyin.
- `b2l06g6-p1` — prompt now 用「等……就……」說; 等的 → 等得 (a stronger 的/得 distractor).
- `b2l06g5-p5` — 會考好了 → 會考好得 with a 的/得 repair; moved before p4; prompt drops 一定會考好.
- `B2L06-G05-P146` q1 — 好/好了 → 得好/好吧; repairFeedback names 得 and 吧.
- `B2L06-G06-P147` q1 — 才 → 又; repairFeedback names 又.
- `b2l06g5-p1/p3` — English/Chinese prompts aligned (no extra “what will happen to your car there”; no extra 她那麼愛你).

Fixed (teaching G07–G08)
- `b2l06g8-p1/p2/p3` — the book rewrites are complete: accepted models keep 我已經…, 我一想到明天…, and 我不喜歡…一聽到坐飛機…; p2/p3 are clause builds with the source in `sub`.
- `b2l06g7-p4` — `只五張` note no longer claims 只 cannot take a number; successNote now only explains 才; bare 只 → 只有 with 只有 needs the number.
- `b2l06g8-p4` — dropped 昨天 from prompt/sub; English now says a thief stole the car; moved after the p5 spot-fix so the build is last.
- `b2l06g8-p5` — prompt now “Choose the right word to fix the sentence”; 被媽媽 → 給媽媽 so the group no longer repeats p1’s distractor.

Rejected / confirmed
- Fidelity #13 — 哪（一）班 normalized to 哪一班 is acceptable: the parentheses mark the optional 一; the app uses the full spoken form, and the answer/tiles match.
- Reviewer G01–G04 #2 model-tail option — rejected in favour of prompt/successNote: putting the tail in `accepted[0].sentence` while the order omits it makes `commaAfter` render a dangling comma after the last tile.

## Unsure
- BOOK-ERRATA: printed p.153 (PDF p.154) says 「只」 cannot be followed by a number and stars 「＊這件衣服只一百塊錢」, but 只一百塊錢 is common in speech. The grammar page quotes the book’s claim and flags it; the practice no longer tests the absolute rule. Owner may want to soften the book note.
- `考好` is not a vocabulary headword; `b2l06g5-p5` uses it from the book’s exam context. The vocabulary gate passes; owner may want to add it.
- G05 p4 and G06 p4 now have two accepted orders with different comma positions; the known `commaAfter` bug can show the comma after the wrong tile when the second order is built.
- `b2l06g8-p5` no longer repeats p1’s 被媽媽 distractor, but the result still uses 讓媽媽很生氣 like p1. Left as is: the tested mistake differs (把 vs 讓).
- `b2l06g4-p2` keeps the book’s tail in the prompt rather than the model; a human should confirm that reads naturally on the exercise screen.

## NEEDS-ENGINE
- `commaAfter` in `src/features/grammar-practice/exercises/OrderBuildExercise.tsx` takes comma positions from `accepted[0]` for every accepted answer. G05 p4 and G06 p4 have two accepted orders with different comma positions, so the second order can show a comma after the wrong tile. Compute positions from the matched accepted answer (same as B2-L03/L04/L05).

## Chinese instruction lines used
- 用「好」說。 / 用「得」說。 / 用「錯」說。 / 用「沒……錯」說。
- 用「會」說。 / 用「沒……會」說。
- 用「幾點……就……幾點」說。 / 用「哪一種……就……哪一種」說。 / 用「哪一個……就……哪一個」說。 / 用「怎麼做……就……怎麼做」說。 / 用「哪一班……就……哪一班」說。 / 用「誰……誰就……」說。 / 用「什麼時候……就……什麼時候」說。
- 用「會……的」說。
- 用「等……就……」說。
- 用「才」說。 / 用「才……就……」說。
- 用「讓」說。 / 用「被」和「讓」說。
- 用「好喝」和「哪一種……就……哪一種」說；最後有「只要不太甜的就好」。
- 用「買好票」和「等……就……」說。 / 用「考完試」和「等……就……」說。
- Situation lines: 明天不用上班，你想幾點起床都可以。 / 那家商店賣很多不同顏色的燈籠。你想買哪一個都可以。 / 朋友問你這塊雞肉要烤還是炸。你想怎麼做都可以。 / 週末飛美國的飛機有很多班。你要搭哪一班都可以。 / 朋友問你什麼時候可以去他家。你什麼時候有空都可以去。 / 這本書對孩子太難了。 / 那個孩子太小了。 / 媽媽因為你的房間很生氣。這個句子不對，選一個對的。
