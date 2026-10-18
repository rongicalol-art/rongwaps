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

## Prompt/key follow-up — 2026-10-18

### Checked
- Reviewed all 98 `order-build` prompt/key pairs; cross-checked flagged cases against authored exercise lines in `materials/book1/L01-L08/transcript.md`.
- Kept each textbook answer as the first model. Added 12 accepted concise answers across 10 items; each retains its target grammar and has its own sentence, pinyin, and English.
- Preserved the existing L01 listen-pick items without edits. Export and content validation passed; typecheck and lint passed; all 1,047 tests passed. Jev lint reported zero violations (no applicable rules).

### Issues
- `lessonOne.json`: p.39 #3 accepts `中明不累` because the prompt already says she is tired; p.44 #1 and p.45 #3 accept `你呢` because the prior statement is supplied by the source context and prompt.
- `lessonSix.json`: p.137 #3 accepts `我睡得很好` because the question supplies the time and the answer keeps 得. p.148 #1–2 accept the direct utterance after the textbook's `我媽媽說` / `老師說` frame, preserving 不可以 / 可以.
- `lessonSeven.json`: p.171 #2 accepts `買東西很方便` because the prompt already supplies the supermarket context.
- `lessonEight.json`: p.186 #1 accepts `這部電影好看` and `這部電影很好看`; #2 accepts `新的腳踏車好騎`; #3 accepts the swimming clause without the unrequested `我也想學` ending, with and without 很. Added a success note for 好看.
- Retained the full multi-part forms where the prompt asks for them, including L06 p.138–140 verb-object + 得 patterns, L07 p.171 #1 and #3, and 又……又. No alternative drops a target classifier, 得, modal, negation, or required repetition.

### Feedback integration
- Shared checker aligns word occurrences and diagnoses omissions, extra occurrences and order errors. The renderer uses that same diagnosis for red marks. Missing words no longer shift correct words red; a move names a relationship that actually needs changing.
- Exact listening keys and authored listening repairs remain intact. Correct builds may carry an authored `successNote`; the feedback status is also announced to screen readers.
- Regression coverage includes the original screenshot, short/full accepted replies, required missing words, duplicate occurrences, distractors and movement advice that must change a relationship.
- DEV UI Previews checked at 390×844 and 1440×1000: `這部電影好看` is correct with the 好看 explanation; missing 好 leaves both submitted words neutral; reversed 看好 marks only 看; 難看 marks only 難 with its meaning repair. No real progress recorded. Safari was not checked separately.
