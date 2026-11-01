# B1 L08 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonEight.json`. All items `slot-build`, A/B speakers, no prompt/sub/glossary/gaps/successNote. Page keys, bookPage, titles kept. Gate `BOOK1_LESSON=lessonEight npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 11/11 pass. All items have 4–6 tiles.

## G01 好/難 (p.186): 6 book, 0 own
- Each blank is 2 slots: 好/難 + verb. Tiles are 好, 難, the right verb and 1–2 wrong verbs that go with other things (聽 for a film, 坐/走 for a bike, 唱/找 for swimming, 吃 for milk tea, 學/聽 for a place). Wrong verbs that would also be right were left out (看 for the bike/milk tea/swimming, 走 for the place, 畫 for #4, 有趣).
- #2 DEVIATION: the book has no clause that decides 好 vs 難, so I added "，我很喜歡" (the same clause as #1).
- Old order-builds and the old `me` lines are gone.

## G02 因為…所以 (p.187): 3 book, 1 own
- #1: B：因為他[很][喜歡]綠色，[所以]常常穿。 Traps: 不, 怕 (meaning), 可是 (contrast vs result).
- #2: A：[你][為什麼]想去海邊玩？ Both orders are accepted (為什麼你… is in the book example). Traps: 什麼, 嗎, 我. 怎麼 was left out because "how come" would also be right.
- #3: B：[因為]我想去台灣，[所以]我想學中文。 Traps: 可是, 為什麼. A swap gets the fallback note.
- own1: 我今天[不][想]去學校，[因為]我很累。 The mistake: a reason that comes second still takes 因為 (learners use 所以 by reflex). Traps: 所以, 可是, 很.
- The old match-pairs and listen-build own items were dropped (wrong kinds for this page).

## G03 吧 (p.193): 3 book, 0 own
- #1 他是[韓國人][吧]？ #2 你喜歡[咖啡][吧]？ #3 你[會]打[籃球][吧]？
- Traps: a question word with 吧 (哪國人/誰/什麼; B's yes decides it), 呢, 蛋糕 (B drinks it), 要 (B answers 不會), 網球 (B can play it), 足球 (踢).
- 嗎 is deliberately not offered: 他是韓國人嗎？ would also be right, and no in-scope context rules it out.

## G04 VV看 (p.194): 3 book, 0 own
- #1 我們再[等][等][看]吧: doubled 看 (等看看), plus 聽. #2 [坐][坐][看]: doubled 騎 and 看. #3 [我][聽][聽][看]: doubled 看, plus 你.
- Wrong verbs left out because they would also be right: 找/想/去 (#1), 唱/想 (#3). The old own item 我穿穿看 copied the book table, so it was dropped.

## G05 快要…了 (p.195–196): 3 book, 0 own
- These items keep their existing picture boxes, and each box has a generated illustration (195:0.193,…, 196:0.202,…, 196:0.2,…). No countdown scenes are used.
- #1 我的日本朋友[快要][來][了]. 來 is supplied because the picture prints no action (BOOK-ERRATA in the transcript). Traps: 明天 (the 5th is two days away), 嗎, 很.
- #2 我們[快要][休息][了]. Traps: 上課, 呢, 很. 下課 and 吃飯 were left out because both would also be right at noon.
- #3 弟弟[快要][十][歲][了]. Traps: 九, 號.
- Only 快要 is offered: 快 and 要 are also right per the book table, so offering them would mean several right answers.
- allowWords 九 (digits are not in the vocab list; L2 did the same).

## PICTURE-NEEDED
None.

## Unsure
- G01 #3: 很難學，我也想學 is grammatical; it is ruled out only by the logic of 也想學. Also, 學 can be copied from the printed clause.
- G01 #2: 好坐 for a bike seat is marginal. It is offered as the 坐/騎 confusion.
- G03 #1: 韓國人 can be copied from B's printed reply. What the item really tests is the particle and the question-word trap. In all G03 items the particle slot has only 吧 + 呢 (or only 吧 in #3).
- G04 #3: 唱唱看 was avoided. 你聽聽看 is grammatical but doesn't answer 你呢.
- G05 #1: the illustration's plane ticket doesn't settle 來 vs 去, so the item doesn't test it.

## Review (2026-11-01, fresh reviewer)
Checked every item against the scans p.185–196 and tried every tile in every blank. Gate: 11/11 pass.

Fixed:
- G02 own1: 很想 + 可是 gave 我今天很想去學校，可是我很累, which is correct and natural, so a "wrong" tile was right. 可是 is now 為什麼 (note: 為什麼 asks why; a reason takes 因為). 很's note no longer mentions 因為.
- G01 #2: 好坐 can describe a comfortable bike seat, so 坐 was swapped for 穿 (好穿 is for clothes). 開 was out of scope at L8-1.
- G03 #3: the particle slot had only 吧. 足球 is now 呢, so the 吧 slot is a real choice. The 籃球/網球 contradiction still decides the noun.
- G03 #1/#2: 哪國人/誰/什麼 + 呢 is a grammatical question, so "never takes 吧" was beside the point there. The notes now say B's yes means A made a guess and wasn't asking a question-word question.

Author flags resolved:
- G03 without 嗎: kept. Context can never rule out 嗎, so offering it would give two right answers. 呢 is the real particle trap.
- 韓國人 copyable (G03 #1): kept. The book prints B's reply. The item tests 哪國人吧 vs a guess plus the particle.
- 學 copyable (G01 #3): kept. The test is 好 vs 難, and the verb half is incidental.
- 難學 vs 也想學 (G01 #3): kept 好學 only. 也想學 reads as agreement with good news, so 難學 needs 可是/還是.

Unsure:
- G01 #2 still adds ，我很喜歡 (same as #1). It's needed to decide 好, but it's repetitive.
- G04 #1: 等看看 is common colloquial Taiwanese Mandarin. It's marked wrong per the book pattern, with only the fallback note.
- G01 #5: only 4 tiles. Adding 看 would be right too (好看 bubble tea), so it was left as is.

PICTURE-NEEDED: none.
