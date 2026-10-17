# L08 exercises — GPT-6, 2026-10-16
Verdict: PASS (author review and structural checks; npm gates not run)

## Checked
- Compared all 18 exercise-list entries with the transcript and attached scans; exact source strings and book order retained across five grammar page IDs.
- Part 1 uses only earlier patterns and G01–G02; Part 2 adds G03–G05 in order; no invented progressive, completed-action 了, comparisons, or 先…再 sequence.
- Choose items preserve the printed sentences/dialogues with scaffolded completions; one own order item and three printed-picture read items provide variation without forcing new formats.
- Printed instructions retained as practice titles; printed 等/聽 cues and 台北/桃園 glossary retained.
- Python checks: 18/18 book sources in exact order, five page IDs/titles, two own items after their book items, 20 unique IDs, 44 possible dock arrangements, exactly one accepted arrangement per item, a matching repair for every wrong arrangement, result reconstruction, tile lengths/pinyin, and bounded picture scenes backed by existing scans.
- Standard export/validation/test gates and verify-change npm gate: SKIPPED by the task's explicit “Do not run npm” instruction; generated packs untouched.

## Design notes

### G01 · 好 / 難 + verb · Part 1
Mistakes: reversing a positive/negative judgment; confusing a pleasant perception with ease of an action.
- p.186 #1: the speaker's positive movie judgment selects 好看 over 難看.
- #2: added bike-fit/easy-riding context selects 好騎; a new bike alone does not establish ease.
- #3: added report that learning is easy selects 好學; wanting to learn alone would not exclude 難學.
- #4: 畫得不好 and 有點兒 select the negative visual judgment 難看.
- #5: the positive taste judgment behind everyone wanting a cup selects 好喝.
- #6: added inability to locate the place on a map selects 難找; distance alone would not exclude 好找.
No own items: the six mandatory book items already exceed the general 3–5 target and cover both categories; none dropped.

### G02 · Cause and effect · Part 1
Mistakes: swapping the reason and result; answering a reason question with a consequence; asking for a time when the reply explains why.
- p.187 #1: retain printed 因為, scaffold 他喜歡綠色 as the reason, and choose 所以 before the clothing habit it explains; 因為 would reverse that relation.
- #2: choose 為什麼 versus 幾點; swimming and sunbathing explain the wish to go, and supply no clock time.
- #3: the scaffolded Taiwan visit is the reason for learning Chinese, so 因為 answers the printed 為什麼 question; 所以 would present it as a result.
No own items: the book items cover these three decisions.

### G03 · Checking a guess · Part 2
Mistakes: treating a guess as a neutral inquiry; assuming a rejected guess needs a different question particle.
- p.193 #1: added expectation that he is Korean calls for confirmation with 吧, rather than neutral 嗎.
- #2: observing the friend's morning coffee gives an expectation to check with 吧; the printed reply stays whole.
- #3: the speaker expects basketball ability, so 吧 expresses that stance even though the printed reply rejects it and mentions tennis.
- own: having no idea about Chinese-song ability calls for neutral 嗎, reversing the book items' stance and preventing an always-吧 strategy.
The short English situations specify the intended stance: the bare printed dialogues alone cannot exclude 嗎.

### G04 · VV看 · Part 2
Mistakes: omitting the repeated verb; putting 看 before the action; confusing trying something with enjoying looking at it.
- p.194 #1: keep the printed waiting dialogue and （等） cue; with 看 scaffolded, choose 等等 over 等 to suggest trying a little more waiting.
- #2: keep the printed metro dialogue; choose 坐坐 over 坐 before scaffolded 看 to express trying the ride.
- #3: keep the song dialogue and （聽） cue; choose 聽聽 over 聽 before scaffolded 看 to express trying a listen.
The book's supplied verbs do not disclose whether to use the single or repeated form; both tiles are real taught action forms, with no invented malformed compound offered as an option.
- own: order 穿穿 + 看 in the book table's 我穿穿看; 喜歡 is a real taught trap because 我喜歡看 expresses enjoyment of looking, rather than offering to try the skirt on.
Reduplicated second syllables have neutral tone in pinyin; own sentence is from the printed grammar table.

### G05 · About to happen · Part 2
Mistakes: confusing soon with tomorrow/today/now; treating the pictured future event as already current.
- p.195 #1: added visit context supplies the missing event, while the calendars decide the time: April 5 is soon but not tomorrow from April 3; choose 快要 over 明天 in 我的日本朋友…來了.
- p.196 #2: 11:50 now precedes the noon break, so 快要 rather than 現在 describes starting the break.
- #3: October 1 precedes the tenth birthday on October 10, so 快要 rather than 今天 describes turning ten.
All three retain sentence-final 了 and offer only one of the synonymous soon forms; 快/快要/要 are never used as mutually exclusive distractors.
No own items: the three pictures already contrast upcoming events with current or incorrect dates.

Picture scenes (left, top, width, height as page fractions; drawings and their captions only):
- p.195 #1: page 195, [0.193, 0.676, 0.293, 0.136], both April calendars and 今天.
- p.196 #2: page 196, [0.202, 0.148, 0.287, 0.121], both clocks and 現在 / 中午休息時間.
- p.196 #3: page 196, [0.200, 0.344, 0.275, 0.123], both October calendars and 今天 / 弟弟十歲生日.

## Issues
- BOOK-ERRATA: p.195 #1 gives dates but no event for the Japanese friend; the learner-facing visit context is an explicit teaching addition, not a transcription claim.
- Open book blanks are scaffolded with taught language so the learner places grammar words instead of building clauses; added context is confined to practice, with grammar pages and transcript unchanged.
- p.187 #2 deliberately avoids 怎麼 as a distractor because it can also ask “how come” here.

## Unsure
- Prototype URL returned “not accessible” through the web tool; evaluated against the skill's written teaching standard, without claiming a visual prototype comparison.
- Browser rendering, crop asset delivery, and repository validators were not run; crop bounds were reviewed against the supplied scans and checked structurally.


## Review
2026-10-16 · Verdict: PASS for source/content review; repository gates skipped as instructed. This section supersedes the earlier design notes where changed.

### Flag verdicts
- l8g2-p1 — giveaway: ACCEPT. Removed the visible 因為 cue and the added consequence; choose 因為/所以 before the scaffolded reason. The printed connector is now the learner's tile, rather than a cue beside another connector gap.
- l8g2-p1 — replaced book blank: ACCEPT. Restored the reason-only completion 因為他喜歡綠色。; removed the authored 所以常常穿綠色的衣服 clause and its English/pinyin equivalents.
- l8g3-p1 — confirmation instruction / ambiguous 嗎: ACCEPT. Removed the instruction; a Korean passport supplies situational evidence. Changed to placing the supplied 吧 after the whole statement, with two wrong positions and individual repairs. Does not mark 嗎 ungrammatical.
- l8g3-p2 — guess instruction / ambiguous 嗎: ACCEPT. Retained only the observed morning coffee; changed to the same sentence-final placement task and position repairs.
- l8g3-p3 — confirmation instruction / ambiguous 嗎: ACCEPT. Basketball equipment supplies situational evidence; changed to the same sentence-final placement task and position repairs. Printed rejection and tennis reply preserved.
- l8g3-own1 — neutral-question instruction: ACCEPT. Replaced the instruction with meeting someone in music class; place supplied 嗎 at the end, with position repairs. Removed the false mutually exclusive 嗎/吧 contrast.

### Own pass and edits
- Reviewed all 20 items against the supplied scans, transcript and scope list; all 18 printed items remain in order. No grammar-page, transcript, pack or engine edits.
- l8g1-p2: replaced “riding it feels easy” (a translation of 好騎) with bike fit and an untiring long ride; updated repair/fallback.
- l8g1-p3: replaced “learning ... is easy” (a translation of 好學) with friends learning in one lesson; updated repair/fallback. The printed desire to learn alone would not exclude 難學.
- l8g1-p6: replaced “cannot find” (a translation of 難找) with checking three maps without locating the place; updated repair/fallback.
- l8g2-p3: removed “Give your reason”; the printed 為什麼 question already supplies the relation.
- l8g4-own1: removed the direct “Try ... to find out” instruction and the potentially valid 我喜歡看 alternative. Keep printed 我穿穿看 as a placement task: supplied 看 goes after 穿穿; wrong position has its own repair. Added only a shop situation, not a grammar label.
- Remaining G01 polarity choices follow the judgments in the sentences; G02 asks for reasons; G04 printed items distinguish a single verb from its repeated form before 看; G05 dates/clocks distinguish upcoming events from the offered tomorrow/now/today alternatives. No synonymous 快/快要/要 distractors.
- G03 now tests particle position, not an exclusive pragmatic distinction between 吧 and 嗎: even evidence for a guess cannot make a neutral question ungrammatical. A supplied placement tile identifies the word deliberately; the learner must decide its position. All wrong positions use the same word, without unequal option lengths or an answer repeated in the context.

### Verification
- PASS: inline Python check — JSON parsing; 18 book sources in exact order; 20 unique IDs; tile limits; one accepted arrangement/position per item; wrong-gap repairs; traditional/simplified result reconstruction.
- PASS: manual source, scope, ambiguity and giveaway review. Position tasks use the skill's existing gaps format; no new engine behavior required.
- SKIPPED: npm export, validation and tests, per explicit task instruction. Structural checks establish authored answer keys, not repository validation or browser behavior.
