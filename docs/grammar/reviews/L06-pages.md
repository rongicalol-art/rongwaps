# L06 grammar pages — rebuild, 2026-10-16

Verdict: PASS (pages). Practice file NOT authored — owner paused `content/grammar-practice/` work today (2026-10-16, see skill header); the task text asking for `lessonSix.json` practice predates that pause.

## Checked

- Transcript `materials/book1/L06/transcript.md` vs both files, page by page:
  - G01 (會): table rebuilt as exactly the printed 2 rows (我會游泳。/我不會打棒球。); removed the invented 3rd row (你會不會做飯), invented examples g1-e4 (她會說中文，可是說得不太快) and g1-e5 (你妹妹會不會騎腳踏車), and the 會-vs-可以 confusion item (可以 is untaught at this page). Lab now shows only printed sentences (我會游泳。/我不會打棒球。/你會不會做飯？) plus a 不-placement repair. Replaced untaught 可以 distractor tiles in the legacy questions with taught-order traps (我會不踢足球, 他不想說中文, 你不會做牛肉麵).
  - G02 (得): the four printed tables now each carry both printed rows as `columns` rows (previously rows were empty shells with only English). Printed cells that had been dropped are restored: 我哥哥說話說得很快。他飯做得很好。我妹妹中文說得很不錯。你的網球打得很好。 All 14 examples verified verbatim printed. Lab (他網球打得不錯。他的牛肉麵做得很不錯。) now uses printed sentences.
  - G03 (有一點兒): table rebuilt as the printed 2 rows with 有（一）點（兒） as printed; removed invented 3rd row (這間房間有點兒小). Explanation trimmed to the book's note. Lab price choice now the printed 我覺得有點兒貴。
  - G04 (可以): subsection rows rebuilt from the printed lines (你可以點一杯熱茶。/你可以送她一件紅色的新衣服。/我們可以點珍珠奶茶。/我可以吃冰淇淋嗎？/我可以去洗手間嗎？/我們可不可以在捷運上吃東西？); the altered summary row 我們可以…在捷運上吃東西嗎 corrected to the printed 可不可以 line. Confusion #3 right, contrast item, and lab choices switched to printed sentences. 我可以去看電影 (invented) removed.
- Confusion rights left as practice-frame answer models (printed book has no answer key): 我不會說中文 (G01 練習 model), 他喝得很多 (G02 placement repair illustration), 這間房間有一點兒小 / 我有一點兒累 (G03 練習 models), 天氣有點兒冷 (shortened from the printed 有（一）點（兒） table form).
- teachingGlossary extended to cover every token shown: G02 +14 (很快, 很慢, 好快, 好慢, 你的網球, 他的牛肉麵, 你哥哥, 你們, 你的飯, 我的飯, 你弟弟的足球, 我弟弟的足球, 她的腳踏車, 不快), G03 +有（一）點（兒）, G04 +13 (一件, 紅色的, 新衣服, 現在, 不知道, 要, 什麼, 想要, 這裡的, 很好喝, （珍珠奶茶）, 會, 游泳).
- Script audit (in-session): JSON parses; every example line found in transcript (Han-normalized); every `columns`/words token present in page glossary; every Han char of lab/contrast/questions strings in glossary chars; part `grammarPages` copies byte-identical to their source pages.
- Scope: patterns used are only 會/得/有一點兒/可以 (L6) plus earlier-lesson forms (吧, 嗎, 好不好, 的, 在, 很/不). No L7+ grammar. Could not run `content:validate`/tests here (no npm per instructions) — gates below not run, engine + vocab test should be run at the content pipeline.

## Issues

- content/grammar/lessonSixPartTwo.json (G04 table english) — BOOK-ERRATA: book prints "He cooks good beef noodles." for 他的牛肉麵做得很不錯。; kept as printed.
- legacy per-page `questions` keep app-authored open-answer models (book prints no key); labeled by each page's `exerciseNote`. They stay unmounted per template; the redesigned practice pass will supercede them.

## Unsure

- G02 confusion repair illustration uses 他喝得很多 (not printed; pattern-consistent, verb 喝 is taught). Flag if the reviewer wants strictly printed display sentences there.
- practice/lessonSix.json: skipped per the owner's same-day pause note; needs a decision whether the task text (rules 4–9 pass) or the pause wins.

## NEEDS-ENGINE

- none
