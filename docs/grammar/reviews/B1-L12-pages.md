# B1 L12 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonTwelve.json`. All items `slot-build`, 4–6 tiles, no prompt/quiet/sub/glossary/gaps/successNote. Gate `BOOK1_LESSON=lessonTwelve npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 11/11 pass. Scans read from `public/data/book-pages/modern-chinese-1/page-27x/28x.webp` (no `materials/book1/L12/p*.png`).

## G01 用 (p.272): 3 book + 1 own
- #1 `他會[用][中文][寫字]，不會[用][英文]寫字。` Picture (○ Chinese, × English) decides which language goes where; trap 在 (“in Chinese” → 在中文). New crop p.272 [0.182,0.24,0.24,0.125], checked (whole picture, no number box). Deviation: the book's open second blank keeps 寫字 printed (6-tile cap).
- #2 `他喜歡[用][手機][打電話]，不喜歡寫信。` Traps 給 (給 + person 打電話), 在, 寫信 (picture). Deviation: second clause printed as 不喜歡寫信.
- #3 `他常[用][手機]打電話，也常[用][電腦]工作。` Traps 跟, 在; pictures decide the tool per action.
- own: `A：你[用][什麼][照相]？ B：手機，我沒有照相機。` Mistake: question word position with 用, 什麼 vs 誰, 跟 vs 用, 嗎 with a question word.

## G02 以前/以後 (p.273, 275, 276): 11 book, no own
- p.273 #1–4: build the time word + verb (以前是學生 / 以後要 / 以前…茶 / 以後要多運動). Pictures (existing illustrations) decide past vs future; traps 已經, 了, 現在, 少, 很.
- p.275 #1 DEVIATION: open answer; B gets `我每天六點下班，[六點][以後]吃晚飯。` so 以後 is decided. Traps 以前, 晚上, 幾點.
- p.275 #2: printed question has 的 (transcript omits it). `我是[兩年][以前]來台灣的。` Traps 二年, 以後, 現在.
- p.275 #3: `他說[十分鐘][以後]會到。` Traps 十分 (clock minute), 以前, 已經.
- p.276 #1–4: the event + 以前/以後 before the clause; the book prints the cue （以後）/（以前） beside each line; dropped (it would give the answer), the picture decides. Traps are the other event (上課/睡覺/起床/吃飯/上班) and the opposite time word.
- allowWords: 刷牙 (printed gloss), 畢業, 遲到 (printed in #3; L12-2 vocab), 十分鐘 (my completion; 分鐘 is L12-2 vocab), 六/二 (digits, as in L2).

## G03 對 (p.281): 4 book
- Rearrange items kept as one blank per book chunk except where the 6-tile cap forced printed text: #1 first clause printed; #2 second clause printed (說了很多話 is a 5-char tile); #3 運動/吃 printed; #4 很好 and 常常要他多休息 printed.
- Traps: 給 (給我們/給身體/給 for 對), 方便 vs 不方便, 在. #2 accepts 他昨天 / 昨天他.
- #4 BOOK-ERRATA reversed: the book's 常常要他 is right. Its answer is 李太太對李先生很好，下班以後常常要他多休息 (she tells him to rest). The old file swapped to 要她; now 要他 decides who is the subject.

## G04 過 (p.283): 6 book
- Article questions: each item shows the relevant article sentence (≤45 chars). Because the test forbids the answer appearing in the item, and 去過/當過 are in the questions:
  - #1 DEVIATION: B `去過，他在法國[說][過][法文]。` (article: 會說他們的語言). Traps 德文, 日文, 沒; 說法文過 → fallback.
  - #2 B `[學][過][一點兒]。` Traps 沒, 很多.
  - #3 B `還[沒][當][過]，他希望以後能當記者。` Traps 不, 了, 是.
- #4 `你[上][過][了]嗎？` #5 `我[看][過][醫生][了]` (V過O了, trap 沒/藥) #6 `妳[說][過][了]` (speakers 媽媽/中明 as printed; cue （說） dropped, 說 is a tile with trap 做).
- Article print confirms 他們的語言, 有名的記者, 晚上的課, 三天的藥 (transcript OCR differs).

## G05 的時候 (p.284): 3 book
- All open in the book. #1 `我[聽音樂][的][時候]最開心` (traps 得, 以後, 什麼). #2 `[我][發燒][的時候]，會多喝水、多休息。` #3 `[我][不上課][的時候]，都在家休息。` (traps 你, 時候 without 的, 以前 / 上課).

## Unsure
- G05 #2/#3: the 的時候 clause echoes A's question, so the items mostly test 我 vs 你, 的 and the trap; unavoidable for "answer with 的時候" while keeping one answer.
- G04 #1 prints the yes (去過) in B; the learner builds the supporting fact.
- G02 p.276 #2/#3: 吃飯以後洗手 / 起床以後刷牙 are true in life; only the picture rules them out.
- G02 #2: 他以前要去美國工作 is grammatical (“used to plan to”); the arrow picture rules it out.
- G03 #4 relies on 他 = Mr Li (book uses 她 for women).
- No PICTURE-NEEDED: all scenes are existing illustrations or the new p.272 #1 book crop.

## Review (fresh reviewer, 2026-11-01)

Checked every item against pp.272–284 scans and the L12 illustrations. Gate 11/11.

Fixed:
- Simplified kept traditional chars: 來→来 (l12g2-p6, p7), 發→发 (l12g5-p2).
- l12g5-p2 rewritten: B `[我][生病][的][時候]，都會多喝水、多休息。` (tiles 我 你 生病 的 時候 得). Old item copied A's 你發燒的時候, and its 以前 note was false when 以前 landed first (以前發燒的時候… is grammatical).
- l12g5-p3 rewritten: B `[有空][的][時候]，我都去打球。` (tiles 有空 很忙 的 時候 得 以後). No longer copies A's clause; learner builds statement + 的 + 時候.
- l12g2-p8 上課 note mentioned a clock the illustration doesn't show; now "class is over and everyone is packing up".

PICTURE-NEEDED: p.272 #1 (box 0.182,0.24,0.24,0.125) — the same person writing at a desk: on the left a page of Chinese characters with a big green ○, on the right a letter starting "Dear Mom" in English with a big red ×. Both marks must be unmistakable; no text other than those.

Unsure:
- G05 #2/#3 now answer with a related situation (生病 for a fever question, 有空 for no-class time) instead of echoing A; natural replies, but not word-for-word answers.
- p.275 #1 `六點下班，六點以後吃晚飯` repeats 六點 from the same line (time tile by elimination); the 以前/以後 choice and order still decide it. A more natural answer would be 下班以後, but that's section (3), not this page.
- p.273 #1 and #3 share a shape (以前 + verb, old→new picture, 現在 printed); both are book items, kept.
- G03 #4 still relies on 要他 to fix who is 對 whom.
