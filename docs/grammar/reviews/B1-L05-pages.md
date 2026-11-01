# B1 L05 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonFive.json`. All items `slot-build`, A/B speakers (p.118 #1 has no speaker, as printed), no prompt/quiet/sub/glossary/gaps/successNote. 4–6 tiles per item. All scene boxes kept unchanged (each has a generated illustration in `generatedPictureAssets.ts`). Gate `BOOK1_LESSON=lessonFive npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 11/11 pass.

## G01 p.116 在 + PW — 3 book, no own
- #1 B：他們[在][圖書館]。 Traps 是, 有 (在 vs 是/有), 不 and 咖啡廳 (picture).
- #2 B：她[不][在]圖書館，她[在]家。 Deviation: added "她在家" so the answer is decided beyond the picture. Two 在 tiles; traps 是, 有, 去 (where she is vs goes). 沒 deliberately not offered: 沒在 is heard colloquially in Taiwan.
- #3 A：李老師今天早上九點[在][哪裡]？ Traps 是, 什麼, 這裡. 嗎 and 去 left out (在嗎 / 去哪裡 would also be acceptable questions).
- No own: book items already test 在 vs 是/有, 不 position and the where-question.

## G02 p.117 在 + PW + V — 3 book + 1 own
- #1 B：我[在][咖啡廳][買][咖啡]。 Open in the book; one place tile only. Tests English order (買咖啡在咖啡廳 → fallback). Traps 是, 賣. 去 left out (我去咖啡廳買咖啡 is also right).
- #2 B：我喜歡[在][家][聽][音樂]。 Open in the book; 聽音樂 chosen. Traps 看, 去. 在家 is copyable from A (book's own frame); the thinking is 在家 before the verb.
- #3 B：我今天[不][在][家]吃晚飯，… Traps 沒 (plan → 不), 是, 餐廳 (contradicts the next clause). 在家不吃 → fallback ("you will eat, just not at home").
- own: A：你[在][哪裡][看書]？ — 在哪裡 before the verb (你看書在哪裡); traps 是, 什麼, 嗎.

## G03 p.118 吧 — 3 book, no own
- #1 你[買][便宜的][吧]。 (frame of the book's 你買小的吧). Traps 貴的 (picture/price), 嗎, 呢.
- #2 B：你[喝][熱][咖啡][吧]。 Open in book; picture = steaming cup. Traps 冷, 嗎; 咖啡熱 order → fallback.
- #3 B：…我們[一起][去][吃]麵[吧]。 Open in book; 麵 from the picture's sign kept as text. Traps 賣, 嗎; 去一起 → fallback.
- No own: no context found where 吧 is clearly wrong and 嗎 clearly right (你要喝咖啡吧？ is also fine).

## G04 p.125 N + directional word — 4 book, no own
- #1 B：[你的]書在[桌子][上面]。 Traps 我的 (pronoun flip), 下面, 裡面.
- #2 B：他在[哥哥][旁邊]。 Traps 弟弟, 姐姐, 前面/後面 (picture: side by side).
- #3 B：她在[房間][裡面]看書。 Traps 客廳, 廚房 (bed in picture), 外面, 上面. 桌子 not offered (桌子前面 would also describe the picture).
- #4 B：他[在][圖書館][裡面][睡覺]。 Traps 看書 (Zzz), 外面; 睡覺在圖書館 → fallback.
- Old own listen-build (錢包在我的書下面) dropped: listen kind not allowed.

## G05 p.126 Existential 有 — 3 book + 1 own
- #1 B：我們學校[有][一千][個]學生。 Open in book; one number tile. Traps 是, 在, 多少.
- #2 B：[我家][旁邊][沒][有]飲料店，可是有一家咖啡廳。 Deviation: added the 可是 clause so "no" is decided. Traps 你家, 不.
- #3 B：我的桌子上[有][兩][本]書跟一枝筆。 Open in book. Traps 在, 張, 個 (measure for 書). 二 vs 兩 wanted but 二 fails the taught-words check.
- own: A：我的錢包在哪裡？ B：沙發上面[有]兩本書，你的錢包[在]書下面。 — place 有 thing vs thing 在 place in one line (swap → fallback). Traps 沒, 不 with per-slot notes. 是 left out (沙發上面是兩本書 is grammatical).

## Unsure
- G02 #1/#2, G05 #1/#3: book answers are personal; the item offers one content word so the grammar decides, not knowledge.
- G03 all three items have 吧 as the answer; learners may learn "always 吧" on this page.
- G01 #2: 她在家 in the line shows 在 before the second place; kept because it decides the 不.
- No PICTURE-NEEDED lines.

## Review (fresh reviewer, 2026-11-01)
Verdict: FIXED 5 items. All 16 book items present, in order, faithful; crops checked against p116/p118/p125 (all match their illustrations). Gate 11/11.

Fixed:
- G02 own (你在哪裡看書): B said 我在圖書館看書, which printed 在 and 看書 for copying. B is now just 圖書館。, so the learner must build 在哪裡 + verb.
- G02 #3: 是 note ("是 doesn't give a place") was odd when 是 lands in s1 (我今天是在家…); now "B won't eat at home, so use 不在家, not 是."
- G03 #1: 呢 note said 呢 asks "and you?", false in 你買便宜的呢; now "呢 doesn't make a suggestion".
- G04 #1: 裡面 note "A table has no inside" is false for a desk (drawer); now points at the picture.
- G02 #2: pinyin xǐhuan → xǐhuān (Taiwan book tone, majority in content).

Unsure:
- G01 #3: B's printed answer 九點在學校 shows 在 in the same spot, so 在 is copyable; only 哪裡 is really decided. Book's own frame, kept.
- G02 #1/#2, G04 #4: A's question already contains 在 + place (copyable); the learner's work is order and the verb. Book's own frames.
- G03: every answer is 吧. No clean 吧-vs-嗎 contrast exists in taught scope: wherever 嗎 fits, supposition 吧 (你要喝咖啡吧？) is also grammatical, so it would have two answers. 嗎 stays as the trap in every item.
- G05 #3: 二 vs 兩 trap blocked by the taught-words check; 個/張 measure traps carry the item.
- G01 #2: added 她在家 clause mirrors the book's example 2 (他不在學校，他在咖啡廳); the picture alone already decides 不.
- No PICTURE-NEEDED.
