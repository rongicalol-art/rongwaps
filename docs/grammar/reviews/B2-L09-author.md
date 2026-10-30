# B2 L09 grammar reference — GPT-6, 2026-10-30
Verdict: PASS
## Checked
- Compared all 39 grammar examples in both parts with `materials/book2/L09/transcript.md`; traditional and simplified source text and punctuation are preserved.
- Added manually reviewed editorial pinyin and word tokens for all 39 examples. Verified that token text and punctuation reconstruct both script versions exactly.
- Compared token readings with local dictionary shards and Book 2 course vocabulary. Resolved readings in context where a dictionary’s primary character entry did not fit, including 你 nǐ, 了 le, 的 de, 都 dōu, and 教到 jiāo dào (the course reading uses 教 as “teach”).
- Used the existing reading records `B2L09-R01` and `B2L09-R02` for the 14 dialogue and 4 reading lines; no dialogue text or grammar examples were invented.
- Added conservative usage rules and checked each against the reader’s tokenized source reading. All seven grammar pages detect a matching sentence.
- Omitted confusion blocks because the book provides no wrong/right sentence contrasts. Aligned validation with the schema’s optional confusion field; present blocks remain validated.
- Kept the three V 到 frames and four Vs-reduplication frames separate. All referenced printed pages have been exported and the seven page links enabled.
- Source example English translations are editorial; the grammar pages do not print English translations.
- `npm run content:export` passed; `npm run content:validate` passed (`Interactive lesson content valid.`).
- `npx tsx --test tests/unit/grammarConfusionOptional.test.ts` passed (1 test, 0 failures).
## Issues
- None.
## Unsure
- No unresolved readings identified. `台北101` follows the Book 1 course reading convention `Táiběi 101`.
