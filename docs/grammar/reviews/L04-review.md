# L04 final review — Codex, 2026-10-16
Verdict: FIXES NEEDED

## Checked
- Grammar transcript against supplied scans pp.95–99, 104–107; p.100 dialogue and p.108 reading added from the supplied scans. Vocabulary outside the grammar sections was not transcribed.
- All five grammar pages, tables/cells, examples, labs, clarifiers, legacy questions, pinyin and English; standalone objects against duplicated part objects.
- All 32 printed exercise subitems: 4 topic answers, 3 也 answers, 3 太…了 answers, 16 number/phone/quantity readings, 6 多 answers.
- Scope list, authoritative skill, template, current three practice kinds and scene union; every second-model flag adjudicated below.
- Practice file: absent; no independent practice items exist to review.

## Issues
- `lessonFourPartOne.json`: open topic/也 exercises were forced into noun/whole-clause tiles, with copyable answers and missing/ambiguous traps. Removed those unmounted legacy questions. `slot-reels` fits; migration pending the practice pause (see needs file).
- `lessonFourPartTwo.json`: the number exercises sampled 3/16 items and used long full-answer tiles. Removed the forced sampling; all 16 source prompts listed in `L04-needs.md`.
- `lessonFourPartOne.json` / `lessonFourPartTwo.json`: picture exercises used captions instead of pictures, several cue pinyins revealed the answer. Removed picture-dependent legacy questions and answer cues; needs file specifies every crop/interaction. Text-only p.99 #3 retained with a short, taught-form contrast; its title requires 太…了, so 很好喝 does not satisfy that instruction.
- Remaining coverage/3–5-item targets are unmet. Empty legacy question arrays are deliberate review removals, not completed practice. No later grammar is needed for the retained material; no new `allowWords` were invented.

### Second-model flags

| Flag | Judgment / action |
| --- | --- |
| G4 13 missing readings | Accept; all 16 recorded for the proper reading interaction, sampled legacy set removed. |
| G2 咖啡也很好喝 marked wrong | Accept; natural additive response. Removed the distractor, then removed the forced whole-clause exercise for migration. |
| G4 一百五 repair | Accept clarification: it means 150. Repair now says so; it is wrong specifically for 105. |
| No pinyin errors / 學生 inconsistency | Reject blanket clearance. p.105 prints neutral xuésheng; glossary, tokens and examples now agree. p.96 prints bù yào; restored this in its quoted example and flagged the sandhi erratum below. |
| G1 #3–4 “more than one decision” | Accept the design problem, qualify the wording: one huge pre-filled list is actually a trivial copy action, while 都 is frozen. Removed; separate reels fit the printed open blanks. |
| Long tiles | Accept. All flagged questions removed rather than split into clause-building puzzles; retained tiles are ≤4 characters, docks ≤6. |
| G5 clock key invented | Accept uncertainty; remove 十二點多 key pending confirmation, not a claim that the scan proves a different hour. |
| G5 age question rewritten | Accept; remove replacement English prompt. Preserve original question/date dependency in needs. |
| 四多歲 = forties | Accept; wrong gloss and invalid option removed with age item. Forties would be 四十多歲. |
| 十多二點 / 八多塊 nonsense traps | Accept; removed with affected picture items. |
| G4 place-value cells dropped | Accept; restored all eight digit columns plus reading, all 11 rows. |
| G3 shirt might mean 太熱了 | Reject. The question asks about the garment; exposed midriff and a tight, short shirt support 太小了. Picture support still needs engine work. |
| Dialogues absent from transcript | Partly accept. Added and checked D02 Chinese against p.100. D01 pp.91–93 and D02 printed pinyin/English pp.101–102 were not supplied; not verified. |

## Fixed
- Transcript and G4: **90,000,000 / 九千萬**, not 9,000,000 / 九百萬. Both previous reviews missed this source error. Corrected reading, pinyin, glossary and reconstructed digit grid.
- Transcript: clarified tight-shirt picture; added p.100 stage directions/dialogue and p.108 traditional/simplified reading. Unclear clock readings remain marked, not guessed.
- G2: restored four separate printed tables, with distinct adjective/verb headers; preserved the book's two subject groupings. Labs/clarifiers now re-show full book sentences and printed English.
- G3: table 太好了！ restored to “Awesome!”; lab 太大了！ restored to “It is so big!”; misleading hot-drink trap removed.
- G5: examples and subsection references restored to printed order; neutral 學生 pinyin corrected throughout; printed dialogue ranges retained. Original exercise instructions restored across G1–G5.
- Clarifiers: removed false categorical claims that generic 蛋糕 cannot take 都 and that 二千 is inherently wrong. Replacement rights reuse printed sentences/readings; no new positive teaching sentence added.
- JSON parsing, duplicate-page equality, token/Chinese equality, table-column counts, retained tile lengths, canonical answer availability and all 11 numeric digit rows: PASS (Python static checks). `git diff --check` for both JSON files: PASS.
- npm export/validation/tests: SKIPPED by explicit task instruction; no command failure output exists. Runtime/schema compatibility and UI were not tested.

## Unsure
- Confirm p.107 clock hands; no exact hour asserted. Confirm whether p.99 desk-worker picture should cue 太忙了 rather than 太累了; prior key is not an official answer.
- D01 pp.91–93 and D02 pinyin/English pp.101–102 need their own source check.
- [Requested skill](../../../.agents/skills/grammar-author/SKILL.md): “do not create or edit any `content/grammar-practice/` file.” The file is absent; its migration stays pending under that explicit pause. This prevents a full exercise PASS.

## BOOK-ERRATA
- p.96: “The book and the pen, I have them both.” is awkward English; retained.
- p.96: printed bù yào conflicts with standard bú yào sandhi; source spelling retained in the quoted example.
- p.97: printed “and(I bought)” lacks spacing; retained. Past-tense English does not introduce completed-action 了 into the Chinese.
- p.99: “Complete the following questions” actually asks for answers; printed title retained.
- p.105: “express the number is in excess” is ungrammatical; explanation paraphrased, not quoted as corrected source text.
- p.106: “between ‘one’ and ‘zero’” means a fractional extra unit; ranges use open endpoints despite the printed ~ notation. Source table translations retained.

## NEEDS-ENGINE
- See [L04-needs.md](L04-needs.md): reading interactions, book-picture scenes, clock confirmation and a dated age interaction; existing-kind migration is listed separately.
