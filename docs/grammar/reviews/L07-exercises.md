# L07 exercises — Codex, 2026-10-16
Verdict: PASS

## Checked
- Compared all 15 `materials/book1/L07/exercises.json` entries with the transcript and supplied scans; retained exact sources, order and instruction titles across the five grammar page IDs.
- Four items per point: three book items, then one `own`; vocabulary and patterns stay within each part and the point's book order.
- Python checks passed: unique IDs; 15/15 book coverage; one accepted completion per item; exact reconstruction of slot results; a repair for every wrong slot option; 2–4 dock tiles, each at most four characters; six bounded picture crops with existing source scans.
- Read the supplied types. Ordering uses three short chunks; p.164 #2–3 fix the subject and other sentence material around ordered slots to avoid rebuilding clauses or exceeding the tile limit.
- npm export, validation and tests: SKIPPED, expressly prohibited by this task. No generated files changed.

## Design notes

### 從 / 到 — B1L07-G01-P158
Mistakes: reversing the start and destination; treating 到 as an origin marker; choosing 來/去 without the speaker's location.
- p.163 #1: the arrow runs from the USA to Taiwan; the speaker is in Taiwan, fixing 來. Only 美國 → 台灣 matches.
- p.163 #2: the arrow runs from his home to school; the speaker remains at his home, fixing 去. Only 他家 → 學校 matches.
- p.163 #3: the arrow runs from the restaurant to the library; the speaker remains at the restaurant, fixing 去. Only 餐廳 → 圖書館 matches.
- own: adapts p.162 我從飯店來; the speaker is now at school and the hotel is the origin, so 從 is right and 到 would misidentify the hotel's role. This tests the marker itself after the book's route readings.
- Crops: p.163 #1 `[.173,.332,.296,.100]`; #2 `[.180,.502,.280,.095]`; #3 `[.176,.677,.230,.084]`. Each includes the drawing and arrow, excluding answer lines.

### Transportation — B1L07-G02-P160
Mistakes: putting the method after the destination; reversing 來/去; using 坐 when personally pedalling a bicycle.
- p.164 #1: the fixed opening 你怎麼 asks about method; the destination follows, then 去. Both speakers are at school, away from his home, excluding 來.
- p.164 #2: 他每天 is fixed; order 坐公車 → 到學校 → 來. The bus carries him to school and the speaker is there, excluding the reversed route core and 去.
- p.164 #3: 我不要 and 那家飯店 stay visible; order 走路 → 到 → 去 around the destination. The distant hotel excludes 來; the method precedes 到.
- own: uses p.164 我們騎腳踏車來; each traveller pedals a separate bicycle, excluding the passenger meaning of 坐. The book rearrangements do not test the choice of transport verb.

### Changed situations — B1L07-G03-P162
Mistakes: reading a change in the opposite direction; missing newly acquired understanding; reading negative …了 as a completed action rather than “no longer.”
- p.166 #1: 25°C yesterday → 30°C today selects 熱了 over 冷了.
- p.166 #2: the same bowl rises from $80 to $120, selecting 貴了 over 便宜了.
- p.166 #3: preserve the whole correction and supply 懂 in the teacher's question; the learner can now explain the correction, selecting 懂了 over 不懂 in the reply. One decision tests new understanding rather than two independent blanks.
- own: uses p.165 上課了…我們不可以玩手機了; games were allowed during the break and are now forbidden, selecting 不可以 over 可以. This adds the negative change the book exercise does not test.
- Crops: p.166 #1 `[.252,.258,.211,.119]` includes both calendars and temperatures; #2 `[.615,.243,.219,.145]` includes both prices, the arrow and bowl.

### Activity topics — B1L07-G04-P170
Mistakes: choosing the wrong activity for a comment; reversing the two activity/ability pairs; putting the people before a requested activity topic.
- p.171 #1: an underground rail trip selects 坐捷運 over 坐公車; both would otherwise fit the printed comment.
- p.171 #2: eggs must be brought home for cooking, selecting 買東西 over 吃東西; the comment concerns shopping rather than eating at the supermarket.
- p.171 #3: the learner has learned only the left-hand sport, so basketball precedes 我會 and tennis precedes 我不會. The picture alone cannot establish ability; the added situation supplies that missing fact.
- own: uses p.171 踢足球，我們都很喜歡; the instruction starts with the activity, and everyone's wish to play excludes 不喜歡. This tests topic-first order after the book's fixed comment frames.
- Crop: p.171 #3 `[.211,.713,.275,.150]` includes both sport drawings and their dividing line.

### 又…又… — B1L07-G05-P172
Mistakes: losing the negative quality when pairing descriptions; pairing a quality contrary to the situation; applying 又 directly to nouns.
- p.172 #1: retain 夏天又熱 in the printed frame; sleepless summer nights select 又不舒服 over 又很舒服.
- p.172 #2: retain 又好吃; $50 here versus $150 for the same bowl nearby selects 又便宜 over 又很貴.
- p.172 #3: retain 又喜歡游泳; enjoyment of sunshine as well as water selects 又喜歡 over 又不想 before 曬太陽. These are model completions of the book's open blanks, not a printed answer key.
- own: adapts the two countries in p.172 example 3; 日本 and 韓國 are nouns, so 和 joins them, while 又 requires a following quality or action. This adds the book note's noun restriction, absent from its three exercises.
- The paired structure stays visible while the learner selects its meaning; alternatives remain grammatical forms used elsewhere, rather than malformed versions of 又…又….

## Issues
- Existing practice contained only the first three points; replaced it with all five, including the six original drawings rather than schematic substitutes.
- Open book blanks needed added situations to rule out otherwise valid completions; those situations are learner-facing prompts, not claimed textbook quotations.

## Unsure
- The linked prototype was inaccessible through the web tool; its written design requirements were followed, but visual parity was not checked.
- Grammar-page pinyin is editorial where the book supplies none; no printed-pinyin verification is claimed.
- Repository vocabulary tests and browser rendering remain unchecked under this task's no-npm constraint; structural checks do not replace those gates.


## Review

Codex, 2026-10-16. Verdict: PASS for the manual content review and Python structural checks; npm gates remain unrun by instruction. This section supersedes the earlier design notes for the edited items.

### Flag verdicts
- **ACCEPT — l7g3-b3, p.166 #3:** the teacher printed the reply verbatim. Removed the supplied question 你們懂了嗎？, retaining the complete printed correction and the student's tested reply. The situation establishes new understanding; the printed 懂 glossary remains. Updated both scripts, result pinyin and English to match the shortened exchange.
- **ACCEPT — l7g4-o1:** “Start with the activity” disclosed the order. Removing that instruction alone would leave both 踢足球，我們都很喜歡 and 我們都很喜歡踢足球 valid. Changed this own item to a fixed comment frame with an activity gap, using 踢足球 / 打網球 and a scene about kicking a ball. Replaced the ordering repairs with the sport contrast; retained the book-derived result.
- **ACCEPT — l7g5-b3, p.172 #3:** 又喜歡 was copyable from the first predicate. Changed the supplied model completion to 他又會游泳, keeping the printed question, second activity and weekend clause. The context establishes swimming ability and enjoyment of sunshine; 又喜歡 / 又不想 now requires a meaning decision. Updated both scripts, result pinyin/English, prompt and repair.

### Independent pass and additional edit
- Reviewed all 20 items against the supplied scans, L07 transcript and scope list for competing answers, copied answers and implausible distractors. Route labels and numerical pictures provide evidence to interpret; their English prompts do not supply Chinese tiles verbatim. No later grammar was added.
- **l7g2-b1, p.164 #1:** “Start with 你怎麼” handed over the first chunk; without it, 到他家，你怎麼去？ is also valid. Fixed 你怎麼 in the sentence and retained destination/direction slots with 到他家 / 去 / 來. Removed the opening tile and instruction; replaced ordering repairs with slot repairs. The original result stays unchanged.
- Remaining items: no edits. The route, location, ability, permission and quality contexts distinguish the offered completions. No book exercise was removed; each of the five points retains three book items and one own item.

### Verification
- **PASS — Python:** JSON parses; 20 unique IDs; all 15 book sources in order; one declared answer per slot; exact Traditional/Simplified result reconstruction; dock/tile limits; repairs cover every wrong tile in every slot; all six picture crops have bounded coordinates and existing source scans.
- **PASS — Python:** none of the three flagged items' selected Chinese tiles appears in its fixed Chinese sentence frame.
- **PASS — manual:** reviewed the offered choices and context for one valid completion; structural checks alone do not establish linguistic uniqueness.
- **SKIPPED — npm export, content validation and tests:** explicitly prohibited by this task. No npm command ran; no generated packs were edited.
- Only content/grammar-practice/lessonSeven.json and this review were edited. No engine change is needed for these fixes.
