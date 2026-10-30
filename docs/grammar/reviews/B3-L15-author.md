# B3-L15 author — Claude Haiku 5.5, 2026-10-31
Verdict: PAGES REBUILT (check_b3 OK; owner/reviewer should check the Unsure list)

## Checked
- Scans printed pp.383–396 (b3png/printed-383…396.png) for all five points: 簡直, Vs得沒話說, 同時, ……及……, 總而言之，……/總之，…….
- Explanations (zh and en) and every 例句 read from the scans, matching the kit transcript. Examples: G1 ex1–3, G2 ex1–3, G3 ex1–3, G4 ex1–3, G5 ex1–3.
- Fixes against the old file: G2 ex3 lacked 關心同學; G5 ex1 was a longer sentence than the book's line (……); G5 ex3 lacked the A/B dialogue lines; ★ examples now carry fromDialogue.
- Example text is verbatim, with 「……」 kept as prefix/suffix tokens. Each example's word tokens rebuild the text exactly.
- Pinyin and English: reused from the old file for unchanged examples (G1 ex1–3, G2 ex1–2, G3 ex1–3, G4 ex1–3, G5 ex2). Authored for G2 ex3, G5 ex1, G5 ex3.
- Confusion and questions: copied unchanged from the old file (ids kept).
- Dialogue, ids and audio fields kept from the old file. No public/data, no practice files, no git.
- Build script: scratchpad/build_b3_L15.py writes content/grammar/b3LessonFifteen.json (ensure_ascii=False, indent=2). Simplified: from t2s (kit), no hand-written simplified.

## Tables
- G1 Subject | 簡直 | Comparison (accent 1). Rows: 那幾條龍 / 簡直 / 快飛起來了; 簡直 / 像個仙女一樣; 簡直 / 就像機器一樣.
- G2 Verb | 得 | 沒話說 (accent 2). Rows: 美 / 快 / 優秀, each 得沒話說. 簡直是 in ex3 is left out of the cells.
- G3 Subject | 同時 | Predicate (accent 1). Rows: —/也在創造歷史; 我們/完成了; —/也是華人最尊敬的老師.
- G4 Verb | Noun | 及 | Noun (accent 2). Rows: —/歷史意義/及/紀念價值; —/手機筆電/及/平板; 提高/產品的品質/及/更好的服務.
- G5 Opening | Subject | Predicate (accent 0). Rows: 總而言之/古蹟/…; 總而言之/大家/…; 總之/各方面/…
- Long cells kept (no shorter faithful core): 也是華人最尊敬的老師 (10), 就像歷史拼圖中的一片 (10), 應該要一起解決這個問題 (11), 都得一百分才行 (7), 產品的品質 (5 fine).

## Unsure
- All pinyin and English for G2 ex3, G5 ex1 and G5 ex3 are authored, not printed. The scans have no pinyin. Tones need a human check.
- Word glosses (meaning field) are authored throughout. The scans have no glosses.
- G2 ex3 gloss 育幼院 = "children's home" and G5 ex3 "A/B" speaker tokens are authored.
- Table cell 手機筆電 drops the 、 between 手機 and 筆電 (no punctuation inside cells).
- G2 table drops 簡直是 from ex3 as lead-in. Check this is acceptable.
- G1 ex1 "……" prefix and suffix are on the first and last word tokens.
- questions and confusion fields are old content (not re-checked against the book).
- content/grammar-practice/b3LessonFifteen.json not touched (per brief).
- tests/content/b3SimplifiedConsistency.test.ts not run and REDONE list not edited (outside this brief).

## NEEDS-ENGINE
- None.
