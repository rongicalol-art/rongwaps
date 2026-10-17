# L04 exercises — GPT-6, 2026-10-16
Verdict: PASS (authoring review; npm gates not run)

## Checked
- All 19 entries in `materials/book1/L04/exercises.json`, in source order, against the transcript and supplied scans; five practices keyed by grammar page ID.
- Part 1 uses no Part 2 numbers, money language or approximate amounts; no later grammar is introduced.
- Three extras, each after its point’s book items: negative 也, sentence-final 了, and grouping large numbers by 萬.
- Each item has one decision and one accepted completion; every wrong tile or gap has a specific one-sentence repair.
- Choose/read items have 2–3 taught tile options; position items use the type’s one-tile `gaps` interaction with three selectable positions, rather than extra word distractors.
- All ten picture crops inspected as images; boxes use fractions of the original printed page and preserve necessary prices/date labels.

## Design notes

### G01 — Transposed objects
Mistakes: putting the subject before the requested topic; putting 都 before the subject or after the verb.
- p.96 #1: a positive preference is supplied in English; red clothes stay first, so 我 has one position between the topic and 喜歡.
- p.96 #2: a positive buying decision is supplied; the pencil crop identifies the referent, and 我 belongs between that topic and 要買.
- p.96 #3: cake and beef noodles are fixed completions of the open food blanks; “both” fixes the scope of 都, which follows 我 and precedes 喜歡吃.
- p.97 #4: flowers, books and cakes fill the three open gift blanks; “all three” fixes 都 between 我 and 喜歡.
No extra: the four book items already cover singular/plural topics and subject/adverb position.

### G02 — 也
Mistakes: putting 也 before the new subject; after the verb phrase; or inside 不喜歡.
- p.98 #1: the same speaker adds a second wish; 也 begins the second predicate.
- p.98 #2: cake is the new subject, so 也 follows 蛋糕 and precedes 很好吃.
- p.98 #3: Youmei is the new subject sharing Zhongming’s preference; 也 follows her name and precedes 喜歡買.
- own: both people dislike coffee, so 也不喜歡 expresses the shared negative preference; 不也 would not express that meaning.
The book’s completely open answers receive fixed, taught completions; learners place only 也.

### G03 — 太…了
Mistakes: reversing the picture’s size judgment; confusing tiredness with hunger; using the food-taste word for a drink; placing 了 before the adjective.
- p.99 #1: the tight, short shirt rules out 大 and selects 小.
- p.99 #2: work alone could imply several states, so added English context says he has eaten and wants sleep; 累 is right and 餓 contradicts it.
- p.99 #3: the question is about bubble tea’s taste and the printed continuation says 喝, selecting 好喝 over 好吃.
- own: the printed 40°C thermometer supplies the situation; 了 closes 太熱 and cannot interrupt it.
Crops: p.99 boy and desk worker separately; p.98 thermometer for the extra.

### G04 — Large numbers
Mistakes: choosing the wrong place-value unit; reading phone groups as quantities; missing internal zero places; grouping millions by thousands instead of 萬.
- p.104 #1: all eight printed numbers and seven supplied readings remain visible; the single decision is 千 in 5,080, with 百/萬 denoting different magnitudes.
- p.104 #2: all four phone numbers and three supplied readings remain visible; the active 493 group must be 四九三, not the quantity readings 四十三 or 四百三.
- p.105 #3: all four printed noun quantities remain visible, with three supplied readings; 5,005 needs 零 between 五千 and the final 五, before 個人.
- own: the book’s 3,050,000 table number requires 萬 after 三百零五; 千 and 百 give different values.
The numbered source entries are whole sets, so each remains one item with one active decision; the remaining members are reading support, not separate scored questions.

### G05 — 多
Mistakes: choosing the wrong approximate decade; putting 多 after the money unit for a large remainder; confusing the hour/age interval or rounding an amount upward.
- p.106 #1: fifteen pictured faces select 十多, not 二十多.
- p.106 #2: $180 selects 一百多塊, not 一百塊多 (only a fractional dollar above 100).
- p.106 #3: $2,200 selects 兩千多塊, not 兩千塊多 (only a fractional dollar above 2,000).
- p.107 #1: the short hour hand points toward XI and the other hands are past the hour; 十一點多 fits, while 十二點多 does not.
- p.107 #2: the printed birth date 2016.1.1 plus an explicit fixed “today” of 2026-10-16 selects 十歲多 over 九歲多; no runtime date dependence.
- p.107 #3: US$8.45 selects 八塊多; 九塊多 would incorrectly round above the next whole dollar.
No extra: all six book entries are retained, taking precedence over the general 3–5-item target.
Crops: p.106 faces, cups with $180, jacket with $2,200; p.107 clock, complete birth-date arrow, pens/flower with US$8.45.

## Issues
- `content/grammar/lessonFourPartTwo.json`: existing clock answer 十二點多 conflicts with the enlarged p.107 drawing; practice uses 十一點多; grammar page left unchanged because it is outside the requested write scope.
- BOOK-ERRATA p.99: “Complete the following questions” precedes answer blanks; the practice title preserves the printed instruction.
- G04 has three distinct printed instructions under one grammar page; the practice title uses the first verbatim, and each book item repeats its own printed instruction as its prompt.

## Unsure
- The prototype URL returned “not accessible via this tool”; visual parity with that artifact could not be reviewed.
- The birth-date picture leaves 今天 unspecified; the fixed date is added context, not a transcription of a printed date.

## Verification
- PASS: independent Python checks of exact source coverage/order, page IDs, unique item IDs, one accepted completion, tile limits, repairs for every wrong choice, result reconstruction, picture bounds, and book-before-own order.
- PASS: manual scan, context, scope, pinyin and crop review.
- SKIPPED: `npm run content:export && npm run content:validate && npm test -- tests/content tests/unit/grammarPracticeCheck.test.ts` — user explicitly prohibited npm and writes to generated packs.

## Review
GPT-6 · 2026-10-16
Verdict: PASS (content review; npm gates skipped by instruction). This section supersedes the earlier design notes for edited items.

### Flag verdicts
- **ACCEPT — `l04-g1-book1`:** the fixed topic and “keep the clothes first” supplied the transformation. Replaced the 我-position task with three ordered slots for 紅色的 / 衣服 / 我喜歡 and the taught negative trap 我不喜歡; retained the book question and positive-preference context. No answer chunks are prefilled, and the prompt no longer states their order. The book instruction still requires a topic-first answer.
- **ACCEPT — `l04-g1-book2`:** same giveaway. Replaced the 我-position task with three ordered slots for 這種 / 鉛筆 / 我要買 and the negative trap 我不要買; retained the book question, pencil crop and positive buying context. Removed the order-revealing prompt. Both topic tasks keep the noun phrase and comment in short chunks rather than constructing clauses word by word.
- **REJECT — `l04-g5-book4`:** the transcript's uncertainty is not decisive when the supplied p.107 scan is available: the short hand points between XI and XII, and the long hand points toward VI, supporting eleven-something. Exactly one of 十一點多 / 十二點多 fits; no key or transcript edit. The conflicting grammar-page answer remains outside this task's write scope.
- **REJECT — `l04-g5-book5`:** 2016.1.1 and 今天 come from the picture; the prompt explicitly fixes 今天 to 2026-10-16 as added exercise context. Ten birthdays have passed on that fixed date, and 九歲多 is wrong. No runtime calendar lookup exists in the item, so the answer does not drift. The skill permits added context to disambiguate an open book answer; the fixed date is not represented as printed book text. Retained unchanged.

### Independent pass and additional edits
- Reviewed all 22 items against the supplied scans, transcript and scope for a unique answer, answer leakage, plausible distractors and specific repairs. Preserved all 19 book entries in order and all ten picture crops.
- `l04-g4-book1`: removed 百 and its repair: 五百零八十 is malformed, making it an eliminable distractor. Kept 千 / 萬, which produce valid readings of different quantities; 5,080 selects 千.
- `l04-g4-book2`: replaced 四十三 / 四百三 with 四三九 and updated its repair. Both remaining options are three-digit phone sequences using the same digits; the printed 493 fixes their order without a quantity-versus-digits formatting giveaway.
- `l04-g4-own1`: replaced the 3,050,000 unit-gap item, whose 百 / 千 endings made malformed whole readings, with the book table's 78,000. Choices 七萬八千 / 七千八百 are both valid, equally long readings; place value decides. Updated the prompt, slot, result, pinyin, translation and repair.
- Remaining position tasks test placement, so naming the supplied word 也 / 都 / 了 does not reveal its correct gap. Their alternative gaps fail the taught word order. Picture-driven size/amount choices and the drink/food taste contrast are decided by the referent, not by a copied answer. The work picture's added sleep context disambiguates 累 from 餓.

### Verification
- PASS: independent Python checks — valid JSON; 22 unique item IDs; 19 book entries; tile limits; one keyed completion per active slot; result reconstruction; ten picture bounds; exactly one accepted permutation for each revised topic-order item.
- PASS: manual review of question context, distractors, scope and source order. Structural checks alone do not establish linguistic uniqueness.
- SKIPPED: npm export, validation and tests, including the verify-change content gate — expressly prohibited by the user. No generated packs or other files edited.
