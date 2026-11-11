# B2 exercise pages, second opinion — Codex (gpt-6.1-sol, medium) as reviewer, Claude triage, 2026-11-11
Verdict: PASS after fixes

## What was done
- Codex read every item of all 16 lessons (430) as a Taiwan teacher marking a paper: is each accepted sentence natural, is any rejected filling actually right, are pinyin and English right. It read the item text only (no scans, no pictures).
- It raised 60 points. Claude checked each one against the item, its picture and the book's grammar note.

## Real problems (all fixed)
- `b2l7g4-3` — `是不便宜，可是…` was a second right answer; the 不 tile is gone.
- `b2l7g7-2` — `剛喝酒還開車` was a second right answer; the tray is 剛 / 喝酒 / 就 / 也 / 吃飯 and 開車 is printed.
- `b2l14g2-1` — `我不常常在網路上買東西` was a second right answer; the 常常 tile is gone.
- `b2l1g4-2` — `早飯吃完` is accepted as well as `吃完早飯`. `b2l2g6-1` — `你沒洗頭多久了` is accepted as well.
- `b2l2g8-2` — `又去了` is right when the speaker is not in Taiwan; the 去 tile is gone. `b2l2g5-2` — `是多貴` is said in Taiwan; the 是 tile is gone.
- `b2l8g2-5` — `連兩個位子都沒有` is fine for a party of two; the 兩 tile is gone. `b2l12g6-1` — the 下 tile is gone (`減不下` is heard).
- `b2l3g6-2` — `看起來有點兒遠` is commonly said for "seems"; the 看 trap is 住 now.
- `b2l7g4-2` — `很是重要` is correct formal Chinese; 很 is printed so it cannot be built.
- `b2l16g5-3` — 別的國家的人 treated Africa as a country; 別的地方的人.
- 玫瑰花 is méiguīhuā (Taiwan reading) in lessons 8, 11 and 12. English of `b2l4g5-3`.
- `b2l10g7-1` — the swapped order now gets its own note.

## Not changed, and why
- The five picture items of lesson 4 and `b2l1g7-3`: the picture decides the answer; Codex could not see it.
- `游去游來`, `休息一點兒`, `才睡著了`, `沒花幾錢`, `吃個飯才走吧`, `等等，還是新的`: a teacher would correct these.
- `想得出來` / `想不出來` for remembering, `寫起來` for writing down, `只五百塊錢`: the book's grammar notes teach the other form.
- Pinyin of 唱不好, 學不會, 睡不著, 牛仔褲: kept as the app's word cards have them.
- `b2l5g7-2`, `b2l13g1-3`, `b2l14g3-6`: the sentences are the book's own.
- Context traps where the other answer is grammatical but against the dialogue (`喝完了，明天再買`, `考試剛開始，學生就回家了`, `我吃得出來` after 真的嗎？, `你不買嗎` before 我又忘了買).
