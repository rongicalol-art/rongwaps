# B3 Lesson 12 author review (grammar pages)

Source: printed scans pp. 313–328, checked for every grammar point (G1–G6). Transcript `docs/grammar/briefs/b3-kit/source/L12.md` used only as a cross-check.

## Points and pages
| Point | Heading | Printed pages | Examples | Table rows | Questions kept |
|---|---|---|---|---|---|
| G1 | 這就…… | 313–314 | 3 (★1) | 3 | 1 (old) |
| G2 | 在……方面（，）…… | 314–316 | 3 (★1) | 3 | 1 (old) |
| G3 | 往往 | 316–318 | 3 (★1) | 3 | 1 (old) |
| G4 | 有關…… | 318–320 | 3 (★1) | 3 | 1 (old) |
| G5 | 儘管 | 325–326 | 3 (★1) | 3 | 1 (old) |
| G6 | 不論……都…… | 327–328 | 4 (★1) | 4 | 1 (old) |

Each point's 說明 (Chinese and English) and 例句 are verbatim from the scan. Exercise 練習 items are not part of this pass (pages only).

## Checks
- `docs/grammar/briefs/b3-kit/check_b3.ts Twelve` prints OK.
- `tests/content/b3SimplifiedConsistency.test.ts` passes, but Twelve is **not yet in the REDONE list** (`tests/content/b3SimplifiedConsistency.test.ts`, line 9). Add it when the batch is wired up.
- Simplified is derived with `t2s` (no hand-typed simplified).
- Every example's word tokens concatenate exactly to the printed 例句 (asserted in the build script).

## Table cells over 6 characters (not split: splitting would change the core clause)
- G1 ex3: 到門口去歡迎他 (7)
- G2 ex2: 白小姐很有品味 (7)
- G3: 透過良好的溝通, 能解決不必要的麻煩, 要不要去補習, 不是孩子能夠決定的 (6+ each)
- G4: all three Predicate cells, and the Topic cell 那個明星吸毒的新聞
- G5: all Fact and Result cells
- G6: 主管有什麼要求 (7), 你有升學或工作方面的問題 (long)
- G6 ex3 has no subject cell (the subject is inside the condition clause).

## Unsure
- Pinyin and English word meanings for the example tokens are authored by me, not printed in the book. Check them with Ron.
- English translations of the 例句 are authored, not printed.
- Confusion items and questions are reused from the old file (rule: keep the old question). They were not re-checked against the book.
- G1 ex2 and ex3 join the printed A/B lines without a line break (the book prints them on separate lines).
