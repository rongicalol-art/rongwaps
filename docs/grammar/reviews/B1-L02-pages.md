# B1 L02 exercise pages — author notes (2026-11-01)

File: `content/grammar-practice/lessonTwo.json`. All items `slot-build`, A/B speakers, no prompt/sub/glossary/gaps.
Gate: `BOOK1_LESSON=lessonTwo npx tsx --test tests/content/grammarPracticeBookOne.test.ts` → 10/10 pass.
Old tests `grammarPracticeQuality`/`grammarPracticeContext` now fail for L2 ("titled by its own question", per-slot repair for right tiles in wrong slots). They conflict with the brief (no titles; `fallbackRepair` covers order) and need retiring for Book 1 pages.

## G01 Indicating Time (p.55) — 3 book + 2 own
- #1 `現在[十][點][十五][分]` + clock 10:15 (the book's example answer). Traps 三 (long hand on 3 = 15), 號. Hour/minute swap → fallback.
- #2 `今天[星期][四]` + May 2019 calendar with 16 highlighted (p.54 calendar + table: 五月十六號 = 星期四). Traps 十六, 號, 五, 幾. 四星期 → fallback.
- #3 `今天[十二][月][七][號]` + Dec 2019 calendar, 7 highlighted (book example answer). Main test: 七月十二號 swap (fallback); traps 點, 幾.
- own 4: ask `現在[幾][點]？` before B: 九點二十分 — 幾 vs 什麼, 點 vs 分/號.
- own 5: `今天[星期天]` + calendar 19 May (Sunday) — 星期七 mistake, column misreading (一/六).
- allowWords 二三四五六九: numbers printed in the p.54 calendar/clock table; individual digits aren't in the vocab list.

## G02 Placement of Time Words (p.55) — 3 book + 1 own
- #1 `我[今天][十點][下課]` + clock 10:00 labelled 下課. Traps 上課, 十分. Time after verb → fallback.
- #2 `[我/星期天][星期天/我][不][去]學校` (both orders accepted). Traps 沒, 是; 不 before the time word → fallback. Deviation: the day is not context-decided (only one day tile); the item tests order and 不, not which day.
- #3 `我[七月][十號][去]日本` + calendar 7/10 labelled 日本. Traps 十月, 七號, 七點. Date after verb → fallback.
- own 4: `你[幾點][去]圖書館？` before B: 我下午一點去 — question word stays in the time slot; 幾號/星期幾 traps.
- Dropped old allowWords 日本 (taught in L1).

## G03 有/沒有 (p.56) — 3 book, no own
- #1 `我[沒][有]美國朋友，我有日本朋友。` Added follow-up clause to make the answer "no". Traps 不 (不有), 是, 很.
- #2 `[我][有]手機。` + book phone picture (crop unchanged, re-verified: whole phone, no "2" label/caption). Traps 你, 是, 沒.
- #3 `[他][有]水，我沒有。` Added "，我沒有" so B can't be the owner. Traps 我, 誰, 沒.
- No own item: 不有 and 有/是 are already tested; nothing new worth adding.

## G04 的 (p.60) — 3 book + 1 own
- #1, #2 single blank as printed, tiles 的/是/有/很, each with its own why.
- #3 Deviation: book `____的____明天去美國` is fully open. Added A：你的孩子明天去日本嗎？ and B：不，[我]的[孩子]明天去美國。 Traps 你 (pronoun flip), 他, 朋友; 孩子的我 → fallback.
- own 4: A：老師有孩子嗎？ B：有，[他][的][孩子]很可愛。 — owner/thing order (孩子的他), 的 vs 是.

## G05 Vaux placement (p.61) — 3 book + 1 own
- #1 `我[不][要][吃]水果，我不愛吃。` Added clause decides "no". Traps 沒, 喝; 要不吃/吃要 → fallback.
- #2 `我[很][喜歡][來]學校，我愛我的同學。` Added clause decides "yes". Traps 不, 沒; 喜歡很來/很來喜歡 → fallback.
- #3 `我[愛][喝][奶茶]，不愛喝茶。` Added clause rules out 茶. Traps 茶, 吃, 不.
- own 4: A：你[要][去]老師家嗎？ B：要，我明天去。 — the short answer repeats the Vaux; 喜歡/愛/來 traps.

## G06 Positive-negative questions (p.62) — 3 book + 1 own
- #1 `台灣[熱][不][熱]？` + book heat picture (crop unchanged, re-verified; "1" label and "(熱 rè, hot)" caption outside). Doubled trap 好/好, plus 嗎.
- #2 `你[喜歡][不][喜歡]吃水果？` Doubled trap 要/要, plus 嗎. Book's 喜不喜歡 can't be built from these tiles (no 喜 tile), so it isn't needed as an alternative.
- #3 `你[要][不][要][去]他家？` (book blank covers 他家 too; kept 他家 fixed). Doubled trap 喜歡/喜歡, plus 來.
- own 4: `他[有][沒][有]台灣朋友？` — 有不有 mistake; 嗎, 是 traps.

## Unsure
- G03 #1: "我有美國朋友，我有日本朋友" is grammatical but odd as a reply; the 是/很 repairs lean on that contrast.
- G05 #2: "我不喜歡來學校，我愛我的同學" is a contradiction only by tone, not logic.
- G02 #1 and #3 mirror the question's word order, so they are easy by design (the book's own item).

## Review (fresh reviewer, 2026-11-01)
Verdict: FIXED 9 items. Gate 10/10. Checked every item against p.54–62 scans, every tile in every blank, repair order, pinyin/English, scope; re-cropped p.56 phone and p.62 heat (whole picture, no label/caption).

Fixed
- G01 #1: 三 note now true in the hour blank too ("…; the short hand gives the hour").
- G01 own 4: `現在[幾][點]` was printed verbatim in item 1's A line two items up. Now `今天[幾][號]？ B：今天十六號。`, traps 什麼, 星期 (星期幾), 月 (幾月).
- G02 #3: 日本 is now a blank, so the English-order mistake 我去日本七月十號 can be built and gets the fallback. Dropped 七點 (點-for-date already tested in G01 #3) to stay at 6 tiles.
- G02 own 4: 圖書館 is now a blank, so 你去圖書館幾點 is buildable; the item now tests position, not only 幾點 vs 幾號.
- G03 #1: made airtight by grammar, not tone: two blanks + one 有 tile leave 沒/不/很/是 before 有, and only 沒 is right. 是/很 notes no longer lean on the "我有日本朋友" contrast; new slot repair for 不是 (s2←是) so 我不是美國朋友 gets "是 says who someone is" instead of the 不有 note.
- G04 own 4: English "Yes, and his child…" → "Yes, his child is very cute."
- G05 #2: "我不喜歡來學校，我愛我的同學" was not a contradiction. B now opens `喜歡，我[很][喜歡][來]學校。` (dropped the 同學 clause); 不喜歡 now contradicts B's own answer.
- G05 own 4: old `你[要][去]老師家嗎？ B：要，我明天去。` printed both answers in B's reply, and 來 also fit (A may be at the teacher's). Now `你[要][喝]茶嗎？ B：好，謝謝。`: B taking an offer decides 要 over 喜歡/愛 (all three are modelled on the page, so no copy); 吃 trap; 喝要 → fallback.
- G06 #3: 來 trap removed (你要不要來他家 + 我不要去他家 is fine if A is at his place); replaced by 沒 (要沒要, the overgeneralised 有沒有).

Scenes (for the redraw)
- `month` items (G01 #2, #3, own 5) decide the answer only if the week strip keeps the 年/月 header (G01 #3 needs 12月) and the 日一二三四五六 weekday row (notes say "sits under 四/日").
- `moment` clock (G01 #1 10:15, G02 #1 10:00): notes refer to the short/long hand on 10/3/12; keep the 3/6/9/12 ticks distinct.

Unsure
- G01 #1/#2/#3, G02 #1/#3: the book question models the answer order (answer goes where the question word was). Kept: that is the skill; tiles still allow the wrong orders.
- G03 #2: 我沒手機 / 沒有手機 are grammatical; only the phone picture (the book's own gloss) rules them out.
- G04 own 4 overlaps #3 (pronoun + owner-的-thing order) and copies book example 他的孩子; kept, weak.
- G06 own 4 is book example 2 verbatim (他有沒有台灣朋友); kept because 有沒有 is the one 沒 form no book item tests.
