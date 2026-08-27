# Grammar Screen Simplification — Implementation Plan

## Goal

Make the grammar lesson a single, obvious path:

`Learn grammar -> Do its exercise -> Learn next grammar -> ... -> Complete part`

The screen should use the same compact header language as Practice, remove the persistent grammar dock, make pattern rows size themselves from their own content, keep optional interactive teaching genuinely hidden, and let the book reference replace the whole grammar workspace while open.

## Product decisions

1. **Use a sequential two-step flow, not one long Learn + Exercise page.**
   - Each grammar point has a Learn step followed by its Exercise step.
   - The Learn step ends with one primary `Continue` action.
   - Completing the exercise reveals one primary `Continue` action that advances to the next grammar point.
   - The last exercise advances to Part Complete.
   - Do not show a persistent Back/Previous control. The header keeps Close. If a real back behavior is added later, render it only when it has a valid destination.
   - Reason: putting the exercise on the same page makes an already long reading page harder to scan and makes completion state ambiguous. A sequential step keeps the existing exercise implementation and gives the learner one decision at a time.

2. **Treat Exercise as part of the grammar path, not as a mode.**
   - Remove the Learn/Practice segmented switch.
   - In learner-facing copy, prefer `Exercise` inside the grammar flow; reserve `Practice` for the app-wide beta practice modes.
   - Do not let learners jump over an exercise using grammar next/previous arrows or keyboard shortcuts.

3. **Use the Practice header system, with grammar-specific controls.**
   - Reuse `ScreenHeader` and the same compact, transparent styling currently applied by `PracticeHeader`.
   - Do not duplicate the Practice header markup in `GrammarLessonHeader`.
   - Keep Close on the left, a compact segmented progress rail in the center, and one quiet settings/reading-aids action on the right.
   - Keep the header one row tall. Reading-aid controls must open in an overlay/drawer and must not expand a second row below the header.

4. **Pattern rows size from their own content.**
   - Keep the pattern header stable and evenly readable.
   - Let each body row calculate its own column proportions from the visible Chinese/pinyin content.
   - A longer phrase gets more width in that row; short grammar particles do not reserve a large fixed column.
   - Row height remains automatic and grows when content wraps.
   - Center the English definition in a full-width band immediately below each Chinese row.

5. **Optional interactive teaching is one quiet line and truly hidden.**
   - Move it directly after the pattern table and before Examples.
   - Use one-line copy: `Explore this pattern` plus a chevron. Remove `Optional visual explanation`.
   - Keep it collapsed initially.
   - Do not mount the interactive lab until expanded. Hidden buttons must not be hoverable, focusable, announced, or positioned over visible content.

6. **The book reference replaces the grammar workspace while open.**
   - It must cover the grammar header as well as the content and footer/action area.
   - On desktop it remains bounded by `.workspace-window` so permanent Books navigation remains visible, matching project shell rules.
   - On mobile it fills the viewport.
   - It owns one compact header: Close, printed page title, and page navigation.

## Target flow and progress model

Use a linear step index instead of separate free navigation and mode selection:

```ts
type GrammarLessonView = 'study' | 'exercise' | 'complete';

const totalSteps = part.grammarPages.length * 2;
const currentStepIndex = currentGrammarIndex * 2 + (activeView === 'exercise' ? 1 : 0);
```

For three grammar points, the header steps are:

```text
1 Learn G1
2 Exercise G1
3 Learn G2
4 Exercise G2
5 Learn G3
6 Exercise G3
7 Complete (completion page, rail at 100%)
```

Build one progress segment per grammar point with a length of two. Feed the resulting segments, `currentStepIndex`, and `totalSteps` into `ScreenHeader`, the same way Practice feeds activity segments and card position into it.

Navigation rules:

```text
Continue on Learn
  -> Exercise for the same grammar

Continue after a completed Exercise
  -> Learn for the next grammar, if one exists
  -> Part Complete, if this was the final grammar and all exercises are complete

Reopen an unfinished part
  -> Learn for the first grammar whose exercise is incomplete

Reopen a completed part
  -> Learn for Grammar 1 (existing behavior), unless a separate Review entry is added later
```

When the last exercise completes, calculate completion using `completedPageIds + current page id`. Do not rely on a render-time `allGrammarComplete` value captured before `markPageComplete`, because that can be stale during the same click.

## File-by-file implementation

### 1. Simplify the lesson state machine

Files:

- `src/screens/grammar-lesson/GrammarLessonScreen.tsx`
- `src/utils/grammarLessonFlow.ts`
- `tests/lessonOne.test.ts`

Changes:

- Add a `continueFromStudy()` transition that changes only `study -> exercise` for the current grammar index.
- Change `continueGrammarLesson()` so a completed exercise advances to the next grammar's Learn step, or to Complete after the final completed exercise.
- Pass the current page id/completed id set into the transition, or calculate the post-completion set before deciding the next view.
- Remove `selectGrammarMode()` from the public flow API.
- Remove direct previous/next grammar selection from the lesson screen.
- Remove `useGrammarKeyboardNav()` from the screen. Delete the hook if no other caller remains.
- Preserve scroll-to-top when the view or grammar index changes.
- Preserve audio stop, focus handling, Escape close, part-start persistence, and part-complete persistence.
- Add tests for the full sequence, including the final-exercise stale-state case and reopening at the first incomplete grammar.

### 2. Replace the custom grammar header with the Practice header pattern

Files:

- `src/screens/grammar-lesson/components/GrammarLessonHeader.tsx`
- `src/screens/grammar-lesson/components/GrammarReadingAids.tsx`
- `src/screens/grammar-lesson/GrammarLessonScreen.tsx`
- optionally `src/utils/grammarLessonFlow.ts` for `buildGrammarPartSegments()`

Changes:

- Make `GrammarLessonHeader` a thin adapter around shared `ScreenHeader`.
- Copy no header structure. Reuse these Practice values:
  - `maxWidth="4xl"`
  - `progressSize="compact"`
  - transparent background
  - no border or shadow
  - compact responsive padding (`px-4 py-3`, then `sm:px-6 lg:px-10`)
- Feed one two-step segment per grammar point plus `currentStepIndex` and `totalSteps`.
- Remove the explicit `Grammar N of N` line; the Practice-style rail and count own position feedback.
- Keep a right-side settings icon at every Learn/Exercise step so the header does not shift.
- Refactor `GrammarReadingAids` into overlay content opened by the header action (prefer existing `BottomDrawer`, workspace-bounded). Do not expand the header vertically.
- Keep all existing traditional/simplified, pinyin, and definition preferences and accessible pressed states.

### 3. Delete the bottom grammar dock and add one continuation action

Files:

- delete `src/screens/grammar-lesson/components/GrammarBottomDock.tsx`
- `src/screens/grammar-lesson/GrammarLessonScreen.tsx`
- `src/screens/grammar-lesson/components/GrammarStudyPage.tsx`
- `src/screens/grammar-lesson/components/GrammarExercisePage.tsx` only if its completion CTA needs copy/placement adjustment

Changes:

- Remove `GrammarBottomDock` and all Learn/Practice/Previous/Next props and callbacks.
- At the end of `GrammarStudyPage`, render one `ActionButton`:
  - primary
  - `fullWidth` on mobile
  - constrained/aligned with the reading column on larger screens
  - label `Continue`
  - accessible name may be more descriptive, such as `Continue to exercise for Grammar 1`
- Let existing per-question actions remain inside the exercise.
- After the exercise is complete, show only one `Continue` action. Avoid labels such as `Review unfinished grammar`; the flow itself should select the correct next incomplete destination.
- Add enough bottom padding that the action is comfortable above the safe area without creating a persistent dock or separate scroll container.

### 4. Make the pattern table content-aware per row

Files:

- `src/screens/grammar-lesson/components/GrammarPatternSection.tsx`
- `src/screens/grammar-lesson/components/GrammarPatternRow.tsx`
- new `src/utils/grammarPatternLayout.ts`
- new or existing test file under `tests/`
- `src/types/models.ts` and grammar data files in the cleanup step

Implementation approach:

1. Remove `RESPONSIVE_GRID_CLASSES` from `GrammarPatternSection`.
2. Keep the header slot map stable; use equal columns for the header labels because it describes roles, not content width.
3. For each row, compute a weight for each visible token group from the actual displayed content:
   - use the active traditional/simplified text;
   - include punctuation attached to the group;
   - consider the longest pinyin line when pinyin is shown;
   - treat Latin/pinyin characters as narrower than Chinese graphemes;
   - clamp each result to a sane minimum and maximum so one sentence cannot collapse its neighbors.
4. Return a CSS `gridTemplateColumns` string such as `minmax(64px, 1fr) minmax(72px, 1.6fr) minmax(64px, 1.1fr)` and apply it only to that row.
5. Use `items-center`, centered text, `min-w-0`, and natural vertical padding. Do not set a fixed row height.
6. Allow wrapping inside the cell; never add horizontal scrolling.
7. Render the definition directly after the row as a full-width centered band:
   - centered text at mobile and desktop;
   - remove the left-aligned `MEANING`/definition layout;
   - if the label is retained for accessibility, make it visually hidden or center it above the definition without creating a side column.

Pure helper contract:

```ts
getPatternColumnWeights({
  groups,
  characterPreference,
  showPinyin,
}): number[]
```

Test at least:

- three short groups -> approximately balanced;
- a long subject -> subject receives more space;
- a long middle phrase -> middle receives more space;
- a long complement -> complement receives more space;
- empty columns are omitted;
- all weights remain within the clamp;
- traditional and simplified variants can produce different weights;
- punctuation such as `呢？` stays with its phrase.

Cleanup after the helper is verified:

- Stop reading `patternMobileLayout`.
- Remove `patternMobileLayout` from `InteractiveGrammarPage` in `src/types/models.ts`.
- Mechanically remove its authored values from grammar data files.
- Update `docs/GRAMMAR_LESSON_TEMPLATE.md` to describe automatic per-row sizing instead of authored layout modes.

### 5. Fix the optional interactive grammar disclosure

Files:

- `src/screens/grammar-lesson/components/GrammarStudyPage.tsx`
- `src/screens/grammar-lesson/components/GrammarInteractiveHelp.tsx`
- optionally a local `GrammarHelpDisclosure.tsx`

Changes:

- Move `GrammarInteractiveHelp` between `GrammarPatternSection` and `GrammarExamplesSection`.
- Replace the two-line summary with one line: `Explore this pattern`.
- Keep the control visually quiet: divider line, label, chevron, no card depth.
- Use controlled open state.
- Render lab children only when open. Collapsed content must not exist as active/focusable controls in the DOM.
- On close, return focus to the disclosure button.
- Keep `aria-expanded`, `aria-controls`, keyboard activation, and reduced-motion behavior.
- Prefer a grammar-local component rather than changing shared `DisclosureLine` unless another screen needs the same unmount behavior.

### 6. Make the book page viewer replace the whole grammar workspace

Files:

- `src/screens/grammar-lesson/components/BookPageViewer.tsx`
- `src/screens/grammar-lesson/components/GrammarStudyPage.tsx` or `GrammarLessonScreen.tsx`

Changes:

- Do not render the viewer as `absolute inset-0` inside the study article; that is why it begins below the grammar header.
- Preferred implementation: portal it to `document.body` and use `workspace-window fixed inset-0 z-[600]`.
- Alternative: lift viewer state/rendering to `GrammarLessonScreen` and render it as the last sibling over the whole screen. Use the portal if the animated parent transform creates a fixed-position containing block.
- Use one `ScreenHeader` inside the viewer with Close, printed page title, and previous/next page controls.
- Keep previous/next buttons disabled at the ends; do not render an additional Back button.
- Preserve the existing focus trap, Escape behavior, image failure state, alt text, and current page reset behavior.
- Ensure the underlying grammar header and controls are neither clickable nor tabbable while the viewer is open.

### 7. Align documentation with the new decision

Files:

- `DECISIONS.md`
- `docs/GRAMMAR_LESSON_TEMPLATE.md`
- `WIDGETS.md` only if a shared widget API changes

Changes:

- Add a new dated decision that supersedes the 2026-08-09 dock decision. Do not delete decision history.
- Change the documented flow to `Learn -> Exercise -> next Grammar`.
- Remove instructions for bottom mode switching, grammar arrow navigation, and `patternMobileLayout`.
- Document the one-line optional interactive disclosure and workspace-replacing book viewer.

## Suggested implementation order / commits

1. `refactor(grammar): make lesson flow linear`
   - state transitions, tests, Continue actions, dock/keyboard navigation removal
2. `refactor(grammar): align header with practice`
   - shared header rail and reading-aids overlay
3. `fix(grammar): size pattern rows from content`
   - weighting helper, centered definitions, tests, data cleanup
4. `fix(grammar): contain optional and book overlays`
   - one-line lazy disclosure and workspace-level book viewer
5. `docs(grammar): record simplified lesson flow`

Keep each commit buildable. Do not combine unrelated vocabulary/content changes with this UI refactor.

## Acceptance criteria

### Flow

- A learner can finish a part using only the primary `Continue` action and exercise answers.
- No Learn/Practice mode switch or persistent grammar bottom dock is visible.
- No disabled Previous button is rendered.
- Learn always advances to the same grammar's Exercise; a completed Exercise advances to the next grammar's Learn step.
- The final completed exercise reaches Part Complete exactly once.
- Reopening a part resumes at the first incomplete grammar.

### Header

- Grammar and Practice use the same `ScreenHeader` geometry, compact rail behavior, spacing, background, and responsive count behavior.
- Header height never changes when settings open.
- Only Close, progress, and one quiet settings action are present.

### Table

- Each row can use different column proportions based on its own content.
- Long content gains width or wraps; it never clips or causes horizontal page scrolling.
- Row height is content-driven.
- Every visible definition is centered immediately below its Chinese row on mobile and desktop.
- Header labels remain readable and do not determine body-row widths.

### Optional interactive teaching

- The collapsed control is one line.
- Interactive controls are not mounted/focusable/hoverable while collapsed.
- The section appears after the pattern table and before Examples.

### Book reference

- Opening a book page covers/replaces the grammar header and content.
- Desktop permanent navigation remains visible; mobile uses the full viewport.
- Close returns focus to the `View book page(s)` action.

### Quality gate

- Verify at `390x844` and `1440x1000`.
- Check traditional and simplified content, pinyin on/off, definitions on/off, long pattern rows, disclosure open/closed, first/last book pages, exercise completion, and reopening progress.
- Run:

```bash
npm run content:validate
npm test
npm run typecheck
npm run lint
npm run build
```

## Explicit non-goals

- Do not redesign the exercise question components in this pass.
- Do not merge Learn and Exercise into one scrolling document.
- Do not add a new icon family, palette, generic card primitive, or nested scroll container.
- Do not change textbook-authored grammar content or grading rules.
- Do not expose the stored source Reading in the grammar flow.

