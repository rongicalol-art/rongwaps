# B1 L16 exercise pages — author notes (2026-11-01)

File: `content/grammar-practice/lessonSixteen.json`. All items `slot-build`, A/B speakers, 4–6 tiles, no prompt/sub/glossary/gaps. Gate: `BOOK1_LESSON=lessonSixteen npx tsx --test tests/content/grammarPracticeBookOne.test.ts` → 11/11 pass.

Sources: `materials/book1/L16/exercises.json`, `transcript.md`, scans `public/data/book-pages/modern-chinese-1/page-373…389.webp` (materials has no L16 PNGs). Only p.374 prints an exercise; pp.384/386/388/390 (exercises for G02–G05) are not in the repo, so those pages are own items only.

## G01 離…遠／近 (p.374) — 6 book + 1 own
p.374 prints no map, so every item gets a follow-up clause that decides near/far. Section II restarts at 1 in print; sources are numbered on through the page (`#5`, `#6`) because the test requires `p.<page> #<n>`.
- #1 `學校[離]醫院[很][近]，醫院就在學校旁邊。` Traps 從 (從…到), 在, 遠.
- #2 `我家[離]百貨公司[很][遠]，坐捷運要一個小時。` Traps 比, 在, 近.
- #3 `學校[離]超級市場[不][遠]，走十分鐘就到了。` Single SV tile; tests 不 vs 沒, and 很/太 against the clause.
- #4 `台北[離]高雄[不太][遠]，搭高鐵只要一個半小時。` (book clause). 只要 decides 不太 over 太; traps 從, 沒.
- #5 A：你家離捷運站遠不遠？ B：`…[很][近]，走三分鐘就到了。` Traps 遠, 是, 有. No 不 tile (不遠 would also be right).
- #6 A：臺灣離你國家遠嗎？ B：`…[很][遠]，坐飛機要十幾個小時。` Added clause decides far. Traps 近, 嗎 (echoing the question), 沒.
- own 7: A：你們學校附近有火車站嗎？ B：沒有，`[學校][離][火車站][很][遠]`。 Tests word order (English "far from" order → fallback); either place first accepted. Trap 近.
- s1 slot notes on every statement item: a non-preposition tile there gets "join the two places with 離".

## G02 本來…後來 (p.383) — 2 own
- own 1: `我們[本來]想去日月潭，可是[後來]下雨了，就沒去。` Traps 以後 (future), 然後 (sequence).
- own 2: A：你哥哥會開車嗎？ B：`會。他[本來][不]會，[後來]學會了。` Traps 沒 (沒會), 現在 (contradicts 會), 以後.
- Title shortened to `本來……後來……` (original title named 原來 too; no item uses it).

## G03 比…更 (p.385) — 2 own
- own 1: A：台北的冬天很冷！ B：`對，可是合歡山[比]台北[更][冷]，還會下雪。` Traps 很, 離, 熱.
- own 2: A：你和哥哥誰高？ B：`哥哥高，可是爸爸[比]哥哥[更][高]。` Traps 最, 很, 矮 (更 presupposes 哥哥 is tall).

## G04 V了O，就… (p.387) — 2 own
- own 1: A：你昨天晚上做了什麼？ B：`我看了書，[就][睡覺][了]。` Past → final 了 (book table rows 1 vs 2). Traps 再, 過, 嗎.
- own 2: A：你們什麼時候去太魯閣？ B：`明天[到][了]花蓮，[我們][就]去。` Tests V了O and subject before 就. Traps 過, 的.
- 才 avoided as a trap: not taught, and 才 is also grammatical in these frames.

## G05 V得 complement (p.389) — 2 own
- own 1: A：你們昨天去日月潭了嗎？ B：`去了，可是我們[玩][得][不太][開心]，因為下雨了。` Traps 的, 很. (夜市 is L16 part 3, out of scope.)
- own 2: A：你朋友會說中文嗎？ B：`會，他[說]中文[說][得]很好。` Tests repeating the verb with an object. Traps 寫, 了, 的.

## Pictures
None used; no PICTURE-NEEDED.

## Unsure
- G01 #4: "台北離高雄很遠，搭高鐵只要…" is not offered (no 很 tile), but a reader could argue 太遠 vs 不太遠 hinges on reading 只要 as "short trip".
- G01 #3/#5: 很近 vs 不遠 both fit short walks; avoided by giving only one SV tile (#3) or no 不 (#5).
- G05: 的 for 得 is common in informal Taiwan writing; notes follow the textbook standard.
- G05 own 1 is close to book example 3 (玩得非常高興); kept because the negative complement 不太開心 is new.
- G02–G05 exercise pages are not in the repo; when found, book items should go before these own items.

## Review (fresh reviewer, 2026-11-01)
Verdict: FIXED 4 items. Gate 11/11 pass. Checked against p.374/389 scans, transcript, vocab ids (all words taught by their part; 日月潭/合歡山/花蓮/太魯閣 are L16-1, so in scope for G02–G05).

Fixes
- G02 own 2: trap 現在 was also right in s3 (他本來不會，現在學會了) and its note false there → replaced with 然後 + note.
- G02 own 1: 然後 note pointed only at 後來; now true in either slot.
- G04 own 2: 過 in s4 builds 我們過去 ("we'll go over"), grammatical, note false → dropped 過 (5 tiles). English reordered: "As soon as we get to Hualien tomorrow, we'll go."
- G05 own 1: 很 note said "they"; speaker is 我們 → "it wasn't much fun".

Author flags resolved
- G01 #4: 只要 ("only takes") does decide 不太遠 over 太遠; no 很 tile, so fine.
- 的 vs 得: p.389 prints 得 in every row and example; notes follow the book. Keep.
- 夜市 (L16-3) → 日月潭 (L16-1): correct scope call.

Unsure
- G02 own 1 is close to p.383 ex. 2 (本來想去…後來下雨就沒去); tests the right contrast, but a reviewer may want a less similar frame.
- G04 own 1 mirrors the p.387 table row 1 (洗了澡→看了書); s2 has a single verb tile (睡覺), so only 就/了 are tested.
- G01 #1/#2/#5/#6: 很 is the only adverb tile (不/太/真 would also fit or are arguable), so the adverb slot is by elimination; the test is 離 and 遠/近.
- G01 #6: 嗎 trap is a different word class; 不 was rejected because 不近 is also true.
- No pictures needed: every G01 item's clause decides near/far (p.374 prints no map).
