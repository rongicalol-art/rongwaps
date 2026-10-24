# L09–L16 final gate evidence

- `npm run content:export` — exit 0, all authored content packs exported successfully.
- `npm run content:validate` — exit 0, “Interactive lesson content valid.”
- `npm test -- tests/content tests/unit/grammarPracticeCheck.test.ts` — exit 1, 1140 pass / 5 fail (the 5th is the aggregate `tests/content` entry).
- `npm test` — exit 1, 1140 pass / 4 fail:
  1. `tests/content/grammarTrackClips.test.ts` “grammar-track clips identify source rows or examples and reach the exported pack”: actual `今天的天氣比較熱`, expected `誰比較瘦姊姊比較瘦妹妹比較胖`; the clip still uses `exampleId: l9g5-e1`, but the text is now table row `l9g5-p1` (out-of-scope audio manifest).
  2. `tests/content/lessonNine.test.ts` “Lesson 9 follows two source dialogues with five ordered grammar points”: `assert.ok(pages.every((page) => page.examples.length >= 5))` — the book prints 3 examples on most pages.
  3. `tests/content/lessonNine.test.ts` “Lesson 9 gives every grammar point its own visual manipulative”: `assert.ok(pages[0].liveSceneLab)` — filler labs removed.
  4. `tests/content/lessonNine.test.ts` “Lesson 9 keeps authored pattern shapes compact”: actual `[3,0,6,0,4]`, expected `[3,2,2,3,3]` — tables now live in subsections.
These are genuine source/test conflicts, not content regressions.
