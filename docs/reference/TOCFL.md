# TOCFL reference

What the official Test of Chinese as a Foreign Language (TOCFL, 華語文能力測驗) looks like at each level, how
the *Modern Chinese* books line up with it, and the official item-writing rules. The lesson tests follow it
(`content/lesson-tests/README.md` is their authoring contract).

Sources are listed at the end. The mock exams (© SC-TOP) are saved in the main checkout's gitignored
`materials/tocfl/mock-exams/` (Novice, Band A vol. 1–5, Band B vol. 1–5, Band C vol. 1–4, with scripts,
answers and audio). They are a format reference only: never copy an item.

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
  band's types can appear. Speaking and writing are still taken by band.
- **Listening**: about 35 items (25–40), about 50 minutes. After an item finishes playing, the taker has 10
  seconds to answer, then the next item comes on its own.
- **Reading**: about 35 items, 60 minutes. Answering fewer than 25 lowers the score in proportion.
- **One item at a time, no going back**: answers can't be checked or changed later.
- Not stated anywhere official: whether a recording or passage with 2–3 questions shows them on one screen or
  one at a time in the CAT.
- The fixed-form tests (paper or computer, one band each) have 50 listening items (about 60 minutes) and 50
  reading items (60 minutes); takers can skip around and check within the time.

## Item types by band (from the mock exams)

### Listening

| Band | Part | What the taker does | Choices | Plays |
| --- | --- | --- | --- | --- |
| Novice (25 items) | 1 | hears a sentence, picks 1 of 3 pictures | 3 pictures | twice, 10 s pause |
| | 2 | sees one picture, hears 3 sentences | 3 spoken | twice |
| | 3 | a one-question, one-answer dialogue, then a question | 3 spoken | twice |
| Band A (50 items) | P1 看圖回答, items 1–10 | one picture, a spoken question, 3 spoken answers | 3 spoken | twice, 5 s pauses |
| | P2 問答理解, 11–28 | a 2-line question and answer, picks 1 of 3 pictures | 3 pictures | twice |
| | P3 對話理解, 29–40 | a 4-line dialogue and a question, picks 1 of 3 pictures | 3 pictures | twice |
| | P4 對話, 41–50 | a 4–5-line dialogue and a question | 4, printed and read aloud | **once** |
| Band B (50 items) | 對話, items 1–13 | one dialogue (about 40–100 characters), one question | 4, printed and read | once |
| | 對話, 14–27 | seven dialogues of 100–180 characters, **2 questions each** | 4 | once |
| | 對話, 28–30 | one discussion of about 315 characters, 3 questions | 4 | once |
| | 段落, 31–50 | talks: announcements, voicemail, self-introductions, broadcasts, speeches, news; 110–200 characters with 2 questions each; the last two 250–400 characters with 3 | 4 | once |

Band B rule, from its booklet: 每題只念一遍，選項念完以後停五秒 (each item is read once; after the choices
are read there are five seconds, then the next item). A group opens with a line like 請聽……然後回答兩個問題,
plays the recording, then asks its questions one after another. In the paper booklet the taker sees all of a
group's choices while listening; dialogue questions are only spoken, while talk questions are also printed.

### Reading

| Band | Part | What the taker does | Choices |
| --- | --- | --- | --- |
| Novice | 2 parts | short text → picture; picture → sentence | 3 |
| Band A (50 items, 60 min) | P1 單句理解, 1–15 | a sentence, picks 1 of 3 pictures | 3 pictures |
| | P2 看圖釋義, 16–30 | one picture, picks 1 of 3 sentences; items 21–30 are realia (recipe, library hours, ad, message, notices, bus or train timetable, job ad) | 3 |
| | P3 選詞填空, 31–40 | 2 scene pictures, 5 gap sentences each | 3 |
| | P4 完成段落, 41–45 | one passage of about 110 characters with 5 blanks and a 6-phrase bank | bank |
| | P5 閱讀理解, 46–50 | 5 passages of 83–136 characters, 1 question each | 4 |
| Band B (50 items, 60 min) | P1 選詞填空, 1–18 | 3 passages of about 140–165 characters, 6 blanks each; the blanks test words and connectives (尤其、除了、至於) | 4 |
| | P2 閱讀理解, 19–50 | 14 texts: five short ones (50–110 characters, 1 question; a realia notice or ad 2), then texts of 180–290 characters with 2–3 questions, and last a story of about 400 characters with 4 | 4 |

Band B has no pictures except realia and tables (a supermarket notice, a group message about sharing a taxi, an
ad, a table comparing three countries, car-rental terms).

**80 of Band A's 100 items rest on a picture** (listening P1–P3, reading P1–P3). Band A's last parts, listening
P4 and reading P5, already look like Band B.

### From Band A to Band B

- Pictures disappear, apart from realia and tables.
- 3 choices become 4; listening goes from twice to once, with the choices printed and read.
- Single questions become groups of 2–4 questions on one recording or text.
- Talks (monologues) join the dialogues.
- Texts grow from about 100 characters to 150–400.
- Questions move from facts to a speaker's intent or attitude and a text's main idea (這位小姐的意思是什麼？
  作者的看法是什麼？).
- Within Band B: B1 texts are plain, concrete and about everyday life or personal interests; B2 adds
  everyday "professional" topics such as public affairs and social issues, read with different strategies and
  speeds.

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
  https://tocfl.edu.tw (Novice 2018; Band A and Band B vol. 1–5).
- TOCFL brochure (levels, words, hours, parts): https://tocfl.edu.tw/OS/dm/TOCFL_En_DM.pdf
- CAT brochure: https://etudes-chinoises.unistra.fr/websites/lge/departements/chinois/CAT_En_DM.pdf, and the
  official CAT page https://tocfl.edu.tw/tocfl/index.php/test/cat/list/2
- Item-writing overview (命題設計概述, 2022): https://tocfl.edu.tw/assets/files/2022presentation.pdf
- Tungnan University course table: https://clc.tnu.edu.tw/zh_tw/c2/c2_1
- Word levels: TBCL in `public/data/levels/levels.json` (`npm run levels:build`, see `docs/DECISIONS.md`
  2026-10-04).
