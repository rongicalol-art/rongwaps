# L05 exercises — Codex, 2026-10-16

Verdict: PASS (author review; npm gates skipped by instruction).

## Checked
- All 16 entries in `materials/book1/L05/exercises.json`, in order, against the transcript and attached scans; five practices keyed by grammar page id.
- Instructions preserved verbatim; one accepted completion per item; 2–3 tiles per dock, each at most four characters; individual repairs for every distractor and wrong order.
- Part 1 uses no Part 2 directional words or existential patterns; later grammar is excluded throughout.
- No own items: the 3/3/3/4/3 book items already supply the requested practice count.
- Python checks: JSON structure, exact source sequence and instruction coverage, unique ids, single accepted completion, result reconstruction, tile limits, repair coverage, and picture bounds.
- The skill's export/validation/test commands were not run: the task explicitly prohibits npm and changes to generated packs.

## Design notes

### B1L05-G01-P116 — location
- Mistakes: misreading the place, affirming a location the picture contradicts, and confusing a confirmation question with a topic follow-up.
- `p.116 #1`: shelves and study tables distinguish 圖書館 from 咖啡廳; 在 is supplied so the reply remains a location statement.
- `p.116 #2`: the bed places Xiaomei at home; only 不在 denies the proposed library location, without using untaught 房間裡.
- `p.117 #3`: the learner explicitly checks a complete statement about Li at nine; 嗎 asks for confirmation, while the previously taught 呢 would require a topic-follow-up context.
- Crops: p.116 drawings 1, 2, and 3 separately; drawing 3 includes its clock. The continued question on p.117 uses the drawing printed on p.116.

### B1L05-G02-P117 — place before action
- Mistakes: putting the location after the action, confusing purchasing with drinking, and failing to deny an incorrect location.
- `p.117 #1`: the added café situation fixes the open location; the book asks about buying, so 喝咖啡 changes the requested action; 在咖啡廳 must precede 買咖啡.
- `p.117 #2`: answer as the pictured reader, fixing the book's otherwise personal preference; the open book rules out 聽音樂, and 在家 precedes 看書.
- `p.117 #3`: the printed restaurant dinner plan contradicts eating that dinner at home, so only 不在家 fits.
- Crop: p.116 drawing 2 reused for the reading reply; no Chinese caption reveals the required order.

### B1L05-G03-P118 — suggestions
- Mistakes: turning an offer or recommendation into a factual question, and failing to recognize an invitation as a shared suggestion.
- `p.118 #1`: recommend the cheaper pictured pen; 吧 makes that recommendation, while 嗎 would ask whether the listener buys it.
- `p.118 #2`: offer a warming drink in response to the cold day; 吧 makes the offer, while 嗎 asks about drinking.
- `p.118 #3`: invite the hungry friend to eat together; 吧 makes the shared proposal, while 嗎 asks a question.
- Each task fixes the speaker's communicative intention; the Chinese context contains neither answer particle. No guessing use of 吧 is introduced.
- Crops: p.118 pens with both prices, steaming cup with saucer, and food counter with its sign; each drawing appears separately.

### B1L05-G04-P124 — precise location
- Mistakes: reversing above/below, confusing beside/behind and inside/outside, and describing another person's action.
- `p.125 #1`: the book rests on the tabletop, selecting 上面 over 下面.
- `p.125 #2`: the two labelled brothers stand side by side, selecting 旁邊 over 後面.
- `p.125 #3`: the reader shares the interior with the bed, selecting 裡面 over 外面; the action remains after the place.
- `p.125 #4`: the foreground boy labelled 小明 has his head down and a sleep bubble, selecting 睡覺 over the other people's 看書; the printed directional phrase remains in the answer.
- Crops: the four p.125 drawings separately; retain the brother labels and 小明 label because they identify the referents.

### B1L05-G05-P126 — existence
- Mistakes: confusing presence with absence and transferring a location answer to a question about a place's contents.
- `p.126 #1`: added enrolment of exactly 1,000 fixes the open answer; 有 states that count, whereas 沒有 denies it.
- `p.126 #2`: the learner's only neighbours are two schools, ruling out a neighbouring drink shop and selecting 沒有.
- `p.126 #3`: treat the pictured table as yours; its visible book selects 有 over 沒有.
- Each answer keeps place first and uses a real positive/negative existential pair; no invented 不有 distractor.
- Crop: reuse the p.125 tabletop drawing for #3. The enrolment and neighbourhood situations are added learner context, not claims printed in the book.

## Issues
- None found in the authored items during source and structural review.

## Unsure
- The linked prototype could not be opened by the web tool; visual parity with it is unverified.
- App rendering and automated vocabulary/content gates remain unverified under the no-npm restriction; no progress-recording activity was used.

## Review

Codex, 2026-10-16. Verdict: PASS (source/content review and standalone structural checks; npm gates not run). This section supersedes the affected design notes and earlier “None found” finding above.

### Flag verdicts and edits

- `l05-g01-book-2` — ACCEPT. Removed the added `她在家` clause from the reply and its result/pinyin/English. The original bedroom picture now decides 在/不在.
- `l05-g02-book-2` — ACCEPT. Reading in a picture does not establish a preference or exclude listening to music; copying 在家 also misses the word-order decision. Changed to the existing `gaps: true` interaction: the completion supplies 我喜歡、家、看書 and the learner places 在 before 家. Removed 聽音樂, the reused p.116 picture and the role-play prompt; added repairs for each wrong position. Result sentence unchanged; the supplied completion is one model answer to the book's open question, not the only possible personal preference.
- `l05-g02-book-3` — ACCEPT the exercise-design issue; REJECT the BOOK-ERRATA label. The printed restaurant clause is legitimate dialogue context, not a textbook error. Kept that clause verbatim, supplied the negation, and changed the decision to placing 在 between 不 and 家. Added wrong-position repairs; result unchanged. The restaurant clue no longer answers the tested decision.
- `l05-g05-book-3` — ACCEPT the copied-有 issue; REJECT the implication that a clearly identified supplementary book crop is inherently invalid. Removed that crop because the revised item does not need it. Kept the printed question, supplied the model completion's table location and 書, and changed the decision to placing 有 between them. Added wrong-position repairs; result unchanged. The question supplies the word but cannot supply its position in the reply.
- Coverage assertion — ACCEPT. All 16 source entries remain, in book order, with their original instructions.

### Independent pass and additional edits

- `l05-g02-book-1` — Removed the copyable English translation and 買咖啡/喝咖啡 choice, whose answer repeated the question's verb. Changed to placing 在 before 咖啡廳 in the existing model reply; added wrong-position repairs. Result unchanged.
- `l05-g03-book-1`, `l05-g03-book-2`, `l05-g03-book-3` — Fixed the same punctuation giveaway in each: a printed full stop favoured 吧 over 嗎 before the communicative context was read. Each now supplies only 吧 and asks where it goes within the recommendation, offer or invitation. Added a repair for every wrong position and replaced the old particle-choice prompts/repairs. Pictures, book text, full stops and results unchanged. This tests the book's sentence-final placement rule without introducing the later guessing meaning of 吧.
- `l05-g05-book-1` — The independent pass found the same copied-有 weakness as #3. Changed to placing 有 after 我們學校 and before 一千個學生; removed the enrolment prompt and positive/negative choice, and added wrong-position repairs. Result unchanged; the number is a supplied model completion rather than an inferred fact about the learner's school.
- Rechecked the remaining seven items: picture-led location/direction/action choices, the explicit confirmation question, and the school-only neighbourhood context each decide one offered answer. 有 in the neighbourhood question does not select the negative reply; its context does.
- All eight position items have exactly one accepted gap and a repair for every other gap. One-word docks use the skill's explicit position-testing exception: wrong placements replace distractor words. No new Chinese vocabulary, later grammar, book items or answer sentences were introduced.

### Verification and limits

- PASS — Python JSON parse; 16 source entries in exact order; original instructions; unique IDs; one accepted gap/fill per item; exact result reconstruction; tile limits; complete wrong-option/wrong-gap repair coverage.
- PASS — Manual comparison with the supplied p.116–126 scans, lesson transcript and grammar scope; checked each offered fill/position for a second valid answer and copied-answer clues.
- SKIPPED — Skill export/validation/tests and verify-change content validation: the owner explicitly prohibited npm. Generated packs were not edited. Rendering and automated vocabulary gates remain unverified.
