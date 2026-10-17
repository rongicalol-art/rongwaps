# L01 final review — Codex (GPT-6), 2026-10-16
Verdict: FIXES NEEDED

## Checked
- All seven supplied scans against `materials/book1/L01/transcript.md`; corrected labels and added missing p.41 dialogue/picture text and p.46 reading, including simplified text.
- Both named grammar JSON files: all five tables, 15 numbered examples, labs, contrast checks, confusion items, legacy questions, token pinyin/English, and both stored page copies.
- All 16 original practice items against book order, instructions, pictures, L1 scope and the skill's 13 rules; eight retained, eight deferred below.
- Existing kinds: `slot-build` fits the retained blanks; the book asks for no rearrangement or independent sentence composition requiring `chat-build` or `slot-reels`.

## Issues
- G01 practice 1–3, G02 practice 1–3, G03 practice 3, G05 practice 3: required pictures unavailable in Practice; removed instead of substituting answer-giving text. See `L01-needs.md`.
- G01 question 2 / practice 4: two decisions; supply 姓 and choose 叫 before 中明, keeping the whole sentence.
- G03 practice 2: one printed blank was split into two; use single four-character nationality+嗎 tiles, with 臺灣人嗎 wrong because B explicitly corrects it.
- G04 practice 2–3: whole-reply tiles/two decisions obscured the target; supply the sentence frame or model reply and leave one choice.
- G05 practice 1: forced rearrangement; changed to `slot-build`, choosing 喜歡/不喜歡 in the supplied sentence.
- G01 table row 3 had five groups under three headings; regrouped to the book's three columns. G04 table now follows the printed two columns.
- G04 notes incorrectly required an earlier spoken question; the preceding statement supplies the question's topic. Corrected; lab 2 concerns a given name, not a surname.

## Fixed
- Second-model flags accepted: `l1g1-q1` removes acceptable 是; `l1g1-cf2` replaces acceptable 他是中明 with the actual surname/given-name error 他姓中明; `l1g5-cf1` replaces acceptable topic-fronting with the malformed 我愛是爸爸、媽媽.
- Accepted: `l1g3-p3` 可愛 is a possible reply; item deferred for picture/staged-turn support. `l1g4-p3` 很忙 is a possible elliptical reply; no longer offered as a wrong answer.
- Accepted: D01 `kěài` → `kě'ài` in both dialogue copies, adding the required syllable separator.
- Unresolved: the D01 `piàoliàng` flag needs the missing p.35 scan; p.39 supplies no printed sentence pinyin for 漂亮. Retained its existing tone rather than claiming an unseen source reading.
- Accepted: `爸爸、媽媽` exceeds the requested four-character tile limit; separate 爸爸 and 媽媽 alternatives now have their own full feedback sentences.
- Accepted: all flagged multiple-decision items corrected or deferred; also caught G01 practice 2–3.
- Rejected: D01 “She is very pretty.” is not demonstrably wrong; 很 can mean “very,” and p.39's gloss belongs to a different occurrence. Kept the existing translation without inventing unseen book English.
- Rejected: 宜文 is printed beside the pp.38–39 exercise in 王宜文; `allowWords` is page-wide. Removed the allowance only because the picture-dependent items using it are now deferred.
- Accepted: transcript `Yìnnǐ` was a transcription error; both printed occurrences read `Yìnní`.
- Contextual token sandhi corrected for 不是、不姓、不累; printed table English preserved, including “She is (very) pretty.” Model completions explicitly labeled.

## Unsure
- D01 pp.34–35 scans are absent locally and were not supplied; its Chinese, English and exact printed pinyin cannot receive a final source sign-off. P.41 confirms D02 Chinese; p.46 is transcript reference only, not an added grammar example.
- Open blanks have app-authored model completions, not a printed answer key. Supplied fills reduce each retained item to one decision.
- Picture-dependent coverage remains incomplete until the interactions in `L01-needs.md` exist.

## BOOK-ERRATA
- No confirmed factual error in the supplied scans. P.38 “equate two nouns,” p.40 “close to a yes/no question,” and p.44 “Complete or answer” are awkward wording; preserved. “Intransitive State Verbs” is the book's terminology, not a Chinese error.

## Verification
- PASS: JSON parsing; both page copies agree apart from the existing in-part-only `confusion`; every table row matches its heading count.
- PASS: current repository validators bundled in memory with esbuild, using authored L01 parts/practice and full-book context: `L01 validators with full-book context: 0 issues.`
- PASS: `Answer/feedback checks: 17 accepted fills, 8 rejected distractors; all match.` Every retained item has one slot and a real wrong tile.
- PASS: vocabulary gate reproduced against authored L01 examples and Book 1 vocabulary through L1: `Vocabulary gate: []`.
- Outside scope: `Unchanged other-lesson context: 15 issues (outside this review).` No other lesson edited.
- SKIPPED by explicit task instruction: npm export, validation and tests; generated packs untouched. No UI/progress testing performed.

## NEEDS-ENGINE
- Eight removed picture-dependent items; exact interactions and IDs in `L01-needs.md`.
