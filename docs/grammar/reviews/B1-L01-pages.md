# B1 L01 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonOne.json`. All items `slot-build`; no prompt/quiet/sub/glossary/gaps/successNote/me. Book-item ids kept (`l1gN-pM`) so old references stay valid. Gate `BOOK1_LESSON=lessonOne npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 10/10 pass.

## G01 p.38 叫 / 姓 / 是 (title kept "Complete the sentences."; the book prints no instruction)
- Book: p.38 #1, p.38 #2, p.39 #3, p.39 #4. All use the p.38 cast row (existing boxes; crops checked).
- #1: blank = name; 4 classmate names, the cast's 日本人 note decides.
- #2: both printed blanks (country + surname). Traps 家樂 / 高家樂 after 姓 (姓 = family name only), 美國 / 印尼 (picture).
- #3: both printed blanks. Trap 王 after 叫 (叫 = given or full name, not surname alone). 王宜文 not offered, so one answer.
- #4: both printed blanks 姓 / 叫. Traps 是, 不姓, 不叫 (picture says 李中明).
- Own `l1g1-own1`: 友美不是臺灣人，她是日本人. Mistake: 姓/叫 for a nationality; 不是 for negation (no book item negates).

## G02 p.39 很 / 不 + Vs
- Book: p.39 #1, #2, #3, single printed blank each; tiles 很 / 不 / 是 / 不是 (是 before a Vs is the book note's mistake). Pictures decide 很 vs 不.
- Crops kept: p.39 #1 [0.211,0.685,0.106,0.1], #2 [0.41,0.686,0.184,0.111] (left edge loses ~7px of a protruding paper sheet; going wider would take in the "2" number box), #3 [0.663,0.686,0.195,0.143] incl. the book's (累)/(中明) captions.
- Own `l1g2-own1`: 友美是日本人，她很可愛. Mistake: 是 vs 很 (noun vs state verb) in one sentence; 叫 tile mixes in G01. New crop p.38 picture 1 with caption [0.172,0.694,0.14,0.162], checked.
- Unsure: 很 vs 不 for 可愛 rests on her smiling in the picture.

## G03 p.40 嗎
- Book: p.40 #1, #2, #3.
- #1 DEVIATION: the book blanks only 嗎. At this point 嗎 is the only taught final particle, so a lone end blank has no plausible wrong words. Blanked 姓 王 嗎 instead; B's 他不姓王 decides 王 (trap 李), 姓 vs 叫/是, and 嗎 last.
- #2: printed open blank → 日本人 + 嗎. Traps 哪國人 (question word + 嗎), 誰, 臺灣人. B's 不是 decides a yes/no question. Only one non-Taiwan nationality offered so one answer.
- #3: A 嗎; B's open blank → 很 + 可愛. Traps 不 (picture), 是. Crop kept [0.74,0.762,0.098,0.101].
- No own items (book items already test 嗎 position, question word + 嗎, 是 + Vs).

## G04 p.44 呢
- Book: p.44 #1, p.44 #2, p.45 #3.
- #1: 你 + 呢; traps 嗎, 我, 他 (B answers about himself).
- #2 DEVIATION: book's B is open (own surname). Added B's printed-style clause "，叫家樂" and the p.38 高家樂 picture (new crop [0.355,0.69,0.117,0.166], checked) so B = 我姓高. Traps 你, 叫, 李.
- #3 DEVIATION: B's open answer → B: [我][很|不]忙。 (忙 fixed). B's busyness is personal, so both 很 and 不 are accepted (alternative listed); the item tests 你呢 and answering with 我. Crop adjusted to [0.656,0.15,0.186,0.1] (old box cut the paper stack; new one clears the "3" box and caption).
- Own `l1g4-own1`: A：你忙嗎？ / B：我很忙，你呢？ Mistake: 呢 on an opening question (no earlier statement); traps 呢, 他, 是.

## G05 p.45 S V O
- Book: p.45 #1, #2, #3 (all "answer" items, open in the book).
- #1 DEVIATION: B gets "，台灣很漂亮" so 喜歡 (not 不喜歡) is decided. Traps 你, 不喜歡, 日本.
- #2 DEVIATION: B gets "我…，不喜歡王小姐" (book example 1's frame) so 李小姐 is the one person left. Traps 誰, 王小姐, 不喜歡, 是.
- #3: picture decides 愛. Traps 你, 不愛, 是. Crop kept [0.68,0.762,0.167,0.136]. 愛 via allowWords (book glosses it beside the item).
- Own `l1g5-own1`: 我不喜歡她，我喜歡李小姐. Mistake: 不 position (separate 不 tile) and 她 vs 他 for 王小姐.

## Unsure / for the orchestrator
- Legacy tests now fail by design of the brief: `grammarPracticeQuality` (needs `prompt`, older wrong-tile rule), `grammarPracticeKinds` listen-pick count (L1 listen-picks removed). `grammarPracticeContext` still passes.
- G05 own: once 不 must be placed, three blanks force it in; the thinking is its position and 她.

## Review (fresh reviewer, 2026-11-01)
Verdict: FIXED 13 items. Checked every item against p.38–45 scans, tried every tile in every blank, re-cropped all 12 scene boxes (all clean: whole picture, no stray number boxes or glosses; p.39 #3 and the p.38 crops keep their printed captions on purpose). All 16 book items present, in order, faithful. Gate 10/10.

- All items: line text had no `simplified`, so simplified-script learners saw 誰/學/樂/臺灣/愛/國/歡/嗎 on the sheet. Added `simplified` to every text segment that differs.
- l1g5-own1 REWRITTEN. Old 我[不][喜歡][她]: the blank count forced 不 (only non-pronoun tile left), so the item reduced to 她 vs 他, which is spelling, not S-V-O. New: A：[你][喜歡][什麼]？ B：我喜歡日本。 Tests the question word staying in the object slot (English-style fronting 什麼你喜歡), 什麼 vs 誰 (B names a country), 嗎 with a question word, 你 vs 我. Book example 2 is 你喜歡什麼; no book item builds a question.
- l1g1-p4: 是 in blank 2 note said "a name takes 叫, not 是", false (他是中明 / 我是李中明 are fine). Now: after 姓李 the given name takes 叫. 不姓/不叫 notes made true in either blank.
- l1g1-p2 / p3: a country dropped after 姓/叫 got the "picture says 英國/美國" note, which misses the point. Added slot notes: 姓/叫 takes a name, not a country.
- l1g1-own1: 姓/叫/不姓 notes pointed at 日本人 even when placed in the 臺灣人 blank; now "a nationality takes 是 or 不是".
- l1g2-p1 / p2 / own1: "不是 never goes before a state verb" softened to "is negated with plain 不, not 不是" (contrastive 不是漂亮，是可愛 exists).
- l1g3-p3: 不/是 at the end of A's question got B's picture note; added slot notes: a yes/no question ends with 嗎.
- l1g4-p1 / p3, l1g5-p1 / p3: notes assumed B is "himself" or pointed at the wrong person; made neutral and true for every blank.

### Unsure
- l1g3-p1 (author deviation): 姓王 is still copyable from B's 他不姓王, and 嗎 is the only particle, so the item mostly tests 姓 vs 叫/是 and reading B's denial. Acceptable given 呢 is not yet taught; owner call.
- l1g4-p3: B's 很/不 blank accepts both (B speaks for themself), so that blank has no decision. The brief says context should decide; nothing in-scope can decide it without inventing a fact. Kept both.
- l1g1-p1: tests reading the cast notes, not 叫/姓/是; that is the book's item.
- l1g2-own1 / l1g3-p3: 很 vs 不 for 可愛 rests on the smile in the picture.
- Legacy unit test `tests/unit/grammarPracticeCheck.test.ts` "place the word" fails: it expects l1g3-p1 to be a `gaps` item (author converted it per the brief). Needs a test update by Claude; not touched here.
