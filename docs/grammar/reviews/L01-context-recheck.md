# L01 practice context recheck — Codex, 2026-10-19
Verdict: PASS

## Checked
- Compared all 16 book exercise items with the Lesson 1 exercise list and scans; sources and order remain intact.
- Checked question/answer direction in the 嗎 and 呢 groups. Replies used to reconstruct the preceding question now say they come afterward.
- The p.40 #1 particle item already uses tap-where across the possible positions, with a repair for each wrong gap; this meets the current particle-placement rule.

## Issues
- `content/grammar-practice/lessonOne.json`: clarified the future reply for p.40 #2, p.44 #1, and p.45 #3. Reworded p.44 #1 so the learner says their nationality before asking the friend.

## Unsure
- None.

## Verification
- PASS: `npm run content:export` — all authored content packs exported.
- PASS: `npm run content:validate` — interactive lesson content valid.
- PASS: `npx tsx --test tests/content/*.test.ts tests/unit/grammarPracticeCheck.test.ts` — 230 tests passed.
- `npm test -- tests/content tests/unit/grammarPracticeCheck.test.ts` exited 1 after 1,062 tests passed because its configured script treated the appended directory as a test module. Exact error: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/ronianb.gica/Projects/rongwaps/tests/content/index.ts' imported from '/Users/ronianb.gica/Projects/rongwaps/'`.
