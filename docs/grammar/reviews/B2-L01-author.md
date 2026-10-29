# B2 L01 AUTHOR — deepseek-v4.1-flash, 2026-10-27
Verdict: PASS

## Checked
- Source: `materials/book2/Modern_Chinese_Book_2.pdf` pages 25–44 (printed 24–43); `materials/book2/ocr/p025`–`p044`. Page images re-read for every grammar exercise (PDF p031–p034 and p039–p042 = printed 30–33 and 38–41) and the corrected 短文 (PDF p034–p035 = printed 33–34).
- `content/grammar/b2LessonOne.json`: 2 parts, 9 pages, 29 examples, 18 confusion items, 9 legacy choice questions.
  - Part 1 `B2L01-P01-D01`, Grammar 1–4 (V一下, 最好+VP, 不但…也…, V完), dialogue `B2L01-D01` audio `01-1`, printed 24–25.
  - Part 2 `B2L01-P02-D02`, Grammar 5–9 (V在, V給, （一）邊…（一）邊…, 雖然…可是…, 句末呢), dialogue `B2L01-D02` audio `01-3`, printed 33–34 (the 短文).
- `content/readings/book-2.json`: `B2L01-R01` (dialogue 1, printed 24–25, `01-1`) and `B2L01-R02` (短文, dialogue 2, printed 33–34, `01-3`).
- `content/grammar-practice/b2LessonOne.json`: 9 groups, 45 items (5 per page; the 3 printed exercises then two `own`), every item carries `promptZh`. Kinds: `slot-build`, `order-build`, `spot-fix`.
- Wiring: `interactiveGrammarManifest.ts` (2 parts), `grammarUsageRules.ts` (9 rules), `OPEN_LESSON_COUNTS[2] = 1`, `tests/unit/booksData.test.ts`.
- Practice text: printed items first, `own` last; every item has a Chinese `promptZh` with the English task behind the EN chip. `pinyin` was checked against the vocabulary pack and dictionary (one syllable per Han character); simplified text was generated once from the dictionary character map, with `妳` kept as printed.
- Gates: `content:export`, `content:validate`, `typecheck`, `lint`, `test` (1234 pass), `jev:lint` all green.

## Decisions
- **G4 (V完) sits in Part 1** even though its 練習 prints on printed p.33 (PDF 34), because the vocabulary pack lists 完 as `B2L01-1-23` (Part 1). Part 1 grammar page ranges therefore extend to p.33, and Part 2 begins at the 短文 (p.33) even though p.33 also carries the G4 exercise.
- **Audio labels.** The book prints Dialogue `01-1`, Vocabulary `01-2`, Reading `01-3`. No grammar track is printed, so Part 1 grammar pages use `01-1` and Part 2 pages use `01-3` (the part's text); noted under Unsure.
- **No Book 2 page images** (`public/data/book-pages/modern-chinese-2/` does not exist). Every page sets `bookPageAvailable: false`; `bookPage` and `printedPages` remain so the pages work once images are exported. No practice `scene` uses a picture crop.
- **Practice ids** are `b2l01g<N>-p<N>`; page ids `B2L01-G0N-P<printed page where the point sits>`; no duplicate page ids (G6→P38, G7→P39, G8→P40, G9→P41). G4 is `P32`: its grammar header prints on p.32 and its 練習 on p.33.
- **Open printed items** (no printed cue) carry a situation cue in `promptZh` / `sub`; the review pass strengthened G2 #3 (crowd), G5 #1–2 (chair/store) and G7 #1–3 (picture) so context decides one answer.
- **Kinds.** Word order / production points use `order-build`; targeted form choice uses `slot-build`; the one real learner error (`雖然…所以…`) uses `spot-fix`. No new kind was needed → no `B2-L01-needs.md`.

## Corrections vs OCR
- 短文: `住在學校的宿舍`, `在台灣的生活`, `放假的時候`, `請她跟她的朋友`, `良介的心跳得很快`, `能認識她真的很幸運`, `他們的興趣一樣` (OCR dropped the 的 / 心 / 真的).
- Dialogue: `有這樣的經驗` (OCR dropped 的); `今天早上起來的時候` (OCR line break made it look like `起來時候`).
- OCR artefacts ignored: `認城新朋友`, `Modem Chinese`, `4601-3` (= `01-3`), `101-1` (= `01-1`).

## Unsure
- **Book 2 audio is not uploaded.** `audioReference` values follow the printed labels; the packs will not play Book 2 until its tracks are hosted. No audio was uploaded or changed.
- **No Book 2 dialogue alignment** (`content/dialogueAlignment-book2.json` does not exist), so no `listen-build` / `listen-pick` items were authored; all listening work is deferred until alignment exists.
- **Grammar track label** is an authoring decision (see above), not printed by the book.
- **`呢` usage rule** is guarded with `notAfter: ['後來']` so the dialogue's interrogative `後來呢？` does not mark the sentence-final emphasis point as used in Part 1; Part 2 still detects it in `騎腳踏車呢！`.
- Book 2 pages have no printed images, so picture-based exercises (G5 #1–3, G7 #1–3) use written scene cues instead of crops; G7 #1 is the p.39 car-and-music picture.
