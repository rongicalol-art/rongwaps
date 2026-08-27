# Project Decisions

Record choices that should remain stable across tasks. Keep each entry short.

## Format

### YYYY-MM-DD — Decision title

- Chosen:
- Reason:
- Affects:

### 2026-08-26 — Flip no longer relies on backface culling; calmer, magnetic memory-hook popover

- Chosen:
  - The flashcard flip no longer uses `preserve-3d` + `backface-visibility` culling. The card still rotates with the same perspective, duration, and easing, but the two faces crossfade by opacity around the 90° midpoint (`flipAngle` motion value → `frontOpacity`/`backOpacity` via `useTransform`). Each face also ties `visibility` to its opacity so the faded-out face stops intercepting pointer events, stays out of the tab order, and stops painting.
  - The memory-hook popover opens with a single quiet fade/rise (0.18s easeOut, slight scale 0.97→1) — no blur-in, no springy overshoot, no per-part stagger, no `layout` growth animation. The popover itself is magnetic: it follows the same cursor spring as the character glyph, so the hook card and the glyph pull together.
- Reason: Transformed descendants inside the flip faces (the magnetic character glyphs, active whenever the pointer is near a character while clicking to flip) break `backface-visibility` culling in some browsers and show the front face's characters mirrored mid-flip. Reproductions in headless Chromium/WebKit with static frames did not leak, but the documented mechanism and the user report agree; the crossfade removes backface culling from the equation entirely, so no browser can ever render a mirrored face — and the magnet (which the user wants to keep) becomes harmless. The old popover's blur + spring overshoot + staggered header/body reads as "too much"; the popover now answers the magnet with a quieter entrance and its own magnetic pull.
- Affects: `DraggableFlashcard.tsx` (flip mechanics), `MemoryHookCharacter.tsx` (popover entrance + magnetic popover, dropped the now-pointless backface-visibility belt-and-suspenders), `DECISIONS.md`.

### 2026-08-26 — Magnetic memory-hook characters in practice mode

- Chosen:
  - New `MemoryHookCharacter` feature component (`src/features/character-memory-hooks/`): each practice-mode Chinese character becomes a button with a subtle magnetic field (~90px radius, capped ~4px pull, tracked on the window so the pull works beside the glyph too; mouse/trackpad only, disabled under reduced motion and while the flashcard is dragged) plus a memory-hook popover that opens iOS-style: blur-in, springy scale with slight overshoot, header/body revealed in sequence. The popover renders in a `createPortal` to `document.body` so it can never be clipped — including by the flashcard's scrollable back face, whose characters get the same treatment.
  - Hook text comes from the existing mnemonic flow (`getCachedMnemonic`) — learner-facing generation was already removed, so only pre-generated hooks are read and a placeholder shows on a miss; the fetch starts on hover before the popover opens, the popover has a fixed width and a two-line reserved body (skeleton shimmer), and the body uses `layout` — so loading never resizes the popover. Generator `**emphasis**` renders as bold; the accessible name is enriched once loaded.
  - Applied to the flashcard front characters (popover suppressed while the card is dragged) and the quiz Choose/Type prompt characters; clicking still opens the character breakdown at the exact clicked character (`initialCharIndex`).
  - Interaction split in quiz/listening bottom bars: the bottom-bar breakdown button now toggles an inline `BreakdownExpandPanel` (characters, pinyin, meaning, word memory hook via `word_{front}`) that expands in place inside the bar; only pressing a character itself opens the full breakdown screen.
  - Flip safety: no `will-change: transform` or hover transforms inside the flashcard's `preserve-3d` flip (transformed descendants break backface culling → mirrored characters); the character button carries `backface-visibility: hidden` as belt-and-suspenders.
  - Shared `isHanziChar` helper in `src/utils/hanzi.ts` replaces the inline CJK regexes in the flashcard.
- Reason: Memory hooks are the "aha" layer of the app but had no presence in practice; hovering characters is the lowest-friction place to surface them, and the magnet gives the glyphs a tactile premium-playful response that matches the product's personality without stealing the primary tap-to-breakdown action.
- Affects: `MemoryHookCharacter.tsx` + feature barrel, `hookText.tsx` (shared hook-text helpers), `BreakdownExpandPanel.tsx` (new, practice feature), `FeedbackBottomBar` (`breakdownOpen`/`breakdownPanel` props), `DraggableFlashcard` (front and back faces — tooltips portal to body so the back face's scroll container can't clip them), `QuizChoices`/`QuizTyping`/`ListeningScreen` (per-char prompt, breakdown index, inline expand state), `src/utils/hanzi.ts`, `DECISIONS.md`.

### 2026-08-07 — Minimal grammar lesson chrome

- Chosen:
  - Header is one text line ("Grammar N of N") + one progress bar + close + one quiet utility (reading-aids gear, study mode only). No Prev/Next buttons, no Lesson·Part eyebrow.
  - Bottom `GrammarModeDock` removed. Learn/Practice is a compact in-content segmented rail at the top of the study/exercise article; labels are just "Learn"/"Practice" — the header owns grammar numbering.
  - Navigation is keyboard-first: `←`/`→` step between grammar points, `1`/`2` switch Learn/Practice, guarded so typing in text-response exercises / IME / modifier chords are never hijacked (mirrors `useNumberKeySelection`).
  - Quiet Previous/Next pair at the bottom of the Learn view only (touch fallback); the header owns grammar numbering.
- Reason: The header/dock stacked too much chrome over the reading surface; grammar-number labels were duplicated between header and dock. Arrow-key + 1/2 navigation removes the need for persistent header arrows on desktop, and the quiet inline row keeps mobile navigation discoverable without a distracting permanent footer.
- Affects: `GrammarLessonScreen` (wires `useGrammarKeyboardNav`, renders `GrammarModeRail` + `GrammarPrevNextNav`), `GrammarLessonHeader` (props trimmed), new `GrammarModeRail`/`GrammarPrevNextNav` components, new `hooks/useGrammarKeyboardNav.ts`, deleted `GrammarModeDock.tsx`.

### 2026-08-08 — Grammar workspace alignment polish

- Chosen:
  - One alignment system: header row (`maxWidth="4xl"`), the in-content segmented rail, and the main scroll content all share a `max-w-4xl` column — no more scattered X positions or dead gaps.
  - Progress bar spans the full content column width (a "long bar" like other lesson headers) with the "Grammar N of N" text line beneath it.
  - `GrammarModeRail` is left-aligned inside the content column (no floating centered pill above left-aligned reading text).
- Reason: The minimal chrome exposed a second problem — the top bar, centered rail pill, and article text each had different alignment anchors, which read as "tacked together." One shared column makes the workspace feel authored as one system.
- Affects: `GrammarLessonHeader` (maxWidth 4xl + full-width progress), `GrammarModeRail` (left-aligned), `GrammarLessonScreen` (max-w-4xl content wrapper).


### 2026-08-08 — Grammar header reuses practice-mode part rail, dock returns

- Chosen:
  - The grammar lesson header is the exact practice-mode header: `ScreenHeader` fed `partSegments` (one segment per grammar point, each = 1 card), `currentIndex`, `totalCount`, and `progressSize="compact"`. No "Grammar N of N" headline anywhere — the part-by-part progress rail and the practice mode's small `N / N` counter (desktop) convey position.
  - Learn/Practice moved back to a bottom dock (`GrammarBottomDock`): quiet Previous/Next grammar icons on the left + centered Learn/Practice segmented switch. In-content top rail and Learn-only bottom nav deleted.
- Reason: Reusing the practice-mode header gives one consistent progress language across practice and grammar study; removing the headline and the in-content rail leaves the reading surface as the only focus, with navigation consolidated into one quiet bottom surface.
- Affects: `GrammarLessonScreen` (feeds `segments`/`currentIndex`/`totalCount`, renders `GrammarBottomDock`), `GrammarLessonHeader` (reset to practice-mode rail), new `GrammarBottomDock`, new `buildGrammarPartSegments` helper in `grammarLessonFlow.ts`, deleted `GrammarModeRail.tsx` + `GrammarPrevNextNav.tsx`.

### 2026-08-09 — Focused grammar workbook

- Chosen:
  - Grammar header owns explicit `Grammar N of N` copy plus a visible segmented progress rail. It does not duplicate a second grammar label or rely on a practice-mode rail whose progress can disappear at narrow widths.
  - Learn uses one `max-w-3xl` reading column. The book-page action sits beneath the title, the pattern is one shared formula board, and examples are one editorial list.
  - Practice presents one authored question at a time with `Question N of N`, a single teaching surface, and a `Next question` action after a correct answer. Content and grading rules remain source-first.
  - The bottom dock is a symmetrical `[Previous] [Learn | Practice] [Next]` capsule with quiet navigation utilities and one selected mode.
- Reason: Browser review showed that the previous composition stacked too many competing surfaces and made progress, title actions, and question sequence harder to scan—especially at 390px.
- Affects: `GrammarLessonHeader`, `GrammarBottomDock`, `GrammarStudyPage`, `GrammarPatternSection`, `GrammarPatternRow`, `GrammarExamplesSection`, `DragBlankExercise`, `ExerciseQuestionCard`, `OpenResponseQuestionCard`, and `SentenceUnscrambleExercise`.

### 2026-08-10 — Simplified linear grammar lesson (supersedes 2026-08-09)

- Chosen:
  - Grammar is one sequential path: `Learn Grammar N -> Exercise Grammar N -> Learn Grammar N+1 -> … -> Part complete`. Each Learn step ends with one primary `Continue` action; a completed Exercise advances to the next grammar's Learn step, and the final completed Exercise reaches Part complete exactly once (completion computed from the post-completion page set, not a render-time flag). No Learn/Practice mode switch, bottom dock, previous/next grammar navigation, or keyboard shortcuts. Reopening resumes at the first incomplete grammar.
  - The header is the practice-mode `ScreenHeader` with a compact two-step rail per grammar point (segment = Learn + Exercise) and the practice `N / N` counter; the reading-aids controls moved into a workspace-bounded `BottomDrawer` so the header never grows a second row and the settings action stays visible at every Learn/Exercise step.
  - Pattern rows size their own columns from displayed content — weighted by traditional/simplified text, attached punctuation, and the longest pinyin line, clamped — instead of authored `patternMobileLayout` modes. Definitions render as a centered full-width band.
  - Optional interactive teaching is one lazy disclosure line (`Explore this pattern`) between the pattern table and Examples; its content mounts only when expanded and focus returns to the control on close.
  - The book viewer replaces the whole grammar workspace while open: portaled above the dialog (`workspace-window` bounded on desktop), with the workspace underneath made inert.
- Reason: Browser review showed the dock and mode switch offered two competing continuations per surface. A linear step flow gives one decision at a time, reuses the practice progress language, and lets the reading surface own the workspace; per-row pattern sizing removes authored layout tuning; lazily mounted optional teaching and a workspace-replacing book viewer keep focus on the path.
- Affects: `GrammarLessonScreen`, `GrammarLessonHeader` (now a `ScreenHeader` adapter), deleted `GrammarBottomDock.tsx` and `hooks/useGrammarKeyboardNav.ts`, `GrammarStudyPage`, `GrammarPatternSection`/`GrammarPatternRow` + new `utils/grammarPatternLayout.ts`, `GrammarInteractiveHelp` + new `GrammarHelpDisclosure.tsx`, `BookPageViewer`, `utils/grammarLessonFlow.ts` (`continueGrammarLesson`, `buildGrammarPartSegments`), removed `patternMobileLayout` from `InteractiveGrammarPage` and all grammar data files.

### 2026-08-10 — Pattern rows as separate cards

- Chosen: The shared framed pattern board is removed. The blue slot legend and the first example row share one card (legend as its header), and each remaining row renders as its own outlined card with one section-level adaptive column template and the centered meaning band combined inside it. Cards are spaced by gaps rather than shared dividers, while their internal vertical dividers remain aligned.
- Reason: Per-row cards make each example sentence a self-contained unit (Chinese + definition together) that scans better at 390px. A single content-weighted template preserves that benefit without making the table feel visually irregular when sentence lengths differ.
- Affects: `GrammarPatternSection` (legend + first row combined card), `GrammarPatternRow` (card wrapper + `bare` prop), `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-10 — Section-level adaptive pattern columns

- Chosen: Pattern columns are content-weighted at the section level. The legend and all pattern rows share one adaptive template based on the longest visible text, pinyin, punctuation, and heading content; widths are bounded for narrow viewports. Globally unused columns are omitted, but a locally empty cell preserves its original grammar-slot position. Five or more columns may use table-only horizontal overflow.
- Reason: Browser review showed that equal-width headers combined with independently sized rows made the pattern cards feel unsymmetrical. Shared tracks improve scanning and keep the grammar relationship stable across row lengths without introducing separate mobile markup.
- Affects: `src/utils/grammarPatternLayout.ts`, `GrammarPatternSection`, `GrammarPatternRow`, `GrammarSlotMap`, and `tests/grammarPatternLayout.test.ts`.

### 2026-08-10 — Softer grammar pattern table surface (superseded)

- Chosen: Keep the aligned section-level columns, but render the pattern as one quiet table surface with a thin `ui-divider` outline, a compact pale-blue slot header, and internal row separators with a small canvas-toned gap between examples. Example rows do not receive individual bordered cards. The header uses dark learner-facing text with a restrained brand accent instead of a tall saturated blue block.
- Reason: The repeated heavy outlines and bright header made each example compete as a separate object and made the table feel unpolished. A single surface preserves alignment while making the grammar structure read as one calm teaching unit.
- Affects: `GrammarPatternSection`, `GrammarPatternRow`, `GrammarSlotMap`, and `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-10 — Separate example tables with shared geometry (superseded)

- Chosen: Keep each example as its own quiet table surface with a thin neutral outline and a small gap between tables. The first table includes the compact slot header; every later table keeps the same section-level column template without repeating the header.
- Reason: Learners need a visible pause between examples, but aligned tracks and shared surface treatment should still make the examples read as one pattern system.
- Affects: `GrammarPatternSection`, `GrammarPatternRow`, `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-10 — Unified grammar pattern table

- Chosen: Keep the grammar legend and every example row united in one quiet table surface. Use one thin neutral outline, aligned section-level columns, and subtle internal separators with no gaps or repeated row cards.
- Reason: The simplest presentation makes the pattern read as one teaching unit while retaining enough row separation for scanning.
- Affects: `GrammarPatternSection`, `GrammarPatternRow`, `GrammarSlotMap`, and `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-10 — Slot legend colors are uniform

- Chosen: The slot legend header uses one color for every slot (`bg-brand-primary` + `border-b-brand-primary-edge`); the darker `activeIndex` highlight is removed along with the `activeIndex` prop on `GrammarSlotMap`.
- Reason: A single darker slot read as an error or a focus state rather than as the grammar accent.
- Affects: `GrammarSlotMap`, `GrammarPatternSection` (accent computation removed), `patternAccentColumn` no longer has a visual role.

### 2026-08-10 — Immersive fullscreen book viewer (supersedes the workspace-bounded viewer)

- Chosen: The book viewer is a YouTube-style fullscreen lightbox: `fixed inset-0` over the whole viewport (no `workspace-window` bound, Books navigation covered while open), black stage, no persistent header — Close/title/pages and zoom controls are floating overlays that auto-hide after ~2.5s and return on any interaction (always visible under reduced motion). Zoom is 1x–4x like a PDF viewer (scroll pans, `Ctrl`+scroll / trackpad pinch zooms to cursor, touch pinch zooms, drag pans when zoomed, double-click 1x/2x, `+`/`−`/`0`), and a horizontal swipe flips pages when not zoomed; `←`/`→` flip pages. Focus trap, Escape, focus return, image-failure state, and per-page reset are preserved.
- Reason: The earlier workspace-bounded viewer with a persistent header and no zoom was "disturbing": it was not full screen and could not be read closely.
- Affects: `BookPageViewer` (rewrite), `AppIcon` (+ `minus`/`plus`), `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-10 — Reliable book reference viewer (supersedes auto-hide viewer)

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

### 2026-08-25 — Example sentences fill the bottom of the memory hook

- Chosen: The V3 memory-hook note carries up to two course example sentences beneath its hook text (Chinese with the character highlighted via `SmartSentence`, tone-marked pinyin, English, B·L tag). Data reuses the dictionary's shared example fetcher (`fetchExamples` in `useWordExtras`) through the new `useCharExampleSentences` hook; when a character has no sentences with full pinyin + English, the block stays hidden. The desktop structure/context rail composition is unchanged.
- Reason: A short sentence list gives the quiet hook card useful body without competing with the breakdown tree, and reusing the dictionary's "In Context" data keeps sentence sourcing and filtering in one place.
- Affects: `V3MemoryHook`, `useCharExampleSentences`, `useWordExtras`, and `docs/CHARACTER_DECOMPOSITION_PHASE6_UI_REBUILD.md`.

### 2026-08-25 — Rank memory-hook example sentences by character usefulness

- Chosen: `rankExampleSentences` (pure, unit-tested) reorders the memory hook's fetched sentences before display. Scoring rewards occurrences of the character that stand outside memorized courtesy phrases (`src/data/formulaicPhrases.ts`: 你好/大家好/不客氣/…), sentences sourced from a vocabulary word containing the character, and short sentences; chunk-buried occurrences score near zero. It only reorders — candidates are never dropped — and equal scores keep upstream order.
- Reason: Substring matching surfaced formulaic greetings as top examples (大家好 for 大, 不客氣 for 不), which teach nothing about the character's meaning; observed live data shows better candidates already existed in the pool but were unranked.
- Affects: `useCharExampleSentences`, `rankExampleSentences`, `formulaicPhrases`, `tests/exampleSentenceRanking.test.ts`.

### 2026-08-25 — Example sentences become their own block with a Show more toggle

- Chosen: Example sentences move out of the memory-hook card into a separate `V3ExampleSentences` block directly beneath it. The block fetches a deeper pool (shared `fetchExamples` gained a `limit` parameter; the dictionary detail keeps its previous cap of three while the breakdown requests up to ten), shows the first four ranked sentences, and expands inline via a quiet `Show more` / `Show less` toggle with no counts. The memory hook card returns to the hook note only.
- Reason: A sentence list is content in its own right; sharing the hook card made both feel cramped, and capping at two wasted the course corpus for characters with rich coverage.
- Affects: `V3ExampleSentences`, `V3MemoryHook`, `useCharExampleSentences`, `fetchExamples` (`useWordExtras`), `V3CharacterBreakdown`, and `docs/CHARACTER_DECOMPOSITION_PHASE6_UI_REBUILD.md`.

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

### 2026-08-27 — Slot legend becomes first-row captions

- Chosen: The separate legend band is removed from the pattern table. The first example row carries each `patternColumns` label and `patternColumnDetails` notation as a nowrap caption under its chunk, inside the same grid cell. Column tracks are therefore sized by chunks and captions together, so every heading stays on a single line at any viewport; later rows render chunks only. The aligned shared-grid structure, content-sized tracks, and single flexible column are unchanged.
- Reason: At 390px the standalone legend band wrapped long headings ("Who or / what", "question / ending") inside the narrow slot columns, which read as messy. Tucking the heading into the first row's cell gives each column exactly the width its caption needs (one line, no overflow) while keeping the word-order alignment that makes the pattern readable.
- Affects: `GrammarPatternSection` (legend band removed, first-row caption cells), `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-27 — Separate nowrap slot header (supersedes first-row captions)

- Chosen: The slot header returns to a separate tinted band at the top of the pattern table, and its headings are `whitespace-nowrap`. Because the band lives in the same shared grid as the rows, the nowrap headings push each column open just enough to hold them on a single line — no wrapped 2-line labels — while example rows stay pure chunks and pinyin, with no caption text mixed into them. Everything else (single shared grid, content-sized tracks, one flexible column, centered `max-w` cap) is unchanged.
- Reason: Merging the headings into the first example row read as annotations on that row rather than a header, so the table looked like one example was different. A separate band with nowrap headings keeps the header visually its own surface while avoiding the wrapped-label mess that the earlier narrow columns caused.
- Affects: `GrammarPatternSection` (legend band restored with nowrap headings), `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-08-27 — Wide viewports spread proportionally; table overflow scrolls

- Chosen: From 768px the pattern table no longer uses a single flexible `1fr` track (which absorbed all leftover space and produced lopsided columns such as `[398, 89, 233]` with one ~stanza-wide column). Instead every track gets a content-weighted `fr` share with a content-based minimum (`minmax(auto, share fr)`, clamped shares), so the table fills its card proportionally (`[283, 153, 283]`). Below 768px the compact flex model is unchanged (`min-content` neighbors + one flexible track, e.g. `[87, 177, 92]` at 390px). The table surface also contains horizontal overflow by always scrolling (`overflow-x-auto`) instead of clipping at the card, which was cutting off the right columns on narrower desktop windows (measured 9px of clipping at 800px with the side nav).
- Reason: Wide-screen browser review showed one column ballooning to 398–543px (a two-instance chunk plus pinyin) while its neighbors became slender strips, and at ~800px viewports the card clipped the table's right edge entirely.
- Affects: `utils/grammarPatternLayout.ts` (restored clamped shares; `sideColumnSizing: 'min-content' | 'proportional'`, `shares` in the layout), `GrammarPatternSection` (always-scrollable table surface), `tests/grammarPatternLayout.test.ts`, and `docs/GRAMMAR_LESSON_TEMPLATE.md`.
