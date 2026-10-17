# L03 exercises — Codex, 2026-10-16
Verdict: PASS (authoring and local structural checks; npm gates skipped)

## Checked
- All 15 entries in `materials/book1/L03/exercises.json` retained once, with exact sources and order; five matching grammar page IDs and printed instruction titles.
- Chinese and exercise cues compared with the transcript, attached scans and both Lesson 3 grammar parts; scope checked against `.audit/grammar-run/scope.md` in part and book order.
- 18 items: 15 book items and three own items; 3–4 items per point, 2–4 tiles per dock, each at most four characters.
- Local Python checks: PASS for all 100 dock permutations, exactly one structural answer per item, a specific repair matching each of the 82 rejected arrangements, result reconstruction, crop bounds and scan existence.
- Picture boxes are left/top/width/height fractions of the printed page; all 12 crops exclude surrounding exercise answers. Book p.74 #2 uses the two-book drawing from p.73 as added context for its open answer.
- Rearrangement items retain their complete book sentence: fixed text carries the long phrases, and only short grammar/role/count chunks move. Picture items use `slot-build`, which supports scenes; `chat-build` has no scene field.

## Design notes

### B1L03-G01-P73 — Measure words
Mistakes: miscounting objects, guessing a number instead of asking how many, using a general or flower classifier for books.
- p.74 #1: the woman has one flower in each hand, making 兩 uniquely correct among 一/兩/三; 幾朵 in the question does not reveal the missing number.
- p.74 #2: the learner explicitly wants the pictured books; the p.73 crop contains exactly two, making 兩 correct among 兩/三/五 without inventing a preference.
- p.74 #3: the printed reply remains 我有四本英文書; the task asks for an unknown count without guessing, so 幾本 is appropriate and 四本 is a numerical guess, not the requested question.
- own: the earlier printed sentence 我有五本中文書 tests 本/個/朵 without a dialogue line exposing the classifier.
Crops: p.74 `[0.645, 0.410, 0.135, 0.113]`, woman and both flowers; p.73 `[0.647, 0.627, 0.167, 0.054]`, the two books only.

### B1L03-G02-P74 — 送 + receiver + gift
Mistakes: reversing giver and receiver, placing the gift before the receiver, counting a cake or book with the wrong classifier.
- p.75 #1: the child visibly gives the father the book; third-person narration fixes 他 as giver and 爸爸 as receiver, while the male adult rules out 媽媽.
- p.75 #2: speaking as the boy fixes 我; his pictured girl and cake require 想 + 送 + 她 + 一個 before 大蛋糕, while 一本 counts books.
- p.75 #3: the learner speaks as the woman and the man is explicitly her British classmate; this fixes 我送英國同學一本中文書 rather than reversing the two people, and the book takes 一本.
No own item: the book already tests these role, wanting and classifier contrasts.
Crops: p.75 `[0.172, 0.515, 0.168, 0.133]`, father and child; `[0.426, 0.508, 0.168, 0.137]`, boy and thought bubble; `[0.691, 0.513, 0.176, 0.137]`, woman and man exchanging the gift.

### B1L03-G03-P81 — 這 / 那 / 哪
Mistakes: copying another speaker's demonstrative without changing perspective, confusing an unknown choice with a known reference.
- p.82 #1: the printed question keeps 這, but the shirts are beside the friend and far from the replying learner; only 那 fits the reply.
- p.82 #2: the printed question keeps 那, but the learner is beside the flowers and the friend is distant; only 這 fits the reply, with the printed count 四 preserved.
- p.82 #3: the picture supplies the possible things, while the prompt fixes the learner's choice as the pen beside them; 這種 fits and 那種 would refer to a distant kind.
- own: the printed tea question asks for an unspecified kind without suggesting one; 哪 asks for that choice, while 這/那 already select a kind.
Crops: p.82 `[0.202, 0.246, 0.162, 0.064]`, three shirts; `[0.397, 0.248, 0.210, 0.057]`, four flowers; `[0.659, 0.220, 0.202, 0.095]`, the complete assortment.

### B1L03-G04-P82 — 的 as modifier and noun replacement
Mistakes: using a predicate description as the object of 喜歡, omitting 的 with an omitted noun, using 很 instead of 的 before an overt noun.
- p.84 #1: the prompt selects the left-hand gift, which is visibly larger; 大的 is correct and 小的 names the other gift, with both choices retaining the required 的.
- p.84 #2: the prompt selects the right-hand book, which lacks the new book's sparkles; 舊的 is correct and 新的 names the left book. 舊 is the book's printed gloss, included in `allowWords` and the item glossary.
- p.84 #3: the decorated cake and printed 好看 cue fix the intended referent; after 我喜歡, 好看的 names the omitted cake, whereas 很好看 is a predicate description. Neither option exposes the answer through length or the printed cue alone.
- own: the printed 我喜歡漂亮的花 retains 花, testing the modifier 漂亮的 against the equally short predicate 很漂亮; the book items test omitted nouns instead.
Crops: p.84 `[0.173, 0.259, 0.166, 0.065]`, both gifts; `[0.411, 0.262, 0.171, 0.061]`, both books, with 舊 shown separately as the printed glossary; `[0.635, 0.264, 0.194, 0.049]`, both cakes.

### B1L03-G05-P84 — 都
Mistakes: putting 都 after the predicate, losing 是 before a noun identity, confusing 都不 with 不都.
- p.85 #1: every pen costs a lot, so the complete group takes 都 before 很貴; 不貴 contradicts that context.
- p.85 #2: every one of the printed four people is a classmate, requiring 都 before 是 and excluding 不; the printed count 四 is preserved.
- p.85 #3: both people visibly dislike the tea, requiring 都 before 不; reversing them gives 不都, and selecting the 不都 trap before 不 would leave someone who likes it.
No own item: these three book items already test placement, identity and negative scope.
Crop: p.85 `[0.594, 0.392, 0.290, 0.103]`, both people and their tea.

## Issues
- Replaced the previous partial practice file: restored missing book items, sources, picture context and printed quantities.
- Open preferences and role ambiguities receive short learner-facing English context; the drawings alone do not establish personal taste, narrator identity or nationality.
- `allowWords` contains only printed exercise words; no later-part vocabulary is introduced into Part 1 and no post-L3 pattern is required.
- npm export, content validation and tests: SKIPPED, explicitly prohibited by the task; no npm command was run and no generated pack was edited.

## Unsure
- The prototype URL returned an access error, so visual parity could not be checked; the written exercise rubric was used.
- Crops were checked against the supplied full-page scans; app rendering and generated-pack integration were not run in this content-only pass.

## Review
Codex, 2026-10-16 — PASS for source/content review and local checks; npm gates skipped by instruction. This section supersedes the earlier descriptions and counts for the three 都 items.

### Flag verdicts
- `l3-g3-book-3`, simplified question — ACCEPT. Changed `你想买哪种東西？` to `你想买哪种东西？`. The flag's diagnosis names 種, but 種 was already simplified to 种; the actual remaining traditional characters were 東西.
- `l3-g3-book-3`, nearby pen prompt — ACCEPT. Changed “choose that kind” to “choose this kind”, matching the nearby pen and 這種.

### Independent pass and edits
- Reviewed all 18 items against the supplied scans, transcript and scope: one intended answer under the stated task, no answer copied from a dialogue cue, and no later grammar required. All 15 book exercises remain in order, with their printed questions/instructions and complete resulting sentences retained.
- `l3-g5-book-1` — removed the easily eliminated 不貴 trap and the second decision about 很貴; fixed the printed description and used existing `gaps: true` placement of 都. Added a gap before the subject, before 很, between 很/貴 and after 貴; only the gap before 很 accepts 都. Replaced repairs and updated the prompt/fallback to test placement.
- `l3-g5-book-2` — removed the syntactically obvious 不 trap and fixed 是我的同學; used the same 都-placement interaction, with gaps before the subject, before 是, after 是 and after 我的同學. Only the gap before 是 accepts 都. Replaced repairs and updated the prompt/fallback.
- `l3-g5-book-3` — removed the compound 不都 trap, which could create an extra negative, and fixed 不喜歡喝這種茶. Added gaps before 他們, before 不, after 不, after 喜歡喝 and after 這種茶; only the gap before 不 accepts 都. Retained the book picture and added “Make clear that neither person likes the tea” to distinguish the required meaning from the weaker 不都. Replaced repairs/fallback: 不都 does not by itself guarantee someone likes the tea; it only denies that everyone does.
- Other 14 items unchanged: numeric options require counting the picture; receiver/giver order requires the pictured roles; demonstratives require the stated speaker distance; 的 contrasts test noun modification/replacement. The unknown-count question explicitly requests a count rather than an echo/guess, and the tea question requests an unspecified choice.

### Verification
- PASS — JSON parsing, unique IDs/tiles, tile limits, five groups, 15 book sources in order and three own items.
- PASS — all 95 complete dock/gap arrangements enumerated: exactly one structural answer per item, specific repairs for all 77 rejected arrangements, and traditional/simplified result reconstruction. Linguistic uniqueness was reviewed separately against the context.
- PASS — only the two task-authorized files edited; no generated files changed.
- SKIPPED — npm export, validation and tests, explicitly prohibited; no npm command run. App rendering and generated-pack integration remain unchecked.
