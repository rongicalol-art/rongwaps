# L02 review — GPT-6, 2026-10-16
Verdict: FIXES NEEDED

## Checked
- Transcript against all eight supplied scans: pp.54–57, 60–63; corrected before JSON review.
- All six grammar pages: 12 pattern rows, 18 numbered examples, glossaries, labs, clarifiers, and 18 original exercise items; repeated Part copies checked too.
- All 18 practice items against the source, L1–L2 scope, wording, pinyin, English, alternatives, tile limits, distractors, and interaction fit. Fifteen retained; three deferred.
- Applied grammar-author and verify-change; npm gates skipped by explicit task instruction.

## Issues
Disposition of `.audit/grammar-run/L02-flags.md`:
- REJECT — 星期 → xīngqī throughout: p.54 actually prints xīngqí; the table prints no pinyin. Its transcript xīngqī was explicitly added, not source evidence. Preserve the printed reading.
- REJECT — 喜歡 → neutral xǐhuan on pp.60–61: both scans visibly print xǐhuān, as does p.62. Corrected the transcript and inconsistent neutral-tone lab/practice readings instead.
- ACCEPT consistency / REJECT source claim — `g04-glossary-29`: normalized 二月二十四號 to èr yuè èr shí sì hào; this exercise has no printed pinyin.
- ACCEPT — `g6-question-1`: 熱嗎 is grammatical; removed the picture-dependent item pending engine support.
- ACCEPT — `g6-question-3`: both rejected questions were valid; replaced the long answers with one 要不要 slot before fixed 去他家 and malformed distractors.
- ACCEPT — `g6-confusion-match-reply-word`: 去不去 is valid; removed the false rule and its invented model sentence.
- ACCEPT — `g3-confusion-shi-vs-you`: 她是台灣朋友 is grammatical; changed the contrast to an erroneous 是/有 blend, retaining the printed right sentence.
- ACCEPT — `g4-confusion-keep-de`: 你手機很新 is possible; replaced the absolute omission claim with a misplaced-的 contrast.
- ACCEPT — `l2g05-p1`: removed 我不吃水果 from this explicit want/do-not-want model; also avoided using that grammatical response as a wrong tile.
- ACCEPT — `l2g03-p2`: 水 repair targeted the wrong slot; corrected it, then deferred the item for its unsupported picture.
- ACCEPT — `g6-pattern-2`: restored printed “Do you eat?”.
- ACCEPT — `g04-glossary-2`: changed 我們 to “we; us”.
- ACCEPT — removed glossary entries 想法 / 動作 / 肯定; labels do not teach these as vocabulary.
- ACCEPT — `l2g01-p1/p3`, `l2g02-p3`: reduced each model to one choice; also fixed unflagged `l2g02-p1`, `l2g03-p3`, and `l2g05-p3`.
- ACCEPT — `l2g04-p3`, `g4-question-3`: two independently open noun blanks need a different interaction; deferred.
- REJECT as errors — singular/plural 朋友 and “America”/“the United States” are valid translation choices; aligned the repeated g6 friend gloss for consistency.

Additional findings:
- `transcript.md`: missing p.57 dialogue and p.63 reading; printed romanization mislabeled “added”; 喜歡 / 不愛 / 先生 readings needed scan corrections.
- Both grammar JSONs: many entire-sentence tiles exceeded four characters. Shortened every retained dock; restored source exercise titles and app-model labels.
- Part 2 G6: three merged columns obscured the printed four-column table; restored subject / verb / 不 / verb and source English. G1/G2/G4 printed table English restored; table labels use standard terms, with Vaux confined to notation.
- Clarifiers: removed invented Sunday model, false negation-scope claims, and future existential glosses for 有/沒有. Rights now reuse printed sentences or their printed optional-是 variants.
- Practice G6 item 2: 要不要 can fit the reply; replaced it with a malformed 喜歡 pair. Removed unwarranted date-expression allowWords and unused picture allowances.

## Fixed
- Applied the content/transcript fixes above; kept repeated standalone/Part page objects identical.
- PASS: all three JSON files parse; 15 retained practice items each have one slot, ≤6 tiles, ≤4 characters per tile, and traditional/simplified results for every accepted answer.
- PASS: six pages, 18 examples, 15 retained page drills; token text reconstruction, unique IDs per page, short docks, accepted tiles, and repeated Part equality.
- SKIPPED: `npm run content:export && npm run content:validate && npm test -- tests/content tests/unit/grammarPracticeCheck.test.ts` — task prohibits npm and generated-file edits; project gates were not run.

## Unsure
- Embedded Dialogue 1 cites pp.50–51, which were not supplied; unchanged and not source-certified here. Dialogue 2 Chinese matches p.57; its pinyin/English would require p.58. The p.60 note refers to unsupplied p.68.
- Engine work remains; this is not a release-gate PASS.

## BOOK-ERRATA
- p.54: “The numbers from 1 to 6 follow 星期 …” has awkward English; “16th, May” is unusual date wording. Printed table English preserved.
- p.55: “time of event is always precedes the verb” is ungrammatical.
- p.61: “Auxiliary verbs … always precedes” has subject–verb disagreement.
- p.62: “by ‘positive-negative’ way” lacks an article.
- Printed xīngqí, xǐhuān, and xiānshēng are source readings, not silently corrected errata.

## NEEDS-ENGINE
- See `L02-needs.md`: p.56 phone picture, p.62 heat picture, p.60 two-blank owner/person completion; all three omitted from page and practice drills.
