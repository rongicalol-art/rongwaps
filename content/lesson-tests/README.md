# Lesson tests (TOCFL-style)

Every lesson ends with a **Lesson test**: a 12–15 minute mini TOCFL built from this lesson and earlier ones.
Learners take it like the exam (no right or wrong until the end), see their results, then a **Fix round**
goes through every miss with the answer, pinyin, English and one line on why. This doc is the authoring
contract; the code that enforces it is named in each section.

## How a test runs

- **Order**: 聽力 Listening, then 閱讀 Reading, each opened by a section page. One question per screen (a
  paragraph's blanks share one screen). No going back; Next appears once the screen is answered.
- **Recordings** play on their own, **twice** (TOCFL Novice/Band A), as a flat disc with one dot per play.
  A dialogue plays its lines, then a **ding** and a pause, then the narrator's question, then the
  answers as "A … B … C …" (`src/screens/lesson-test/testAudioSequence.ts`). In the Fix round the
  recording plays once and the speaker becomes a replay button.
- **Results**: Listening and Reading tiles, time, and up to four "to fix" points (earlier lessons named).
  **Pass at 80%** (`LESSON_TEST_PASS`): the Test tab gets a crown and the card shows the best score. The
  test never locks anything; retakes are unlimited.
- **Fix round** (review honey tone): each missed screen again, answers checked, the reason shown.
- **Review deck**: a missed word the learner has studied comes back in the next review (the `lapse`
  option of `markCardReviewed`, owned by `src/utils/srs/reviewProgress.ts`); an unstudied word is only
  logged, never marked learned.
- **Saving**: the run is saved after every answer (`lessonTestAttempt`); closing the window resumes it.
  Results live in `lessonTestSlice` (local to the device for now; not yet cloud-synced).
- **Retakes**: each slot shows the version seen least; earlier lessons the learner missed weigh ×3 in
  review slots; answer letters are spread evenly over A/B/C (`src/utils/lesson/lessonTestPlan.ts`).

## Files

| What | Where |
| --- | --- |
| Authored tests | `content/lesson-tests/book-N/lessonNN.json` |
| Types | `src/types/lessonTest.ts` |
| Taught-word rule | `src/utils/lesson/lessonScope.ts` |
| Planner and scoring | `src/utils/lesson/lessonTestPlan.ts` |
| Screen | `src/screens/lesson-test/` (opened from the lesson window's Test tab) |
| Pictures | `src/assets/images/lesson-tests/<name>.webp`; briefs and tools in `scripts/assets/lesson-test-art/` |
| Audio | `scripts/audio/generateLessonTestAudio.py` → `checkStudioBatch.py` → `publishLessonTestAudio.ts`; receipt `content/audio/lesson_test_audio.json` |
| Pack | `npm run lesson-tests:export` → `public/data/lesson-tests/` (never hand-edit) |
| Checks | `tests/content/lessonTests.test.ts`, `tests/unit/lessonTestPlan.test.ts` |

## Shape of a lesson

`{ schemaVersion: 1, key: "b1l04", bookId, lessonId, band: "A" | "B", allowWords?, slots: [...] }`.
A **slot** is one position in the test: `{ id, part: "listening" | "reading", review?, versions: [...] }`.
Each slot holds **2–3 interchangeable versions** (same kind, same number of questions), so a retake
shows different questions. A `review` slot's versions practise earlier lessons.

Every question has: `id`, `key` (index of the right choice), `why` (one plain-English line, shown in the
Fix round), `focus: { zh, en }` (the "to fix" row), `lesson` (the lesson it practises), `wordIds`
(vocabulary card ids it tests; missed ones go back to review) and optional `grammarIds`. Chinese text is
always `{ traditional, simplified, pinyin, english }` with tone-mark pinyin.

### Books 1–2: TOCFL Novice / Band A (3 choices)

| Slot kind | TOCFL part | What the learner does | Notes |
| --- | --- | --- | --- |
| `hear-pick-picture` | Novice 聽力 1 · Band A 問答理解 | hears a sentence, picks one of 3 pictures | `lines` (usually one); a picture trio |
| `picture-hear` | Novice 聽力 2 · Band A 看圖回答 | sees one picture, hears 3 sentences | answers are spoken (`speaker: "N"`), shown as sound bars |
| `dialogue` | Novice 聽力 3 · Band A 對話理解 | short dialogue, ding, question, spoken answers | `lines` (F/M), `answerLine`; `printed: true` prints the answers (Band B) |
| `read-pick-picture` | 單句理解 | reads a sentence, picks a picture | the sentence is the question's `prompt` |
| `realia` | 看圖釋義 | a menu, receipt or notice; which statement is true | `transcript` = the exact writing in the picture |
| `scene-gap` | 選詞填空 | one scene picture, gap sentences (＿＿) | each question has `answer` (the full sentence); a reply line follows `——` |
| `paragraph-bank` | 完成段落 | paragraph with `{1}`…`{n}`, a word bank with one extra | `bank.length = blanks + 1`; each word used once |
| `reading` | 閱讀理解 | a message, notice or short passage, one question | `format`: `message` (last line is the signature), `notice`, `passage` |

Book 1 has about 7 picture questions out of 20; Book 2 is text and audio with no new pictures.

### Books 3–4: Band B (4 choices, text only)

`dialogue` with `printed: true` (and `plays: 1` for longer ones), `cloze` (a passage whose numbered
blanks each have 4 choices), `reading` with several questions.

### A 20-question Book 1 lesson (Lesson 4 is the model)

8 listening (2 hear-pick-picture, 2 picture-hear, 4 dialogue of which 2 review) and 12 reading
(2 read-pick-picture, 2 realia, 3 scene-gap, a 4-blank paragraph, 1 review reading).

## Content rules (enforced by `tests/content/lessonTests.test.ts`)

- **Taught words only**: every character must belong to words taught by this lesson (earlier books, this
  book's lessons up to this one, grammar example words, numerals). Book names and the few needed extras go
  in `allowWords`.
- **Every grammar point** of the lesson appears in every possible run; the review share is 15–45%.
- **One right answer, decided by the context.** Wrong answers are real taught words or facts from the
  recording, text or picture that are wrong *here* (the next price on the menu, the drink she turned down).
  Choices are about the same length; no choice repeats; the bank never lists answers in blank order.
- **TOCFL-like, never copied**: the saved mock exams (© SC-TOP) are a format reference only.
- **Pinyin**: tone marks, word-joined like the book (Wǒmen yào liǎng wǎn niúròu miàn.).

Quality gate before a lesson ships: two blind solvers agree on every key and find no second defensible
answer; a solver given only the choices (no recording or text) does no better than chance; the
`mandarin-content-qa` agent reviews it; then the owner's review.

## Pictures (Book 1 only)

Drawn by Codex image generation from a written brief, never in code. Style: the app's warm flat
illustrations (`scripts/assets/lesson-test-art/style.txt`); the book characters keep their looks
(portraits in `src/assets/images/characters/portraits/`).

- **Picture trios** (answer pictures): one 3-panel strip, the same scene three times with **one detail
  changed** (TOCFL's rule), white gutters between panels, no numbers or labels.
- **Single pictures** (scenes, realia): one image. Menus, receipts and notices state the **exact**
  Traditional Chinese text in the brief; check every character by eye before use.
- Vary scenes across lessons; reuse existing art only where it truly fits.

```bash
scripts/assets/lesson-test-art/generate.sh b1l04-drinks scripts/assets/lesson-test-art/briefs/b1l04-drinks.txt src/assets/images/grammar-practice/generated/l04-two-teas-180-v1.webp
```

```bash
python3 scripts/assets/lesson-test-art/cut.py b1l04-drinks:strip b1l04-menu:single
```

## Audio

Studio voices with a Taiwan accent: **F** Vivian, **M** Dylan (or Uncle_Fu, the owner's pick), **N**
Serena the narrator (questions, spoken answers, letters). Dialogue voices speak like everyday
conversation; the narrator like a test recording. The ding is a synthesized soft bell.

1. Generate: `HF_HUB_OFFLINE=1 <venv>/bin/python scripts/audio/generateLessonTestAudio.py --lessons b1l04`
   (`<venv>` = `output/qwen-pilot-venv` in the main checkout).
2. Check: `checkStudioBatch.py output/lesson-test-audio` (independent ASR must hear the whole line; endings
   must fade). Rejected takes are re-voiced by running step 1 again. Listen to the letters and ding by ear.
3. Publish: `node --env-file=<.env> --import tsx scripts/audio/publishLessonTestAudio.ts --upload --male dylan`
   (uploads to R2 under `lesson-test-studio/v1/`, writes the receipt).
4. Export: `npm run lesson-tests:export -- --strict` (fails if a spoken line has no recording), then commit
   the content, receipt and pack together.
