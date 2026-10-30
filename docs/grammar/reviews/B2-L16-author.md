# B2 L16 grammar reference — GPT-6, 2026-10-30
Verdict: PASS

## Checked
- Compared all six grammar entries with `materials/book2/L16/transcript.md` and the printed scans for pp.361–364 and 370–371; all 18 numbered examples match the source text.
- Preserved the printed English explanations, including the three numbered condition types for 得看／要看; kept the adjacent 得很 phrase table and the three-column layout contract.
- Manually checked contextual pinyin and token segmentation for all 18 examples; every token sequence reconstructs its traditional source and the pinyin syllable counts match the Han-character readings, with 儿/兒 treated as erhua.
- Copied the full 19-line and 4-line dialogue records, reading metadata, and audio references from `content/readings/book-2.json` (`16-1-1`, `16-2-1`).
- Confirmed grammar numbers 1–6 are contiguous, IDs are unique, all `bookPageAvailable` flags are false, and no confusion blocks were added.
- Ran `validateInteractiveLessons` directly on the unexported source parts plus readings: 122 usage-rule/unknown-page issues filtered as unrelated to source validation; zero relevant issues. A separate source audit found no missing examples, token reconstruction errors, pinyin-count errors, or literal `undefined` strings.

## Issues
- None.

## Unsure
- None.
