# Project Decisions

Record choices that should remain stable across tasks. Keep each entry short.

## Format

### YYYY-MM-DD — Decision title

- Chosen:
- Reason:
- Affects:

### 2026-09-29 — Character breakdown: the sound piece is highlighted in the components block

- Chosen:
  - The phonetic piece now lives on its component: the tree tile matching the sound pack's `phonetic.glyph` carries the book accent (2px `edgeHex` border, soft `accentHex` wash, matching bottom depth) plus a "SOUND" micro-badge with the speaker icon, and its pinyin line shows the compact tone shift (`qīn→xīn`).
  - Nested pieces auto-reveal once per character: `resolveSoundRevealPath` walks the runtime reverse index from the sound glyph to the character and `useRuntimeDecompositionTree.expand` opens the ancestors, so 師's 㠯 (inside 𠂤) shows bordered without manual digging. Applies to the summary row and the Component-tree screen.
  - The standalone Sound card is retired (`SoundBlock`/`SoundStrip` deleted). Only the sound family survives, as `SoundFamilyStrip` in the summary card (accent-bordered tiles under a `Sound family` label). No phonetic and no family renders nothing — the 58% empty case is gone.
- Reason: owner design review — a second tinted card under the Memory Hook competed with it, and sound is a property of one component, so it belongs on that component. 270/277 phonetic pieces are direct components; the other 7 (師 餐 弟 第 關 傷 南) sit one level deeper and are auto-revealed.
- Affects: `src/features/character-breakdown/components/v3/{V3RuntimeTree,V3CharacterBreakdown,V3CharacterSummary,V3TreeScreen}.tsx`, `src/features/character-breakdown/components/breakdown/SingleBreakdownView.tsx`, `src/features/character-breakdown/hooks/useRuntimeDecompositionTree.ts`, `src/features/character-breakdown/utils/soundRevealPath.ts`, `src/features/character-memory-hooks/SoundFamilyStrip.tsx`, `tests/unit/characterBreakdownV3.test.ts`.

### 2026-09-26 — Reader redesign: left-anchored dialogue, balanced 72/28 layout, unified Study Guide

- Chosen:
  - Dialogue conversation widened to `max-w-3xl xl:max-w-4xl` (~72% screen area), and `StudySidePanel` narrowed to `w-72 xl:w-80` (~28% screen area), keeping the dialogue as the clear primary focus of the lesson without dead center stops.
  - All dialogue lines left-anchored: speaker avatars, speaker name headers, and speech bubble tails all sit consistently on the left margin, eliminating erratic left/right zig-zag and making conversation scanning effortless.
  - Standardized bubble padding to `px-3.5 py-2.5 sm:px-4 sm:py-3` with natural content-hugging widths.
  - Unified Study Guide into one quiet, neutral reference panel: removed the yellow alert outline from Grammar and the asymmetric blue outline from Vocabulary; standardized Characters, Grammar, and Vocabulary cards to neutral `rounded-2xl bg-ui-surface border-2 border-ui-border border-b-[length:var(--depth-md)] shadow-xs` with matching collapsible headers and quiet `›` row markers.
  - Top bar upgraded to use `ScreenHeader` with left-anchored lesson title (`← LESSON X · PART Y`), line progress counter (`3 / 8 lines`), and right-anchored tools (💡 study guide toggle and ⚙ reader settings).
- Reason: user design review — right study guide panel was competing heavily with dialogue, yellow outline looked like an alert state, dialogue zig-zag made reading jumpy, and bubble gutters were oversized.
- Affects: `src/lib/widgets/{ScreenHeader,StudySidePanel}.tsx`, `src/screens/reader/ReaderScreen.tsx`, `src/screens/reader/components/{ReaderHeader,ReadingCanvas,ReadingNarrativeView,ReaderDialogueLine,ReaderCompanionSpeakersCard,ReaderCompanionGrammarCard,ReaderCompanionGrammarRow,ReaderCompanionVocabCard,ReaderCompanionVocabRow}.tsx`, `WIDGETS.md`.

### 2026-09-23 — Course examples: verified Lesson 1–6 dialogues + separable verb-object matching

- Chosen:
  - The Book 1 importer publishes pinyin-verified dialogue lines for every lesson up to 14 (was Lessons 7–14); aligned Reading sentences stay Lessons 7–10. 80 new Part-scoped records (Lessons 1–6) were merged into `public/data/course-examples/book-1.json` surgically instead of regenerating, because the local OCR copy predates the Lesson 10 pinyin cleanup; count 276 → 356 and the manifest was re-hashed.
  - `sentenceMatchesForms` (`src/utils/courseExamples.ts`) adds split matching for `V-sep` cards: the verb and object may appear in order, so 找錢 matches 找您七百八十五塊錢 and 他找你多少錢？. Used by `recordsToExampleCards`, `findSmartExamplesForWord`, the local vocabulary fallback, and the coverage report; `pos` comes from the flashcard card, or is resolved from the vocabulary pack inside `fetchExamplesForWord` for dictionary callers.
- Reason: owner review — 找錢 is taught in the Lesson 4 dialogue 找您七百八十五塊錢, yet the card had no example: the importer never published Lesson 1–6 dialogue lines, and the literal matcher cannot see a separable verb-object form. Coverage: 10 cards moved from no-example to covered (找錢 now rich with both the dialogue sentence and the textbook example).
- Affects: `scripts/content/exportCourseExamples.ts`, `scripts/content/reportCourseExampleCoverage.ts`, `src/utils/courseExamples.ts`, `src/services/{courseExamplePackService,vocabularyService}.ts`, `src/features/flashcards/hooks/useCurriculumExamples.ts`, `public/data/course-examples/*`, `tests/courseExamplePack.test.ts`, `docs/COURSE_EXAMPLES.md`.

### 2026-09-23 — Book-faithful grammar tables: normalized slot terms, one table per printed part

- Chosen:
  - Slot labels use the standard grammar term where the slot has one (`Subject`, `Verb`, `Object`, `Noun`, `Adjective`, `Number`, `Measure word`, `Statement`) instead of role phrases (`Who`, `Does / feels`, `Who / What`, `First`, `Next detail`, `Thing`, `Action`); particle slots keep particle labels (`叫 · 姓 · 是`, `很／不`, `嗎`, `有 / 沒有`, `太`, `了`, `得`, `都`, `多`, `這 · 那 · 哪`, `可以`). Applied to the pattern tables plus their labs, hints, and feedback in Lessons 1–6.
  - Every grammar point the book prints in numbered parts renders as `subsections`, each with its own table matching the printed grid: L4 G1 (Singular/Plural Topic), L4 G2 (same/different subjects), L4 G5 (Nu+多+M+N / Nu+M+多+N), L5 G4 (at a place / place before an action), L6 G2 (four 得 frames), L6 G4 (suggestion/permission). Root `patternRows` stay empty on those pages; the study screen renders the subsections.
  - Tables match the printed columns elsewhere: L1 G3 `Statement | 嗎`; L2 G1 `Number | Time word | Number | Measure word` (incl. 號/日, plus the note on why 星期四 puts 星期 first); L3 G3 `這 · 那 · 哪 | Number | Measure word | Noun` (incl. （一）); L5 G2 `Subject | 在 | Place | Verb`.
  - L4 G4 is the deliberate exception to book shape: the printed place-value grid is replaced by four labelled step tables around one mechanical model — read the biggest part first, then read the rest — so every row reads left to right as the spoken number: (1) the four building blocks (`Block | Means | Example`: 三百, 五千, 八萬), (2) `Number | First part | The rest` incl. the 零 start (115 = 一百 + 一十五, 105 = 一百 + 零五), (3) the droppable last word (`Number | Full reading | Short way`: 八百五十 = 八百五), (4) big numbers counted in 萬 (`Number | How many | 萬 | The rest`: 90,500 = 九 + 萬 + 零五百). These number rows carry no `english`, so the translation band is skipped for them (`GrammarPatternRow.english` is optional and the table renders the band only when authored).
  - Multi-column rows use `GrammarPatternRow.columns`; `validateInteractiveLessons` and `grammarTeachingTokens` read rows through `getPatternRowGroups`, so four/five-column tables keep ID checks and dictionary targets.
  - L4 G4 ships no example cards: the printed page has no numbered examples and the table already lists every reading, so the validator's examples requirement is calibrated to exempt a page that teaches with its number lab + reference table.
- Reason: owner review of Lessons 1–6 against the printed book found tables that dropped or mislabeled slots, two-part grammars shown as one invented table, and "who does" role labels instead of grammar terms.
- Affects: `content/grammar/*.json` (Lessons 1–6), `src/data/interactiveGrammarPages.ts`, `src/data/interactiveGrammarLessonOnePartTwo.ts`, `src/utils/{validateInteractiveLessons,grammarTeachingTokens}.ts`, `tests/lessonFive.test.ts`, `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-09-22 — Architecture cleanup: single owners, shared session engine, strict acceptance

- Chosen:
  - One owner per duplicated rule: `isSameSrsData` (accepts missing baselines) backs cloud sync and `mergePulledSrsData`; `isSrsDue` backs the loader's local due set; `aggregateLessonPartProgress` (case-insensitive learned matching) backs the course dashboard and study parts; `getDeckIdentityKey` derives every session/exclusion/cache deck key; `stripPinyinTones` + `expandSlashAndOptionalVariants` back answer checking, vocabulary search, and reader matching.
  - Flashcards run on the shared `useCardSession` engine; `useFlashcards` keeps only flip/breakdown UI state and audio warm-up. `useCardFlow` remains the autoplay flow, not a session engine.
  - Pulled-metadata merge rules moved to pure `src/utils/cloudMetadata.ts` (`resolveCloudMetadataPatch`, `resolveGuestFolderMigration`) with unit tests; `useCloudSync` keeps only orchestration. Workspace inert isolation is shared via `useWorkspaceIsolation` (Reader + Grammar).
  - God files split along behavior seams: `ReadingCanvas` → `readingCanvasLines` + `ReaderNarratorLine`/`ReaderDialogueLine`; `GrammarLessonScreen` → `useGrammarLessonPage` + `useGrammarFooterVisibility` + `GrammarContinueFooter` + `GrammarBookPageViewer`; `App.tsx` → `AppWorkspace`/`AppOverlays`/`useAppShellActions`/`useAppShellState`/`useActiveBook`/`useFocusModeSidebar` (now 241 lines).
  - `npm test` runs with `ACCEPTANCE_STRICT=true`: the structural gates (App.tsx < 250, no stale decision entries, no empty dirs, widget encapsulation, no Node builtins in src) are enforced, not skipped.
- Reason: remove duplicated business rules that could drift (the dashboard/activities learned-count mismatch proved the risk), give the card-session engine one implementation, and make the structural quality gates fail CI instead of skipping.
- Affects: `src/hooks/{useCardSession,useCloudSync,useWorkspaceIsolation}.ts`, `src/utils/{srsRowMapping,cloudSyncQueue,reviewOverview,lessonPartProgress,lessonPartSelection,pinyinNormalize,cloudMetadata}.ts`, `src/screens/flashcard/hooks/useFlashcards.ts`, `src/screens/reader/{ReaderScreen.tsx,components/*}`, `src/screens/grammar-lesson/*`, `src/app/*`, `src/App.tsx`, `package.json`, `tests/{lessonPartProgress,pinyinNormalize,cloudMetadata,deckExclusions}.test.ts`.

### 2026-09-22 — Lesson path: a part's reading continues into the next part's grammar

- Chosen:
  - In the reader, both gestures are lesson-path steps: `→` / swipe-left continues into the *next part's grammar* (`findNextGrammarPartForReading`), so `→` walks grammar points → reading → next grammar → reading across lesson boundaries; `←` / swipe-right returns into *this reading's part grammar* at its last page (the page that handed off). Readings that belong to no part — essays — have no step in either direction; the old reading-list browsing is gone.
  - `ReaderScreen`/`ReaderWindow` replace the index-based `onNavigate(targetIndex)` with `onNext`/`onPrevious` (App owns the path decision, `handleReaderNext` / `handleReaderPrevious`); URL-driven reading indexes still use the launcher's `navigateReader`.
  - `findNeighbourGrammarPart` moved from `GrammarLessonScreen` to `src/data/interactiveGrammarPages.ts` (the owner of part order); `findGrammarPartForReading` moved from `screens/reader/utils/readerStudyTargets.ts` to `src/utils/readingContext.ts` (the inverse of `findReadingIndexForPart`), where `findNextGrammarPartForReading` composes both.
- Reason: the owner navigates with arrows and expects the lesson to keep flowing — after Part 1's reading the next step is Part 2's grammar (then its reading), and the previous step returns to the grammar that led there.
- Affects: `src/App.tsx`, `src/utils/readingContext.ts`, `src/data/interactiveGrammarPages.ts`, `src/screens/grammar-lesson/GrammarLessonScreen.tsx`, `src/screens/reader/{ReaderScreen.tsx,utils/readerStudyTargets.ts}`, `src/app/components/ReaderWindow.tsx`, `scripts/auditReaderCurriculum.ts`, `tests/{readerGrammarUsage,grammarTableHeaders}.test.ts`, `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-09-22 — Grammar pattern-table headers: single-line 1-3 word titles, no detail line

- Chosen:
  - The header cell renders one line only — the slot label. `patternColumnDetails` no longer renders as a small second line under it; the notation rides in the cell tooltip (`label · detail`) and still nudges the column scorer.
  - Labels read as plain 1-3 word titles, never as parenthetical notes or abbreviations: `Rest` → `Sentence body`, `Name / ID` → `Name / identity`, `N` → `New topic` (and its internal pattern string), `(Adv / TW)` → `Time word`, `V(O)` / `V + O` → `Action`, `(Double 了)` → `Double 了`, `(Skip 的)` → `Skip 的`, `(no noun)` → `No noun`.
  - `grammarHeaderWordCount` (splits on `/`, `／`, `·`, `+`, whitespace, and parentheses) joins `grammarHeaderWeight` in `grammarPatternLayout`; `validateInteractiveLessons` and `tests/grammarTableHeaders.test.ts` now fail a label that is more than three words or wrapped in parentheses.
  - Header titles render through a local `HeaderTitle` helper: Hanzi runs carry `font-chinese`, so the study font choice (sans / kai / rounded, with Kai's optical boost) applies exactly as in the table cells, while Latin runs stay in the UI face.
- Reason: the owner asked grammar headers for a single line — no second line — with 1-3 word titles, simplified but not so far that meaning is lost (the one-word pass produced labels like "Rest" and "Name / ID").
- Affects: `src/screens/grammar-lesson/components/GrammarPatternSection.tsx`, `src/utils/{grammarPatternLayout,validateInteractiveLessons}.ts`, `src/data/{interactiveGrammarPages,interactiveGrammarLessonOnePartTwo}.ts`, `content/grammar/{lessonThreePartTwo,lessonEleven}.json`, `tests/{grammarTableHeaders,grammarPatternLayout}.test.ts`, `docs/GRAMMAR_LESSON_TEMPLATE.md`.

### 2026-09-22 — Universal colorful chrome glyphs (bulb + gear)

- Chosen:
  - `AppIcon` gains two baked-color glyphs in the Duolingo-like flat voice (no outlines): `hint` is a gold study bulb (`feedback-warning` fill, `-edge` base, glossy highlight — orange read as red and yellow read as canvas) and `settings`/`appSettings` share one brand-blue filled gear (`PiGearSixFill` geometry with `color: var(--color-brand-primary)`). The neutral outline `lightbulb` stays for generic tips (AlertBanner, flashcards, grammar options).
  - Because baked icons ignore `currentColor`, these buttons carry no active-state recolor or chip at all — open/disabled state rides on `aria-expanded`, the panel itself, and the flow-active dot; the disabled "coming soon" gear on Add Card mutes with `opacity-40`.
  - `StickyWorkspaceHeader`'s menu toggle now uses `menu` instead of `settings` — it opens nav, not settings.
- Reason: the owner wanted the study-guide bulb and settings gear to read as colorful Duolingo-style marks (yellow vanished against the practice canvas), applied as universal logos rather than reader-only.
- Affects: `src/lib/widgets/{AppIcon,StickyWorkspaceHeader}.tsx`, `src/screens/reader/components/ReaderSettingsPopover.tsx`, `src/features/character-breakdown/components/BreakdownSettingsPopover.tsx`, `src/features/practice/components/PracticeHeader.tsx`, `src/screens/add-card/AddCardScreen.tsx`, `WIDGETS.md`.

### 2026-09-22 — Reading Mode gets a frosted header type

- Chosen:
  - New `ScreenHeader variant="frosted"`: a tone-matched translucent bar (`bg-ui-canvas/95` / `bg-ui-practice-canvas/95`) with `backdrop-blur-md`, the universal 2px `ui-border` bottom edge, its own `env(safe-area-inset-top)` inset, no shadow, and the standard `--size-window-header` (71px) footprint so study-window chrome lines up. It is a plain block — the consumer owns positioning.
  - `ReaderHeader` composes it (`tone="practice"`) with the `Lesson N · Part N` title centered (the brand lockup stays in the side nav); close stays left, study-guide and reading settings stay right.
  - Reading Mode overlays it on the reading column (`absolute top-0`), so scrolled content passes under the blurred bar without showing through. Both reading canvases pad their top clear of it (`pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:pt-[6.5rem]`).
  - Because the bar lives in the reading column, its border line stops at the Study Guide panel on desktop and runs full width on phone/tablet. Grammar keeps the canonical sticky fade. `getLessonTitles` / `getReaderHeaderTitles` stay — `ReadingNarrativeView` still renders the titles inside the reading.
- Reason: the owner asked Reading Mode for a transparent-looking header at the default header height that hides the content beneath it, with a universal border line that is cut off at the side panels on desktop and full width on mobile/tablet, no shadow, and the lesson/part title (not the logo) in the center.
- Affects: `src/lib/widgets/ScreenHeader.tsx`, `src/screens/reader/ReaderScreen.tsx`, `src/screens/reader/components/{ReaderHeader,ReadingCanvas,ReadingNarrativeView}.tsx`, `WIDGETS.md`.

Older entries (2026-09-21 and earlier): `docs/archive/DECISIONS_ARCHIVE.md`.
