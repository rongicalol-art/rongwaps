# Book 1 Example Coverage

Generated with:

```sh
npm run course-examples:export
npm run course-examples:coverage
```

The current Book 1 pack contains 276 Chinese–pinyin–English source records. At
runtime, those records give 457 of 825 cards (55%) at least one eligible rich
example after the Book/Lesson/Part future-content guard. Another 260 cards have a
Chinese-only fallback and 108 have no eligible example.

| Lesson | Cards | Rich | Chinese-only | None | Rich coverage |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 7 | 54 | 35 | 14 | 5 | 65% |
| 8 | 54 | 44 | 8 | 2 | 81% |
| 9 | 46 | 42 | 4 | 0 | 91% |
| 10 | 48 | 38 | 6 | 4 | 79% |
| 11 | 44 | 4 | 37 | 3 | 9% |
| 12 | 45 | 5 | 40 | 0 | 11% |
| 13 | 47 | 3 | 42 | 2 | 6% |
| 14 | 49 | 8 | 40 | 1 | 16% |
| 15 | 47 | 3 | 33 | 11 | 6% |

Lessons 7–10 use dialogue lines and Reading sentences whose pinyin was visually
verified against the printed pages. Lesson 10 publishes only those verified
sections; its lesson-wide pinyin flag remains false because grammar-section OCR
has not been approved. Lessons 11–14 have complete Chinese and English source
extraction, but their stored pinyin is raw OCR with documented recognition errors.
Lesson 15 is also a partial scan. Those context rows remain excluded until their
pinyin is re-extracted and page-verified; the app falls back to Chinese-only text
instead of publishing unreliable pronunciation data.

The detailed per-card report is generated locally at
`output/course-examples/book-1-coverage.json`.
