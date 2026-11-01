# B1 L11 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonEleven.json`. All items `slot-build`, A/B speakers (孩子/媽媽 on p.259 #5 as printed), no prompt/sub/glossary/gaps/successNote/me. Max 6 tiles per item. Ids kept (`l11gN-pM`).
Gate `BOOK1_LESSON=lessonEleven npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 11/11 pass.
Scans: `materials/book1/L11/` has no PNGs; checked against `public/data/book-pages/modern-chinese-1/page-248…260.webp`. All picture boxes kept unchanged (each has a generated illustration in `generatedPictureAssets.ts`). No PICTURE-NEEDED.

## G01 了 (p.248) — 5 book, no own
- #1 B：我[買][了]。 + ticket picture. Traps 沒 (ticket in hand), 不 (won't buy), 嗎.
- #2 DEVIATION: open blank → 我[吃][了][一碗]，還想再吃。 Added "還想再吃" (book example 3b frame). Picture: one empty bowl decides 一碗 vs 兩碗; traps 沒, 不. 吃一碗了 → fallback.
- #3 DEVIATION: open blank → 我已經[寫][了][七個][了]，還要寫三個。 Added clause; tests double 了 and the arithmetic (traps 十個, 三個). 六/八 are not taught characters, hence 七/三.
- #4 [看到][了][一隻][狗] + dog picture. Traps 一個 (measure word), 沒. Printed cue "(V：看到)" dropped (看到 is a tile).
- #5 上午已經[去][了][三個]地方 — 5 places minus post office + supermarket. Traps 兩個, 五個, 沒.
- No own item: every in-scope idea (bare-object 了 at the end) copies a book example or makes 看了電影 vs 看電影了 ambiguous.
- allowWords 票 (printed gloss).

## G02 沒／沒有／還沒 (p.250) — 4 book + 1 own
- Book blanks exactly as printed. A's blank accepts 沒/沒有 (and 嗎 in #3/#4, per the book's 嗎／沒（有） table); every combination listed.
- #1 B = 沒/沒有 (yesterday); traps 還沒, 不. #2, #4 B = 還沒 (they go tomorrow / he eats after exercise); #3 B = 沒/沒有 (doesn't like movies, won't watch later).
- own1 A：你昨天看電影了沒有？ B：[沒][看]，我在家寫功課。 Mistake: 沒…了 (沒看了) and 不 for a past action.

## G03 是……的 (p.252) — 3 book, no own
- #1 DEVIATION: book blanks only the question word; now 你是[哪天][買][的]？ so the learner also picks 的 over 了 and drops 嗎. Traps 了, 幾點, 嗎.
- #2 both printed blanks: 哪天 / 在哪裡; traps 跟誰, 怎麼, 幾點. A's answers decide.
- #3 B[昨天] (trap 明天: 去台中了 says she went), A[怎麼] (B answers 開車). Last line DEVIATION: book's two uncued blanks → 她[不][是]跟友美一起去的，是跟她妹妹一起去的 (companion invented, fixed text). Tests 是 kept in the negative; trap 沒.

## G04 先…等…再 (pp.258–259) — 5 book, no own
- Printed cue "（再）" dropped on #1/#2 (it is the answer).
- #1 明天[再][洗] + bowls picture. Traps 在, 先, 吃.
- #2 DEVIATION: 明天[再][去][買]東西 (added 買東西 so 再's position can go wrong). Traps 在, 先, 了. 來 not offered (再來 would also fit).
- #3 等[人][少][了]，我再[來] + café pictures. Traps 多, 很.
- #4 DEVIATION (book blanks are open; transcript BOOK-ERRATA says content words): 常常[等][肚子][餓][了]，[再]喝牛奶 — reads the 3 panels as the 等…再 pattern. Trap 在. 先 deliberately not offered (先肚子餓了，再喝牛奶 / 等…先喝 are grammatical).
- #5 媽媽：妳[先][吃水果]，等爸爸回家了，我們[再]一起吃飯。 Traps 在 (slot notes: 妳在吃水果 / 我們在一起吃飯), 吃飯.

## G05 給 (p.260) — 3 book, no own
- #1 B：他要[給][女朋友][打電話] + picture; 打電話給女朋友 accepted. Traps 男朋友, 媽媽, 在.
- #2 B：我[給][孩子]買衣服 + picture (bubble: a little boy and a girl). Traps 跟 (children only in the bubble), 媽媽, 爸爸. 弟弟/妹妹 not offered (bubble could be siblings).
- #3 B：啊！我忘了，[還沒][給][他][寫信]。 還沒寫信給他 accepted. Traps 了, 不. allowWords 忘 (printed in the item).

## Unsure
- G02 #2/#4: 沒有 as a bare "No" (沒有，他們決定明天去) is natural speech; marked wrong because the book's point is 還沒 for "will still happen". Owner call.
- G01 #2: 我吃一碗了 gets the fallback (了 after the verb); colloquially marginal.
- G03 #1: A's next line 我是昨天買的 models 買的, so 的 is partly copyable.
- G04 #4: 肚子餓 is my reading of the stomach panel (could be 肚子痛/不舒服); 餓 is the only content tile, so it is not a trap.
- G01 #3/#5 double vs single 了: blank counts force the shape; both are grammatical in the abstract.

## Review (2026-11-01, fresh reviewer)
Checked every item against `page-248…260.webp` and the L11 illustrations. Gate 11/11 pass after fixes.

Fixed:
- G01 #2: own slot note for 吃一碗了 (了 after the verb, not at the end).
- G01 #4: simplified result typo 络上 → 路上.
- G02 #2, #4: bare 沒有 ("No, …") is correct Mandarin, so B now accepts 還沒 or 沒有 (alternatives added). Bare 沒 stays wrong with its own note (a reply on its own is 沒有/還沒).
- G03 #1: 的/買 were copyable from A's lines (這是我買的 / 我是昨天買的). Back to the printed single blank 你是[哪天]買的？; traps 幾點, 在哪裡, 跟誰, 怎麼, each with a note.
- G03 #3: A's 怎麼 was the only question word (elimination) and the split [不][是] let 是 be copied. Now one 不是 blank (trap 沒有: 是…的 is negated with 不是) and 跟誰 added as a question-word trap. Invented companion (她妹妹) kept: the printed "，是____" needs a fixed person, and it is plain text, not tested.
- G04 #2: clearer 先 note.

PICTURE-NEEDED: 259:0.17,0.29,0.57,0.095 — G04 #4 middle panel must read as hungry (empty-plate/food thought bubble, rumbling tummy), not pain: current art has red lightning bolts and sad-face calendar, which reads 肚子痛 (痛 is taught in L10).

Unsure:
- G01 #3/#5: blank and tile counts (two 了 tiles in #3) give the 了 shape away; the real decision is the arithmetic. Book blanks are open; no cleaner single-answer shape found.
- G04 #4: 5 of 6 tiles are used; only 再/在 and order are tested. Once the picture shows hunger, 痛 could be added as a trap.
- G05 #1/#3: A's question already holds 給…打電話 / 給…寫信 (book design); the decision is who (picture) and 還沒 vs 了/不.
- G05 #3 English says "the teacher" for 他; kept for clarity.
