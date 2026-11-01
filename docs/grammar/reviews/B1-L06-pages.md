# B1 L06 exercise pages — author notes (2026-11-01)

File: `content/grammar-practice/lessonSix.json`. All items `slot-build`, A/B speakers, 4–6 tiles, no prompt/sub/glossary/gaps.
Gate: `BOOK1_LESSON=lessonSix npx tsx --test tests/content/grammarPracticeBookOne.test.ts` → 11/11 pass.
Picture boxes unchanged from the previous file (all seven have generated illustrations). No PICTURE-NEEDED.

## G01 會 (p.136) — 3 book + 1 own
- #1 `[我][不][會][踢]足球，可是我會打籃球。` Added 可是 clause decides "no". Traps 沒 (沒會), 打 (打足球). Subject is a blank because A's 會不會踢 would otherwise print the answer.
- #2 `[他][會][說]中文，也會說英文。` 也 decides "yes". Traps 我, 不, 要.
- #3 `A：你[會][不][會]做牛肉麵？` Traps 沒, 要 (single tile, so 要不要 can't be built), 嗎.
- own: `A：你會游泳嗎？ B：[不][會]，我哥哥會。` Short answer repeats the Vaux; 是/沒/有/要 traps (answering 是 or 沒有).

## G02 得 (p.137–140) — 12 book, no own
- p.137 #1/#2 picture decides 多 (少 trap); #2 answers 好多 (book example 3's 好) because 很多 would copy A's line.
- p.137 #3 + 今天不累; 睡覺 trap (睡覺得).
- p.138 #1 + 他是網球老師; learner adds the repeated 打. #2 builds 睡覺睡得不好 (picture). #3 + 可是我很喜歡踢 decides 不太好.
- p.139 #1 + 大家都很愛吃; builds 牛肉麵做得很好 (order). #2 `[我][籃球][打][得]不錯`, also accepts 籃球我打得不錯 (L4 topic). #3 builds 棒球打得怎麼樣 (什麼 trap).
- p.140 #1 `我[的]飯做[得][很]好` — the 的/得 contrast in one line. #2 + 可是他不喜歡打 decides 很好. #3 builds 說得好不好 (沒 trap).

## G03 有（一）點（兒）(p.146) — 3 book + 1 own
- #1 `[有][一點兒][累]` (有 vs 是/沒), #2 `[有點兒][渴]`, #3 `[有點兒][小]`. 很/太 left out on purpose: 很累/很小 would also be right.
- own: `我[有點兒][餓]，想吃[一點兒]水果。` 有點兒 + adjective vs 一點兒 + thing.

## G04 可以 (p.147–148) — 6 book + 1 own
- p.147 #1 `你[可以][點][三明治]` (飯 trap, since A doesn't want a meal); #2 accepts 可以在家 / 在家可以; #3 `[可以][一起][去][看]`. 會 is the trap throughout (skill vs suggestion/permission).
- p.148 #1 + 太冷了 decides 不可以 (沒/會/喝 traps). #2 deviation: book blank is open; used the book's own example (洗手間) + 我現在去 so that only "yes" fits. #3 subject 我 kept fixed (你/我們 would also be right); doubled 會 trap against doubled 可以.
- own: `我[會]游泳，可是媽媽說我今天[不][可以]去。` 會 (skill) vs 可以 (permission) in one sentence.

## Unsure
- Most 得 items echo A's frame (the book's design). The decision is in the comment, 的/得 and the repeated verb.
- p.137 #2 好多 instead of 很多: forced by the copy rule.
- p.140 #3 doubles 好 with no doubled trap (6-tile cap).
- p.147 #1 uses 點 (to order) from example 1; the 三明治 gloss is a tile, not printed text.
- G01 own fallback relies on reading "我哥哥會" (no 也) as a contrast.

## Review (fresh reviewer, 2026-11-01)
Verdict: FIXED 6 items. Gate 11/11 pass. All 24 book items present, in order, faithful to scans p.136–148. Pictures checked (7 illustrations); each shows what its item needs. No PICTURE-NEEDED.

Fixes
- G01 #2: trailing 也會說英文 printed the 會說 frame to copy → 也很喜歡說 (still decides "yes"; 不 note updated).
- G01 #3: two 會 + one 不 gave 會不會 away → 嗎 replaced by a second 要 (要不要 is the doubled wrong frame; B's 不會 decides).
- G01 own: contrast now explicit: `[不][會]，可是我哥哥會。` (no longer relies on reading the missing 也).
- p.138 #2: illustration shows him awake, not sweating → note and alt say "lies awake at night".
- p.140 #3: doubled 好 had no doubled trap → 說 printed, tiles 得 好 好 不 快 快 (快不快 vs B's 說得很好).
- G04 own: 沒 note was false when 沒 lands in slot 1 (我沒游泳) → rewritten to hold anywhere.

Unsure
- p.140 #1 `我[的]飯做[得][很]好`: A's 你的飯做得 prints the 的/得 positions; book design, kept.
- Most 得 items still copy A's frame (book design); decision lives in the comment and the repeated verb.
- p.148 #2 slot 2 (去) has no real competitor and is echoed by 我現在去; harmless, kept.
- G04 own: 可以游泳 / 不會去 swap gets only the fallback (會 = skill, 可以 = allowed); fine for this level.
- p.148 #1 reuses the page's own example 1 (冰淇淋) as the open completion.
