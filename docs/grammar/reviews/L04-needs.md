# L04 exercise needs — Codex, 2026-10-16

- NEEDS-ENGINE: p.99 #1–2 — show the book's tight-shirt boy and frantic desk-worker pictures beside their original A/B prompts. Tap a short 太…了 completion; return the completed Chinese, pinyin, English and a picture-specific repair. `slot-build` fits the answer, but `PracticeScene` supports only route/change/countdown, not book pictures. Do not substitute an answer-revealing caption. Confirm whether the worker chiefly cues 忙 or 累 before setting one answer.
- NEEDS-ENGINE: p.104 #1 — a reading interaction for all eight numbers, in printed row order: 150, 5,080, 630,000, 9,400,000; 309, 7,200, 800,500, 13,000,000. Show one numeral, let the learner read/hear its reading, and return the full Chinese and pinyin. Full-answer tiles exceed four characters; splitting every number into tiles forces several decisions. None of the three existing kinds directly fits reading aloud.
- NEEDS-ENGINE: p.104 #2 — the same reading interaction, reading every digit including zero: 0930-252-242, 0988-321-259, 0936-068-493, 0955-734-068. Do not replace it with one ten-character answer tile.
- NEEDS-ENGINE: p.105 #3 — reading with measure words for all four prompts: 201（杯子）, 2,200（老師）, 5,005（人）, 512,300（錢）. Show the original number/noun, read the complete quantity, then reveal Chinese, pinyin and English; keep number decoding separate from choosing a measure word.
- NEEDS-ENGINE: p.106 #1–3 — show the original 15 faces, two teas priced $180, and jacket priced $2,200. Tap the placement of 多 within a fixed model answer; return the completed sentence and the range shown by the picture. Requires a book-picture scene; do not show the answer as the cue's pinyin.
- NEEDS-ENGINE: p.107 #1 — show the actual ornate clock with 現在幾點？; tap an hour + 點多 answer, then return its reading and range. Requires a book-picture scene and human confirmation of the hands. The scan does not justify the current 十二點多 key confidently.
- NEEDS-ENGINE: p.107 #2 — preserve 李先生的孩子幾歲？ and the 2016.1.1 → 今天 picture. Supply an explicit reference date and compute the completed age plus 多; tapping the age frame returns the age at that date. Neither an arbitrary 四歲多 model nor an unannounced live date is faithful. The current scene date has month/day only, with no year or age calculation.
- NEEDS-ENGINE: p.107 #3 — show three pens and a flower priced US$8.45 beside 這些東西一共多少錢？. Tap a short unit + 多 answer and return 八塊多, pinyin and English, with a repair distinguishing a partial dollar from a whole-dollar range. Requires a book-picture scene.

## Existing kinds; no engine work needed

- p.96 #1–3 / p.97 #4: `slot-reels` fits the open topic-first answers. Preserve the two/three separate noun blanks and the shared comment; label completions as app models. Do not freeze 都 and turn the task into copying a noun list.
- p.98 #1–3: `slot-reels` fits open completions with 也; keep the two book blanks, ordinary taught words, and natural compatible completions. `chat-build` would force clause construction and is not the book's instruction.
- p.99 #3: `slot-build` fits the text-only 太…了 completion; retain the book's follow-up sentence.

Practice migration is pending: the named `content/grammar-practice/lessonFour.json` is absent, and the requested skill explicitly pauses creating/editing practice files. Removed legacy questions were unmounted data, not working practice coverage. Restore every source item through its suitable interaction during that pass; no coverage PASS is claimed.
