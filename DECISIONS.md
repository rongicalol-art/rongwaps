# Project Decisions

Record choices that should remain stable across tasks. Keep each entry short.

## Format

### YYYY-MM-DD — Decision title

- Chosen:
- Reason:
- Affects:

### 2026-08-10 — Simplified linear grammar lesson

- Chosen:
  - Grammar is one sequential path: `Learn Grammar N -> Exercise Grammar N -> Learn Grammar N+1 -> … -> Part complete`. Each Learn step ends with one primary `Continue` action; a completed Exercise advances to the next grammar's Learn step, and the final completed Exercise reaches Part complete exactly once (completion computed from the post-completion page set, not a render-time flag). No Learn/Practice mode switch, bottom dock, previous/next grammar navigation, or keyboard shortcuts. Reopening resumes at the first incomplete grammar.
  - The header is the practice-mode `ScreenHeader` with a compact two-step rail per grammar point (segment = Learn + Exercise) and the practice `N / N` counter; the reading-aids controls moved into a workspace-bounded `BottomDrawer` so the header never grows a second row and the settings action stays visible at every Learn/Exercise step.
  - Pattern rows size their own columns from displayed content — weighted by traditional/simplified text, attached punctuation, and the longest pinyin line, clamped — instead of authored `patternMobileLayout` modes. Definitions render as a centered full-width band.
  - Optional interactive teaching is one lazy disclosure line (`Explore this pattern`) between the pattern table and Examples; its content mounts only when expanded and focus returns to the control on close.
  - The book viewer replaces the whole grammar workspace while open: portaled above the dialog (`workspace-window` bounded on desktop), with the workspace underneath made inert.
- Reason: Browser review showed the dock and mode switch offered two competing continuations per surface. A linear step flow gives one decision at a time, reuses the practice progress language, and lets the reading surface own the workspace; per-row pattern sizing removes authored layout tuning; lazily mounted optional teaching and a workspace-replacing book viewer keep focus on the path.
- Affects: `GrammarLessonScreen`, `GrammarLessonHeader` (now a `ScreenHeader` adapter), deleted `GrammarBottomDock.tsx` and `hooks/useGrammarKeyboardNav.ts`, `GrammarStudyPage`, `GrammarPatternSection`/`GrammarPatternRow` + new `utils/grammarPatternLayout.ts`, `GrammarInteractiveHelp` + new `GrammarHelpDisclosure.tsx`, `BookPageViewer`, `utils/grammarLessonFlow.ts` (`continueGrammarLesson`, `buildGrammarPartSegments`), removed `patternMobileLayout` from `InteractiveGrammarPage` and all grammar data files.

### 2026-08-10 — Slot legend colors are uniform

- Chosen: The slot legend header uses one color for every slot (`bg-brand-primary` + `border-b-brand-primary-edge`); the darker `activeIndex` highlight is removed along with the `activeIndex` prop on `GrammarSlotMap`.
- Reason: A single darker slot read as an error or a focus state rather than as the grammar accent.
- Affects: `GrammarSlotMap`, `GrammarPatternSection` (accent computation removed), `patternAccentColumn` no longer has a visual role.

### 2026-08-10 — Reliable book reference viewer

- Chosen:
  - The fullscreen book viewer keeps compact top and bottom overlays that auto-hide after inactivity. Only the top and bottom edge reveal zones show them again; page movement and taps in the reading area do not interrupt focus. Previous/Next remain conditional, while the zoom dock shows `− percentage +`; the edge zoom control disables at 100% or 400%, and the percentage resets to 100% when tapped.
  - Page zoom uses rounded layout dimensions plus native stage scrolling rather than CSS transform translation. Touch screens support one-finger panning and a two-finger pinch that scales around the gesture center; Chrome/Edge Ctrl-wheel and Safari gesture events are intercepted so laptop trackpad pinches zoom the page reference instead of the browser. Discrete buttons and keyboard controls remain available.
  - Escape and browser/System Back close only the viewer; Close, Escape, and Back return focus to the View Book action.
- Reason: Edge-only reveal keeps the source page focused without sacrificing reliable zoom geometry, keyboard access, or focus restoration.
- Affects: `BookPageViewer`, `useBookViewerHistory`, `bookViewerLayout`, `useModalFocus`, and grammar progress accessibility copy.

### 2026-08-10 — Grammar-only beta progression

- Chosen: The learner-facing grammar part is temporarily a reading-only sequence: `Grammar N -> Grammar N+1 -> Part complete`. The primary `Continue` action sits on the right with a quiet `Back` text action on the left after the first grammar. Exercises and their authored content remain in the codebase but are not mounted until practice returns to the beta flow.
- Reason: The current goal is one clear grammar-reading path with no competing exercise surface while the lesson experience is being validated.
- Affects: `GrammarLessonScreen`, `GrammarStudyPage`, `grammarLessonFlow`, and the grammar lesson template.

### 2026-08-10 — Close on grammar part completion

- Chosen: The final grammar `Continue` marks the part complete and closes the grammar window. The learner returns to the lesson surface; no separate grammar-complete screen is shown.
- Reason: The grammar sequence should stay focused and end with the same simple action pattern as every other step.
- Affects: `GrammarLessonScreen`, `grammarLessonFlow`, and the grammar lesson template.

### 2026-08-10 — Temporarily hide pattern exploration

- Chosen: Do not mount the `Explore this pattern` disclosure in the learner-facing grammar screen for now. Keep its interactive content and component in place for a later beta phase.
- Reason: The current grammar path should stay focused on the explanation, pattern table, examples, and navigation.
- Affects: `GrammarStudyPage`, `GrammarInteractiveHelp`, and the grammar lesson template.

### 2026-08-24 — Per-book theme via runtime brand tokens

- Chosen: The active book's accent palette drives the app-wide `brand-*` tokens. `src/data/books.ts` gains a `theme` object per book (`primary`, `primaryEdge`, `primaryDeep`, `primarySoft`, `primarySoftEdge`, `primaryTrack`, `practiceCanvas`), and `src/hooks/useBookTheme.ts` writes them onto `document.documentElement` CSS custom properties (`--color-brand-primary*`, `--color-ui-practice-canvas`) whenever the active book changes. New tokens `brand-primary-soft` (pale tint surfaces: selected chips, info panels), `brand-primary-soft-edge` (borders/focus rings on those surfaces), and `brand-primary-track` (theme-tinted neutral for progress-bar empty states) were added; hardcoded blue hexes (`#EAF7FF`, `#BFE9FF`, `#F2F9FF`, `#69CCF9`, blue rgba shadows, …) and the untinted progress-track grays were replaced with these tokens so every screen follows the book color. Books 2–4 soft tints are kept notably paler than their raw hue so they read like Book 1's pale blue. Books/`library`/`search` tabs intentionally keep Book 1 (blue).
- Reason: Book accent colors previously reached only a few components via `accentHex` props, so most UI stayed hardcoded blue when switching books; flat gray progress tracks also clashed with the warm book palettes.
- Affects: `src/data/books.ts`, `src/hooks/useBookTheme.ts`, `src/App.tsx`, `src/index.css`, `src/data/designTokens.ts`, and every component that hardcoded a blue tint or a progress-track gray.

### 2026-08-25 — Rank memory-hook example sentences by character usefulness

- Chosen: `rankExampleSentences` (pure, unit-tested) reorders the memory hook's fetched sentences before display. Scoring rewards occurrences of the character that stand outside memorized courtesy phrases (`src/data/formulaicPhrases.ts`: 你好/大家好/不客氣/…), sentences sourced from a vocabulary word containing the character, and short sentences; chunk-buried occurrences score near zero. It only reorders — candidates are never dropped — and equal scores keep upstream order.
- Reason: Substring matching surfaced formulaic greetings as top examples (大家好 for 大, 不客氣 for 不), which teach nothing about the character's meaning; observed live data shows better candidates already existed in the pool but were unranked.
- Affects: `useCharExampleSentences`, `rankExampleSentences`, `formulaicPhrases`, `tests/exampleSentenceRanking.test.ts`.

### 2026-08-25 — Example sentences become their own block with a Show more toggle

- Chosen: Example sentences move out of the memory-hook card into a separate `V3ExampleSentences` block directly beneath it. The block fetches a deeper pool (shared `fetchExamples` gained a `limit` parameter; the dictionary detail keeps its previous cap of three while the breakdown requests up to ten), shows the first four ranked sentences, and expands inline via a quiet `Show more` / `Show less` toggle with no counts. The memory hook card returns to the hook note only.
- Reason: A sentence list is content in its own right; sharing the hook card made both feel cramped, and capping at two wasted the course corpus for characters with rich coverage.
- Affects: `V3ExampleSentences`, `V3MemoryHook`, `useCharExampleSentences`, `fetchExamples` (`useWordExtras`), `V3CharacterBreakdown`.

### 2026-08-26 — Flip no longer relies on backface culling; calmer, magnetic memory-hook popover

- Chosen:
  - The flashcard flip no longer uses `preserve-3d` + `backface-visibility` culling. The card still rotates with the same perspective, duration, and easing, but the two faces crossfade by opacity around the 90° midpoint (`flipAngle` motion value → `frontOpacity`/`backOpacity` via `useTransform`). Each face also ties `visibility` to its opacity so the faded-out face stops intercepting pointer events, stays out of the tab order, and stops painting.
  - The memory-hook popover opens with a single quiet fade/rise (0.18s easeOut, slight scale 0.97→1) — no blur-in, no springy overshoot, no per-part stagger, no `layout` growth animation. The popover itself is magnetic: it follows the same cursor spring as the character glyph, so the hook card and the glyph pull together.
- Reason: Transformed descendants inside the flip faces (the magnetic character glyphs, active whenever the pointer is near a character while clicking to flip) break `backface-visibility` culling in some browsers and show the front face's characters mirrored mid-flip. Reproductions in headless Chromium/WebKit with static frames did not leak, but the documented mechanism and the user report agree; the crossfade removes backface culling from the equation entirely, so no browser can ever render a mirrored face — and the magnet (which the user wants to keep) becomes harmless. The old popover's blur + spring overshoot + staggered header/body reads as "too much"; the popover now answers the magnet with a quieter entrance and its own magnetic pull.
- Affects: `DraggableFlashcard.tsx` (flip mechanics), `MemoryHookCharacter.tsx` (popover entrance + magnetic popover, dropped the now-pointless backface-visibility belt-and-suspenders), `DECISIONS.md`.

### 2026-08-26 — Magnetic memory-hook characters in practice mode

- Chosen:
  - New `MemoryHookCharacter` feature component (`src/features/character-memory-hooks/`): each practice-mode Chinese character becomes a button with a subtle magnetic field (~90px radius, capped ~4px pull, tracked on the window so the pull works beside the glyph too; mouse/trackpad only, disabled under reduced motion and while the flashcard is dragged) plus a memory-hook popover that opens iOS-style. The popover renders in a `createPortal` to `document.body` so it can never be clipped — including by the flashcard's scrollable back face, whose characters get the same treatment.
  - Hook text comes from the existing mnemonic flow (`getCachedMnemonic`) — learner-facing generation was already removed, so only pre-generated hooks are read and a placeholder shows on a miss; the fetch starts on hover before the popover opens, the popover has a fixed width and a two-line reserved body (skeleton shimmer), and the body uses `layout` — so loading never resizes the popover. Generator `**emphasis**` renders as bold; the accessible name is enriched once loaded.
  - Applied to the flashcard front characters (popover suppressed while the card is dragged) and the quiz Choose/Type prompt characters; clicking still opens the character breakdown at the exact clicked character (`initialCharIndex`).
  - Interaction split in quiz/listening bottom bars: the bottom-bar breakdown button now toggles an inline `BreakdownExpandPanel` (characters, pinyin, meaning, word memory hook via `word_{front}`) that expands in place inside the bar; only pressing a character itself opens the full breakdown screen.
  - Shared `isHanziChar` helper in `src/utils/hanzi.ts` replaces the inline CJK regexes in the flashcard.
- Reason: Memory hooks are the "aha" layer of the app but had no presence in practice; hovering characters is the lowest-friction place to surface them, and the magnet gives the glyphs a tactile premium-playful response that matches the product's personality without stealing the primary tap-to-breakdown action.
- Affects: `MemoryHookCharacter.tsx` + feature barrel, `hookText.tsx` (shared hook-text helpers), `BreakdownExpandPanel.tsx` (new, practice feature), `FeedbackBottomBar` (`breakdownOpen`/`breakdownPanel` props), `DraggableFlashcard`, `QuizChoices`/`QuizTyping`/`ListeningScreen`, `src/utils/hanzi.ts`, `DECISIONS.md`.

### 2026-08-26 — Scroll-to-expand flashcard examples

- Chosen: The flashcard back opens in a compact answer state with no sentence visible. Example data loads only after the back is flipped, and sentence rows mount only after a downward scroll gesture. The card expands with a spring-sized height transition on downward scroll and collapses back to the compact answer on upward scroll, on both mobile and desktop. Examples are presented in ranked groups: Current match, This lesson, Previous lessons, and Other lessons.
- Reason: The answer should remain the first memory cue while sentence context stays available without a separate overlay. Deferring the example request and row rendering keeps the common flashcard path responsive, while directional scroll makes the expansion feel intentional and reversible.
- Affects: `DraggableFlashcard`, `FlashcardExamples`, `useCurriculumExamples`, `courseExamples`, `FlashcardScreen`, and `docs/COURSE_EXAMPLES.md`.

### 2026-08-26 — Wide reference-style flashcard sentence stream

- Chosen: Expanded flashcards animate from the compact card width to the available workspace width as well as growing vertically. Sentence context uses separate, quiet rows with a lesson pill and one rank pill per group (`Top match`, `This lesson`, `Previous lesson`, or `Other lesson`); instructional scroll copy and the old group header/count chrome are removed. Every eligible ranked sentence remains in the stream.
- Reason: The reference makes each sentence feel like a deliberate reading unit rather than content appearing inside a narrow card. A single coordinated group reveal keeps that transition calm while avoiding an animation and layout observer for every sentence.
- Affects: `DraggableFlashcard`, `FlashcardExamples`, `FlashcardScreen`, and `docs/COURSE_EXAMPLES.md`.

### 2026-08-27 — Content-driven grammar pattern columns

- Chosen: The pattern legend and every example row render in one shared CSS grid (replacing per-row grids with a repeated JS template). Column widths are browser-resolved: when one column clearly outweighs the rest (weight ratio ≥ 1.5) it becomes the single flexible `1fr` track and its neighbors size to their content — `min-content` below 768px so a one-character slot (e.g. 嗎) never stretches, `auto` from 768px so slot headings stay on one line; near-equal columns each get `1fr`. The grid is centered and capped at `max-w-[45rem]` so a flexible column cannot dominate a wide viewport. The previous `minmax(72px, share fr)` template left a dead band inside the card at 390px and stretched one-character cells to the floor width; the shared grid keeps dividers aligned by construction and fills the card exactly.
- Reason: Mobile browser review showed the pattern table left ~90px of unused space at the right edge and sized a single 嗎 to the 72px floor. Content-sized tracks make short slots hug their text (43/57px for 他/嗎), let the sentence column absorb leftover space (256px), and keep desktop headings readable.
- Affects: `GrammarPatternSection` (single shared grid; deleted `GrammarSlotMap`/`GrammarPatternRow`), `utils/grammarPatternLayout.ts` (+ `sideColumnSizing`, `flexColumnIndex`; raw weights), new `hooks/useMediaQuery.ts`, `tests/grammarPatternLayout.test.ts`, and `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-27 — Separate nowrap slot header

- Chosen: The slot header returns to a separate tinted band at the top of the pattern table, and its headings are `whitespace-nowrap`. Because the band lives in the same shared grid as the rows, the nowrap headings push each column open just enough to hold them on a single line — no wrapped 2-line labels — while example rows stay pure chunks and pinyin, with no caption text mixed into them. Everything else (single shared grid, content-sized tracks, one flexible column, centered `max-w` cap) is unchanged.
- Reason: Merging the headings into the first example row read as annotations on that row rather than a header, so the table looked like one example was different. A separate band with nowrap headings keeps the header visually its own surface while avoiding the wrapped-label mess that the earlier narrow columns caused.
- Affects: `GrammarPatternSection` (legend band restored with nowrap headings), `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-27 — Wide viewports spread proportionally; table overflow scrolls

- Chosen: From 768px the pattern table no longer uses a single flexible `1fr` track (which absorbed all leftover space and produced lopsided columns such as `[398, 89, 233]` with one ~stanza-wide column). Instead every track gets a content-weighted `fr` share with a content-based minimum (`minmax(auto, share fr)`, clamped shares), so the table fills its card proportionally (`[283, 153, 283]`). Below 768px the compact flex model is unchanged (`min-content` neighbors + one flexible track, e.g. `[87, 177, 92]` at 390px). The table surface also contains horizontal overflow by always scrolling (`overflow-x-auto`) instead of clipping at the card, which was cutting off the right columns on narrower desktop windows (measured 9px of clipping at 800px with the side nav).
- Reason: Wide-screen browser review showed one column ballooning to 398–543px (a two-instance chunk plus pinyin) while its neighbors became slender strips, and at ~800px viewports the card clipped the table's right edge entirely.
- Affects: `utils/grammarPatternLayout.ts` (restored clamped shares; `sideColumnSizing: 'min-content' | 'proportional'`, `shares` in the layout), `GrammarPatternSection` (always-scrollable table surface), `tests/grammarPatternLayout.test.ts`, and `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-28 — Flashcard list mode with per-deck include/exclude curation

- Chosen: Flashcards gains a second view mode (Cards / List) opened from a sub-menu on the bottom dock's Flashcards icon (the quiz Choose/Type pattern). List mode keeps the home-screen lesson chain geometry — included rows merge into one accent-edged block (rounded corners only at chain ends, hairline dividers between connected rows, spring layout animation); excluded rows sit apart as resting blocks with dimmed content and break the chain — rendered as a **single column** with the deck grouped by part; the `Part N` label renders **inside the first block of each part** (home lesson eyebrow style, accent when included) so chains break at part boundaries without a separate header plate. Rows are dictionary-style: vocab word, hairline vertical divider, pinyin + definition, and the book/lesson token plus the POS tag reusing `PosBadge`. There is no included/total counter and no Reset button — the whole block is the toggle, so tapping an excluded block re-includes it. The whole block is tappable (the container must be `flex` — a plain block container would shrink the button to its content, leaving the right side of the row dead). Top/bottom gradient fades blend the scroll under the transparent study header and the floating mode dock.
- Header semantics: the header is otherwise unchanged, but in list mode the progress registers as *included / total* (20 / 20 at default, 19 / 20 after one exclusion) so the bar reads "how much of the deck is on". Switching back to Cards restores live session progress (1 / 19 — the deck minus exclusions). A compact "included / total words" line plus Reset action sits above the list; auto-advance Flow pauses on entering List.
- Exclusions are persisted per deck (`deckExclusions` in the persisted app store, keyed by deck identity): curriculum decks use the session key (book + lessons + part fingerprint), library decks `shared_deck_library_<folder>`, and the review deck `shared_deck_review` — global rather than book-scoped, because the review deck is *all* due cards across every book (a book-scoped key would silently resurrect excluded cards when the user switched books). An absent entry means "include everything"; user-toggled entries are stored as excluded ids only.
- Exclusions apply at the single shared loader (`useActivityDataLoader`), so flashcards, quiz, listening, and writing (curriculum, review, and library decks) all agree on the same deck. The fetch is not re-run on toggle — the filter is derived, and stale ids (deleted cards, removed vocabulary) are pruned against the loaded source set; for review, pruning happens against the full vocabulary id set, never the due set, so "not due today" never un-excludes a word.
- Exclusions apply live: the running deck updates immediately, the current card is tracked by id (existing `retainCurrentCardIndex`), and excluding the current card skips to the next included one. Resuming a session after a reload restores the same curated deck. Excluding every card yields an explicit "All vocab is hidden" state with Reset.
- Accept: switching decks (part selection or exclusions changing the deck) resets shuffle to canonical order — this matches the existing part-toggle behavior rather than adding new deck-ordering semantics.
- Affects: `src/utils/deckExclusions.ts`, `src/store/useAppStore.ts` (`deckExclusions`), `src/hooks/useActivityDataLoader.ts`, `src/hooks/useDeckExclusionActions.ts`, `src/screens/flashcard/FlashcardScreen.tsx` (+ `components/FlashcardList.tsx`), `src/screens/activities/ActivityModals.tsx` and `components/PracticeModeDock.tsx`, `tests/deckExclusions.test.ts`.

### 2026-09-06 — Universal proportional shares and wrapping headers for pattern tables

- Chosen: Sentence pattern tables use proportional track shares (`minmax(0, share fr)`, `clampShares`) across all viewports, completely replacing the mobile `1fr min-content min-content` sizing mode. Slot header labels and details wrap naturally (`whitespace-normal text-center leading-tight hyphens-auto`) instead of `whitespace-nowrap`, eliminating compound label track blowouts. Header influence in column weight scoring is calibrated by longest segment rather than raw length. The grid enforces a responsive minimum width (`min-w-[340px]` for 3-column tables) inside the scroll container, and subtle gradient edge fades dynamically indicate horizontal scrollability on narrow mobile devices.
- Reason: Mobile inspection revealed 55+ tables suffered from severe column starving: `min-content` tracks with unwrapped headers (e.g. `WHAT IS THERE / SECOND ACTION` at 230px+) squeezed neighboring columns down to ~18px, clipping characters and borders. Universal proportional shares guarantee every column receives between 20% and 60% of available width, while natural wrapping keeps headers compact and readable.
- Affects: `src/utils/grammarPatternLayout.ts`, `src/screens/grammar-lesson/components/GrammarPatternSection.tsx`, `tests/grammarPatternLayout.test.ts`.

### 2026-09-08 — Profile rework: review hub, honest stats, guest-first account

- Chosen:
  - Profile tab is now a status screen: sticky "Profile" header, identity block (avatar, name, guest label), a Review hub hero, a "Words you know" panel, and a quiet Account surface. The Vocabulary Garden, streak/XP/total-review stat grid, and `ProgressDashboard` were deleted.
  - The hub has three honest states (words due → Start Review; known words but nothing due → "All caught up"; nothing known → "No words yet") and never offers a dead-end action. Due count = any SRS word past its review date, mirroring the review deck's own filter.
  - Stage semantics: known = passed at least once (`learnedCards`); 1–2 successful reviews = Learning, 3+ = Solid (`SOLID_REPETITION_THRESHOLD = 3` in `src/utils/reviewOverview.ts`); reviewed-but-unpassed words surface as a quiet "Just started" row. All counts derive purely from local SRS state via `useReviewOverview`.
  - Review hub + stage bar intentionally share one data source with the session deck, so hub numbers always equal what a launched review contains.
- Reason: The garden's seed/sprout/flower metaphor and the streak/XP grid told no one anything actionable. A due-first hub with self-explanatory word stages gives the Profile one clear job ("what to review now") and honest numbers.
- Affects: `ProfileScreen`, new `screens/profile/components/{ReviewHubCard,WordsKnownCard,AccountRow}.tsx`, new `screens/profile/hooks/useReviewOverview.ts`, new `utils/reviewOverview.ts` (+ `tests/reviewOverview.test.ts`), deleted `GardenVisualization.tsx`/`ProgressDashboard.tsx`, `TabScreens` now passes `menuToggle` to Profile. Streak/XP removal app-wide, review-session key unification, and the full-screen sign-in window are planned follow-up phases.

### 2026-09-08 — Review sessions span every book; streak/XP removed app-wide; full-screen sign-in

- Chosen:
  - Review decks already loaded the full vocabulary catalog (all books) for every activity — but resume keys, deck-exclusion keys, and clear-on-close keys disagreed (`shared_deck_review_${activeBookId}` vs global `shared_deck_review`). Session keys are now unified behind `SHARED_REVIEW_SESSION_KEY` in `utils/lessonPartSelection.ts`, used by `useFlashcards`, `useWriting`, `useListening`, `QuizScreen`, `ActivityModals`, and matching the exclusion key. Profile copy ("across all the books") is therefore literally true.
  - XP and streaks are removed product-wide: `xpSystem.ts` deleted; XP/streak/total/last-study fields gone from the store and `reviewProgress`; `LessonComplete` no longer shows "+N XP"; the settings reset copy no longer lists them; dead streak surfaces (`CourseProgressSummary`, `ProgressDashboard`) deleted. Session sync keeps daily cards-reviewed/learned counters only (`xpEarned` dropped from `SyncProgressCounters` and the fingerprint); `upsert_daily_progress` is still called with `p_xp_earned = 0` so the legacy server column and RPC stay intact with no live migration.
  - Sign-in is a dedicated full-screen window (`SignInWindow`) that owns its tone, replaces the old `AuthScreen` bottom drawer, and closes automatically when a session appears; guests continue with one quiet action and are never gated.
- Reason: Review progress must live on the same key as the deck that backs it, or resume/exclusions silently fragment per book. Streaks and XP gamified the wrong loop and duplicated numbers the app no longer shows. A full-screen sign-in makes the account decision legible instead of tucking it into a drawer.
- Affects: `SHARED_REVIEW_SESSION_KEY` (5 call sites unified), deleted `xpSystem.ts`/`CourseProgressSummary.tsx`/`AuthScreen.tsx`, slimmed `useAppStore`, `reviewProgress`, `cloudSyncQueue`, `progressService` (daily upsert only), `useCloudSync`, `useResetProgress`, `LessonComplete`/`WritingScreen` (no XP), `types/models.ts` (no `SessionProgress.xpEarned`/aggregate stat types), tests (`reviewProgress`, `cloudSyncQueue`, acceptance tiers 1–4) updated to the no-XP shapes; new `SignInWindow` + auth barrel.
