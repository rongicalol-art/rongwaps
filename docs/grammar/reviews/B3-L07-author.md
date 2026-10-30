# B3-L07 author — Haiku 5.5, 2026-10-30

Verdict: PASS for the self-check (28/28 in the five named suites). Human review needed on the Unsure list (bank judgments and the G5 self-written blanks).

## Checked

- Scan footers: printed 184–191 (files page_168–175), 195–199 (files page_179–183). Printed 192–194 are reading only, no grammar.
- Grammar pages (6): titles, explanations (zh and en) and all 3 examples per point compared verbatim to the scans. Examples 1 of each point marked `fromDialogue` where the book's ★ marks it.
- Book prompts: 33 printed prompts (練習1 items and 練習2 situations). File has 49 items: each bank item as reply-pick; each fill-in and "answer yourself" item as order-build; each 練習2 situation as reply-pick then order-build.
- Simplified: generated with t2s (with 計畫→计划 override). Ambiguous chars checked: 麼→么, 乾→干, 裡→里 in context; no 著 or 於 in text.
- Tiles: all ≤6 per dock and ≤4 characters; every distractor tile carries a repair (placed) or is the accepted tile.
- Dialogue lines, ids and audio references kept from the existing file (part dialogue objects unchanged).
- Gates run: `npx tsx --test tests/content/b3SimplifiedConsistency.test.ts tests/content/grammarPracticeQuality.test.ts tests/content/grammarPracticeKinds.test.ts tests/content/grammarPracticeContext.test.ts tests/unit/grammarPracticeCheck.test.ts` → 28 tests, 28 pass, 0 fail. Both JSON files parse. Export and validate were not run (per brief).

| Point | Book prompts (練習1 + 練習2) | File items (reply-pick / order-build) |
| --- | ---: | ---: |
| 才……（，）就…… (p.184) | 6 (4 + 2) | 8 (6 / 2) |
| 話說回來，…… (p.186) | 5 (3 + 2) | 7 (2 / 5) |
| 這麼說，…… (p.188) | 5 (3 + 2) | 7 (2 / 5) |
| V 成 (p.189) | 7 (5 + 2) | 12 (2 / 10) |
| 就……來說 (p.195) | 5 (3 + 2) | 8 (5 / 3) |
| V / Vs 得…… (p.197) | 5 (3 + 2) | 7 (5 / 2) |
| Total | 33 | 49 |

## Issues

- `content/grammar/b3LessonSeven.json` — rebuilt all six pages from the scans. Removed the old `confusion` and `questions` fields (not in the L1/L5 shape; the practice lives in the practice file). Titles now match the book (才……（，）就…… with the 2 meanings).
- `content/grammar-practice/b3LessonSeven.json` — replaced the old items with the printed prompts only; no own items.
- BOOK-ERRATA: G6 printed English "Words after 得 ard complements." ("ard" for "are"). Kept verbatim.
- Pinyin for examples, tokens and items is authored, not scan-verified (the scans print no pinyin).

## Unsure

- G1 練習1 #3 bank card h ("我不會～四十歲，腦子～有問題了吧") is marked ok, giving "我不會才四十歲，腦子就有問題了吧". The card itself is awkward; check whether the book intends it to fit.
- G1 練習1 #1 and #2: two bank cards are marked ok each (b and g; a and e). Confirm the book allows both.
- G4 練習1 #2 accepted answer is 做不成 only; 沒做成 also reads as right in context. Confirm.
- G4 練習1 #1 accepted answer 沒辦成 / 去不成; 辦不成 is also possible. Confirm.
- G5 練習1 #1 and #2: the 「 」 part is self-written by me (e.g. "房子很大", "有點貴", "新機器…很多玩具"), since the book leaves it blank. The bank cards with blanks are presented as complete options. Confirm this is acceptable.
- G5 練習1 #3 and G5 練習2 are answer-yourself items; their accepted answers are one wording each.
- G6 練習1 #1 and #2: bank cards with blanks filled in by me (e.g. "走路都困難", "睡不好", "說不出話"). Same concern as G5.
- G1 練習1 #2 "他" + card: tone and punctuation of the printed start kept as printed.

## NEEDS-ENGINE

- None found. The bank cards with blanks (G5, G6) may need an engine change to let the learner write the 「 」 part; flagged here rather than changed.
