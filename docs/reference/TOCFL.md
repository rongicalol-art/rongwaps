# TOCFL reference

What the official Test of Chinese as a Foreign Language (TOCFL, 華語文能力測驗) looks like at each level, how
the *Modern Chinese* books line up with it, how the tests are scored, and the official item-writing rules. The
lesson tests follow it (`content/lesson-tests/README.md` is their authoring contract).

Sources are listed at the end. The mock exams (© SC-TOP) are saved in the main checkout's gitignored
`materials/tocfl/mock-exams/` (Novice vol. 1, Band A vol. 1–5, Band B vol. 1–5, Band C vol. 1–4, with scripts,
answers and audio). They are a format reference only: never copy an item. Our measurements of them (part
boundaries, group sizes, lengths, speaking pace) were taken on 2026-11-23 and are summed up below.

## Levels and the books

| TOCFL | Level | CEFR | Words | Study hours in Taiwan |
| --- | --- | --- | --- | --- |
| 準備級 Novice | 1–2 | below A1 | | |
| Band A 入門基礎級 | 1 入門 · 2 基礎 | A1 · A2 | 500 · 1,000 | 120–240 · 240–360 |
| Band B 進階高階級 | 3 進階 · 4 高階 | B1 · B2 | 2,500 · 5,000 | 360–480 · 480–960 |
| Band C 流利精通級 | 5 流利 · 6 精通 | C1 · C2 | 8,000 | 960–1,920 · over 1,920 |

The app's word data puts the books here (each book's new words looked up in the official TBCL word list in
`public/data/levels/levels.json`; TBCL levels 1–7 = Novice, A1, A2, B1, B2, C1, C2):

| Book | New words (total) | Level mix of its new words | Fits |
| --- | --- | --- | --- |
| 1 | 825 (825) | L1–8: 58% Novice, 20% A1 · L9–16: A1 and A2 grow | Novice → A1 |
| 2 | 964 (1,789) | B1-or-higher words: 20% in L1–2, about 40% in L6–10, 58–77% in L11–16 | A2, B1 from about L10–11 |
| 3 | 1,019 (2,808) | B1-or-higher words 80–90% in most lessons; B2-or-higher grows from about 25% (L1–4) to about 50% (L14–16) | B1, B2 growing |
| 4 | 1,253 (4,061) | B2 35%, the largest share | B2 |

Tungnan University's language center (東南科大華語中心) maps its regular track the same way: 1級 準備級 (A1)
當代1 L1–8; 2級 入門基礎級 (A1) 當代1 L9 to 當代2 L2; 3級 (A2) 當代2 L3–L9; 4級 當代2 L10 to 當代3 L3;
進階高階級 (B1) 當代3 L4–L9; 5級 (B2) 當代3 L10 to 當代4 L3. Its merged table cells make the exact numbering
ambiguous, and publishers give wider ranges (Books 1–6 cover A1–B2 or A1–C1), but every source agrees on the
picture above.

The book texts grow with the level: reading texts average 133 characters in Book 1, 426 in Book 2 and 565 in
Book 3. The book's own recordings speak about 2.0 characters a second in Book 1 L1–8, 2.5 in L9–16, 3.2–3.5 in
Book 2 and 3.9 in Book 3.

## How the exam is given today

- **In Taiwan, listening and reading are a computerized adaptive test** (CAT, 電腦化適性測驗): the test taker
  picks no band, the computer estimates their level as they answer and picks the next item, and items of every
  band's types can appear. Speaking and writing are still taken by band. Its settings are in "The adaptive
  test (CAT)" below.
- **Listening**: about 35 items (25–40), about 50 minutes. After an item finishes playing, the taker has 10
  seconds to answer, then the next item comes on its own.
- **Reading**: about 35 items, 60 minutes. Answering fewer than 25 lowers the score in proportion.
- **One item at a time, no going back**: answers can't be checked or changed later.
- Not stated anywhere official: whether a recording or passage with 2–3 questions shows them on one screen or
  one at a time in the CAT.
- The fixed-form tests (paper or computer, one band each) have 50 listening items (about 60 minutes) and 50
  reading items (60 minutes); takers can skip around and check within the time. The Novice test has 25 of each.

## Item types by band (from the mock exams)

The parts do not sit in the same place in every volume, so the tables give ranges across the volumes we have.
Lengths are Han characters only, as min / median / max. A text or recording is counted once, even when it
carries several questions. No single volume's layout is the rule.

Two limits. Reading texts printed as images (notices, ads, letters, web pages, tables) have no text layer, so
their lengths are an OCR estimate: 29 of Band B's 73 texts and 4 of Band C's 34. The text inside Novice and
Band A pictures and realia was not measured, and neither was Band B vol. 1 reading items 36–37 (a whole page
printed as an image).

### Listening

**Novice** (25 items, vol. 1 only)

| Part | Items | Choices | Plays | Length | What the taker does |
| --- | --- | --- | --- | --- | --- |
| P1 | 1–10 | 3 pictures | twice, 5 s between, 10 s after | sentence 4 / 6 / 10 | hears one sentence, picks 1 of 3 pictures |
| P2 | 11–20 | 3 spoken | twice | choice 4 / 7 / 10 | sees one picture, hears 3 sentences, picks the one that fits |
| P3 | 21–25 | 3 spoken | twice | dialogue 13 / 20 / 26 | a 2-turn question and answer, then a spoken question and 3 short choices |

**Band A** (50 items)

| Part | Items by volume | Choices | Plays | Length | What the taker does |
| --- | --- | --- | --- | --- | --- |
| P1 看圖回答 | v1, v2: 1–25 · v3, v4, v5: 1–10 | 3 spoken | twice, about 5 s after each | question 5 / 7 / 12 | one picture, a spoken question, 3 spoken answers |
| P2 問答理解 | v1, v2: 26–40 · v3, v4: 11–25 · v5: 11–28 | 3 pictures | twice | recording 10 / 24.5 / 42 | a 2-turn question and answer, picks 1 of 3 pictures |
| P3 對話理解 | v1, v2: 41–45 · v3, v4: 26–40 · v5: 29–40 | 3 pictures | twice | dialogue 25 / 47.5 / 92 | a 4-turn dialogue and a spoken question (7 / 11.5 / 18), picks 1 of 3 pictures |
| P4 對話 | v1, v2: 46–50 · v3, v4, v5: 41–50 | 4, printed and read aloud | once | dialogue 44 / 64.5 / 104 | always 4 turns, then the narrator's question (8 / 10 / 19); choices 2 / 9 / 14 |

All Band A listening groups are single questions.

**Band B** (50 items; every item plays once, the choices are printed and read aloud)

| Part | Items by volume | Questions per recording (per paper) | Recording length by questions in the group |
| --- | --- | --- | --- |
| P1 對話 | 1–30 (v4: 1–31) | 13–20 singles, 2–7 pairs, 1–2 triples | 1 q: 18 / 48 / 115 · 2 q: 63 / 149 / 202 · 3 q: 152 / 261.5 / 376 |
| P2 段落 (talks: announcements, broadcasts, voicemail, reports) | 31–50 (v4: 32–50) | 0–4 singles, 5–7 pairs, 1–2 triples | 1 q: 58 / 79 / 105 · 2 q: 59 / 121 / 198 · 3 q: 203 / 261 / 356 |

Dialogues have 2–8 turns (median 4). Questions are 6 / 11 / 23 characters in P1 and 6 / 13 / 32 in P2; choices
2 / 9 / 16 and 1 / 8 / 15. A lead-in line (請聽……然後回答兩個問題) is 14 / 22 / 31 characters before dialogues and
14 / 20 / 55 before talks.

**Band C** (50 items; every item plays once, the choices are printed and read aloud)

| Part | Items by volume | Questions per recording, by volume | Recording length by questions in the group |
| --- | --- | --- | --- |
| P1 對話 | 1–25 (v4: 1–27) | v1, v2: 2, 2, 3, 3, 3, 4, 4, 4 · v3: 2, 3, then five of 4 · v4: eight singles, 3, then four of 4 | 1 q: 34 / 49 / 100 · 2 q: 30 / 157 / 199 · 3 q: 243 / 285 / 377 · 4 q: 271 / 359 / 501 |
| P2 段落 (one speaker) | 26–50 (v4: 28–50) | v1, v2: 2, 3, 3, 4, 4, 4, 5 · v3: 1, 2, 3, 3, 4, 4, 4, 4 · v4: 4, 4, 5, 5, 5 | 2 q: 190 / 194 / 227 · 3 q: 234 / 279 / 297 · 4 q: 274 / 363.5 / 513 · 5 q: 367 / 428 / 496 (the one single, in v3, is 97) |

Dialogues have 2–12 turns (median 4). Questions are 9 / 16 / 24 characters in P1 and 8 / 16 / 25 in P2;
choices 2 / 9 / 17 and 2 / 10 / 17. The lead-in is 14 / 33 / 91 characters before dialogues and 10 / 28 / 91
before talks.

Booklet rule for Bands B and C: 每題只念一遍，選項念完以後停五秒 (each item is read once; after the choices
are read there are five seconds, then the next item). A group opens with a line like 請聽……然後回答兩個問題,
plays the recording, then asks its questions one after another. The taker always sees the choices. Questions
are printed only when they are read before the recording (Band B vol. 1–3, Band C vol. 1 and 3); Band B vol.
4, 5 and Band C vol. 2, 4 print choices only.

### Reading

**Novice** (25 items, vol. 1 only)

| Part | Items | Choices | Length | What the taker does |
| --- | --- | --- | --- | --- |
| P1 | 1–15 | 3 pictures | sentence 8 / 12 / 22 | a short printed sentence or message, picks 1 of 3 pictures |
| P2 | 16–25 | 3 sentences | choice 5 / 7 / 12 | one picture, picks 1 of 3 printed sentences |

**Band A** (50 items, 60 min)

| Part | Items by volume | Choices | Length | What the taker does |
| --- | --- | --- | --- | --- |
| P1 單句理解 | 1–15 | 3 pictures | sentence 5 / 14 / 27 | a sentence, picks 1 of 3 pictures |
| P2 看圖釋義 | 16–30 | 3 sentences | choice 5 / 9 / 15 | one picture or realia (recipe, library hours, ad, message, notice, timetable, job ad), picks 1 of 3 sentences |
| P3 選詞填空 | v1, v2, v5: 31–40 · v3, v4: 31–35 | 3, one to three characters | gap sentence 5 / 13.5 / 23 | a scene picture with 5 gap sentences; v3 and v4 have one scene, the other volumes two |
| P4 完成段落 | v1, v2, v5: 41–45 · v3, v4: 36–45 | 6-phrase bank | passage 56 / 92 / 138 | a passage with 5 blanks and a bank of 6 phrases, each used once; v3 and v4 have two passages |
| P5 閱讀理解 | 46–50 | 4 | passage 65 / 122 / 161 | 5 passages, 1 question each (8 / 12 / 20); choices 2 / 9.5 / 16 |

**80 of Band A's 100 items rest on a picture** is only the vol. 5 count. It is 75–85 depending on the volume
(listening P1–P3 is 40–45 of 50, reading P1–P3 is 35–40 of 50; reading P2's realia counts as pictures). Band
A's last parts, listening P4 and reading P5, already look like Band B.

**Band B** (50 items, 60 min; four choices throughout)

| Part | Items by volume | Texts | Length |
| --- | --- | --- | --- |
| P1 選詞填空 | v1, v2: 1–15 · v4: 1–17 · v3, v5: 1–18 | 3 passages with 5–6 blanks each (v1, v2: 5, 5, 5 · v4: 5, 6, 6 · the rest 6, 6, 6) | passage 99 / 126 / 164; choices 1 / 2 / 4; the blanks test words and connectives |
| P2 閱讀理解 | v1, v2: 16–50 · v3, v5: 19–50 · v4: 18–50 | 12–20 texts per paper, with 1 to 4 questions each (over all volumes: 14 with 1, 34 with 2, 19 with 3, 7 with 4) | 1 q: 18 / 112 / 125 · 2 q: 36 / 153 / 269 · 3 q: 193 / 287 / 386 · 4 q: 298 / 368 / 407 |

Band B P2 has 32–35 items. Questions are 8 / 15 / 46 characters; choices 2 / 10 / 24. Band B has no pictures
except realia and tables (a notice, a group message, an ad, a table comparing three countries, car-rental
terms).

**Band C** (50 items, 60 min; four choices throughout)

| Part | Items by volume | Texts | Length |
| --- | --- | --- | --- |
| P1 選詞填空 | v1: 1–15 · v2: 1–16 · v3, v4: 1–18 | 3 passages with 5–6 blanks each (v1: 5, 5, 5 · v2: 5, 5, 6 · v3, v4: 6, 6, 6) | passage 113 / 161 / 200; choices 1 / 2 / 4 |
| P2 閱讀理解 | v1: 16–50 · v2: 17–50 · v3, v4: 19–50 | 7–10 long texts per paper with 2 to 6 questions each; none has a single question | 2 q: 123 / 168 / 196 · 3 q: 190 / 278.5 / 461 · 4 q: 196 / 370 / 525 · 5 q: 451 / 499 / 558 · 6 q: 428 / 474.5 / 505 |

Band C P2 has 32–35 items. Questions are 8 / 18 / 51 characters; choices 0 / 10 / 23 (0 where the choices are
the marked positions I–IV of a "where does this sentence fit" item).

### From Band A to Band B

- Pictures disappear, apart from realia and tables.
- 3 choices become 4; listening goes from twice to once, with the choices printed and read.
- Single questions become groups of 2–4 questions on one recording or text. How many groups depends on the
  volume: Band B listening P1 has 13–20 single-question dialogues in a paper, then a few pairs and triples.
- Talks (monologues) join the dialogues.
- Texts grow from about 100 characters to 150–400.
- Questions move from facts to a speaker's intent or attitude and a text's main idea (這位小姐的意思是什麼？
  作者的看法是什麼？).
- Within Band B: B1 texts are plain, concrete and about everyday life or personal interests; B2 adds
  everyday "professional" topics such as public affairs and social issues, read with different strategies and
  speeds.

### Band C in words

Band C is Level 5 流利 (C1) and Level 6 精通 (C2). There are no pictures and four choices everywhere. Almost
everything comes in groups of 2–5 questions, and the recordings and texts are much longer than Band B's.

**Listening, 50 items, each played once.**

- **Part 1 對話, items 1–25 (vol. 4: 1–27).** Two-person conversations and discussions. Vol. 1 to 3 are all
  groups of 2–4 questions. Vol. 4 opens with eight single-question two-turn exchanges (34–100 characters), then
  five groups of 3–4. A 4-question conversation runs about 360 characters (271–501). Turns are fewer and much
  longer than in Band B: one vol. 1 discussion is two turns of about 135 characters each. A lead-in sentence
  (median 33 characters, Band B 22) sets the scene: who is talking, where, about what (a professor and a centre
  director discussing a paper, two students debating, colleagues).
- **Part 2 段落, items 26–50 (vol. 4: 28–50).** One speaker. 5–8 recordings per paper, groups of 2–5
  questions (one single in vol. 3). A 4-question talk runs about 364 characters (274–513), a 5-question talk
  about 428 (367–496). The lead-ins name the kind: news report, story or legend, service description, a
  researcher's proposal, a research summary, commentary or review, broadcast, self-introduction. Topics are
  academic and public affairs: medicine and health policy, biology and ecology, economics and trade, history
  and folklore, technology and law.
- Questions (our estimate, all four volumes): Part 1 detail 53, speaker's view or intent 44, main idea 2,
  inference 2; Part 2 detail 61, view or intent 34. A typical question is 16 characters (9–25). Many name the
  speaker's stance (……的看法為何, 對……的評價, 說話者提到X主要想表達什麼) or a quoted phrase.

**Reading, 50 items.**

- **Part 1 選詞填空, items 1–15 to 1–18.** Three passages of 113–200 characters (median about 160), 5–6
  numbered blanks each, four choices of 1–4 characters per blank. The choice sets test four-character idioms,
  formal written connectives and adverbs, and near-synonyms that differ in one character: a level above Band
  B's everyday connectives.
- **Part 2 閱讀理解, items 16–50 (vol. 1) to 19–50.** 7–10 texts per paper, each with 2–6 questions. Mostly
  continuous prose (essays, research reports, commentary, news features, a web page); only 4 of 34 texts are
  image realia (forms, a bank letter, a web page). Question kinds (our estimate): detail 83, view or intent
  23, main idea 12, what a quoted phrase refers to 7, sentence placement 6 (a sentence goes in one of four
  marked positions I–IV and the choices are the positions), inference 2. Several questions point to one
  paragraph (根據第二段…).

## Speaking pace

How fast the official recordings speak, measured as the script's characters divided by the talking time (silences
of 0.3 s or longer removed) on Novice vol. 1, Band B vol. 1 and 5 and Band C vol. 1 and 4, with each recording
checked by an offline transcription against its script. Band A was not measured; 4 Band C recordings were left
out because their transcription did not match.

| Band | Kind | Recordings | Characters a second, median (range) | Pause between speakers, s |
| --- | --- | --- | --- | --- |
| Novice | P1 single sentence (first reading) | 10 | 2.38 (2.05–2.6) | – |
| Novice | P3 two-turn dialogue (first reading) | 5 | 2.79 (2.58–2.96) | 1.02 (0.5–1.18) |
| B | P1 dialogues: group of 2 | 9 | 4.88 (4.16–5.28) | 0.65 (0.38–1.04) |
| B | P1 dialogues: group of 3 | 3 | 4.79 (4.58–4.9) | 0.65 (0.43–0.97) |
| B | P1 dialogues: single question | 33 | 4.74 (3.96–5.28) | 0.57 (0.32–1.4) |
| B | P2 talks: group of 2 | 12 | 4.6 (3.92–5.17) | – |
| B | P2 talks: group of 3 | 4 | 4.51 (4.06–4.84) | – |
| B | P2 talks: single question | 4 | 4.05 (3.82–4.54) | – |
| C | P1 dialogues: group of 2 | 2 | 4.89 (4.73–5.05) | 0.54 (0.37–0.72) |
| C | P1 dialogues: group of 3 | 3 | 4.75 (4.5–5.09) | 0.52 (0.31–1.11) |
| C | P1 dialogues: group of 4 | 7 | 4.73 (4.06–5.0) | 0.63 (0.32–1.07) |
| C | P1 dialogues: single question | 7 | 4.84 (4.2–5.47) | 0.58 (0.37–0.63) |
| C | P2 talks: group of 2 | 1 | 4.38 | – |
| C | P2 talks: group of 3 | 2 | 4.17 (4.15–4.18) | – |
| C | P2 talks: group of 4 | 5 | 4.51 (4.34–4.94) | – |
| C | P2 talks: group of 5 | 2 | 4.24 (4.03–4.44) | – |

Compare the book's own recordings in "Levels and the books": 2.0 to 3.9 characters a second. Band B and C
speak at about 4 to 5.

Timing of a Band B or C item: every recording ends with a non-speech cue tone of about 1.5 s. Single-question
items then go to the question about 4.7 s after the last word. Group recordings end about 2.2 s after the
cue tone, and each question then has its own track. After the last choice there is silence of about 5.2 s
(5.08–5.47 s over 200 items). Novice items play twice; only the first reading was measured. The gaps between
tracks are not in the audio files.

## How the tests are scored

- **Band tests** (Novice 25 + 25 questions, Bands A, B and C 50 + 50): each skill is reported out of 80.
  Nothing is taken off for a wrong answer; a blank counts as wrong. Each paper has its own conversion table
  from right answers to the score.
- **Pass scores** are out of 80, listening / reading.
- **Certificate rule since 2020**: listening plus reading must reach a total, and each skill must reach a
  minimum.
- **Right answers needed** on the official mock papers are given as a range across the volumes.

| Level | Pass score, listening / reading | Total needed | Minimum, listening / reading | Right answers needed on the mock papers, listening / reading |
| --- | --- | --- | --- | --- |
| Novice 1 | 38 / 39 | 77 | – | – |
| Novice 2 | 59 / 61 | 120 | – | – |
| Level 1 | 41 / 42 | 83 | 37 / 38 | 22–25 / 21–27 |
| Level 2 | 57 / 60 | 120 | 51 / 53 | 36–38 / 37–42 |
| Level 3 | 46 / 48 | 94 | 42 / 44 | 22–23 / 22–26 |
| Level 4 | 61 / 64 | 125 | 53 / 56 | 36–38 / 36–40 |
| Level 5 | 50 / 52 | 102 | 46 / 47 | 25–31 / 24–35 |
| Level 6 | 61 / 69 | 130 | 54 / 61 | 36–41 / 41–46 |

A dash means we have no figure.

**Finding (ours, measured 2026-11-23, not published by SC-TOP):** every official conversion table follows one
ability scale. With theta the Rasch ability (the same scale the adaptive test uses), the band score is
10 × theta + K, kept between 10 and 80, with K = 100 for Novice, 70 for Band A, 50 for Band B and 30 for
Band C. We checked it two ways:

1. It reproduces the published pass scores from the adaptive test's pass scores (next section) for 14 of the 16
   level and skill pairs exactly, and the other two within 1 point.
2. We fitted a 50-question paper with normally spread question difficulties to each of the 30 official tables.
   The typical error is 0.2 to 1.2 points.

The fitted papers:

| Band | Where the questions centre (theta) | Spread |
| --- | --- | --- |
| Novice | about -5.2 | 1.1 |
| Band A | about -2.7 | 1.25 |
| Band B | about -0.1 | 1.05 |
| Band C | between 1.25 and 2.25 | 0.75 |

## The adaptive test (CAT)

The official computer adaptive test picks one question at a time for the taker's current estimate. It uses the
Rasch model and reports 0 to 700 per skill.

**Settings seen on the official practice test**

- Start at ability 0.3 (spread 2 for listening, 2.5 for reading).
- At most 35 questions per skill, at least about 22. It stops early once the estimate's error is 0.35 or less.
- A group of questions that has started is finished, so a skill can run over: reading ran to 40 once.

**Score** = 500 + 50 × theta, rounded to the nearest 5, the same line for listening and reading. We measured
this over four sittings of the official practice test. One pair is exact (theta 2.97218 gave 650); the others
matched within 2 points. It is our reading of the practice site, not a published rule.

**Pass scores**, listening / reading:

| Level | Listening | Reading |
| --- | --- | --- |
| Novice 1 | 190 | 195 |
| Novice 2 | 295 | 305 |
| Level 1 | 355 | 355 |
| Level 2 | 435 | 450 |
| Level 3 | 480 | 490 |
| Level 4 | 555 | 570 |
| Level 5 | 600 | 610 |
| Level 6 | 655 | 690 |

The overall level appears to be the lower of the two skills (inferred, not published).

**What the official practice site does** (https://cbt.sc-top.org.tw/sctopj/)

- Band A picture questions are read twice, with about 5 s after each reading. Printed-choice dialogues and all
  of Band B and C play once.
- About 10 s to answer: 5 s of silence, then a 5 s bar. No replay and no pause. The taker can change the answer
  until time is up.
- Listening shows the volume, the progress and the question number, but no clock.
- Adaptive reading has one 60-minute clock and no going back. Fixed-form reading allows going back and has a
  number grid.

## Item-writing rules (SC-TOP's 命題設計概述)

An item is a stem (the recording or text), a question and choices: one right answer and tempting wrong ones.
It tests one of three things: the main idea, an important detail, or the speaker's thinking and way of saying
it.

**Stem**
- The first sentence sets the scene and the topic.
- Realistic and logical; no words above the level, no proper nouns, no slang; nothing unneeded.
- Dialogue turns are shared evenly: one-word replies leave too little to ask about.
- A complete, connected paragraph.

**Question**
- Exactly one question, stated completely and clearly, at the level.
- No negative questions (not 小美不喜歡吃什麼？).
- Never answerable from common sense or widely taught culture facts without the text.

**Choices**
- About the same length, at most about 15 characters.
- Ordered by length or by logic (numbers, direction, time); the right answer's position spread evenly.
- No compound choices (both A and B) and no "all of the above" or "none of the above".
- Third-person wording; no proper nouns or slang; positive and negative statements balanced.
- Each relates to the text; exactly one is right; wrong ones are tempting but not defensible.
- The right answer paraphrases the text, never copies it.
- No choice contains another (肚子痛 is a kind of 身體不舒服, so both would be right).
- Every choice answers the question asked.

**Groups (several questions on one text)**
- Each question tests a different point.
- No question gives away another's answer, and their choices are not the same or similar.

**Fairness and originality**: no content that some groups know better than others; items are new, never taken
from textbooks, workbooks or earlier tests.

**Topics** (11 domains): personal information, food and drink, travel, free time, health, shopping, daily
routine, work, home and surroundings, relations with others, education.

## Sources

- Mock exams (format reference only): `materials/tocfl/mock-exams/` in the main checkout, from
  https://tocfl.edu.tw (Novice 2018; Band A, Band B vol. 1–5; Band C vol. 1–4).
- Our measurements of them (2026-11-23): `output/tocfl-blueprint/` in the main checkout (`blueprint.md`,
  `cat-scale.json`). It is gitignored scratch.
- Official practice sites (observed 2026-11-23): https://cbt.sc-top.org.tw/sctopj/ (exam behaviour) and
  https://cbt.sc-top.org.tw/cato/ (CAT practice).
- TOCFL brochure (levels, words, hours, parts): https://tocfl.edu.tw/OS/dm/TOCFL_En_DM.pdf
- CAT brochure: https://etudes-chinoises.unistra.fr/websites/lge/departements/chinois/CAT_En_DM.pdf, and the
  official CAT page https://tocfl.edu.tw/tocfl/index.php/test/cat/list/2
- Item-writing overview (命題設計概述, 2022): https://tocfl.edu.tw/assets/files/2022presentation.pdf
- Tungnan University course table: https://clc.tnu.edu.tw/zh_tw/c2/c2_1
- Word levels: TBCL in `public/data/levels/levels.json` (`npm run levels:build`, see `docs/DECISIONS.md`
  2026-10-04).
