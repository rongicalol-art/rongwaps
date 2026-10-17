# L06 exercises — GPT-6, 2026-10-16
Verdict: FIXES NEEDED

## Checked
- All 24 entries in `materials/book1/L06/exercises.json`, in order; transcript and attached printed scans; four grammar page IDs and part boundaries; `src/types/grammarPractice.ts`; scope list and grammar-author rules 0–14.
- One practice per grammar page; all book items before extras within that page; 26 items total; two or three options, one accepted fill and a separate repair for every distractor.
- Python structural checks: PASS (coverage, order, IDs, titles, tile limits, answer/result reconstruction, repairs, crop bounds).
- npm export, validation and tests: SKIPPED by explicit task instruction; generated packs untouched.
- Prototype URL could not be retrieved; the skill's written design standard was used, without claiming a visual comparison.

## Design notes

### 會 — B1L06-G01-P135
Mistakes: confusing ability with willingness; choosing the wrong polarity for an acquired skill.
- p.136 #1: learning from a brother and being able to join his team selects 會 over 不會.
- p.136 #2: explicitly being unable to speak Chinese selects 不會 over 會.
- p.136 #3: the learner asks about knowing how; the printed reply denies the skill, selecting 會不會 over 想不想.
- own: swimming ability is explicitly present but another activity is preferred, selecting 不想 over 不會; this adds the willingness contrast missing from the book.

### 得 — B1L06-G02-P136
Mistakes: mismatching a performance description to evidence; confusing quality with amount; losing the repeated verb or the topic structure when answering.
- p.137 #1: the many cans select 很多 over 不多; crop p.137 [0.622, 0.213, 0.215, 0.091].
- p.137 #2: the stacks of bowls select 很多 over 不多; crop p.137 [0.628, 0.326, 0.217, 0.089].
- p.137 #3: a comfortable night and rested morning select 很好 over 不太好.
- p.138 #1: skillful tennis and winning select 很好 over 不太好.
- p.138 #2: the awake, sweating figure selects 不太好 over 很好; crop p.138 [0.647, 0.281, 0.205, 0.145].
- p.138 #3: frequently missing the ball selects 不太好 over 很好.
- p.139 #1: enthusiastic diners select 很好 over 不太好 for mother's noodles.
- p.139 #2: losing the ball and missing the basket select 不太好 over 很好.
- p.139 #3: the printed response evaluates quality, selecting 怎麼樣 over 多不多.
- p.140 #1: diners enjoying the food and requesting more select 很好 over 不太好.
- p.140 #2: skillful basketball and winning select 很好 over 不太好.
- p.140 #3: the printed response evaluates English proficiency, selecting 怎麼樣 over 多不多.
The four printed 得 structures stay in their original sequence; supplied sentence frames preserve their different verb/topic positions without making learners assemble clauses. Twelve book items take precedence over the general 3–5 target; no extras.

### 有（一）點（兒） — B1L06-G03-P146
Mistakes: choosing a mild state that does not explain the need; confusing 有點兒 before a quality with 一點兒 for an amount.
- p.146 #1: low energy plus explicit absence of hunger/thirst selects 累; rest alone would not uniquely exclude the other states.
- p.146 #2: a dry mouth plus explicit absence of hunger/tiredness selects 渴.
- p.146 #3: limited space and comfortable temperature select 小 over 冷/熱.
- own: the printed coffee-price example puts the gap before 貴, selecting 有點兒 over 一點兒; this tests the form distinction absent from the three book blanks.
Fixed 有點兒 in the book completions keeps the full sentence while the learner chooses one state; the title supplies the book's required pattern.

### 可以 — B1L06-G04-P147
Mistakes: offering an action that does not fit the situation; reversing granted/refused permission.
- p.147 #1: a customer using a menu orders rather than cooks, selecting 點 over 做; crop p.147 [0.191, 0.474, 0.158, 0.132]; 三明治 is the book's printed gloss and sole allowWords addition.
- p.147 #2: the indoor television drawing selects 看電視 over 聽音樂; crop p.147 [0.439, 0.475, 0.147, 0.136].
- p.147 #3: the cinema exterior selects 去那裡 over 在家; crop p.147 [0.662, 0.470, 0.209, 0.152]; the choice cannot be copied from 電影 in A's line.
- p.148 #1: mother's explicit refusal selects 不可以 over 可以; the cold-weather reason comes from the printed example.
- p.148 #2: teacher's explicit permission selects 可以 over 不可以; the restroom situation comes from the printed example.
- p.148 #3: the librarian explicitly welcomes reading, selecting 可以 over 不可以; crop p.148 [0.691, 0.580, 0.193, 0.100]. The printed library drawing identifies the setting but alone cannot prove a rule; the added welcome supplies permission. A is completed and fixed so B is the sole decision.
Six book items take precedence over the general 3–5 target; no extras.

## Issues
- The single-title schema cannot give 得 and 可以 separate practice titles for their different printed exercise boxes: each practice uses its first printed instruction, with the later instruction on the relevant items as `prompt`.
- Crop coordinates are fractions of each full attached page and tightly frame the drawings, excluding question text and numbered badges.
- Added English situations constrain the book's originally open answers; they are learner context, not claimed book quotations. No new Chinese contexts introduce later grammar.

## Unsure
- Required repository npm gates remain unrun, so this review does not certify integration or vocabulary-test acceptance.
- Confirm the crops in the app when picture assets are available; no UI or progress-writing checks were performed.


## Review
2026-10-16 — GPT-6

Verdict: PASS for this manual answer-uniqueness/giveaway pass; repository gates remain unrun.

### Flag verdicts
- **ACCEPT — b1l06-g02-p136-practice-2 (p.137 #2):** A printed the entire correct complement 很多. Changed only A's question to 他吃得怎麼樣？ so the bowl picture determines 很多 versus 不多. This is an adapted question frame, not a verbatim transcription of the printed 他吃得很多嗎？; source, picture and book-item position remain.
- **ACCEPT — b1l06-g04-p147-practice-6 (p.148 #3):** A supplied B's correct 可以. Moved the sole gap into A: 我[可以]在這裡看書嗎？; fixed the open B response as 好。 Changed the contrast to 會/可以, distinguishing learned ability from permission without introducing the ambiguous negative question 我不可以…嗎？. Updated the permission-request context, repair and question result/pinyin/English. The printed 在這裡看書嗎？ remains intact; both completions are authored for the book's open blanks.

### Independent pass and additional edits
- Reviewed all 26 items against the attached exercise boxes, transcript and scope list, including distractor meanings, visible answer echoes, English elimination clues and picture dependence.
- **p.146 #1:** removed the explicit “neither hungry nor thirsty” elimination clue; kept the observable fatigue cue (struggling to keep one's eyes open). Reduced options to 累/渴 and rewrote the remaining repair around the need for rest.
- **p.146 #2:** removed “neither hungry nor tired”; retained the dry-mouth context. Reduced options to 渴/餓 and rewrote the remaining repair around drinking versus eating.
- **p.146 #3:** replaced the unrelated temperature options 冷/熱 with 大, giving a same-dimension 大/小 contrast. Replaced the comfortable-temperature elimination clue with shelves full and belongings still without space; replaced both old repairs with the size repair.
- Remaining items: retained the ability/willingness, performance, quantity/quality, suggestion and permission contrasts; no further edits. English situations and pictures supply evidence, rather than spelling out which other options to exclude. Printed instructions naming the target construction remain as required by the book.
- No book items dropped; all 24 book sources retain their sequence, plus the two existing own items. Only `content/grammar-practice/lessonSix.json` and this review were edited.

### Verification
- **PASS:** Python JSON/structure checks — 26 unique items; all 24 book sources in order; exactly one accepted fill per item; 2–4 distinct options of at most four characters; answer/result reconstruction; a repair for every distractor; picture crop bounds.
- **PASS (manual):** single intended answer and no copyable full answer in the two flagged frames; revised 有點兒 options no longer depend on explicit exclusion lists. Existing picture crops were checked against the attached scans, not rendered in the app.
- **SKIPPED:** npm export, validation and tests, as explicitly instructed. No generated files or progress data touched; vocabulary-test and integration acceptance remain unverified.
