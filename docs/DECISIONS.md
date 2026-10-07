# Project Decisions

Record choices that should remain stable across tasks. Keep each entry short.

## Format

### YYYY-MM-DD — Decision title

- Chosen:
- Reason:
- Affects:

### 2026-10-05 — One pronunciation index: every reading, Taiwan-first

- Chosen: `npm run pronunciation:build` builds `public/data/pronunciation/pronunciation.json` from CC-CEDICT (gitignored `output/pronunciation/cedict.txt`): every reading of ~9.9k characters, ordered course reading first, then a standalone "Taiwan pr." over the mainland reading (期 qí, also qī), then by how many (course, then TBCL/HSK-weighted) words use each reading. `~` marks same-meaning variants ("also pr.": 誰 shéi, also shuí); other readings carry a common example word (行 háng 銀行). Surname readings and pure "variant of" pointers (妳 nǎi) are dropped.
- `src/utils/pronunciation.ts` is the single owner of which pinyin a character shows (`primaryReading`, `allReadings`, `soundPair`); breakdown `pinyin[0]` is only a fallback. Header shows "shéi · also shuí" — the other readings, pinyin only, up to three. The sound clue uses the closest-sounding pair (誰 ← 隹: "zhuī → shuí · usually read shéi"), and `relations:build` grades every character reading × part reading.
- Reason: the breakdown and dictionary packs kept one reading per character (only 10 breakdown characters had more), often the mainland or a secondary one, so the app taught shuí while the course teaches shéi, and lost 行 háng, 長 zhǎng, 還 huán.
- Not changed: single-character TTS still picks its own reading; the dictionary pack still has one entry per word (a CC-CEDICT rebuild would restore e.g. 長 zhǎng senses).
- Affects: `scripts/pronunciation/buildPronunciation.ts`, `scripts/relations/buildParts.ts`, `public/data/pronunciation/`, `src/utils/{pronunciation,packValidators}.ts`, `src/services/{contentPacks,contentPackConfigs}.ts`, `src/hooks/usePronunciation.ts`, `src/features/character-breakdown/**` (summary header, sound clue, tree metadata, chips, memory hook), `src/features/dictionary/hooks/useWordExtras.ts`.

### 2026-10-05 — Breakdown shard fixes go through an overrides file

- Chosen: `scripts/content/breakdown-overrides.json` + `npm run breakdowns:patch` replace whole fields in the committed `public/data/breakdowns/` shards and rewrite the manifest (hashes + version). Readings follow the course books (Taiwan standard): 妳 nǐ, 髮 fǎ/fà, 髒 zāng, 長 cháng/zhǎng.
- Reason: the shards' Supabase source table was removed on 2026-10-03, so no generator exists; hand-editing packs stays forbidden.
- Affects: `scripts/content/{patchBreakdowns.ts,breakdown-overrides.json}`, `public/data/breakdowns/`.

### 2026-10-05 — One parts index replaces the sound-hooks and used-as packs ("Built with" + "Sound clue")

- Chosen:
  - One relation pack, `public/data/relations/parts.json` (+ `manifest.json`), built by `npm run relations:build` (`scripts/relations/buildParts.ts`). `parents`: part → every pool character built from it (breakdown shards' `components_historical`, reversed), sound-alikes first (same, then tone, then close) then shape-only, each in pool rank order, with a grade mark: `=` same sound, `~` tone change, `≈` close, none = shape/meaning only. `phonetic`: character → the part that gives it its sound, only when the grade is same/tone/close. Replaces the `sound-hooks` and `used-as.json` packs (and the `phonetic:build`, `breakdowns:used-as`, `memory-hooks:sound` scripts); the earlier global `sound-families` pack stays removed for contamination — this keeps the pool scoping and the owner overrides (`noSound`, `blockMember`).
  - Grades are marks, not duplicated families: the family exists once, on the part. No cap on parents (the old `MAX_FAMILY=6` / 15 limits are gone); the UI decides how many rows to show.
  - Pool = course characters ∪ every character in `levels.json` (`tbcl` then `hsk` sections). Rank: course (book, lesson), then level, then list order (`scripts/lib/learnerPool.ts`).
  - Nothing derivable ships: no pinyin, meaning, level or lesson in the pack. The app derives them at runtime from breakdown/vocabulary/levels data (`src/utils/parts.ts` owns the format and the relation rule: `builtWith`, `resolveSoundClue`; `useParts` loads it once). The tone shift (`mǎ → mā`) is computed in the UI from pinyin.
  - Rail, top to bottom: **Sound family** (`soundFamily` in `src/utils/parts.ts`) — only about sound, built from the same reference rows as "In words" (glyph, pinyin over meaning, lesson or level): no explanatory text — the rows carry pinyin, meaning and lesson: for a character that borrows its sound, its sound part followed by the characters that borrow it too (馬, 碼, 螞, 媽, 罵); for a sound part, its borrowers; a character can show both (星 ← 生, 星 → 猩 腥 醒), or just the part when nothing else borrows it (輛 ← 兩). Order same sound → new tone → close, five rows, "See all". A part must lend to at least two characters to count as a family (`MIN_FAMILY_SIZE`; 大 → 馱 alone is an accident — 馱's own page still shows "Sounds like 大"). Then **Appears in N characters** (`AppearsInCard`) — every character built from it, sound-alikes included so the count is honest (青 → 8), as a glyph-only strip, course lesson → level; closed by default, always shown when three or fewer. Then **In words**. Meaning-part rows are dropped (the tree shows the parts). No known-character logic in the rail.
  - Grading uses the part's main modern reading, so a family has one grade per member regardless of which character is open (polyphonic parts like 長 and 相 can differ from the old per-viewer grade).
- Reason: two overlapping per-character datasets (884 KB + 35 KB, each family duplicated on the giver and every member, 41% of entries empty) became one 55 KB relation index; merging the cards removed the de-dupe rule between them.
- Affects: `scripts/relations/buildParts.ts`, `scripts/phonetic/{soundGrade,soundMap}.ts`, `scripts/lib/learnerPool.ts`, `public/data/relations/`, `src/utils/{parts,packValidators}.ts`, `src/services/{contentPacks,contentPackConfigs,breakdownService}.ts`, `src/hooks/useParts.ts`, `src/features/character-breakdown/**` (v3 `SoundFamilyCard`, `SoundRow`, `AppearsInCard`), `tests/content/partsPack.test.ts`, `tests/unit/parts.test.ts`.

### 2026-10-04 — Breakdown rail is the learner's map: known state, sound ladder, tile grids

- Chosen:
  - **In words** stays a list (words need meanings); course words from later books are dimmed (`ReferenceRow` `muted`). Dictionary-only suggestions rank by official level (never estimates) and drop vulgar / slang / neologism entries (`isNoisyDictionarySuggestion`, plus a short reviewed hide list for unlabelled transliterations such as 嗎哪).
  - **Sound family** (see the 2026-10-05 parts-index entry) replaces the earlier ladder and tile grids; the known-state summary line and ✓ marks are gone from the rail (2026-10-05). The card has no play button (removed 2026-10-05); the tree and word rows already carry audio.
  - The shared `CharacterTile` widget backs every character grid, including Library "Learn next".
  - Unencoded tree pieces read "Picture part" (a quiet icon + label; the full "no meaning of its own — part of the drawing" is a tooltip) instead of "No glyph for this".
- Reason: three identical row lists gave beginners no hierarchy, no sense of progress, and a long mobile scroll. Tiles fit twice the content, and hearing the sound family teaches the pattern.
- Affects: `src/features/character-breakdown/components/v3/{V3SupportingInformation,SoundFamilyCard,SoundRow,AppearsInCard,railStyles,V3RuntimeTree}.tsx`, `src/lib/widgets/{CharacterTile,ReferenceRow}.tsx`, `src/screens/library/**`.

### 2026-10-04 — TBCL levels: learner pool, level tags, TOCFL readiness

- Chosen:
  - TBCL (臺灣華語文能力基準, NAER — the standard TOCFL levels follow) is the level source. `npm run levels:build` imports `tbcl-chars.csv` + `tbcl.csv` (from github.com/ivankra/tocfl, placed in gitignored `output/levels/`) into the `tbcl` section of the committed pack `public/data/levels/levels.json`: 3,067 characters and 14,733 word forms, levels 1–7, with the `*` tier folded in. TOCFL bands: Novice/A1/A2 = A, B1/B2 = B, C1/C2 = C (`src/utils/levels.ts`).
  - The learner pool (`scripts/lib/learnerPool.ts`) is course characters (1,677) plus levelled characters (TBCL; since 2026-10-05 also the HSK gap fill), replacing the frequency-based "common" tier.
  - **The book stays primary.** Course items always show `B·L` and sort first. TBCL level shows only where there is no lesson (`Lv 4`), or as a quiet secondary header chip (`TOCFL C · Lv 6`). One widget owns this: `LevelTag`.
  - "In words": course words first, then dictionary words by TBCL level; unleveled names and rare terms go last.
  - Library gets a **TOCFL readiness** card (`computeTocflReadiness`). It counts TBCL characters known per band from passed course words and suggests what to learn next in the focus band, in book lesson order.
- Reason: owner wants coverage beyond the book without the old rare/simplified noise, and learners need to know what matters and how close they are to TOCFL.
- Affects: `scripts/levels/buildLevels.ts`, `scripts/lib/learnerPool.ts`, `src/utils/{packValidators,levels,tocflReadiness}.ts`, `src/services/contentPack{s,Configs}.ts` (`levels` pack), `src/hooks/useLevels.ts`, `src/lib/widgets/LevelTag.tsx`, `src/features/character-breakdown/**`, `src/screens/library/**`.

### 2026-10-05 — Every character and word gets a TOCFL level (TBCL + HSK gap fill + estimate)
- Chosen:
  - One pack, `public/data/levels/levels.json` (schema v2), built by `npm run levels:build` from gitignored `output/levels/`. `tbcl` = official TBCL (github.com/ivankra/tocfl). `hsk` = New HSK 2025 (github.com/Punpuf/hsk-syllabus-vocabulary-parser words, github.com/krmanik/HSK-3.0 characters), only for forms TBCL lacks, with simplified forms mapped to traditional through the dictionary packs.
  - All levels sit on the TBCL 1–7 scale. HSK is converted by overlap medians: 1→1, 2→2, 3→3, 4→4, 5→5, 6→5, 7-9→6.
  - Labels fix an off-by-one: 1 Novice, 2 A1, 3 A2, 4 B1, 5 B2, 6 C1, 7 C2 (previously 1 was shown as A1). Bands: Novice/A1/A2 = A, B1/B2 = B, C1/C2 = C.
  - Estimates are computed at runtime, never stored: a multi-character word whose characters all have levels gets max(char level) + 1 (cap 7), shown as `~B1`, dimmed. `resolveLevel` in `src/utils/levels.ts` is the single resolver (tbcl, then hsk, then normalized forms like `兔/兔子` and `梨（子）`, then characters, then estimate); `useLevel`/`useLevels` in `src/hooks/useLevels.ts` wrap it.
  - TOCFL readiness reads only the `tbcl` section, so official stats are unchanged by the HSK gap fill. (The learner pool reads both sections since the 2026-10-05 parts-index entry.)
- Reason: owner wants a level on every word and character shown, not only the TBCL-listed ones.
- Affects: `scripts/levels/buildLevels.ts` (was `scripts/dictionary/importTbcl.ts`), `src/utils/{levels,packValidators}.ts`, `src/hooks/useLevels.ts`, `src/lib/widgets/LevelTag.tsx`, dictionary and breakdown level call sites.

### 2026-09-29 — Character breakdown: the sound piece is highlighted in the components block

- Chosen:
  - The phonetic piece now lives on its component: the tree tile matching the parts index's phonetic part (`resolveSoundClue`) carries the book accent (2px `edgeHex` border, soft `accentHex` wash, matching bottom depth) plus a "SOUND" micro-badge with the speaker icon, and its pinyin line shows the compact tone shift (`qīn→xīn`).
  - Nested pieces auto-reveal once per character: `resolveSoundRevealPath` walks the runtime reverse index from the sound glyph to the character and `useRuntimeDecompositionTree.expand` opens the ancestors, so 師's 㠯 (inside 𠂤) shows bordered without manual digging. Applies to the summary row and the Component-tree screen.
  - The standalone Sound card is retired (`SoundBlock`/`SoundStrip` deleted). The sound family now lives in the rail's Sound family card (2026-10-05 parts-index entry). No phonetic part renders nothing.
- Reason: owner design review — a second tinted card under the Memory Hook competed with it, and sound is a property of one component, so it belongs on that component. 270/277 phonetic pieces are direct components; the other 7 (師 餐 弟 第 關 傷 南) sit one level deeper and are auto-revealed.
- Affects: `src/features/character-breakdown/components/v3/{V3RuntimeTree,V3CharacterBreakdown,V3CharacterSummary,V3TreeScreen}.tsx`, `src/features/character-breakdown/components/breakdown/SingleBreakdownView.tsx`, `src/features/character-breakdown/hooks/useRuntimeDecompositionTree.ts`, `src/features/character-breakdown/utils/soundRevealPath.ts`, `tests/unit/characterBreakdownV3.test.ts`.

### 2026-09-26 — Reader redesign: left-anchored dialogue, balanced 72/28 layout, unified Study Guide

- Chosen:
  - Dialogue conversation widened to `max-w-3xl xl:max-w-4xl` (~72% screen area), and `StudySidePanel` narrowed to `w-72 xl:w-80` (~28% screen area), keeping the dialogue as the clear primary focus of the lesson without dead center stops.
  - All dialogue lines left-anchored: speaker avatars, speaker name headers, and speech bubble tails all sit consistently on the left margin, eliminating erratic left/right zig-zag and making conversation scanning effortless.
  - Standardized bubble padding to `px-3.5 py-2.5 sm:px-4 sm:py-3` with natural content-hugging widths.
  - Unified Study Guide into one quiet, neutral reference panel: removed the yellow alert outline from Grammar and the asymmetric blue outline from Vocabulary; standardized Characters, Grammar, and Vocabulary cards to neutral `rounded-2xl bg-ui-surface border-2 border-ui-border border-b-[length:var(--depth-md)] shadow-xs` with matching collapsible headers and quiet `›` row markers.
  - Top bar upgraded to use `ScreenHeader` with left-anchored lesson title (`← LESSON X · PART Y`), line progress counter (`3 / 8 lines`), and right-anchored tools (💡 study guide toggle and ⚙ reader settings).
- Reason: user design review — right study guide panel was competing heavily with dialogue, yellow outline looked like an alert state, dialogue zig-zag made reading jumpy, and bubble gutters were oversized.
- Affects: `src/lib/widgets/{ScreenHeader,StudySidePanel}.tsx`, `src/screens/reader/ReaderScreen.tsx`, `src/screens/reader/components/{ReaderHeader,ReadingCanvas,ReadingNarrativeView,ReaderDialogueLine,ReaderCompanionSpeakersCard,ReaderCompanionGrammarCard,ReaderCompanionGrammarRow,ReaderCompanionVocabCard,ReaderCompanionVocabRow}.tsx`, `docs/WIDGETS.md`.

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
- Affects: `src/lib/widgets/{AppIcon,StickyWorkspaceHeader}.tsx`, `src/screens/reader/components/ReaderSettingsPopover.tsx`, `src/features/character-breakdown/components/BreakdownSettingsPopover.tsx`, `src/features/practice/components/PracticeHeader.tsx`, `src/screens/add-card/AddCardScreen.tsx`, `docs/WIDGETS.md`.

### 2026-09-22 — Reading Mode gets a frosted header type

- Chosen:
  - New `ScreenHeader variant="frosted"`: a tone-matched translucent bar (`bg-ui-canvas/95` / `bg-ui-practice-canvas/95`) with `backdrop-blur-md`, the universal 2px `ui-border` bottom edge, its own `env(safe-area-inset-top)` inset, no shadow, and the standard `--size-window-header` (71px) footprint so study-window chrome lines up. It is a plain block — the consumer owns positioning.
  - `ReaderHeader` composes it (`tone="practice"`) with the `Lesson N · Part N` title centered (the brand lockup stays in the side nav); close stays left, study-guide and reading settings stay right.
  - Reading Mode overlays it on the reading column (`absolute top-0`), so scrolled content passes under the blurred bar without showing through. Both reading canvases pad their top clear of it (`pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:pt-[6.5rem]`).
  - Because the bar lives in the reading column, its border line stops at the Study Guide panel on desktop and runs full width on phone/tablet. Grammar keeps the canonical sticky fade. `getLessonTitles` / `getReaderHeaderTitles` stay — `ReadingNarrativeView` still renders the titles inside the reading.
- Reason: the owner asked Reading Mode for a transparent-looking header at the default header height that hides the content beneath it, with a universal border line that is cut off at the side panels on desktop and full width on mobile/tablet, no shadow, and the lesson/part title (not the logo) in the center.
- Affects: `src/lib/widgets/ScreenHeader.tsx`, `src/screens/reader/ReaderScreen.tsx`, `src/screens/reader/components/{ReaderHeader,ReadingCanvas,ReadingNarrativeView}.tsx`, `docs/WIDGETS.md`.

Older entries (2026-09-21 and earlier): `docs/archive/DECISIONS_ARCHIVE.md`.
