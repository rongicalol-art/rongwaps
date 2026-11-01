# B1 L03 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonThree.json`. All items `slot-build`, A/B speakers, 4–6 tiles, no prompt/quiet/sub/glossary/gaps/me. Old order-build/listen-build items converted. Book-item ids kept (`l3-gN-book-M`).
Gate `BOOK1_LESSON=lessonThree npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 11/11 pass.

## G01 Measure words (p.74) — 3 book, no own
- #1 `她有[兩][朵]花` + book picture (crop moved right to drop the "1" box). Traps 二, 個, 本, 幾.
- #2 DEVIATION: open in the book. Added `，兩本中文書，一本英文書` so the number is decided: `我要買[三][本]`. Traps 兩 (copy the clause), 個, 幾. Dropped the old p.73 example-picture scene.
- #3 `你[有][幾][本]英文書？` Traps 四 (copy B), 個, 嗎 (幾 + 嗎).
- No own items: the old ones copied example 2 or repeated 二/兩.

## G02 S + 送 + IO + DO (p.75) — 3 book + 1 own
- Rearrange = one blank per book word + 1 trap (6-tile cap).
- #1 `[爸爸][送][他][一本][書]` trap 的. Picture decides the giver (dad gives, pats the boy's head; the scan's handwritten order agrees). exercises.json describes it backwards ("child hands a book to an older man"). Slot notes for the reversed 他送爸爸. Crop moved right to drop the "1" box.
- #2 DEVIATION: 我 fixed (six book words, cap 6 tiles). `我[想][送][她][一個][大蛋糕]` trap 一本. Crop moved right to drop the "2" box (bubble edge loses a few px).
- #3 `[我][送][英國同學][一本][中文書]` trap 的; slot note for 英國同學 first.
- own: `A：你想[送][爸爸][什麼]？ B：一本中文書，他喜歡看書。` — question-word position (什麼 stays in the gift slot), 誰 vs 什麼, 嗎 with a question word, 的 between objects. No book item builds a 送 question.

## G03 這/那/哪 + Nu + M + N (p.82) — 3 book + 1 own
- #1 `[這][三][件]衣服[很]漂亮` traps 個, 哪. 那 not offered (also right).
- #2 `[那][四][朵]花很[好看]` traps 個, 怎麼樣. 這/漂亮 not offered (also right).
- #3 DEVIATION: open answer; noun fixed to 蛋糕 (in the picture). `我想買[這][種]蛋糕` traps 哪, 什麼, 本, 件. 個/那 not offered (這個蛋糕 / 那種 also fine).
- own: `A：你要買[哪][兩][本]書？ B：這兩本。` — 哪 + Nu + M in a question, 二/兩; traps 那, 二, 幾. allowWords + 二.
- Old 這/那 "distance" notes dropped: the pictures don't show distance.

## G04 的 as modifier marker (p.84) — 3 book + 1 own
- #1 DEVIATION: added `，那個很小` so B likes the big one: `我喜歡[大][的]`. Traps 小, 很, 是. Crop top raised so the bow isn't cut.
- #2 DEVIATION: added `這本很舊，` → `我要買[那][本][新][的]` (book example 3 shape 那朵漂亮的). Traps 這, 舊. Crop keeps the book's (舊 jiù, old) caption.
- #3 `（好看）` cue kept as printed. `我喜歡[好看][的]` traps 很 (很好看), 是.
- own: `那件很貴，我要買[便宜][的][衣服]` — 的 between a two-syllable Vs and its noun; traps 貴, 很, 是.

## G05 都 (p.85) — 3 book, no own
- Seven words each; cap 6 tiles, so some words are fixed (DEVIATION):
- #1 `[這][五][枝][筆][都]很貴` (很貴 fixed), trap 個.
- #2 `這[四][個][人][都][是]我的同學` (這, 我的同學 fixed), trap 很.
- #3 `[他們][都][不][喜歡]喝這種茶` (喝這種茶 fixed), traps 沒, 很; slot note for 不都. Crop moved right to drop the "3" box.

## PICTURE-NEEDED
None.

## Unsure
- G02 #3: who gives in the picture is not certain (both hands on the gift; the man looks surprised). Answer follows the book's handwritten order 我送英國同學.
- G03 #1/#2/#3 copy A's 這三件 / 那四朵 / 種 by nature (book "answer" items); thinking is in the measure-word and 很/怎麼樣/哪 traps.
- G04 #2: 新的那本 (Vs的 before the demonstrative) is also grammatical but gets the fallback.
- G02 own is close in shape to example 1 (你想送媽媽什麼).

## Review (fresh reviewer, 2026-11-01)

Crops checked (PIL): all 11 show the right picture, no number boxes. Gate 11/11.

Fixed:
- G01 #2: answer 三 tested addition, not grammar. Now `我要買[兩][本]，一本中文書，一本英文書` so 二/兩 is the real trap (traps 二, 個, 幾).
- G02 #3: the picture can't show which person is 我, so both directions are accepted (`英國同學送我一本中文書` added as alternative, slot note removed). No picture needed.
- G02 own: was example 1 with 爸爸 for 媽媽. Now `A：媽媽送你什麼？ B：[她][送][我][一個]蛋糕。`: perspective swap (你→我, 媽媽→她) and giver/receiver order; traps 你, 一本, slot note for 我送她.
- G03 own: B's `這兩本` printed the answer's 兩本. B is now `這本和那本。`, so the number comes from the two books.
- G04 #2: `新的那本` could be built from the four tiles and got the fallback. 那 is now fixed text: `那[本][新][的]`, traps 舊, 個, 很.

Unsure:
- G03 #1/#2 answers still copy A's 這三件 / 那四朵 (book items by nature); the 個/哪/怎麼樣 traps carry the thinking.
- G01 #3: B's line prints 有 and 本; only 幾 vs 四 vs 嗎 is really tested.
- G04 #2: a blank right after fixed 那 looks a little odd; the alternative was a 2-blank item like #1/#3.
