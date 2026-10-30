# B2L14 author — GPT-6 Codex, 2026-10-30
Verdict: FIXES NEEDED

## Checked
- Compared all eight grammar points and 29 numbered examples with `materials/book2/L14/transcript.md` and scans of printed pp.316–317 and 325–329. Preserved the source distinctions for 想起來, 從來, 例子＋等等, 當……就……, 讓, 無所謂, V走, and 要不是. The 讓 page retains its passive/verb distinction and printed subnumbering.
- Confirmed no syntax tables are printed on these grammar pages; `patternRows` is empty. Grammar numbering runs 1–8 across the two parts.
- Reviewed contextual pinyin, including neutral tones and 一／不 sandhi, and verified every token stream reconstructs the traditional and simplified example text exactly. Corrected source-space/punctuation segmentation and simplified speaker labels. For grammar 2, split 是真的嗎 into explicit 是／真／的／嗎 tokens; the simplified token and full-line text both retain 的 (是真的吗).
- Copied dialogue metadata and all lines from the existing Lesson 14 readings; page availability remains false.

## Issues
- `npm run content:validate` fails on unknown grammar pages in the existing usage rules for B2L10–B2L13. It reported no B2L14 page errors. The command output was:
  ```
  B2L10-G01-P231: Grammar usage rule points at an unknown page.
  B2L10-G02-P232: Grammar usage rule points at an unknown page.
  B2L10-G03-P232: Grammar usage rule points at an unknown page.
  B2L10-G04-P233: Grammar usage rule points at an unknown page.
  B2L10-G01-P239: Grammar usage rule points at an unknown page.
  B2L10-G02-P240: Grammar usage rule points at an unknown page.
  B2L10-G03-P241: Grammar usage rule points at an unknown page.
  B2L11-G01-P250: Grammar usage rule points at an unknown page.
  B2L11-G02-P252: Grammar usage rule points at an unknown page.
  B2L11-G03-P252: Grammar usage rule points at an unknown page.
  B2L11-G04-P253: Grammar usage rule points at an unknown page.
  B2L11-G05-P254: Grammar usage rule points at an unknown page.
  B2L11-G06-P260: Grammar usage rule points at an unknown page.
  B2L11-G07-P260: Grammar usage rule points at an unknown page.
  B2L12-G01-P271: Grammar usage rule points at an unknown page.
  B2L12-G02-P272: Grammar usage rule points at an unknown page.
  B2L12-G03-P273: Grammar usage rule points at an unknown page.
  B2L12-G04-P273: Grammar usage rule points at an unknown page.
  B2L12-G05-P274: Grammar usage rule points at an unknown page.
  B2L12-G06-P275: Grammar usage rule points at an unknown page.
  B2L12-G07-P282: Grammar usage rule points at an unknown page.
  B2L12-G08-P283: Grammar usage rule points at an unknown page.
  B2L13-G01-P293: Grammar usage rule points at an unknown page.
  B2L13-G02-P294: Grammar usage rule points at an unknown page.
  B2L13-G03-P294: Grammar usage rule points at an unknown page.
  B2L13-G04-P301: Grammar usage rule points at an unknown page.
  B2L13-G05-P302: Grammar usage rule points at an unknown page.
  B2L13-G06-P303: Grammar usage rule points at an unknown page.
  ```

## Unsure
- The repository validation cannot establish integration for the new L14 file until the owning integration/export work registers it. No exported packs were modified.
