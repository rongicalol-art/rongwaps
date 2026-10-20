# Picture practice illustration review — 2026-10-21

Verdict: reviewed replacements ready; new Luna batch blocked by image generation limit.

## Checked

- `l1g5-p3`, book p.45: Mr. Wang imagines himself with Mrs. Wang and a heart. The reviewed illustration preserves love, the thinking cue, and accepted answer 他愛王太太。; no answer text appears in the artwork.
- `src/assets/images/grammar-practice/wang-thinking.webp`: lossless conversion of the approved generated PNG, identical RGBA bytes. Source alpha and native proportions preserved.
- Book p.163 #1–3: USA → Taiwan, home → school, restaurant → library. Existing route renderer reused with an explicit visible arrow. Speaker-location instructions remain in the heading, so 來/去 is still determined by the authored context.
- Book p.196 #2: existing countdown renderer reused with exact 11:50 and 12:00 hands, captions 現在 and 中午休息時間. No generated numerical details.
- Other pictures keep their printed-book crop. No content, accepted answers, or generated packs changed.
- English picture-question headings are omitted only when the incoming Chinese question already displays it and the English contains no additional sentence/context. Role, selection, date and direction instructions remain.

## Pending

- Luna Max attempted the first of four new Lesson 1 illustrations and received `429 usage_limit_reached`; no new assets were produced or approved.
- First batch: Youmei seated at her desk; busy man at computer (shared by two items); tired woman beside energetic Zhongming; smiling girl in a dress.
- Prompts, accepted-answer provenance, and all 56 picture exercises inventoried in the local `output/grammar-scene-kit/` pack. Inspect each later printed page before generating its replacement. Validate generated counts, lettering, prices, date and clock details separately.
