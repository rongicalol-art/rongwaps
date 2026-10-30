# B2-L12 grammar references — Codex, 2026-10-30
Verdict: FIXES NEEDED

## Checked
- Compared all eight numbered examples with the transcript and scans for printed pp. 271–275 and 282–283.
- Copied the complete Part 1 dialogue and Part 2 reading paragraphs from `B2L12-R01` and `B2L12-R02` in `content/readings/book-2.json`.
- Reviewed pinyin, translations, simplified forms, and example word tokens; token joins reproduce every traditional example.
- Kept `bookPageAvailable` false on all eight pages; omitted confusion blocks rather than adding unsourced sentences.

## Issues
- `validateInteractiveLessons` requires each new page ID to have a reviewed detected/undetectable entry in `src/data/grammarUsageRules.ts`. It reports this missing entry for all eight B2L12 pages; that file is outside this assignment.

## Unsure
- None.
