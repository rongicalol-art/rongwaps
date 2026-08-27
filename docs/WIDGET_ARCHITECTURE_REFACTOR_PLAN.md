# Widget Architecture Refactor Plan

## Purpose

Clean up RongWaps' component structure without changing product behavior or visual design. Convert `src/lib/widgets/` from a mixed collection of shared controls, feature components, app shell code, and legacy compatibility components into a small, stable shared UI library.

This plan is written for an implementation agent such as Luna. Execute it one phase at a time and stop after every phase for review.

## Primary outcome

- `src/lib/widgets/` contains only generic, stable UI primitives and cross-feature presentation patterns.
- Feature-specific components live with their owning feature.
- Cross-screen domain features have a clear package and public API.
- Shared widgets do not own feature fetching, feature services, or global feature state.
- The existing premium-playful UI, responsive behavior, accessibility, and product flows remain unchanged.
- `WIDGETS.md` documents only the public shared UI library.

## Non-goals

- Do not redesign screens.
- Do not change copy, colors, spacing, typography, motion, responsive behavior, or interaction behavior unless required to fix a regression introduced by a move.
- Do not change Supabase schemas, service behavior, stores, routes, persistence, curriculum content, grammar content, or progress rules.
- Do not introduce a new UI framework, CSS framework, state library, component library, or dependency.
- Do not rewrite working components merely to make them stylistically uniform.
- Do not combine this refactor with unrelated feature work.
- Do not create compatibility layers or parallel component systems “for later.”

## Mandatory instructions for Luna

1. Read `AGENTS.md`, this plan, `WIDGETS.md`, `docs/ARCHITECTURE.md`, and `docs/INDEX.md` before editing.
2. Run `git status --short` before each phase.
3. Preserve all pre-existing changes. Never reset, discard, overwrite, or commit unrelated user work.
4. Phase 0 may run in a dirty worktree because it is read-only. Phase 1 and later require the current grammar work to be checkpointed or explicit user approval to work around it.
5. Execute one phase only, verify it, report results, and stop. Do not automatically continue into the next phase.
6. Use `rg` to prove ownership and usage before moving every component.
7. Prefer file moves and import updates. Do not refactor component internals unless a move exposes a real boundary violation.
8. Preserve component names and public props unless the plan explicitly authorizes a change.
9. Keep one-way dependency direction:
   - `screens` may import `features` and shared widgets.
   - `features` may import services, stores, data, utilities, types, and shared widgets.
   - shared widgets may import shared utilities, tokens, and types, but not feature code.
   - services, stores, and data must not import screens or UI features.
10. Do not allow one feature package to reach into another feature's internal folders. Import from its public `index.ts`.
11. Do not add a public export unless another module needs it.
12. If a move creates a circular dependency, ambiguous ownership, required behavior change, or large unrelated diff, stop and report the blocker.

## Current repository warning

At plan creation, the working tree contains uncommitted grammar lesson changes, including modified, deleted, and new files under `src/screens/grammar-lesson/`, plus changes to `AGENTS.md` and `DECISIONS.md`.

Luna must not begin the grammar extraction phase until those changes have been reviewed and checkpointed. Do not stage or commit them unless the user explicitly asks.

## Architecture definitions

### Shared primitive

A small, generic, prop-driven component that represents one reusable interaction or visual building block.

Examples:

- `ActionButton`
- `IconActionButton`
- `SegmentedControl`
- `AppIcon`
- `Skeleton`
- `CountryFlag`

### Shared pattern

A reusable composition that is demonstrably used by multiple features and remains presentation-first.

Examples:

- `ConfirmationDialog`
- `BottomDrawer`
- `DropdownMenu`
- `ScreenHeader`
- `StickyWorkspaceHeader`
- `WorkspaceDetailShell`

### Feature component

A component that understands a product domain such as grammar, dictionary lookup, character breakdown, practice sessions, curriculum, profile, or flashcards. Feature components may use feature hooks, services, and stores.

### App shell component

A component that owns application-wide layout or navigation. App shell components belong under `src/app/`, not in the shared widget library.

### Legacy component

A compatibility component that has a named replacement or no longer matches the current design system. Legacy components are migrated usage-by-usage and deleted only after zero references are confirmed.

## Target structure

Create folders only when a phase moves real code into them.

```text
src/
├── app/
│   ├── components/
│   └── index.ts
├── features/
│   ├── character-breakdown/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── index.ts
│   ├── dictionary/
│   │   ├── components/
│   │   └── index.ts
│   └── practice/
│       ├── components/
│       ├── settings/
│       └── index.ts
├── lib/
│   └── widgets/
│       ├── primitives and shared patterns only
│       └── index.ts
├── screens/
│   └── feature-specific route and study screens
├── services/
├── store/
├── data/
├── types/
└── utils/
```

Do not move all screen folders into `features/`. Existing screen feature slices remain valid. Create `features/` only for domain UI that is genuinely reused across multiple screens.

## Verification commands

Run these after every implementation phase:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Run `npm run content:validate` if a phase touches lesson, curriculum, grammar, or source-content registration.

For substantial UI movement, verify in a browser at approximately:

- Mobile: `390x844`
- Desktop: `1440x1000`

At minimum verify Books, Dictionary, Library, Profile, one practice activity, Grammar Learn, Grammar Practice, settings, and character breakdown when affected by the phase.

## Phase 0 — Baseline audit and migration map

### Goal

Produce a verified inventory without changing application files.

### Tasks

1. Record `git status --short` and identify pre-existing changes.
2. Record the baseline result of the verification commands. Do not fix unrelated failures in this phase.
3. List every file under `src/lib/widgets/` and classify it as:
   - shared primitive
   - shared pattern
   - app shell
   - grammar feature
   - character-breakdown feature
   - dictionary feature
   - practice feature
   - curriculum feature
   - profile feature
   - flashcard feature
   - legacy
   - needs decision
4. For each non-shared component, record all consumers using `rg`.
5. Identify direct imports from `src/lib/widgets/<Component>` and barrel imports from `src/lib/widgets`.
6. Identify widget files importing:
   - `src/services/`
   - `src/store/`
   - feature-specific data
7. Identify likely dead exports and components with zero consumers outside their own file, barrel, and documentation.
8. Report the proposed classification and any ambiguous ownership. Do not move files.

### Acceptance criteria

- No source file changed.
- Baseline failures are separated from refactor-created failures.
- Every widget has a proposed owner.
- Ambiguous components are listed for user decision.

### Stop condition

Stop after reporting the audit. Do not begin Phase 1 automatically.

## Phase 1 — Establish boundaries and documentation

### Prerequisite

The user's existing work must be checkpointed or the user must explicitly authorize working around it.

### Goal

Make the intended architecture explicit before moving implementation files.

### Tasks

1. Update `docs/ARCHITECTURE.md` so it matches the current application and the definitions in this plan.
2. Remove outdated claims, including any references to obsolete token locations or animation packages.
3. Document the allowed dependency direction.
4. Document the promotion rule: a component starts feature-local and moves to shared widgets only after real cross-feature reuse or when it is an obvious app-wide primitive.
5. Update the existing code-structure rule in `AGENTS.md` with one concise exception: cross-screen domain UI reused by multiple screens may live under `src/features/<domain>/`; generic presentation still belongs in `src/lib/widgets/`.
6. Keep `AGENTS.md` concise. Do not copy this full plan into it.
7. Do not add lint restrictions yet; enforcement comes after the moves.

### Acceptance criteria

- Architecture documentation matches actual folders and current dependencies.
- No runtime source file changes.
- `AGENTS.md` remains concise.

### Stop condition

Stop after verification and report documentation changes.

## Phase 2 — Extract grammar-only widgets

### Prerequisite

Current grammar lesson changes are checkpointed and the baseline passes or known failures are documented.

### Goal

Move components used only by grammar lessons out of the global widget library.

### Candidate experience components

Verify consumers before moving:

- `GrammarAbilityLab.tsx`
- `GrammarCompareLab.tsx`
- `GrammarDiscoveryLab.tsx`
- `GrammarLiveSceneLab.tsx`
- `GrammarNumberLab.tsx`
- `GrammarPairCompareLab.tsx`
- `GrammarRouteLab.tsx`
- `GrammarSequenceLab.tsx`
- `GrammarTimeRangeLab.tsx`
- `GrammarTimelineLab.tsx`

Move confirmed grammar-only experiences to:

```text
src/screens/grammar-lesson/experiences/
```

### Candidate grammar presentation components

Verify consumers before moving:

- `GrammarLabShell.tsx`
- `GrammarInteractiveSentence.tsx`
- `GrammarFocusText.tsx`
- `GrammarSlotMap.tsx`
- `GrammarRuleContrast.tsx`
- `LinkedTranslationText.tsx`
- `ContextualChineseText.tsx`
- `SentenceSpine.tsx`

Move confirmed grammar-only components to an appropriate subfolder under:

```text
src/screens/grammar-lesson/components/
```

Do not move a component if another real feature uses it. If it is cross-feature teaching UI, report that evidence and propose a dedicated shared domain owner instead.

### Tasks

1. Move only confirmed grammar-owned files.
2. Add the smallest useful local public exports.
3. Update grammar imports to local paths or the grammar feature's public API.
4. Remove moved components from `src/lib/widgets/index.ts`.
5. Remove moved components from the shared sections of `WIDGETS.md`.
6. Update `docs/GRAMMAR_LESSON_TEMPLATE.md` only if paths or extension instructions become incorrect.
7. Do not alter CSS classes, component props, authored grammar data, or lesson flow.

### Acceptance criteria

- Grammar behavior and visuals are unchanged.
- No grammar-only component remains exported from the shared widget barrel.
- No non-grammar screen imports grammar internals.
- Verification commands pass.
- Mobile and desktop Grammar Learn and Practice are visually checked.

### Stop condition

Stop and report moved files, import changes, verification results, and remaining grammar-related widget candidates.

## Phase 3 — Extract app shell components

### Goal

Separate application-wide layout and navigation from the reusable UI library.

### Candidate files

Verify ownership before moving:

- `LayoutShell.tsx`
- `SideNav.tsx`
- `MainHeader.tsx`
- `AppSettingsDrawer.tsx`
- `BrandWordmark.tsx`
- `PlayfulNavIcon.tsx`

Move confirmed shell components to:

```text
src/app/components/
```

Export only required shell components through:

```text
src/app/index.ts
```

### Tasks

1. Move shell components without changing behavior or styling.
2. Update `App.tsx` and other consumers to import from `src/app`.
3. Keep generic primitives such as `AppIcon`, `IconActionButton`, and shared headers in `src/lib/widgets/`.
4. Remove shell exports from the widget barrel and shared widget documentation.

### Acceptance criteria

- Navigation behavior is unchanged on mobile and desktop.
- Desktop workspace bounds and hidden-navigation restore controls remain correct.
- Mobile drawer behavior and focus behavior remain correct.
- Books, Dictionary, Library, and Profile pass visual checks.

### Stop condition

Stop after reporting shell moves and verification.

## Phase 4 — Extract character breakdown and dictionary features

### Goal

Move cross-screen dictionary and character-breakdown domain UI into explicit feature packages while leaving backend access in services.

### Character-breakdown candidates

Verify the full dependency graph before moving:

- `CharacterBreakdown.tsx`
- `CharacterBreakdownOverlay.tsx`
- `BreakdownWordInfo.tsx`
- `BreakdownSkeleton.tsx`
- `DeepBreakdownModal.tsx`
- `RelatedWordsListModal.tsx`
- `UsedAsListModal.tsx`
- `StrokeOrderBox.tsx`
- `SmartSentence.tsx`
- `src/lib/widgets/breakdown/`

Move confirmed domain code to:

```text
src/features/character-breakdown/
├── components/
├── hooks/
├── utils/
└── index.ts
```

### Dictionary candidates

- `GlobalDictionaryModal.tsx`

Move dictionary-owned UI to:

```text
src/features/dictionary/
├── components/
└── index.ts
```

### Dependency direction

- Dictionary may import character breakdown through `src/features/character-breakdown/index.ts`.
- Character breakdown must not import dictionary feature internals.
- Both features may import dictionary/breakdown services, stores, types, utilities, and shared widgets.
- Practice screens import the public feature API, never internal feature paths.

### Tasks

1. Map current consumers in flashcard, quiz, listening, writing, dictionary search, and `App.tsx`.
2. Move one feature package at a time, character breakdown first.
3. Add narrow public exports.
4. Update all consumers.
5. Remove old widget exports and documentation entries.
6. Do not move service implementations out of `src/services/`.
7. Do not change caching, mnemonic generation, dictionary segmentation, audio, or overlay behavior.

### Acceptance criteria

- Character breakdown opens correctly from every existing entry point.
- Dictionary exact lookup and phrase fallback still work.
- Mnemonics, audio, related words, stroke order, and deep breakdown still work.
- Focus trapping, Escape dismissal, focus restoration, workspace bounds, and mobile full-screen behavior remain intact.
- Verification commands pass.

### Stop condition

Stop after reporting each package extraction. Do not combine character breakdown and dictionary into one oversized change if either diff becomes difficult to review.

## Phase 5 — Extract shared practice domain UI

### Goal

Give quiz, listening, writing, flashcards, and curriculum practice a shared domain package without treating practice behavior as generic UI.

### Candidate files

Verify consumers before moving:

- `PracticeHeader.tsx`
- `PracticeSettingsScreen.tsx`
- `src/lib/widgets/practice-settings/`
- `FeedbackBottomBar.tsx`
- `PartProgressRail.tsx`
- `PracticeChoiceButton.tsx`
- `LessonComplete.tsx`
- `EmptyReviewState.tsx`

Move confirmed practice domain code to:

```text
src/features/practice/
├── components/
├── settings/
└── index.ts
```

Keep generic patterns such as `ScreenHeader`, `DropdownMenu`, `SegmentedControl`, and `ActivityModalWrapper` shared if multiple unrelated features use them.

### Tasks

1. Move practice code in small groups: settings, feedback/answers, progress/header, completion.
2. Verify each group before proceeding to the next.
3. Update quiz, listening, writing, flashcard, curriculum, and activity imports.
4. Preserve current answer progression, auto-next, retry, part selection, long-press, progress animation, and reduced-motion behavior.
5. Remove moved exports and shared widget documentation entries.

### Acceptance criteria

- Multiple choice still grades immediately.
- Type Pinyin still submits with Enter and retries wrong answers correctly.
- Writing retains explicit checking.
- Listening auto-check and auto-next behavior remain correct.
- Practice settings still pause timers while overlays are open.
- Part progress switching and long-press selection remain correct.
- Verification commands and relevant visual checks pass.

### Stop condition

Stop after reporting practice package extraction and all affected flows tested.

## Phase 6 — Move remaining feature-owned components

### Goal

Remove obvious single-feature components from the shared widget library.

### Candidate ownership

Verify before moving:

- Profile:
  - `ProgressDashboard.tsx`
  - `ProgressMetricCard.tsx` if it is profile-only
  - `GardenVisualization.tsx`
- Flashcard:
  - `DraggableFlashcard.tsx`
  - `DynamicBackground.tsx` if flashcard-only
- Curriculum:
  - `CourseIcons.tsx`
  - `CourseSwitcher.tsx` if curriculum-only
- Search or Library:
  - `SearchBar3D.tsx` if it lacks real cross-feature reuse

### Tasks

1. Confirm each component has one clear owner.
2. Move components into the owner's existing `components/` folder.
3. Update imports and local exports.
4. Remove obsolete shared exports and docs.
5. Leave genuinely shared components in place.

### Acceptance criteria

- `src/lib/widgets/` contains no clearly single-feature component.
- No cross-feature import reaches into another screen's internal folders.
- Verification commands pass.

### Stop condition

Stop after reporting remaining shared candidates and any ownership decisions requiring user input.

## Phase 7 — Migrate and remove legacy components

### Goal

Remove compatibility UI only after every use has been intentionally migrated.

### Completion status — 2026-08-10

Phase complete. All listed legacy candidates were either migrated to the canonical controls or removed after confirming zero live references:

- `Soft3DButton` → `ActionButton`
- `IconButton3D` → `IconActionButton`
- `PracticeSegmentedControl` → `SegmentedControl`
- `Card3D`, `Floating3DButton`, `GlassCard`, and `LessonPartSelector` → removed after dead/orphaned usage audits

The active Profile, practice settings, Grammar, Library, Auth, Curriculum, and practice flows passed typecheck, lint, tests, production build, and targeted browser checks.

### Legacy candidates

- `Soft3DButton`
- `IconButton3D`
- `Card3D`
- `Floating3DButton`
- `GlassCard`
- `LessonPartSelector`
- `PracticeSegmentedControl`

### Migration guidance

- Replace text actions with `ActionButton` only when its hierarchy matches the existing action.
- Replace icon utilities with `IconActionButton`.
- Replace mutually exclusive controls with `SegmentedControl`.
- Replace `LessonPartSelector` with the established part-progress pattern where behavior matches.
- Do not mechanically replace cards. First determine whether the surface should be flat, a shared pattern, or removed.
- Preserve accessibility names, disabled states, loading states, keyboard behavior, and focus styling.

### Tasks

1. Migrate one legacy component type at a time.
2. Verify all consumers.
3. Confirm zero references with `rg`, excluding documentation and the component itself.
4. Delete the legacy component, remove its barrel export, and remove its documentation in the same phase.
5. Do not leave deprecated wrappers with no active migration need.

### Acceptance criteria

- All listed legacy components have either zero references and are deleted, or have a documented concrete blocker.
- No visual hierarchy regression is introduced.
- Verification commands and affected screen checks pass.

### Stop condition

Stop after each legacy component family or small related group. Report any component that cannot be safely migrated without product decisions.

## Phase 8 — Finalize shared UI API and documentation

### Goal

Make the remaining shared widget library small, discoverable, and truthful.

### Completion status — 2026-08-10

Phase complete. The shared barrel is categorized, direct external imports now use the public barrel, internal-only helpers are no longer exported, and `WIDGETS.md` is a concise catalog of the current public API. `docs/ARCHITECTURE.md` and `docs/INDEX.md` now describe the finalized ownership and documentation boundaries.

### Expected shared categories

The exact final list must follow real usage, but should primarily contain:

- Actions and selectors
- Icons and flags
- Dialogs, drawers, menus, and disclosure
- Generic progress and loading presentation
- Generic headers and workspace shells
- Generic search/input presentation with real cross-feature reuse
- Generic accessibility/error boundaries

### Tasks

1. Reorder `src/lib/widgets/index.ts` by category.
2. Export only stable public components.
3. Remove dead exports and direct-path workarounds.
4. Rewrite `WIDGETS.md` as a concise public catalog:
   - purpose
   - important props
   - one usage example
   - accessibility or interaction contract
5. Move feature behavior documentation to the owning feature docs.
6. Update `docs/ARCHITECTURE.md` and `docs/INDEX.md`.
7. Ensure no documentation points to moved paths.

### Acceptance criteria

- `WIDGETS.md` documents only current shared public UI.
- Every barrel export has a real consumer or is an intentional app-wide public primitive.
- Documentation paths are valid.
- Verification commands pass.

### Stop condition

Stop after reporting final widget count, export count, moved feature counts, and documentation changes.

## Phase 9 — Add lightweight boundary enforcement

### Goal

Prevent the architecture from drifting back without introducing heavy tooling.

### Completion status — 2026-08-10

Phase complete. Existing ESLint now enforces narrow widget, service, and feature-internal import boundaries. A temporary widget-to-screen violation was rejected by lint and removed; no lint dependency was added.

### Tasks

1. Use the existing ESLint configuration; do not add a dependency unless absolutely necessary and approved.
2. Add narrowly scoped restricted-import rules where the current ESLint setup supports them:
   - shared widgets cannot import from `src/screens/` or `src/features/`
   - services cannot import UI modules
   - features cannot import another feature's internal folders
3. Add no more rules than can be clearly explained and maintained.
4. Update `docs/ARCHITECTURE.md` with the enforced boundaries.

### Acceptance criteria

- Existing valid imports pass lint.
- A deliberate test violation is caught, then removed before completion.
- No new lint dependency was added without approval.

### Stop condition

Stop after reporting the exact rules added and what they prevent.

## Final regression review

### Completion status — 2026-08-10

Phase complete. The final browser matrix passed at mobile and desktop sizes, automated checks passed, and the Type Pinyin Enter/retry race was fixed by keeping feedback-bar keyboard shortcuts away from text fields.

Final metrics:

- `src/lib/widgets/`: 29 component files remain; 27 public barrel export lines (28 public symbols including `DropdownMenuItem`).
- Feature packages: 3 (`character-breakdown`, `dictionary`, `practice`).
- Legacy candidates removed or migrated: 7.
- Automated tests: 87 passing.

After all phases are complete:

1. Run all verification commands.
2. Run content validation.
3. Test key flows at mobile and desktop sizes:
   - Books navigation and course selection
   - Dictionary search, saved words, and character breakdown
   - Library home, folder view, search, and start action
   - Profile metrics
   - Flashcards and memory hooks
   - Multiple-choice quiz
   - Type Pinyin quiz
   - Listening
   - Writing
   - Grammar Learn and Practice
   - Practice settings
   - Global settings and reset confirmation
4. Verify keyboard navigation, focus restoration, Escape dismissal, reduced motion, loading, empty, error, and long-text states where relevant.
5. Compare before/after screenshots for visual drift.
6. Report final architecture metrics:
   - number of files remaining in `src/lib/widgets/`
   - number of shared exports
   - number of feature packages created
   - legacy components removed
   - tests and checks run

## Overall definition of done

- Shared widget ownership is obvious from file location and imports.
- Feature behavior is no longer hidden inside the generic widget library.
- `src/lib/widgets/` is materially smaller and contains only shared presentation.
- No feature service or feature store is owned by a shared widget.
- No stale public exports or stale widget documentation remain.
- No behavior, visual, accessibility, responsive, content, or persistence regression is detected.
- All automated checks pass.
- The user has reviewed the final structure and any unresolved ownership decisions.

## Required phase report format

After every phase, Luna must stop and report:

```text
Phase completed:

Files moved:
- ...

Files edited:
- ...

Public exports changed:
- ...

Behavior or styling changes:
- None expected / list any unavoidable change

Verification:
- npm run typecheck: pass/fail
- npm run lint: pass/fail
- npm test: pass/fail
- npm run build: pass/fail
- browser checks: pass/fail/not applicable

Pre-existing failures or unrelated changes preserved:
- ...

Open questions or blockers:
- ...

Recommended next phase:
- ...
```

Luna must not continue until the user approves the next phase.
