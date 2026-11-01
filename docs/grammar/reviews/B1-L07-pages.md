# B1 L07 exercise pages — author notes (2026-11-01)

File: `content/grammar-practice/lessonSeven.json`. All items `slot-build`, 4–6 tiles, no prompt/quiet/sub/glossary/gaps/successNote. Book-item ids kept.
Gate: `BOOK1_LESSON=lessonSeven npx tsx --test tests/content/grammarPracticeBookOne.test.ts` → 11/11 pass.
Picture boxes unchanged (all 6 have generated illustrations: p.163 ×3, p.166 ×2, p.171 #3). No PICTURE-NEEDED.

## G01 從…到…來/去 (p.163) — 3 book, no own
- Every item builds 從 PW₁ 到 PW₂ 來/去 (5 blanks); the arrow decides the places, context decides 來/去.
- #1 `他[從][美國][到][台灣][來]看我。` DEVIATION: added purpose 看我 (book ex. 3 shape) so 來 is forced. Trap 去.
- #2 `我在家，他[從][家][到][學校][去]。` DEVIATION: added 我在家 (the waving woman) so 去 is forced. Trap 來. 他從學校到家來 is grammatical but contradicts the arrow (note says so).
- #3 `他[從][餐廳][到][圖書館][去]看書。` Added purpose 看書. No 來 tile; trap 在 (在 for the start point).
- Dropped old own (我從飯店來 = book example 1).

## G02 S + how + 來/去 (p.164) — 3 book + 1 own
- #1 `我們在學校，[你][怎麼][到][他家][去]？` Added 我們在學校 to decide 去 (trap 來). Also accepts 你到他家怎麼去 (natural).
- #2 `他[每天][坐公車][到][學校][來]。` 他 fixed (tile cap). Trap 騎公車. No 去 tile, since nothing decides 來 vs 去.
- #3 `我[不要][走路][到][那家飯店][去]，太遠了。` 我 fixed, 那家+飯店 merged into one tile (tile cap). Added 太遠了 so 去 is forced; trap 來.
- own `l7g2-o1`: A：你明天怎麼到我家來？ B：我[坐][公車][去]。 Mistake: echoing A's 來 (viewpoint switch). Traps 來, 騎, 到.
- Dropped the old listen-build (kind not allowed).

## G03 了 for a change (p.166) — 3 book + 1 own
- #1 `今天天氣[熱][了]` traps 冷 (picture), 是 (是 + Vs), 嗎. 很 deliberately not offered (很熱 is also true).
- #2 `現在東西都[貴][了]` traps 便宜 (picture), 的, 嗎.
- #3 老師/學生 as printed; `你們[懂]了嗎？` / `[懂][了]！謝謝老師。` Tiles 懂×2, 了, 不, 很, 嗎. 懂 in allowWords (printed beside).
- own `l7g3-o1`: A：你要喝咖啡嗎？ B：不要，謝謝。我[要][睡覺][了]。 Tests pattern (2) (Vaux) V + 了 at the end, which no book item uses. Traps 喝, 是, 嗎.

## G04 VO as topic (p.171) — 3 book, no own
- #1 `[坐][捷運]很快…` Book blank is open; only one vehicle offered so 捷運 isn't a guess. Traps 騎, 走路 (contradicts 我不想走路去), 的.
- #2 `…，[買][東西]很方便。` Traps 寄 / 信 (L7 post-office words), 坐.
- #3 `[打][籃球]我會，[打][網球]我不會。` Picture can't say which sport the speaker plays, so both orders accepted. Traps 踢, 足球 (picture).
- Dropped old own (踢足球，我們都很喜歡 = table example).

## G05 又…又… (p.172) — 3 book + 1 own
- #1 B：這裡的夏天[又][熱][又][不舒服]，我不喜歡。 DEVIATION: 夏天 printed (the book blank starts after 的). Book hint words become tiles. Traps 舒服 (B dislikes it), 很. Both orders accepted.
- #2 B：[又][好吃][又][便宜]，我很喜歡。 DEVIATION: added 我很喜歡 to decide the good qualities. Traps 貴 (opposite direction), 和. Both orders accepted.
- #3 B：他[又][喜歡]游泳[又][喜歡]曬太陽，… Hint words 游泳/曬太陽 printed as text (6-tile cap). Traps 不喜歡, 和. 常常 in allowWords (printed in the item).
- own `l7g5-o1`: A：你要到超市去買什麼？ B：我要買[水果][和][茶]。 Tests the book's note that 又 can't be followed by nouns. Traps 又, 也, 還是. Both orders accepted.
- Dropped old owns: 日本和韓國，我都想去 (replaced by the clearer item above) and 飯店又大又舒服 (repeats #1/#2).

## Unsure
- G01: all three book items share one shape; the 來/去 decision rests on added context (看我, 我在家). The decision in #3 is only 在 vs 從/到.
- G02 #1: accepting 你到他家怎麼去 means the item doesn't force the taught position. I accepted it because it's natural Chinese.
- G03 #3: two 懂 tiles make the item easy. The real test is 懂了 (with 了) in the reply.
- G03 own: 要…了 can be read as "about to"; it's the book's (Vaux) V 了 shape.
- G04 #2: 寄/信 are ruled out only by meaning (supermarket ≠ post office).
- G05 #2 貴 note: 又…又 qualities point the same way. That's true of standard usage; 又貴又好吃 does occur in speech.
- G05 #3: doubled 又 and 喜歡 show the frame; the choice is 不喜歡/和.

## Review (fresh reviewer, 2026-11-01)

Checked every item against scans p.163/164/166/171/172 and the six illustrations. Gate 11/11 pass after fixes.

Fixed:
- G02 own `l7g2-o1` removed: answering 你明天怎麼到我家來？ with 我坐公車來 (來 toward the listener) is also natural, so the 來 trap was right too. No sound replacement that doesn't copy A's verb; book items already cover the pattern.
- G03 #3: 懂×2 gave the answer away. Now 懂×2 + 不×2 + 了 + 嗎 (dropped 很, a weak trap); 不 note already covers it (student thanks the teacher).
- G04 #3: 打×2 vs single 踢 gave it away. Now 打×2 + 踢×2 + 籃球 + 網球 (dropped 足球).
- G05 #3: 喜歡×2 vs single 不喜歡 gave it away. Now 喜歡×2 + 不喜歡×2 + 又×2 (dropped 和; the instruction already names 又…又).
- G05 #2 貴 note: "same direction" claim replaced with the context reason (B likes it a lot, so both qualities are good).
- G04 #1 English: "fast and also comfortable".

Unsure:
- G01 #2 added 我在家 is slightly stiff but needed to force 去; the illustration has no waving person at the house.
- G04 #1 is easy (only one vehicle noun, 坐捷運 is the table's example 1).
- G03 #1 illustration shows 25°C → 30°C without 昨天/今天 labels; left-to-right reads fine.
- G02 now has no own item.
