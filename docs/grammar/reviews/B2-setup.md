# B2 SETUP — deepseek-v4.1-flash, 2026-10-27
Verdict: PASS

## Checked
- `materials/book2/Modern_Chinese_Book_2.pdf` exists; OCR for p001–p402 present.
- TOC (p009–p010) and lesson title pages checked: L1 p025 … L16 p355. PDF page = printed page + 1 (verified on p006=5, p025=24, p067=66, p334=333, p355=354).
- Titles match `LOCKED_BOOK_LESSON_TITLES[2]` exactly.
- `materials/book2/lessons.tsv` written: lesson, title, PDF range, parts. Each lesson has two parts: 1 = 對話 (dialogue, grammar) and 2 = 短文 (reading, grammar). Part boundaries are the page where 短文 begins; the trailing 課室活動 is outside both parts.
- Book 2 packs exported empty: `public/data/readings/book-2.json`, `public/data/grammar/book-2.json`; manifests include Book 2 with count 0.
- Book 2 status `unlocked`; `OPEN_LESSON_COUNTS = { 2: 0, 3: 16 }` so every Book 2 lesson is locked until its AUTHOR run raises the count.
- Gates: `content:export`, `content:validate`, `typecheck`, `lint`, `test` (1234 pass), `jev:lint` all green.

## Issues
- `scripts/content/exportAuthoredContent.ts` — Book 3 prefix filter was a special case. Replaced with `/^b(\d+)/` so every `b<N>Lesson…` practice file binds to its own book; Book 1 stays unprefixed. Export now loops `[1, 2, 3]`.
- `scripts/content/validateLessons.ts` — validated only `[1, 3]`. Now `[1, 2, 3]`.
- `src/utils/grammar/validateInteractiveLessons.ts` — usage-rule page→book mapping hard-coded B3/B1. Now parsed from the `B<N>` id prefix.
- `src/utils/grammar/validateInteractiveLessons.ts` — the "2–3 readings per lesson" rule scanned lessons 1…max, so an empty Book 2 failed on lesson 1. Now it checks only lessons that actually have authored parts/readings; a newly authored lesson still fails if its readings are missing.
- `scripts/content/exportAuthoredContent.ts` — Book 2 has no forced-alignment source yet, and the exporter threw on the missing file. It now skips dialogue alignment when `content/dialogueAlignment-book<N>.json` does not exist.
- `tests/content/authoredContentRoundTrip.test.ts` — Book 1 filter excluded only `b3`; now excludes every book-prefixed file.
- `src/screens/curriculum/hooks/useCourseDashboard.ts` — the dashboard re-implemented lesson locks and still opened only Book 3 lessons 1–5. It now calls `isLessonLocked`, so AUTHOR runs that raise `OPEN_LESSON_COUNTS[2]` actually open the lesson in the app (and Book 3's authored L6–16 are no longer hidden).
- `tests/unit/booksData.test.ts` — Book 2 expected locked; updated to unlocked with all lessons locked.

## Unsure
- Book page images for Book 2 are not exported (`public/data/book-pages/modern-chinese-2/` does not exist). AUTHOR pages should set `bookPageAvailable: false` until pages are generated, or SETUP should extend `exportBookPages.ts` first. Printed page numbers in `printedPages` still follow the book (+1 offset to PDF).
- Part 2 starts on the page where 短文 is printed, which is sometimes the bottom of a page that also ends part 1 (e.g. p034, p058). The ranges above follow that printed boundary.
- `materials/book2/lessons.tsv` is gitignored (whole `materials/` tree), so a fresh clone must rebuild it. It is present locally for the following AUTHOR runs.
- OCR corrupts track labels (`101-1`, `002-1`) and punctuation; reading `audioReference` values will need `NN-P-T` verification by the AUTHOR run.
