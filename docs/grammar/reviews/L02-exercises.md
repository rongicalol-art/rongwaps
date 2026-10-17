# L02 exercises — GPT-6, 2026-10-16
Verdict: PASS (authored-content checks; npm gates skipped by instruction)

## Checked
- Attached pp.54–57, 60–63 and transcript against all 18 entries in `materials/book1/L02/exercises.json`; book items retain their source strings and order.
- Six page IDs and part/book ordering against `lessonTwoPartOne.json`, `lessonTwoPartTwo.json` and the scope list; only `lessonTwo.json` and this review edited.
- Existing `grammarPractice.ts` scene and slot shapes; four items per point, one accepted completion per item, two to four taught tiles, no tile over four characters.
- Read/choose/order use existing slot-build interactions; ordering uses short chunks with one trap and keeps the rest of the sentence fixed.
- Python structural check: PASS: 6 page keys; 18/18 book sources in order; 6 own items; 24 unique answers; 71 wrong-slot repairs; 2 valid picture boxes; all results match filled lines.
- Grammar-author export/validation/tests and verify-change content gate: SKIPPED, because the task explicitly prohibits npm and public-pack writes; no npm command was run.

## Issues
### G01 · Dates, weekdays and times · Part 1
Mistakes: reversing hour/minute or month/day order; putting the weekday number before 星期; using a known number when asking for an unknown one.
- p.55 #1: a 09:20 moment fixes both chunks; 十五分 is a plausible minute reading but disagrees with the clock.
- p.55 #2: May 16, 2019 is highlighted; its Thursday column decides 四, and 星期 must precede the number.
- p.55 #3: the same calendar decides 五月十六號; 六月 disagrees with its month and the date cannot precede the month.
- own: the speaker asks for the weekday and receives 四; only 幾 makes the preceding turn a request for that unknown number, testing question formation beyond the book’s answer blanks.

### G02 · Time before the action · Part 1
Mistakes: putting the action before its time; replacing the requested action with its opposite; placing 不 before the time instead of before the verb.
- p.55 #1: the prompt fixes class ending and a 16:00 clock fixes 四點; 上課 changes ending to starting, and the time precedes 下課.
- p.55 #2: Saturday is explicitly a day off school; 星期六不去學校 is the sole order matching both that situation and the question.
- p.55 #3: departure for Japan is dated May 16; only 五月十六號 before 去日本 matches the date and the taught placement.
- own: the noon question and absence from home decide 中午不回家; 下午 answers a different time, and 不 must stay with 回家, testing time versus negation placement.

### G03 · 有 / 沒有 · Part 1
Mistakes: choosing possession without checking context; using 不 to negate 有; answering 誰 with the wrong conversational person.
- p.56 #1: all friends are Taiwanese, so there are no American friends; only 沒有 fits.
- p.56 #2: the prompt explicitly assigns the depicted phone to the learner; the drawing alone does not establish ownership, so only the combined context licenses 有.
- p.56 #3: only the questioner has water; the responding learner must address that person as 你, excluding 我 and third-person 他.
- own: Mr Wang has no children; the whole phrase 沒有 is split to contrast 沒 with 不, a negator distinction the book’s open answers do not directly test.
- Phone crop: page 56, box `[0.602, 0.770, 0.061, 0.082]`, around the handset only; the printed 手機 gloss is supplied separately and allowed explicitly.

### G04 · 的 · Part 2
Mistakes: substituting possession 有 or identification 是 for the noun link; reversing owner and person; treating a noun phrase as a complete possession statement.
- p.60 #1: preserved February 24 exactly; 媽媽 and 生日 require 的 before the existing predicate 是二月二十四號.
- p.60 #2: 台灣 identifies the fruit’s origin inside the object of 喜歡; 的 makes that connection, whereas 是 cannot occupy that link.
- p.60 #3: the context fixes the traveler as the learner’s child; 我 must precede 的 and 孩子 follow it, while 老師 names the wrong traveler.
- own: the speaker must state having a child; 有 makes a complete statement, while 的 leaves only the noun phrase 我的孩子, testing the reverse contrast to the book’s 的 blanks.

### G05 · Wanting/liking before the action · Part 2
Mistakes: reversing the feeling and action verbs; answering with the wrong polarity; negating the action instead of the preference.
- p.61 #1: accepting the fruit decides 要 rather than 不要; 要 must precede 吃.
- p.61 #2: explicit dislike decides 不喜歡; both tiles are grammatical before 來學校, so the situation is necessary.
- p.61 #3: milk tea is fixed as the favourite drink, leaving only the order 愛喝; 吃 is a real taught action but does not describe drinking the milk tea.
- own: the p.61 example anchors the contrast with fruit; the chunks must form 不愛喝, targeting negation before the auxiliary rather than between auxiliary and action.

### G06 · Positive-negative questions · Part 2
Mistakes: choosing 沒 for qualities or preferences; repeating the action instead of the auxiliary; using 不 instead of 沒 with 有.
- p.62 #1: retains the printed heat reply and its reading; the sweaty figure in sunlight supplies the heat context, and 熱 must pair through 不, not 沒.
- p.62 #2: the printed liking reply stays intact; the gap tests the absent negator 不, which is not copied from the affirmative reply, in 喜不喜歡.
- p.62 #3: the printed refusal stays intact; 要 and 不要 form the question before fixed 去他家, while 不去 incorrectly switches the negation to the action.
- own: the p.62 example 他有沒有台灣朋友 supplies the lexical scope; 沒 is required in 有沒有, contrasting with the preceding 不 patterns.
- Heat crop: page 62, box `[0.635, 0.631, 0.153, 0.132]`, tightly around sun and sweating person, excluding the answer and caption; 熱 is glossed separately and allowed explicitly.

## Unsure
- The linked prototype could not be retrieved by the web tool, so direct visual comparison was unavailable; the written exercise-design criteria were used.
- Runtime rendering and the repository vocabulary/coverage gates remain unverified because npm is prohibited; crop coordinates were checked against the supplied printed-page images, not an app preview.

## Review
GPT-6, 2026-10-16. Verdict: PASS for source/context review and Python structural checks; repository gates not run.

### Flag verdicts
1. **ACCEPT — l2g01-1, minute / 十二點:** corrected “ten past fifteen” to “fifteen past ten”; the scene is 10:15.
2. **ACCEPT — l2g01-4, B:** expanded 一。 to 星期一。; clarified that A does not know the weekday, excluding a confirmation question.
3. **ACCEPT — l2g02-1, time / 上課:** repair now names 十點 before 下課.
4. **ACCEPT — l2g02-4, negative / 下午:** repair now names 不 immediately before 回家.
5. **ACCEPT — l2g03-2, giveaway:** retained the printed question and phone crop; the phone now belongs to the questioner and the learner has none. Changed the answer to 沒有, with matching result, English, pinyin and repair. Copying A’s 有 now gives the wrong response.
6. **ACCEPT — l2g05-1, giveaway:** changed acceptance to refusal and fixed 吃水果; the single choice is 要 / 不要, with 不要 correct. Updated context, result, pinyin, English and repair; no verb-order copying.
7. **ACCEPT — l2g05-1, action / 不要:** removed this action slot and its repairs as part of #6; the remaining repair names the remaining slot’s answer 不要.
8. **ACCEPT — l2g05-3, giveaway:** retained the printed question and answer sentence, fixed 愛喝, and made the blank the drink: 奶茶 / 水. Both make grammatical replies; the favourite-drink context decides 奶茶. Updated repairs and fallback. This book item now tests answering 什麼; l2g05-4 still tests auxiliary/action order.
9. **ACCEPT — l2g05-3, feeling / 吃:** removed the feeling slot and 吃 distractor as part of #8; each new repair names 奶茶.
10. **ACCEPT — l2g06-1, pinyin:** changed the editorial result to Táiwān rè bú rè?, consistent with the existing yào bú yào convention. The book prints no pinyin for this completed question; this is not a newly verified printed reading.

### Independent pass and edits
- Checked all 24 items for alternative grammatical readings, copied answers, distractor plausibility, context, and repairs against pp.54–57, 60–63, the transcript and the supplied scope list; all 18 printed exercise items remain in order.
- **l2g01-2:** replaced 七 with 三 and rewrote both affected repairs. 星期三 is a real weekday; 星期七 supplied an invalid-weekday elimination shortcut. The highlighted Monday decides 一.
- **l2g01-4:** repair now explicitly names 幾.
- **l2g04-3:** 老師的孩子 could still be the learner’s child if the learner is a teacher. Fixed 我 and 孩子 and moved the decision to their link, 的 / 是; rewrote repairs/fallback. The completed sentence, book source and child-travel context remain.
- **l2g02-2:** rewrote time / 去學校 and action / 星期一, 去學校 repairs to name the correct target fill.
- **l2g02-3:** rewrote month / 去日本, day / 十月, and action / 七號, 十二月, 十月 repairs to name 十二月, 七號 or 去日本 as appropriate.
- **l2g05-4:** rewrote feeling / 不, 沒 and action / 愛, 不, 沒 repairs to name 愛 or 喝 as appropriate.
- Corrected residual traditional 嗎 / 麼 inside existing simplified fields: l2g03-1 A, l2g03-2 A, l2g04-2 result, l2g05-2 A and l2g05-3 A.
- Other items retain their keyed answers. Questions containing 有 or 喜歡 do not alone decide response polarity; their contexts remain necessary. Existing order items require a complete ordered answer rather than choosing the sole grammatical option from several sentence-length alternatives.

### Verification
- Python: PASS: 6 groups; 18 book items in order; 6 own items; 24 unique keyed completions; 62 wrong-slot repairs; results, tile limits and repair targets valid.
- Keyed-completion enumeration verifies the data’s accepted combinations, not linguistic uniqueness; the latter was checked manually.
- npm export, content validation and tests: SKIPPED by explicit task instruction. No npm command or generated-pack write.
- Only `content/grammar-practice/lessonTwo.json` and this review were edited. Earlier sections describe the pre-review version; this section supersedes their affected item descriptions.
