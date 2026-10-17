# L05 final review — Codex (GPT-6), 2026-10-16
Verdict: FIXES NEEDED

## Checked
- Transcript against all eight supplied scans: pp.116–119, 124–127. Existing grammar transcription agrees; missing p.119 and p.127 added, including the stage direction and simplified reading.
- Both page JSON files, including bundled copies: 12 printed table rows, 18 numbered examples, labs, clarifiers, cues, all 16 legacy questions; scope checked in book order.
- Item decisions (source → legacy item; all retained):
  - p.116 #1 → g1-q1: library, 在; #2 → g1-q2: bedroom, 不在. p.117 #3 → g1-q3: ask 哪裡; a 嗎 question is also possible in the original open blank.
  - p.117 #1–3 → g2-q1–3: sample café answer, sample home activity, restaurant continuation. Short 在/不在 choices preserve place-before-action order.
  - p.118 #1–3 → g3-q1–3: cheaper pen, hot drink, shared food plan. Keep each sample suggestion whole; choose final 吧.
  - p.125 #1–4 → g4-q1–4: 上面, 旁邊, 裡面, 睡覺. Each picture decides one short choice; #4 correctly asks for an action.
  - p.126 #1–3 → g5-q1–3: sample quantity with 有, sample negative 沒有, sample table contents with 有. Personal facts remain explicitly labeled sample answers.
- Static checks PASS: JSON parses; bundled copies match; source alignment and text-token reconstruction match; one blank/item, 2–3 tiles/item, maximum two characters/tile; all source labels present. `git diff --check` PASS.
- npm export/validation/tests SKIPPED: explicitly forbidden. No claim of full gate completion or UI verification.

## Issues
Second-model flags, adjudicated:
- g1–g5 exercise titles: ACCEPT; restored all printed instructions.
- g1 instruction/preview: ACCEPT; removed misleading particle-only instruction and nonexistent pin interaction.
- 星期 tone: REJECT mandatory change. Supplied L5 scans print no 星期 pinyin; p.54 is not supplied. Repository decisions explicitly recognize Taiwan 期 qí. Retained pending printed evidence.
- 喜歡/朋友 tones: REJECT mandatory change. Transcript readings are labeled “added,” not printed; they cannot establish the book’s neutral-tone convention. Retained existing readings pending evidence.
- g1-q3 嗎 distractor: ACCEPT; removed the acceptable whole-question distractor.
- g1-confusion-negative: ACCEPT; replaced the grammatical 不是在 contrast with an actual 不 placement error.
- g3-confusion-forgot-ba: ACCEPT; removed the false error. Suggestions can omit 吧.
- g5-q2 不在 answer / g5-q3 fronted book answer: ACCEPT; both can answer the original questions. Replaced whole-answer marking with short grammar gaps.
- g5-confusion-zai-vs-you: ACCEPT; removed the grammatical “wrong” sentence and unsupported known/new information rule, including its contrast block.
- Long answer tiles: ACCEPT for every listed item. Also fixed g3-q2’s weak/malformed options. All 16 items now make one short choice.
- Invented discovery labs: ACCEPT; labs now show only printed table/example sentences.
- Dialogue verification concern: PARTLY ACCEPT; all seven D02 spoken lines match p.119 and are now transcribed. D01 remains unverified; see Unsure. 跟 in D02 is printed conjunction use, not grounds for deleting source text.
- Coverage claim: ACCEPT for the 16 legacy questions only; no native L05 practice file exists.

## Fixed
- Extra table rows removed: g1-p3, g2-p3, g3-p2/p3. Printed g4 (1)/(2) tables remain separate.
- Restored printed English in g2’s first row, g3’s table, and all three g5 rows.
- Removed false claim that direction words always need an explicit noun; removed grammatical 書在上面 as a supposed error. Clarifier right-hand text now traces to printed sentences/clauses.
- g3 explanation no longer equates every suggestion with “let’s.” Removed invented g4 contrast sentences.
- Removed Part 2 房間 from Part 1 glossary/exercise completion; the pictured home is expressed with taught 家.
- Updated standalone and bundled page objects identically; original book prompts and item order retained.

## Unsure
- `content/grammar-practice/lessonFive.json` is absent. The skill pauses creation/editing of practice files; only existing legacy questions were repaired. Per repository decisions these legacy questions are unmounted, so this is not a completed native practice pass.
- Native format fit: existing slot-build fits picture/closed items; slot-reels better fits personal answers on p.117 #1–2 and p.126 #1–3. Migration belongs to the paused practice pass; no new engine kind is required, no book item was dropped, and no NEEDS-ENGINE entry is warranted.
- D01 pp.112–113 and claimed parallel D02 pages 120–121 are outside the supplied scans; left unchanged. p.127’s reading is transcribed, but these two JSON files contain no reading object to review.
- Exact printed pronunciation conventions for 星期/喜歡/朋友 need vocabulary/pinyin pages or official audio. Added transcript pinyin is not visual verification.

## BOOK-ERRATA
- p.118: printed English joins two statements with a comma: “This cake is too large, you had better buy the small one.” Preserved.
- p.126: “there is/are something on a place” is awkward English; “in a place” is idiomatic. Chinese and table meanings are clear.
