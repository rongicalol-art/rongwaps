# Grammar pipeline status

Roles: **Codex** writes and reviews content from the book (rules: `.claude/skills/grammar-author/SKILL.md`). **Claude** owns design, engine, UX and the brief. **Owner** makes taste calls and gives the final ✓.

Steps per lesson: 1 Brief (Claude) → 2 Transcript (Codex sol-high) → 3 Author (Codex sol-medium) → 4 Gates (Codex luna) → 5 Independent review (fresh Codex sol-high) → 6 Screen review (Claude, then Codex sol-high vs book) → 7 Owner ✓.

Files: brief `docs/grammar/briefs/LXX.md` · scans + transcript `materials/book1/LXX/` (gitignored) · reviews `docs/grammar/reviews/LXX-*.md`.

| Lesson | Brief | Transcript | Pages | Practice | Gates | Review | Screens | Owner |
|---|---|---|---|---|---|---|---|---|
| L8 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Claude ✓ · Codex pending | |
| L7 | (pre-pipeline, Part 1 practice done) | | | | | | | |
| L1–L6 | rebuild from the book after L8 | | | | | | | |

## Definition of done (owner, 2026-10-16): every item must hold for every lesson L1–L8

**Scope**
- [ ] Words and grammar only from the book up to that point: per *part* and in book order. Anything later only if the book itself prints it (`allowWords`).
**Pages**
- [ ] Follow the book: its tables (never merged; every cell, units included), its examples, short explanations.
- [ ] Book layout: where the book prints a sentence under a table row, show it under that row (prototype A).
- [ ] Phone-safe: no table overflow, no lone 。, correct focus highlighting.
**Exercises**
- [ ] Every book exercise item is included, in book order, with `source`; the coverage check passes.
- [ ] Each made smart: exactly ONE right answer, decided by context (the dialogue, the picture, the calendar, the clock).
- [ ] Smart options: 2–4 real taught forms, plausible, with no giveaways (nothing to copy from the context and nothing found by ruling out obviously wrong options).
- [ ] Forms fit the mistake: Choose / Order / Read. Book pictures are shown (cropped from the scans), never dropped.
- [ ] Every wrong option teaches (a one-line why). Titles are the book's instruction, and the text speaks to the learner.
- [ ] Our own items only after the book's: 1–3 per point, for typical mistakes the book doesn't test.
**Process**
- [ ] Pilot the exercise pass on L1, then the owner OKs it, then L2–L8.
- [ ] Checks green: content:validate, tests, typecheck, lint. Phone (390) and desktop (1440) check of every lesson.

## Remaining work, in order
1. Overnight run finishes the pages for L4–L8.
2. App: ~~Order kind~~ (done 2026-10-18: `order-build`, `spot-fix`, `match-pairs`, `sort-groups`, `story-order`; 13 own items in L1–L8, plan for L9–L16 in `GRAMMAR_LESSON_TEMPLATE.md`; later that day `listen-build`, hear a clause of a book dialogue then build it, 6 own items in L1–L8), calendar/clock Read scenes, book-picture scene (crops), book-row layout, table overflow and lone-。 fixes, one-answer check, coverage check.
3. Page fixes: L2 G1 tables, L1 exercise titles (superseded by the pass), focus highlighting.
4. Exercise pass: L1 pilot → owner OK → L2–L8 (Sol designs; checks enforce).
5. Final checks and the owner summary with screenshots.
