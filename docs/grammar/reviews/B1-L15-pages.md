# B1 L15 exercise pages — author notes (2026-11-01)

File: `content/grammar-practice/lessonFifteen.json`. All items `slot-build`, ≤6 tiles. Gate: `BOOK1_LESSON=lessonFifteen npx tsx --test tests/content/grammarPracticeBookOne.test.ts` → 11/11 pass.
Page keys, bookPage, titles and all six picture boxes kept (each has a generated illustration). Dropped `allowWords` (電視/音樂/咖啡 are in taught vocab).

## G01 跟…(不)一樣 (p.348) — 3 book + 1 own
- #1 `妹妹的興趣[跟][弟弟的][不一樣]` + picture (sister enjoys drawing, brother bored). Traps 一樣 (picture), 沒, 比. Tests 弟弟的 (interest vs interest) and the picture decision.
- #2 `她今天的心情[跟][昨天][一樣][好]` + 昨天/今天 portraits. Traps 不 (不跟昨天一樣 is buildable, picture says same), 很 (一樣很好). 比 left out: with 不 it builds the true 不比昨天好.
- #3 `姐姐跑得[跟][妹妹][一樣][快]`. Traps 比, 很. 不 left out (不比妹妹快 would be true).
- own: A：你的美國朋友中文怎麼樣？ B：他說中文[說得][跟][台灣人][一樣]好。 — VO needs the verb repeated (說中文得 trap 得); both table-B orders accepted (說得跟台灣人 / 跟台灣人說得). Trap 比.

## G03 一…，就… (p.349, app part 3) — 3 book, no own
Source sentence on line 1, rewrite on line 2 (no speakers, no arrow).
- #1 `[你][一]到家，[就]給我打電話` — 一 after the subject; traps 我 (給我 = call me), 也.
- #2 `[他][一]說話，[大家][就]知道…` — two subjects, 就 after the second; traps 我, 也.
- #3 `這件事我[一][決定]，[就]開始做了` — traps 以後, 了 (一決定了). 開始 kept fixed: 我一開始就決定做了 would be a valid other reading.
- Traps 馬上/都/在 avoided: they build natural sentences (一…馬上…, 大家都知道).

## G02 V著 (p.354) — 3 book + 1 own
- #1 `中明[看][著][電視]` traps 了, 過, 聽. #2 `國安常常[騎][著][腳踏車]` traps 了, 過, 開. 看電視著 → fallback.
- #3 `宜文[聽][著]音樂，[喝][著]咖啡` traps 吃, 的. 了 not used here: 聽了音樂，喝了咖啡，覺得很舒服 is natural.
- own: A：我可以走了嗎？ B：不可以，你[坐][著]，我有事情跟你說。 — Part B "request to keep an action", untested by the book items. Traps 走, 了, 過.

## Unsure
- G01 #1 is close to A's question (only 不一樣 changes); that is the book's item. 不跟弟弟的一樣 is not buildable now.
- G01 #3 relies on the generated art showing equal speed; the book scan is ambiguous.
- G01 own 跟台灣人一樣說得好 gets the fallback; marginal, not accepted.
- G02 #1 看了電視 is grammatical but odd with 不知道我們已經來了; the 了 note leans on the picture/context.
- G03 #1/#2 trap 也 in the 一 slot builds 你也到家…/他也說話… (loose but not the rewrite); note says 一 pairs with 就.

## Review (fresh reviewer, 2026-11-01)
Checked every item against p.348/349/354 scans and all six illustrations; tried every tile in every blank. Gate 11/11.

Fixed:
- G03 #1–#3: source-line `simplified` had traditional 馬上 → 马上 (the gate only checks presence, not correctness).
- G03 #1: 我 note was wrong if 我 lands after the comma; now "給我打電話 means “call me”: 你 gets home and 你 calls, so no 我 here."
- G03 #3: 了 note said "after 決定", false when 了 lands before it; now "No 了 in the first part: 一決定…".

Author flags resolved:
- G01 #1 near-copy of A: keep. It is the book item; the real decision (一樣/不一樣) comes only from the picture, which the art shows clearly (girl happy, boy bored). 弟弟 (vs 弟弟的) not added as a trap: 跟弟弟不一樣 is common speech, would be a "wrong tile that's also right".
- G02 #1 看了電視: keep. 了/著 is the target confusion and the art (watching, people walking in behind) decides it.
- G03 也 trap: keep. 也 builds a sentence that isn't the requested pattern in either slot; the note is true wherever it lands.

Pictures: G01 #3 art shows the sisters side by side, same stride, both with speed lines: decides 一樣. All six art pieces match their items; no new pictures needed.

Unsure:
- G01 own item is close to the page example 那個美國學生寫字，跟中國人寫得一樣好看 (美國 vs native speaker, V-O-V得). It tests the repeated verb, which the book items don't; owner may want a different topic.
- G02 #3 is mostly verb–object matching plus one 的 trap; weakest item, but it is the book's.
