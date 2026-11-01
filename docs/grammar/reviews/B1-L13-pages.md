# B1 L13 exercise pages: author notes (2026-11-01)

File: `content/grammar-practice/lessonThirteen.json`. All items `slot-build`, 4–6 tiles, no prompt/sub/glossary/gaps/successNote/me. Ids kept (`l13gN-pM`); old spot-fix own items dropped. Gate `BOOK1_LESSON=lessonThirteen npx tsx --test tests/content/grammarPracticeBookOne.test.ts`: 11/11 pass.
Scans: `materials/book1/L13/` has no PNGs; checked `public/data/book-pages/modern-chinese-1/page-295…306.webp` instead.

## G01 p.295 V(一)V: 3 book items, 0 own
- #1 `你要不要[看][看]？` B's 我也看過 decides 看 over a doubled 聽 trap; 一 (no room for V一V), 不 (要不要 already asks).
- #2 B: `我常常在家[上][上網]，不太出去。` Added "，不太出去". Trap: the second 上網 tile (上網上網, the AB-AB mistake), plus 一 and 了. 網 on its own isn't a taught word, so the tiles are 上 + 上網.
- #3 B: `我們可以[看][一][看]衣服，可是我不想買。` Added "可是我不想買" so 看 wins over a doubled 買. 了 trap (看了看).

## G02 p.296 從……往……: 3 book, 0 own (generated illustrations kept, boxes unchanged)
- #1 `[從][這裡][往][上]看，…` Traps 外, 裡. 下 left out because 從下往上看 would also be right.
- #2 `[從][車裡][往][外]看，…` Traps 上, 前. 裡 and 這裡 left out (從裡往外看 / 從這裡往外看 are right).
- #3 DEVIATION: the book has two open blanks. First clause built `[從][學校][往][郵局]走`, second fixed `，你會看到一隻貓。` Traps 銀行 (not on the map), 到.

## G03 p.297 就: 3 book, 0 own
- #1 A: `我[七點][就][到][了]。` Traps 也, 會. The time is a single tile: nothing in the book separates an early time from a late one.
- #2 B: `往前走，[你][就][可以]看到台北101了。` (the cue 往前走 stays as printed text). Checks that 就 comes after the subject (就你 → fallback). Traps 也, 再, 我.
- #3 B: `你上網找一找，[就][可以]找到了。` (the cue 上網 stays as printed text). Traps 再, 在, 想. 也 left out: here B is offering another option, so 也可以 would be close to right.

## G04 p.303 就（要）……了: 3 book, 0 own
- #1 `[明天][就要][考試][了]` traps 快要 (can't follow a set time), 已經.
- #2 `她[下星期二][就要][回國][了]` traps 快要, 會. Added 回國 to allowWords (printed cue).
- #3 `火車十分鐘[以後][就要][來][了]` traps 以前, 快要. 十分鐘 is fixed so the item stays at 6 tiles.

## G05 p.304 + p.306 Time-duration: 11 book, 0 own
- p.304 #1: both 他每天 and 每天他 accepted. Trap 的 (no object, so no 的).
- p.304 #2: trap 十分 (a clock time vs a length of time).
- p.304 #3 DEVIATION: the book has 10 words. "我現在太累了，可以" is fixed; the learner builds [先][睡][十分鐘][嗎]. Traps 睡覺 (verb + object before a time), 呢.
- p.306 #1–#4 (rewrite): the source sentence is shown as a plain line, then a build line in the other pattern. The blank count rules out the source pattern. In #3/#4 the 的 note says "that's the sentence you started with". Traps: #1 走路/得, #2 上班/了, #3 的/兩月, #4 a doubled 開 + 的.
- p.306 #5–#8 (rearrange) DEVIATION: the book numbers these ① to ④ under "2. Rearrange". The sources are p.306 #5–#8 so they stay unique and in order. To fit 6 tiles, one leading word is fixed text: 我 (#5, #7 also 明天), 他 (#6), 我決定 (#8). The scan prints #7 as 走/路, two words; exercises.json says 走路. Traps: #5 在, #6 得, #7 走路, #8 上.

## PICTURE-NEEDED
None.

## Unsure
- G02 #3: 到 in the 往 blank (從學校到郵局走) is marked wrong. Some speakers might accept it colloquially.
- G03 #1: 我七點也到了 is grammatical, and only the context (A stressing "early") rules it out.
- G05 p.304 #3: casual speech sometimes says 睡覺十分鐘. It is marked wrong, as the book's pattern requires.
- G05 p.306 #3: 兩月 is a made-up wrong form, used as the trap for the missing measure word.
- G01 #1: the B line shows the verb 看 (看過). The item tests the reduplication form, not which verb to use.

## Review (fresh reviewer, 2026-11-01)
Verdict: FIXED 5 items. Checked every item against page-295…306.webp and the p.296 illustrations; every tile tried in every blank. Gate 11/11.
- G02 #3: the book's walker comes down from the post office toward the school, the cat between them, so both directions pass the cat. Now accepts 從郵局往學校走 (alternative added). Marginal 到 trap (從學校到郵局走) swapped for 去 (go vs direction 往). Alt text no longer says "girl".
- G02 #1: 外 note was false when 外 lands in the place slot; now slot-neutral.
- G05 p.304 #2: 我需要十分鐘休息 ("I need ten minutes to rest", 需要 + time + purpose) is correct Mandarin; accepted as an alternative.
- G05 p.306 #4: 的 note said "that is pattern B" but no 的 placement can build pattern B there; rewritten.
- G01 #2: 上網-in-first-blank note said "never 上網上網" even when the build was 上網上; rewritten.
- Kept wrong: 我七點也到了 (nobody else; A stresses early), 睡覺十分鐘 (the book's pattern A/B point; standard teaching rejects it).

### Unsure
- G03 #1: A's first line 很早就到學校來了 prints the 就…了 frame (book text, kept).
- G04: all three items test 就要 vs 快要 after a time word (book items; other traps vary).
- G05 p.306 #3: copying the source sentence (上兩個月的華語課) fits the 4 blanks; the 的 note asks for pattern A. Fine for a rewrite task.
- G05 p.306 #8: 上一年的日文 is said colloquially in Taiwan (上日文 = attend Japanese class); 上 trap kept, weak.
- G02 #3 illustration has no 郵局/學校 labels (book prints them); envelope sign and clock read clearly enough.

PICTURE-NEEDED: none.
