# L01–L08 sentence building — Codex, 2026-10-18
Verdict: PASS

## Checked
- Audited all eight authored practice files for supplied target grammar, position giveaways, unrelated word choices and dock size.
- Reworked 95 items as free-line sentence builds and nine longer items as tap-where frames. Removed one redundant own item about coffee prices; no book item removed.
- Preserved every book item ID, source reference and order against the previous pack sources. Original answer sentences and their readings retained; alternate readings assembled only from existing authored tile readings.
- 可以: textbook L06 transcript pp.147–148 distinguishes suggestions from permission. All six book items now require producing the construction; the word bank no longer supplies 可以 in the sentence.
- 有點兒: the learner produces or positions the degree expression instead of merely choosing an adjective.
- L1 adjective predicates and verb phrases; L2 dates, times, time-before-action and repeated-verb questions; L3 giving and omitted nouns; L4 topic-first answers and 多 placement; L5 locations; L6 得; L7 direction and change; L8 好＋verb and reason questions.
- Retained focused classifier and demonstrative choices, existing particle placement, and longer short-pattern exercises where they directly test the taught point.
- Every new build's answer text equals its feedback sentence after punctuation is removed, and its tile multiplicities exist in the dock. Every wrong tile has a repair; tap-where frames explain each wrong boundary.
- Accepted taught time-before-subject alternatives and both natural placements of 可以 with 在家 / 在這裡.
- Kept printed pictures and glossary entries; free-line builds show their glosses in the existing context line.
- DEV UI Previews: 390×844 and 1440×900. Checked 可以 wrong → repair → retry → correct; alternative 我們在家可以看電視 accepted; 從…到…來 frame completed correctly. No real progress recorded. Safari not checked separately.
- `npm run content:export`: pass.
- `npm run content:validate`: Interactive lesson content valid.
- `npm test`: 1,040 tests passed, zero failures (working tree includes pre-existing listening changes).

## Issues
- `content/grammar-practice/lessonSix.json`: supplied 可以 and 有點兒 tested unrelated vocabulary; replaced with productive constructions.
- `.claude/skills/grammar-author/SKILL.md`, `docs/GRAMMAR_LESSON_TEMPLATE.md`: the former restriction of sentence builds to own items conflicted with the approved learning objective; book items can now use the existing free-line builder.
- Preserved pre-existing listening implementation and its two L1 own items in the working tree; excluded them from this task's commit.

## Unsure
- None.
