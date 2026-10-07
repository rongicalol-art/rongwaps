# Cleanup plan (pre-audited 2026-10-06 by Opus)

Baseline: `src/` + `server/` ≈ **56.8k lines** (excluding `src/data/`). Target this run: **−5k or more**.
Tools used: `npx -y knip@5 --config .claude/skills/cleanup-loop/knip.json --no-progress --no-exit-code` and `npx -y jscpd@4 src server --ignore "src/data/**,**/*.json,**/*.svg" --min-lines 8 --min-tokens 60`. **Re-run knip after every Wave-1 item** — each deletion exposes more dead code.

Work the waves in order. Each `- [ ]` is one iteration (one commit) unless it says "split". Numbers are estimated net lines removed.

## Wave 1 — Dead code (safest, biggest)

- [ ] **W1.1 ~-2,900 · Orphaned grammar-lesson labs/exercises.** The renderer that used them (`GrammarExercisePage`) was deleted earlier; nothing reachable imports these. Delete:
  - `src/screens/grammar-lesson/experiences/` (whole folder, 11 files)
  - `src/screens/grammar-lesson/components/`: `DragBlankExercise, ExerciseContextStrip, ExerciseProfileStrip, ExerciseQuestionCard, GrammarCompletionRecap, GrammarContrastSection, GrammarExerciseRenderer, GrammarFocusNote, GrammarHelpDisclosure, GrammarInteractiveSentence, GrammarLabShell, GrammarParticleWorkshop, GrammarQuickChecks, GrammarRuleContrast, OpenResponseQuestionCard, SentenceSpine, SentenceUnscrambleExercise` (.tsx)
  - `src/screens/grammar-lesson/hooks/useDragBlankExercise.ts`, `useSentenceUnscramble.ts`
  - Then: `src/types/grammarLabs.ts` and the lab/exercise types it feeds in `src/types/grammar.ts` / `src/types/models.ts` **only if** nothing else uses them after the delete — grep `scripts/` and `tests/` too (content validators may type authored data with them; if so keep the types, note it).
  - Fix doc mentions: `docs/ARCHITECTURE.md`, `docs/GRAMMAR_LESSON_TEMPLATE.md`, `docs/TESTING.md`.
  - Split into 2 commits if > 8 non-deleted files change.
- [ ] **W1.2 ~-65 · Other unused files:** `src/lib/widgets/DraggableFlashcard.tsx` (empty), `src/features/character-breakdown/components/breakdown/BottomCharacterTabs.tsx` (fix `docs/DESIGN_TOKENS.md` mention), `src/app/index.ts`. Leave `src/screens/activities/index.ts` if `eslint.config.js` relies on screen barrels — run lint to decide.
- [ ] **W1.3 · SKIP (owner: do not delete SVG icons) — mark Skipped, do not touch any `.svg`.** Was: unused SVG assets: `src/assets/icons/cube/` (32 files, 0 references; `DebugWindow` only globs `icons/*.svg`, not subfolders — confirm). Not line-counted, but shipped clutter.
- [ ] **W1.4 ~-300 (split by folder) · Unused exported functions/constants** (knip "Unused exports"). For each: if not used inside its own file → delete it; if used internally → leave it (removing `export` saves no lines; skip). Do one folder per commit: `src/services/` → `src/utils/` → `src/features/` → `src/app/` + `src/store/` + `server/`.
  - Exclude compound widget parts (`Dialog*`, `Drawer*`, `DetailShell*`, `FloatingDock*`, `part-progress/*`) — handled in W1.5.
  - Notable: `src/features/practice/settings/PracticeSettingControls.tsx` exports `SettingsSection/SettingsControlList/SettingsRadioRow` used nowhere else — keep them if W2.6 will reuse them.
- [ ] **W1.5 ~-40 · Duplicate aliases / shims:** pick one name and update callers: `Dialog|ModalDialog`, `Drawer|BottomDrawer`, `DetailShell|WorkspaceDetailShell`, `FOLDER_COLOR_PALETTE|CUSTOM_FOLDER_OPTIONS`; `src/lib/widgets/PartProgressRail.tsx` re-export shim vs `part-progress/index.ts` (keep one entry point, the barrel in `src/lib/widgets/index.ts` is the public API). Update `docs/WIDGETS.md`.
- [ ] **W1.6 ~-400 (split) · Unused exported types** (knip "Unused exported types", 288). Delete types not referenced in their own file either. One folder per commit.

## Wave 2 — Collapse duplication (jscpd)

- [ ] **W2.1 ~-180 · `src/screens/quiz/QuizChoices.tsx` vs `QuizTyping.tsx`** — ~200 identical lines (lines ~38–80, ~120–230, ~250–270 in each). Extract the shared shell (header/progress/feedback/footer) into one component in `src/screens/quiz/` and keep only the answer UX in each (architecture rule 3).
- [ ] **W2.2 ~-90 · `RelatedWordsSection.tsx` vs `UsedAsComponentSection.tsx`** (`src/features/character-breakdown/components/breakdown/`, 138 lines each, near-clones) → one component with props.
- [ ] **W2.3 ~-45 · `src/screens/add-card/AddCardScreen.tsx`** — lines 65–115 and 146–196 are the same block twice → one render function / map.
- [ ] **W2.4 ~-80 · `src/lib/widgets/AppIcon.tsx` custom SVG icons** (lines ~250–420, repeated `<svg viewBox…width height className {...props}>` wrappers) → one small `svgIcon(children)` factory inside the file.
- [ ] **W2.5 ~-25 · `src/features/practice/components/PracticeFormatMenu.tsx`** lines 193–218 ≈ 280–305.
- [ ] **W2.6 ~-60 · Settings popovers:** `BreakdownSettingsPopover.tsx`, `src/screens/reader/components/ReaderSettingsPopover.tsx`, `GrammarReadingAids.tsx`, `GrammarLessonHeader.tsx` (lines ~113) share row markup → reuse `SettingsSection/SettingsRadioRow` from practice settings (promote to `src/lib/widgets/` only if used by 2+ features; update `docs/WIDGETS.md`).
- [ ] **W2.7 ~-30 · Skeletons:** `BreakdownSkeleton.tsx` vs `src/features/dictionary/components/WordDetailSkeleton.tsx`, and `src/lib/widgets/ScreenSkeleton.tsx` internal dup (61≈89) → reuse `Skeleton`/`ScreenSkeleton`.
- [ ] **W2.8 ~-35 · Reader:** `ReadingCanvas.tsx` (16–35, 192–215) vs `ReadingNarrativeView.tsx` (20–39, 365–388); `src/screens/reader/utils/narrativeParagraphs.ts` 156≈194.
- [ ] **W2.9 ~-40 · Session hooks:** `src/screens/quiz/hooks/useQuiz.ts` (40≈182), `useListening.ts` (120, 163) vs `useQuiz.ts` (121) vs `src/screens/writing/hooks/useWriting.ts` (119) — move shared mechanics into `useCardSession` (rule 3) if they are card-session mechanics; otherwise a local helper.
- [ ] **W2.10 ~-25 · Library:** `src/features/library/hooks/useSaveWordDestination.ts` (187≈243, 223) vs `src/screens/library/hooks/useLibrary.ts` (206) → one owner (rule 5).
- [ ] **W2.11 ~-30 · Misc small dups:** `server/index.ts` 335≈364; `src/services/vocabularyService.ts` 19≈69; `ProfileScreen.tsx` 90 vs `WordDetailView.tsx` 147; `DetailShell.tsx` 101 vs `SingleBreakdownView.tsx` 92 (use the widget); `ListeningOptions.tsx` 34 vs `QuizChoices.tsx` 99; `BreakdownComponentCard.tsx` 35 vs `CharNodeItem.tsx` 58; book-viewer gesture hooks 46≈21. One commit each where the saving is ≥ 8 lines.
- [ ] **W2.12 · Re-run jscpd** and add any new pairs ≥ 10 lines to the backlog.

## Wave 3 — UI inconsistencies fixed by reuse (only when net-negative or neutral)

- [ ] **W3.1 · Raw `<button>`** in 65 files under `src/screens src/features src/app` — replace hand-styled ones that duplicate `ActionButton` / `IconActionButton` / `SegmentedControl` (long className strings → props). One screen/feature per commit.
- [ ] **W3.2 · 26 hex colors** in `.tsx` under `src/screens src/features src/lib/widgets src/app` → `ui-*/brand-*/feedback-*` tokens (excluding SVG art/illustrations where the hex is the artwork).
- [ ] **W3.3 · Arbitrary values** (`-[12px]` etc., ~355 lines): replace with scale classes where an exact token exists. Not a line-saver — do only alongside other edits in the same file, never as standalone churn.
- [ ] **W3.4 · Browser check** (390×844 + 1440×1000) of each screen touched in W2/W3 for visual regressions.

## Wave 4 — Over-engineering pass (free audit)

Then switch to the skill's normal audit rotation (§2), reading the largest `src/` files for code to delete: needless `useEffect`/`useMemo`/`useCallback`, prop-forwarding wrappers, one-caller helpers, nested ternaries, defensive checks the types already guarantee. Start with: `src/services/flashcardService.ts`, `src/services/audioService.ts`, `src/lib/widgets/Drawer.tsx`, `src/screens/reader/components/ReadingNarrativeView.tsx`, `src/services/audio/speechEngine.ts`, `src/utils/packValidators.ts`, `src/screens/activities/ActivityModals.tsx`, `src/utils/grammar/validateInteractiveLessons.ts`, `src/screens/reader/ReaderScreen.tsx`.

## Needs owner (do NOT do — pre-filed)

- `src/data/` tables (`vocabularySenseRules.ts` 780, `interactiveGrammarManifest.ts` 573, `grammarUsageRules.ts` 396) are content, not code — out of scope.
- `react-icons` is used only for its Phosphor set (`react-icons/pi`); switching to `@phosphor-icons/react` would be a dependency change — skip.
