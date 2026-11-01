# B1 L10 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonTen.json`. All items `slot-build`, A/B speakers, 4–6 tiles, no prompt/sub/glossary/gaps. Page keys, bookPage, titles and all nine generated-illustration boxes kept. Old order-build / spot-fix / sort-groups / match-pairs own items dropped.
Gate: `BOOK1_LESSON=lessonTen npx tsx --test tests/content/grammarPracticeBookOne.test.ts` → 11/11 pass. (The full run has one failure in another lesson file, not L10.)
Scans: `materials/book1/L10/` has no images; checked against `public/data/book-pages/modern-chinese-1/page-227…237.webp` and the generated art.

## G01 跟 (p.227): 4 book + 1 own
- Book prints pictures + open lines; each item is the picture + a build line. 從/在/給 are the preposition traps; 對 avoided (its preposition use is L12).
- #1 元真[跟][朋友][喝茶]. Traps 從, 在, 老闆 (picture).
- #2 元真[跟][老闆][買]包包. Traps 給 (= buy for him), 從, 賣.
- #3 元真[跟][老師][說]：「你好！」 Traps 從, 叫, 醫生.
- #4 [醫生][跟][元真][說]：「你發燒了！」 Tests direction: slot notes for the 元真/醫生 swap ("你發燒了" is said to the sick person). Traps 從, 叫.
- own1 A：你媽媽會做飯嗎？ B：會，我[跟][媽媽][學]做飯。 Meaning (3) "from" with 學 vs 教, 給 trap.

## G02 Clause + 的 + N (p.228–230): 9 book, no own
- DEVIATION (all): the book's B lines are open. Repeating A's 的-phrase would copy the answer, so most items make B build a new 的-phrase, with fixed context around it:
  - p.228 #1 不難，那是[我們][上課][用][的]書。 (traps 得, 是)
  - p.228 #2 很好看，[他][穿][的][衣服]也很好看。 (戴 vs 穿, 得). New crop [0.37,0.641,0.112,0.085], checked.
  - p.228 #3 不喜歡，我喜歡吃[媽媽][做][的]牛肉麵。 (他 contradicts 不喜歡; 得, 是). New crop [0.714,0.648,0.1,0.076], checked.
  - p.229 #2 不是，[我][教][的][學生]都很愛上網，也都很喜歡看書。 (認識 is L11, so 教)
  - p.230 #2 是姊姊，[沒][穿][紅衣服][的]那個是妹妹。
  - p.230 #3 不是，[姊姊][穿][的][那件]是買的。 (那個 vs 那件, 戴)
- Short-answer items (logic decided by B's next clause): p.229 #1 [不][一定] vs 一定不 (one counter-example); p.229 #3 [對]，他們[不]怕 (answering a negative question; 沒/很 traps); p.230 #1 想，[我][也][想]吃 (你, 再 traps).
- allowWords added 曬, 她們 (printed in the questions).

## G03 多/少 V (p.231): 3 book + 1 own
- #1 應該要[多][吃]一點兒 (少, 很, 太). #2 應該[少][喝]一點兒 (多, 不, 很). Added 一點兒 so the blank is 多/少 + verb.
- #3 多[看書]，少[上網] (book prints 多/少). Traps 書, 手機 (多/少 + a noun).
- own1 A：我身體不好。 B：你應該[多][運動]。 Mistake: 很多 + verb (English "a lot"), 太.

## G04 會 "will" (p.236): 3 book, no own
- #1 我明天[會][坐][捷運]去 (在 = right now, 騎, 公車 vs picture). 要/能 left out because they'd also be right.
- #2 她生病了，[不][會][來] (沒, 很). 去/能/要 left out (also right).
- #3 [會]，我們今天去吧！ B's own plan to move the game decides 會 (traps 不會, 要, 能). The generated forecast has no day labels; this works without them.

## G05 要是/如果…就 (p.237): 3 book + 1 own
- Book prints "B：____，就____。"; 就 kept fixed as printed.
- #1 [要是][我]有很多錢，就[買]大房子 (我要是… also accepted). Traps 所以, 你, 賣.
- #2 [如果][我]的手機不能上網，就[用][電腦] (你, 手機).
- #3 要是我想多練習中文，就[多][跟][朋友][說]中文: mixes G01/G03. 跟朋友多說 is also accepted. Traps 少, 給.
- own1 A：明天要是下雨，你要去海邊嗎？ B：要是下雨，[我][就][不][去]了。 Mistake: 就 before the subject; 沒 for a future plan; 所以.

## Unsure
- G02 p.228 #1: "那是我們上課用的書" relies on the book's cover (時代華語 1), which the generated art doesn't show.
- G02 p.230 #1 and p.229 #3 test 也 and answering a negative question, not 的 production. Book question comprehension only.
- G02 p.230 #2: "是姊姊" is fixed context (the picture doesn't show who's older). 沒 is forced by the blank count, so the item is really clause order + 的.
- G01 #4 generated doctor is a man (book: a woman); notes use no pronouns.
- No PICTURE-NEEDED lines.

## Review (fresh reviewer, 2026-11-01)

Checked every item against page-227…237 scans and the generated art. Gate 11/11 after fixes.

Fixed (6):
- G02 p.230 #1: B 我也想吃 just copied A (你→我) and tested no 的. Now 不想，我不喜歡吃[太][甜][的][東西] (traps 得, 是); picture kept.
- G03 own1: 你應該多運動 copied the page's own example sentence. Now A：我每天都很累。 B：你應該[多][睡覺] (少, 很多, 太).
- G05 p.237 #2: 如果 was the only tile that could open the clause (elimination + copy of A). 你 → 所以 trap.
- G02 p.229 #3 (沒) and p.230 #2 (是): notes were only true in one slot; reworded to hold wherever the tile lands.
- G01 #3 醫生 note: "woman by the blackboard" didn't fit the art (both stand there); now "it's a classroom".
- G04 #3 不會 note pointed at "90% for 後天", but the art has no day labels; note now leans on B's line.

PICTURE-NEEDED: 228:0.37,0.641,0.112,0.085 — a young man, chest-up, wearing glasses AND a stylish jacket with a fur collar; both glasses and clothes must look good (B says both are 好看); clearly male (B uses 他).
PICTURE-NEEDED: 228:0.714,0.648,0.1,0.076 — one steaming bowl of Taiwanese beef noodle soup (noodles, beef chunks, greens), slightly from above; no people needed.
PICTURE-NEEDED (optional): 236:0.649,0.545,0.222,0.128 — add 今天 / 明天 / 後天 labels over the three forecast panels, like the book's table.

Judged OK: p.228 #1 doesn't need the book cover (B's line stands alone); G01 #4 male doctor is fine (notes use no pronouns); p.230 #2 art has one girl in red, which is all the item needs.

Unsure:
- G03 #1/#2: learners who know Taiwanese 吃多一點 may place 吃 before 多; the fallback calls it wrong. Pattern-faithful, but colloquially defensible.
- G02: five items still share the 得 trap. Each also tests something different (是, 戴/穿, 他/媽媽, 沒, 件), so all 9 kept.
- p.229 #1 / #3 test 不一定 and answering a negative question, not 的; book items, kept.
- p.230 #3: 那個 for clothes is common in speech; kept as the measure-word trap (book teaches 那件 in (3)).
