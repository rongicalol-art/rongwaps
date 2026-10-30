# Handoff: Book 3 grammar pages, Lessons 6–16 (2026-10-31)

## Goal
Every Book 3 grammar point in Lessons 6–16 matches the printed book: nothing missed, text verbatim, clean and checked. **Grammar pages only. No exercises for now** (owner): do not touch `content/grammar-practice/*`.

## State
- **L1–5:** done and committed earlier (d180d340). These are the reference.
- **L6–8:** pages rebuilt and committed as WIP (c72600c6). All three pass the lesson validator. **Not yet reviewed against the scans.**
  - Author notes: `docs/grammar/reviews/B3-L0{6,7,8}-author.md`, including Unsure lists.
  - Their `content/grammar-practice/b3Lesson{Six,Seven,Eight}.json` were also rebuilt before the owner paused exercises. **Ask the owner** whether to keep them or restore the pre-c72600c6 versions.
  - Known open items on L7 (from a review against the transcript):
    - author-filled 「 」 bank blanks;
    - 連絡 → 连络 in a dialogue line;
    - the book's own typo "ard" in G6's English, kept verbatim.
- **L9–16:** untouched. The old content is still there, mostly invented tables and prompts.

## Source of truth
- **Transcripts:** `docs/grammar/briefs/b3-kit/source/LNN.md`. Model-made, and checked against the scans for L6–8 only.
- **Scans:** `materials/book3/` is **git-ignored and not in the cloud**. Two ways to work:
  - **Cloud:** work from the transcripts and mark every scan check as still owed.
  - **Locally:** scans are `materials/book3/pages/page_XXX_*.webp`, where XXX = printed page − 16. Convert one with `dwebp -quiet in.webp -o out.png`.

## Rules (from `docs/grammar/briefs/B3-batch.md`, Pages section)
- `explanationEnglish` is the book's English, verbatim. `explanation` is the book's Chinese, verbatim.
- `examples` are the book's 例句, verbatim and in order.
- `focusTerms` cover every printed form of the pattern.
- **Tables:** each row is the core clause of an example; invent nothing. Each pattern part gets its own column. Cells are ≤6 characters with no punctuation. Headers are plain words of ≤6 units.
- Keep the Lesson 5 page shape. Every grammar page has:
  - `bookPage` and `confusion`;
  - `questions`, at least one item (reuse the old file's question for that point);
  - `text.words` tokens on every example.
- Keep the existing ids, `dialogue` and audio fields. A G-number's page id may be registered in `src/data/grammarUsageRules.ts`; keep it.
- **Simplified:** never hand-write it. Derive it with `python3 docs/grammar/briefs/b3-kit/t2s.py "…"`, or `from t2s import t2s` in a build script. Check the characters it warns about (著 乾 麼 於 …) by context.
- Write each lesson with a Python build script, never as hand-typed JSON.

## Steps
1. **Review L6–8 against the book.** Flag every difference in text, page or explanation, then fix it.
2. **Author L9–16** one lesson at a time, from the transcript (plus scans if local).
3. **Before calling a lesson done:**
   - `npx tsx docs/grammar/briefs/b3-kit/check_b3.ts <Word>` prints OK.
   - `npx tsx --test tests/content/b3SimplifiedConsistency.test.ts` passes. First add the lesson's Word to its `REDONE` list.
4. **At the end:**
   - `npm run content:export && npm run content:validate && npm test`.
   - Add any new `B3Lxx` parts to `src/data/interactiveGrammarManifest.ts` if lessons are missing there. Book 2's L9–16 needed this.
   - Export book pages for Book 3: `scripts/content/exportBookPages.ts` handles Books 1 and 2 only. This needs the local PDF, so it must be done on the owner's Mac.
5. Commit per lesson. Push only when the owner asks.

## Working with Haiku (owner wants Haiku for execution, plus separate reviewers)
- One author agent and one read-only reviewer agent per lesson.
- Authors must run `check_b3.ts` themselves; they skip the validator otherwise.
- On big files, Haiku tends to stop after verifying; tell it explicitly to finish the rebuild.
- The `mandarin-content-qa` agent type can't run shell conversions, so give reviewers PNGs or transcripts.
- Verify each reviewer finding yourself before applying it.
