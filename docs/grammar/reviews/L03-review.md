# L03 final review — Codex, 2026-10-16

Verdict: FIXES NEEDED

## Checked

- Transcript against all ten supplied scans: pp.73–76, 81–86; grammar, tables, numbered examples, exercise tokens, pictures, printed pinyin and English.
- All five grammar pages, their embedded PART copies, all 21 original page questions and all 14 original practice items; scope list and grammar-author rules.
- Static checks: three JSON files parse; embedded pages match; nine retained page drills have one blank and short docks; eleven retained practice items have one accepted fill/order, matching feedback sentences and valid repair references; 79 tokenized sentence records reconstruct exactly.
- npm export/validation/tests: SKIPPED as instructed; no command failures claimed. Runtime/schema and UI checks: not run.

## Issues

Flag decisions (all flags resolved or qualified):

- **Accept:** `g2-question-1` / `g2-cue-1` reverse the pictured gift. Corrected the cue to boy → Dad; removed the forced drill with the other G02 ordering drills pending engine support.
- **Accept:** `g5-confusion-dou-bu` labels grammatical Chinese wrong. Reframed the question explicitly as expressing “none of us wants to”; explained the meaning difference rather than banning 不要都.
- **Accept:** `g4-confusion-de-dropped`, `g4-question-4/5/6` wrongly ban optional 的. Removed the false clarifier and the invented example-derived drills; retained the book examples and optional-的 table.
- **Accept:** `g4-question-1/2/3` have grammatical distractors and are not the book exercise. Removed; kept their source sentences as examples.
- **Accept:** `g4-question-7/8` reject valid preferences. Removed those competing preference tiles; fixed each labelled model's adjective and tested only 的. The book's open prompts have no official preference key.
- **Accept:** G02/G05 multi-blank page drills and `l3g1-p2` ask too much. Removed forced legacy ordering drills; G05 uses existing chat-build with short groups; G01 now asks only for 本 in a fixed model answer.
- **Accept:** every listed overlong page tile. Shortened the retained drills to grammar words or removed the forced drill; no retained tile exceeds four characters.
- **Accept:** `l3g3-p3` glosses 個 as “kind”. Changed the model to 這種筆 with matching English, preserving the book's question and a pictured item.
- **Accept:** `b1l03-g04-sec-3` invents 紅色的. Replaced it with the printed cake reply.
- **Accept:** `l3g3-p1` uses 都 before G05; G02 practice also uses untaught 都 traps. Removed these uses.
- **Accept:** `l3g3-p2` repairs a measure word outside its slot. Moved the slot to 朵; the repair now matches the learner's decision.
- **Accept:** `g5-repair` ends a question with 。. Restored ？ and the pinyin question mark.
- **Reject normalization:** xǐhuān follows these scans. Do not silently impose L02's neutral-tone convention.
- **Partly accept transcript-gap flag:** restored supplied p.76; pp.77–80 were not supplied. Missing transcription alone does not prove their vocabulary is untaught.
- **Qualify “no pinyin errors”:** sentence sandhi matches the scans; the 啊 glossary used neutral a where p.73 prints ā, now corrected.

Additional findings:

- G04 tables contained extra rows made from examples; removed those rows, restored book table English and subsection numbering, and softened compulsory-omission language.
- G01 clarifier invented 我有兩本書; now re-shows the printed new-classmate reply. G02/G04 repair pairs changed extra words or person; now preserve the printed sentence and isolate the error.
- G04 discovery repair translated 他 as “I”; corrected. G02/G05 table English paraphrased printed English; restored it.
- `l3g5-p2` said to end with 是; replaced the incorrect repair. G05 practice traps now target statement/meaning context rather than an acceptable emphatic 是 or unrelated 好.
- G02 item 3's picture does not label 我 versus 英國同學; its single viewpoint key was unsupported. Removed with the other G02 items; see needs file.

## Fixed

- Transcript omissions: p.73 vocabulary, p.76 dialogue, p.86 reading. Distinguished printed example pinyin from editorial additions.
- Clear language, scope, answer-key, tile, table and repair defects above; synchronized embedded page copies.
- Existing slot-build fits fixed model completions; chat-build fits G05 rearrangement. G02's complete-sentence assembly is forced under the short-order/one-decision rule and is deferred, not rewritten as a different task.

## Unsure

- Engine gaps leave G01 with two practice items and G02 with none; the skill's 3–5-item target is not met. No invented replacements added.
- pp.69–70 and 77–80 were not supplied: bundled Dialogue 1 and Dialogue 2's printed pinyin/English cannot be certified. Retained them; p.76 verifies Dialogue 2's Chinese. Glossary-only 愛、看書、一些 still need their earlier source pages.
- Empty legacy question arrays and the omitted G02 practice block need the repository gate once npm runs are permitted.
- This task explicitly requests practice fixes, overriding the skill's general practice-edit pause; no redesign outside these named files.

## BOOK-ERRATA

- p.73 “when there is a measure word used”; p.74 “the other one is direct object”; p.81 the wording about two; p.83 “Nouns, mentioned previously”; p.84 “in Chinese sentence”: awkward source English, preserved in the transcript.
- p.84 “Both (All) of us bought pens.” supplies past time absent from 我們都買筆. Retained the printed English; it must not imply 都 marks past tense.

## NEEDS-ENGINE

- See [L03-needs.md](L03-needs.md): printed two-flower picture and G02 gift-ordering frames/pictures. Four book items remain omitted from practice.
