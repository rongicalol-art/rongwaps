# L06 final review — Codex, 2026-10-16
Verdict: FIXES NEEDED

## Checked
- Transcript against all 11 supplied scans; p.142–145 inspected locally to adjudicate pinyin, English and vocabulary flags.
- Both grammar JSON files: four pages, both embedded copies, six printed tables, 24 numbered example dialogues/sentences, labs, contrasts, clarifiers, glossary tokens and all 24 exercise items.
- Scope list; grammar-author rules; grammar template; scoped content rules. Read vocabulary pack only to confirm prior teaching: 渴 B1L04-1-10, 玩 B1L03-3-02, 聽/音樂 B1L05-1-04/05. 上網/電腦/手機/應該/運動 are printed L6 Part 2 vocabulary (p.144).
- `content/grammar-practice/lessonSix.json` is absent; not created under the skill’s practice pause.
- Retained exercises: p.146 #1–3. Removed forced exercises: p.136–140 #1–3 on each exercise page; p.147–148 #1–3. Every disposition is in L06-needs.md.

## Issues
- `lessonSixPartOne.json:G01/G02`, `lessonSixPartTwo.json:G04` — open replies forced into whole-clause choices, without support for their pictures or personal answers; removed 21 items and recorded restoration requirements. Existing slot-build/slot-reels fit the intended interactions, but the legacy inline schema cannot select those kinds. No engine changes authorized.
- `lessonSixPartOne.json:g2-q5` (p.138 #2) — sweating, sleepless picture contradicts 很好; removed, poor-sleep cue required on restoration.
- `lessonSixPartTwo.json:G04` — six synthetic table rows were not printed tables; removed. All six printed dialogues remain as examples in their two source subsections.
- `lessonSixPartOne.json:G02` — two table sentences duplicated as numbered examples; removed duplicates and their subsection references. Twelve printed numbered examples remain.

## Fixed
- Transcript: grammar tables, numbered examples and blanks match; added omitted p.135 vocabulary, p.141 dialogue and p.149 reading; transcribed verified p.142 pinyin/English. Fixed added 不買 pinyin; read 上映中; corrected can/sofa/restless-sleep picture descriptions.
- G03 p.146 #1/#2/#3: keep the full sentence, one blank, a four-character model fill and one inversion trap; removed five-character traps. Models are labelled app answers, not book keys. No clause-building or invented later grammar.
- Replaced invented positive lab/clarifier/contrast examples with printed sentences; removed correction labs that invented source examples, including the acceptable 我去可以嗎. Added the source subject to the 得 sentence spine.
- Corrected G02 subsection 3 to subject → object → verb; restored the book’s heading. Reused source sentences in the clarification answers.
- Removed unused glossary entries, including later-point words from earlier pages. Synced page objects with embedded part copies.

### Second-model flags: decisions
- 喜歡 — ACCEPT neutral 歡 from p.135 (also p.143–144); fixed all occurrences. REJECT claim that p.146 prints pinyin: it does not.
- 朋友 — REJECT neutral 友 requirement: p.135 and p.145 print péngyǒu. Kept the book tone.
- 漂亮 — REJECT neutral 亮 requirement: p.144 prints piàoliàng; p.146 has no printed pinyin. Kept the book tone.
- 牛肉麵 / 每天 — ACCEPT inconsistency; normalized niúròumiàn and měi tiān (latter printed p.144).
- 沒關係 — ACCEPT spacing cleanup to méi guānxi. REJECT claimed p.147 pinyin evidence; that page prints none. Word spacing is editorial here.
- D01 “can not” — REJECT as a definite grammatical error; “cannot” is preferred spelling, but the source English is unavailable. Preserved pending source check.
- D01 跑得很慢 / “run slowly” — ACCEPT missing intensity; defer any English edit until p.132 is available, because printed English must stay printed.
- D02 “those two days” / trailing “often” — ACCEPT awkward English, but p.142 prints both verbatim. Preserved; BOOK-ERRATA below.
- G02 “before the topic” — ACCEPT; fixed to “after the subject and before the verb.”
- 他得喝很多 / 他得吃很多 — ACCEPT ambiguity with děi; removed with their forced items.
- 在家可以看電視 — ACCEPT valid order; removed unfair item.
- 去洗手間可以嗎 — ACCEPT valid question; replaced false clarification with actual 可以 misplacement.
- G04 會 distractors — ACCEPT future-reading ambiguity; removed affected items, without teaching L10 future 會.
- 房間是有點兒小 — ACCEPT valid emphasis; removed false clarification.
- “No wrong accepted answer” — REJECT: g2-q5’s 很好 contradicts p.138’s sleepless picture; removed.
- All flagged long tiles — ACCEPT; removed affected clause items; shortened G03 to ≤4 characters. No dock exceeds six tiles.
- g4-q6 two decisions / clause-sized answers — ACCEPT; removed rather than split the printed item into fabricated independently numbered questions.
- Invented exercise titles / G01 instruction mismatch — ACCEPT; replaced with printed instructions. G02/G04 each span two differently worded printed instructions, both retained in exerciseInstruction.
- g2-repeat / g3-tired / g3-size — ACCEPT invented wording; replaced with source sentences. Also fixed unflagged G03 contrast and synthetic G04 tables.
- D01/D02 absent from transcript — ACCEPT; added verified D02. D01 cannot be transcribed from missing scans.
- D01 comprehension — ACCEPT weak causal inference; now asks how she runs, directly matching the existing line rather than claiming that slowness caused her refusal.
- 應該 / internet-computer-phone-exercise/music scope — REJECT later-lesson suspicion: p.141 prints the dialogue; p.144 teaches 應該 and the Part 2 words; 玩/聽/音樂 were taught earlier. Pruned unused entries from grammar-page glossaries.
- Neutral-tone uncertainty — resolved per the actual scans above; no blanket neutralization.
- “He cooks good beef noodles” — REJECT as an English error; it is natural and printed. Kept; noted only its compressed degree meaning.

## Unsure
- Dialogue 1 Chinese, pinyin and English remain unverified: p.131–132 are absent locally and were not supplied. Do not claim its English is corrected against print.
- Restore the 21 removed book items after the interaction wiring/practice pause is resolved; see L06-needs.md. This prevents a PASS verdict.
- Targeted Python checks PASS: both JSON files parse; embedded pages match; all 24 numbered examples and 12 table rows trace to the transcript; subsection references resolve; three retained items have one blank, ≤4-character tiles and a wrong tile; token surfaces reconstruct exactly.
- npm gates SKIPPED: explicit user prohibition. No export, generated pack changes, browser or progress-writing checks.

## BOOK-ERRATA
- p.142: “those two days” for 這兩天 misleads; “these days” matches the Chinese. Printed English preserved.
- p.142: internet/computer/phone advice ends awkwardly with “often.” Printed English preserved.
- p.139: “He cooks good beef noodles.” compresses 很不錯; natural English, not a correction request. Printed English preserved.

## NEEDS-ENGINE
- NEEDS-ENGINE: restore p.136–140 and p.147–148 book items with short grammar decisions, personal-response handling and the actual source pictures; individual interactions are specified in L06-needs.md.
