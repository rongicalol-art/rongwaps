# B2 L01 FIX — deepseek-v4.1-flash, 2026-10-28
Verdict: PASS

## Checked
- Book: `materials/book2/ocr/p025`–`p044` and the page images p025, p031–p035, p039–p042. Printed page = PDF page − 1 from p025 (printed 24); audio labels are `01-1` (dialogue), `01-2` (vocabulary), `01-3` (reading), `01-4` (reading vocabulary), not `01-1-1`/`01-1-3`.
- Grammar: every table cell, numbered example and exercise item against printed 30–33 and 38–41; 9 pages, 29 examples, 18 confusion items.
- Practice: all 45 items (5 per group = 3 printed + 2 own) against the printed cues/pictures; p039 #1 is the car + music-note picture, p040 #2 the TV dinner, p040 #3 the café.
- Readings: both B2L01 entries line by line (traditional/simplified/pinyin/English) against printed 24–25 and 33–34.
- Wiring: manifest ids, usage rules, Book 2 lock state; public packs regenerated.
- Gates: `content:export`, `content:validate`, `typecheck`, `lint`, `npm test` (1240 pass), `jev:lint` green.

## Issues
**Fixed**
- Audio labels: `content/readings/book-2.json` B2L01-R01/R02, `content/grammar/b2LessonOne.json` D01/D02 and G01–G09, transcript l.3/45 and author review corrected to `01-1` / `01-3`.
- Page metadata: G02 printedPages [31,31]; G04 `B2L01-G04-P32` / bookPage 32 / [32,33]; G06 `P38` / 38; G07 `P39` / 39 / [39,39]; G08 `P40` / 40 / [40,40]; G09 `P41` / 41 / [41,41]. Matching keys renamed in practice, manifest and usage rules.
- G7 #1: now 開車 + 聽音樂 (p.39 picture); p2/p3 silly 睡覺/游泳 replaced with 寫功課/打電話 and 看書/寫字; transcript picture cues added.
- G1 #2: added 你 and the accepted tag order `你來一下我的辦公室可以嗎？` / concise `來一下我的辦公室可以嗎？`; sources p.31 #2/#3.
- Order-build alternatives: `最好以後早一點去學校。`, `作業我寫完了。`, `我作業寫完了。`, `我一邊念書，一邊聽音樂。`, and the G2 concise advice orders.
- English: R02 ¶4 / `b2l01d2-l4` now “felt safe and found being with him interesting”; g1-p3 “The wife”; g6-ex4 drops “to eat”.
- G5: p2 uses 商店 (not B2L03 便利商店); p1/p2 cues now decide 坐在/站在; p3 unchanged.
- Untaught words: g8-p4 於是→然後; G1 q1 看起來→看過; G4 q1 看起來→看到; G2 q1 只好→剛好 (+ repair).
- G6: p1/p2/p3 prompts no longer give 送/寄; table row `b2l01g6-r2` subject is 王先生的舊車.
- G1 confusion: `等我一下` spacing; cf1 wrong sentence now 他… so the pair isolates 一次/一下.
- G4 #5 recast to 看完 (own-item repeat rule) with accepted `這本書已經看完了嗎？`; G6 #4 recast to 賣給, G6 #5 to 帶給, G2 #5 to 問老師; G2/G1 prompts now address the friend consistently.
- G3 #3: removed 還 (也/還 both correct); replaced with 但是 + contrast note.
- G9: p1/p2/p3 ambiguous 啊/了 replaced with 的; p4 cue added and tiles 嗎/了/的.
- `allowWords`: G3 `法文`; G9 `良介`, `沒空`.
- Usage rules: G05 adds 寫在; G06 adds 拿給/帶給/寫給/說給.
- Transcript metadata: printed 24–34 + 38–41, G4 p.32–33, G7/G8/G9 p.39/40/41; author review counts 29 examples / 45 items / 2 own, page ids and audio labels corrected.

**Rejected**
- Teaching #11 `allowWords: ["便利商店"]`: the word is not printed beside the exercise (only the 24-hour shop picture) and is B2L03 vocabulary; the item now uses taught 商店.
- Fidelity #12 `38–42 (PDF 39–43)`: G9 ends on printed 41; printed 42 is the 課室活動 page, not lesson content.
- Teaching #13 “Your wife”: the book says 太太 and the learner speaks as the wife; “The wife” is the faithful reading.
- Fidelity #5’s 票 sentence: superseded by teaching #10 (own item repeated 賣完); the same 已經-accepted fix is applied to the recast 看完 item.
- Teaching #7’s 給媽媽/給一本 repair: recasting #5 to 帶給 removes the grammatical 送給媽媽 clash and the implausible 給一本 tile.

## Unsure
- G1 #2: the printed frame `你可以來一下我的辦公室嗎？` needs seven tokens (你/可以/來一下/我的/辦公室/嗎 + one distractor), over the six-tile dock. I kept the reviewer-listed tag order `你來一下我的辦公室可以嗎？` (all content present, 你 included) plus the concise order; a learner cannot build the exact printed word order.
- G5 #2: the picture is a convenience store; the item says 商店 (in-scope, from the G1 example) rather than B2L03 便利商店. If the picture is considered decisive, this needs the Book 2 picture-crop/scene pipeline.
- No Book 2 page images/scene crops are exported, so G5/G7 picture items rely on written cues.

## NEEDS-ENGINE
- Book 2 vocabulary gate: `tests/content/grammarPracticeVocabulary.test.ts` loads `public/data/vocabulary/book-1.json` and `book-1.json` grammar only, so Book 2 practice has no scope test despite `allowWords` metadata. Add the Book 2 counterpart (per the instruction, no new test file was created in this run).

## Chinese instruction lines used
- 用「…」回答。 / 用「…」說這句話。 / 用「…」和「…」說這句話。
- 回答：…？ / 朋友說他…。你跟他說什麼？ / 外面很冷。跟朋友說什麼？
- 這句話不對。 / 說你…。 / 問…。 / 請他來一下你的辦公室。
- 孩子在椅子上，沒有站。 / 商店前面有兩個學生，他們沒有坐。
- 弟弟沒有錢買衣服。他住在你家，你沒有寄也沒有賣。說舊衣服去哪裡了。
- 這些鉛筆是生日禮物。問朋友要給誰。 / 這張卡片是從郵局來的。問卡片怎麼來的。
- 你賣了舊車。說賣給誰了。 / 媽媽請你帶一本書給她。
- 你在問他問題，要知道他喜不喜歡喝茶。 / 這個電影很好看。用「呢」說你想再看一次。
