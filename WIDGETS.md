# Shared Widgets Library

Tracks reusable UI components in `src/lib/widgets/`.

All widgets export from `src/lib/widgets/index.ts`:
```ts
import { ActionButton, IconActionButton, SegmentedControl, MainHeader, ... } from '../lib/widgets';
```

## ActionButton
Canonical text action. Variants encode hierarchy with clean bottom-edge depth: `primary`/`danger` tactile, `secondary` restrained, `quiet` nearly flat.

**Props:**
- `variant?: 'primary' | 'secondary' | 'quiet' | 'danger'`
- `size?: 'sm' | 'md' | 'lg'`
- `fullWidth?: boolean`
- `loading?: boolean`, `loadingLabel?: string`
- Standard HTML button attrs, incl `className`

Use one primary per surface/action group. Reset/Review/Cancel/nav/utilities use secondary/quiet.

## PracticeChoiceButton
Shared tactile answer row for Quiz and Listening. Uses a single bottom edge instead of a full outline and owns identical course-selected, correct, wrong, muted, hover, and pressed states across both activities.

**Props:**
- `index: number`
- `state?: 'idle' | 'selected' | 'correct' | 'wrong' | 'muted'`
- `selectedClassName?`, `selectedEdgeColor?`
- Standard HTML button attrs, incl `className`

## ConfirmationDialog
Shared destructive alert dialog. Traps focus, focuses safe Cancel on open, Escape closes, restores focus, dialog semantics.

**Props:**
- `title`, `description`
- `confirmLabel`, `onConfirm`
- `cancelLabel?`, `onCancel`
- `icon?: ReactNode`
- `isConfirming?`, `errorMessage?`
- Standard HTML div attrs, incl `className`

## DisclosureLine
Quiet native disclosure for optional supporting content. It appears as a divider row, stays closed by default, and rotates its semantic chevron when opened.

**Props:**
- `title`
- `description?`
- Native `<details>` attrs, incl `className`

## GrammarLabShell
Shared clean reading shell for interactive Grammar Learn tools. It is unframed and texture-free, using a strong title hierarchy, optional header control, one teaching surface, and a quiet takeaway strip.

**Props:**
- `eyebrow`, `title`
- `description?`, `headerAction?`, `takeaway?`
- `panelClassName?`
- Standard HTML section attrs, incl `className`

## GrammarTimelineLab
Meaning-first timeline for duration contrasts. Shows whether an action ends
before the reference point or continues through `NOW`, then pairs the visual
with the authored Chinese sentence and reading aids.

**Props:**
- `lab: GrammarTimelineLab`
- `characterPreference`, `showPinyin`, `showTranslation`
- `contextTokens`, `onOpenWord`
- Standard HTML section attrs, incl `className`

## GrammarPairCompareLab
Explicit `A 比 B + quality` comparison surface. Keeps both authored sides
visible, visualizes the compared quality, and avoids conflating `比` with the
existing context-dependent `比較` lab.

**Props:**
- `lab: GrammarPairCompareLab`
- `characterPreference`, `showPinyin`, `showTranslation`
- `contextTokens`, `onOpenWord`
- Standard HTML section attrs, incl `className`

## GrammarSlotMap
Semantic sentence-pattern header. Replaces abstract algebra labels with plain-language slots while preserving the pattern row grid and one active grammar slot.

**Props:**
- `slots: { label: string; detail?: string }[]`
- `activeIndex?: number`
- `gridClassName?: string`
- Standard HTML div attrs, incl `className`

## GrammarRuleContrast
Explicit correct/incorrect grammar comparison. Uses semantic success/error treatment, tappable contextual Chinese, and one short explanation per example.

**Props:**
- `contrast: GrammarRuleContrast`
- `characterPreference`
- `contextTokens`
- `onOpenWord`
- Standard HTML section attrs, incl `className`

## LinkedTranslationText
English translation segments linked to authored Chinese token alignment IDs. Hover, focus, or tap reveals the matching phrase without permanent rainbow coloring.

**Props:**
- `segments: GrammarTranslationSegment[]`
- `activeAlignmentId`
- `onActiveAlignmentChange`
- Standard HTML paragraph attrs, incl `className`

## IconActionButton
Flat/light icon-only utility for Close, Previous, Next, Settings, Audio, etc. Requires text `label` for accessible name + tooltip.

**Props:**
- `icon: ReactNode`, `label: string`
- `variant?: 'quiet' | 'surface' | 'danger'`
- `size?: 'sm' | 'md' | 'lg'`
- Standard HTML button attrs except `children` and `aria-label`

## SegmentedControl
Flat mode/selection track for mutually exclusive options. Selected option uses solid brand fill, stable on hover.

**Props:**
- `value`, `options`, `onChange`
- Options may include `label`, `icon`, `title`, `disabled`, and `buttonProps` for accessible trigger behavior
- `ariaLabel: string`
- `orientation?: 'horizontal' | 'vertical'`
- Standard HTML div attrs, incl `className`

## AppIcon
Semantic gateway for functional icons. Maps stable concepts (`play`, `search`, `forward`, `settings`, `menu`, `books`, `profile`, `progress`, `analytics`, `check`, `lock`, etc.) to approved Phosphor icons.

**Props:**
- `name: AppIconName`
- Standard `react-icons` props: `size`, `color`, `className`

Add shared concepts to `AppIcon`; avoid duplicate icon families.
Quiz typing uses the semantic `keyboard` icon.

---

## AppSettingsDrawer
Global app settings drawer from `SideNav`. Owns app preferences, future settings placeholders, reset progress confirmation.

**Props:**
- `isOpen`, `onClose`
- `characterPreference`, `onCharacterPreferenceChange`
- `onResetProgress` may be async; failures remain visible in the confirmation dialog
- Standard HTML div attrs, incl `className`

---

## ActivityModalWrapper
Full-screen activity modal wrapper. Provides a simple solid light blue-gray canvas, animated entry, workspace bounds, dialog semantics, Escape dismissal, and focus trapping. Exercise cards and controls remain white for gentle contrast; decorative background images are intentionally excluded.

**Props:**
- `id: string`
- `ariaLabel: string`
- `onClose: () => void`
- `children: ReactNode`

## BottomDrawer
Slide-up modal drawer for mnemonics/examples/settings/dictionary. Portals to overlay layer, uses `workspace-window`, preserves desktop side nav, mobile full width. Focus trap, 44px close, Escape close, restores focus, dialog semantics.

**Props:**
- `isOpen`, `onClose`
- `title?: string`
- `ariaLabel?: string`
- `topAccessory?: ReactNode`
- `workspaceBound?: boolean` (defaults to `true`; use `false` only outside the authenticated app shell)
- `className?: string`

## BrandWordmark
Compact RongWaps lockup for nav/branding. Gold `文` seal + default name `Ron's Mandarin`.

**Props:**
- `name?: string`
- Standard HTML div attrs, incl `className`

## BreakdownSkeleton
Skeleton loader for character breakdown.

## CourseSwitcher
Compact selector for books/courses. Renders labeled tactile rows or quiet number tiles.

**Props:**
- `options: CourseSwitcherOption[]`
- `onSelect: (id: number) => void`
- `display?: 'labeled' | 'numberTiles'`
- `variant?: 'panel' | 'bare'`
- Standard HTML div attrs, incl `className`

## CountryFlag
Square country artwork from Awesome Country Flags Figma library. Replaces emoji flags, shadow-free.

**Props:**
- `code: 'GB' | 'ID' | 'JP' | 'US'`
- Standard HTML image attrs except `src`, incl `className`, optional `alt`

## RongWapsCharacterPortrait
Reusable crop renderer for the original RongWaps main and supporting cast reference sheets. Keeps character identity and crop behavior consistent while individual production poses are created.

**Props:**
- `character: RongWapsCharacter`
- `label: string` accessible character name
- Standard HTML div attrs, incl `className`

Reference direction and production rules live in `docs/RONGWAPS_CHARACTER_BIBLE.md`.

## Card3D
Legacy framed card compatibility component. Neutral card outlines remain a consistent 2px; primary actions own tactile depth.

## CircularProgress
Accessible SVG ring. Clamps 0-100. No decorative gradients.

**Props:**
- `value: number`
- `size?`, `strokeWidth?`
- `label?: React.ReactNode`
- `trackClassName?`, `progressClassName?`
- Standard HTML div attrs, incl `className`

## CharacterBreakdown
Interactive character decomposition tree. Shows radicals/components + structure markers (⿰, ⿱, etc.).

**Location:** `src/lib/widgets/CharacterBreakdown.tsx` and `src/lib/widgets/breakdown/`

### AiMnemonicCard
Shows AI mnemonic. Loads pre-generated Supabase cache first; auto-generates on miss. Shows "Generate AI Story" only if generation fails.

**Location:** `src/lib/widgets/breakdown/AiMnemonicCard.tsx`

**Props:**
- `char: string`
- `data: DBCharacterBreakdown | null`
- `accentBgClass?: string` default `'bg-[#FF9600]'`
- `accentTextClass?: string` default `'text-[#FF9600]'`
- `buttonEdgeClass?: string` default `'border-[#E57A00]'`

**Behavior:**
1. Checks in-memory cache → Supabase DB cache.
2. If missing, auto-generates via Gemini API.
3. If generation fails, shows manual retry button.
4. Renders only for characters with decomposition components > 1.

### CharNodeItem
Clickable breakdown tree character node. Shows component meaning. Location `src/lib/widgets/breakdown/CharNodeItem.tsx`.

### BreakdownComponentCard
Card for component details: meaning, pinyin, decomposition. Location `src/lib/widgets/breakdown/BreakdownComponentCard.tsx`.

### UsedAsCompactItem
Compact vocab item using a component. Location `src/lib/widgets/breakdown/UsedAsCompactItem.tsx`.

### BottomCharacterTabs
Tabs for multiple characters in a word. Location `src/lib/widgets/breakdown/BottomCharacterTabs.tsx`.

### SingleBreakdownView
Fetch/display one character breakdown: structure, meaning, components. Location `src/lib/widgets/breakdown/SingleBreakdownView.tsx`.

## CharacterBreakdownOverlay
Workspace-filling character detail view. Mobile uses the full viewport; desktop preserves the permanent side navigation and centers content in a bounded workspace column. It uses the same solid practice canvas as the full-viewport app background, preventing both tint cutoffs and underlying-content bleed. The transparent toolbar has no border or surface, informational sections remain borderless, and direct-manipulation component tiles retain restrained bottom-edge depth. Multi-character navigation floats above a bottom fade without a bordered dock. Traps focus, supports Escape/back focus restoration, respects reduced motion, and wraps `CharacterBreakdown` with multi-character navigation.

## WorkspaceDetailShell
Canonical seamless shell for full-workspace drill-downs. Uses the same solid canvas as the global practice background so the permanent floating navigation has no visible tint cutoff and underlying activity content cannot bleed through. Provides a transparent borderless header, centered responsive content, restrained content motion, dialog semantics, focus trapping, Escape dismissal, focus restoration, and reduced-motion behavior.

**Props:**
- `ariaLabel`, `title?`, `centerContent?`
- `onClose?`, `onBack?`, `rightAction?`
- `zIndexClassName?`, `maxWidthClassName?`
- `className?`, `headerClassName?`, `contentClassName?`, `contentInnerClassName?`

## CourseIcons
Themed icon components for curriculum library.

## CustomProgressBar
Animated rounded progress bar with accent colors.

**Props:**
- `progress: number`
- `showText?: boolean`
- `accentClassName?: string`
- `size?: 'sm' | 'md'`
- `className?: string`

## PartProgressRail
Split lesson-part progress controls. `StudyPartProgressRail` renders unselected parts as an empty, rounded, dashed neutral outline matching the progress-bar shape; selected parts use the solid neutral track with a left-revealing blue fill. `PracticePartProgressRail` keeps the solid rounded track and growing inner highlight of the continuous practice progress bar. `SelectablePartProgressRail` is available for larger selection cards.

**Props:**
- `parts: CourseLessonPartProgress[]`
- `segments: PartSegment[]`
- `onTogglePart?: (partId: number) => void`
- `currentIndex?: number`
- `totalCount?: number`
- `disabled?: boolean`
- Standard HTML div attrs, incl `className`

Selection owner must keep at least one part active. New lesson selection defaults to its first available part. Do not render part selectors under lesson tiles.

## DeepBreakdownModal
Deep breakdown modal wrapper with mnemonic lightbulb in header.

## DraggableFlashcard
Main flashcard with drag-to-swipe, 3D flip, tappable characters.

**Props:**
- `card: any`
- `exitX`, `exitY`
- `exitAction: 'learned' | 'again' | 'nav'`
- `isFlipped`, `setIsFlipped`
- `setActiveBreakdown`, `setActiveMemoryHook`
- `activeBook`
- `handleDragStart`, `handleDrag`, `handleDragEnd`
- `onCardTap`

## DynamicBackground
Animated gradient background based on active book theme.

## EmptyReviewState
Empty study state. Shows friendly message with book accent colors.

## ExpandableSearch
Animated pill search. Small when empty/unfocused, expands on focus. Placeholder doubles as accessible label. Clear action is named 44px utility.

**Props:**
- `value`, `onChange`
- `placeholder?`
- `isExpanded?`, `onExpandedChange?`
- `className?`

## FeedbackBottomBar
Compact bottom feedback strip for answer states. Wrong retry states keep the correct answer and optional breakdown utility in one row, without an empty action area.

**Props:**
- `showCheck?: boolean` to hide the idle Check action for activities that submit answers directly.
- `hideWhenAutoAdvance?: boolean` to remove the feedback overlay while automatic advancement is active.
- `showContinueOnWrong?: boolean` to keep wrong-answer feedback visible without offering a next-card action.
- `onContinue`, `onCheck?`, `isCheckDisabled?`, `onSkip?`, `onBreakdown?`, `onRetry?`

## Floating3DButton
Floating 3D action button for primary actions like Add/Create.

## GlassCard
Glassmorphism card for overlay content.

## GlobalDictionaryModal
Full-screen dictionary search modal. Search Chinese, pinyin, English.

## GraphPaperPanel
Reusable 3D card with subtle square-grid background for large workspace/analytics panels. Use selectively for grouped content.

**Props:**
- `gridSize?: 'compact' | 'roomy'`
- Standard HTML div attrs, incl `className`

## GrammarDiscoveryLab
Interactive grammar concept comparison for Learn pages. Uses a compact segmented choice rail and one spacious result surface. Learners switch sentence states, hear results, and read why grammar choice changes meaning. Corrections show incorrect red + repaired blue. Use before the pattern table, not as a scored exercise.

**Props:**
- `lab: GrammarDiscoveryLab`

## GrammarNumberLab
Interactive place-value builder for beginner number grammar. Uses a segmented number rail and one unified teaching surface containing the spoken number and grouped place-value blocks.

**Props:**
- `lab: GrammarNumberLab`
- `characterPreference`, `showPinyin`, `showTranslation`
- `contextTokens`, `onOpenWord`
- `focusTerms?: string[]`
- Standard HTML section attrs, incl `className`

## GrammarRouteLab
Interactive route builder for travel grammar. Uses a segmented trip rail and one spacious route surface with connected From / How / To / Direction / Purpose stops, followed by the complete sentence.

**Props:**
- `lab: GrammarRouteLab`
- `characterPreference`, `showPinyin`, `showTranslation`
- `contextTokens`, `onOpenWord`
- Standard HTML section attrs, incl `className`

## Lesson 9 Scene Labs
Five reusable, texture-free visual manipulatives for beginner grammar. All use `GrammarLabShell`, `SegmentedControl`, contextual Chinese lookup, audio, pinyin, and translation.

- `GrammarLiveSceneLab`: separates who, ongoing `在 + action`, and optional place.
- `GrammarTimeRangeLab`: visual start/finish ruler for `從…到…`.
- `GrammarSequenceLab`: two-step route for `先…再…`.
- `GrammarAbilityLab`: open/limited/closed gate for `能／只能／不能`.
- `GrammarCompareLab`: side-by-side scales for implicit `比較`.

**Shared props:**
- `lab`
- `characterPreference`
- `showPinyin`, `showTranslation`
- `contextTokens`
- `onOpenWord`
- Standard HTML section attrs, incl `className`

## GrammarFocusText
Highlights grammar terms in headings/explanations/teaching sentences. With context tokens + `onOpenWord`, Chinese spans become hoverable/focusable/dictionary-clickable with lesson pinyin/meaning first.

**Props:**
- `text: string`
- `terms?: string[]`
- `variant?: 'title' | 'body' | 'sentence'`
- `contextTokens?: GrammarWordToken[]`
- `characterPreference?: 'traditional' | 'simplified'`
- `onOpenWord?: (word: string) => void`
- Standard HTML span attrs, incl `className`

## ContextualChineseText
Renders mixed English/Chinese teaching copy. Longest lesson-token match wins; Chinese gets blue hover/focus, tooltip, dictionary click. Unlisted Chinese still clickable.

**Props:**
- `text: string`
- `tokens?: GrammarWordToken[]`
- `focusTerms?: string[]`
- `characterPreference?: 'traditional' | 'simplified'`
- `onOpenWord: (word: string) => void`
- Standard HTML span attrs, incl `className`

## IconButton3D
Legacy tactile icon control. New nav/header/audio/settings utilities use `IconActionButton`.

## LayoutShell
Main app layout shell. Its full-viewport canvas extends behind a borderless floating navigation rail inset on all sides; desktop content receives a matching safety offset without clipping the background. The rail is permanent on desktop/wide and becomes an inset, closable drawer on mobile. The mobile Books route intentionally omits `MainHeader`; its course title owns the page header while a quiet floating menu control preserves navigation access.

## LessonComplete
Scroll-safe, reduced-motion-aware end-of-session summary. Shows available XP,
accuracy, and card-result metrics, with one primary Continue action and quiet
review/restart alternatives.

**Props:**
- `score?`, `accuracy?`, `learnedCount?`, `unlearnedCount?`
- `activeBook?` for the current curriculum accent
- `onContinue?`, `onReviewUnlearned?`, `onResetAll?`

## LessonPartSelector
Legacy compact multi-select for lesson vocab parts. Prefer `PartProgressRail` for new lesson-part controls.

**Props:**
- `parts: CourseLessonPartProgress[]`
- `onTogglePart: (partId: number) => void`
- `disabled?: boolean`
- Standard HTML div attrs, incl `className`

## LoadingScreen
Full-screen loading with animated logo/progress.

## LottiePlayer
Wrapper for Lottie animations.

## MainHeader
Compact mobile global header for top-level screens. Hidden on desktop.

## PlayfulNavIcon
Flat SVG nav/feature illustration loader. Current Adventure Time assets temporary; replace with licensed/original art before launch.

**Props:**
- `name: 'books' | 'dictionary' | 'library' | 'profile'`
- Standard image attrs, incl `className`

## PracticeHeader
Expandable floating "Session Island" for practice/activity screens. It is centered, inset, rounded, bottom-edged, and capped-width on both mobile and desktop. The controls panel expands inside the same island from the quiet chevron and closes during Flow. Memory hooks are intentionally not exposed in the progress header.

**Props:**
- `maxWidth`
- `onClose`
- `progress`
- `currentIndex`, `totalCount`
- `accentBgClassName`
- `onShuffleClick`, `isShuffled`
- `onFlowClick`, `flowStatus`
- `onRestartClick`
- `settings`

## PracticeControlPanel
Compact toolbar inside `PracticeHeader`. Shuffle/Flow labels show state; Settings/Restart icon-only. Semantic colors. Shuffle reorders full round and returns card one. Restart confirms inline.

**Props:**
- `isShuffled?: boolean`
- `flowStatus?: 'idle' | 'playing' | 'paused' | 'finished'`
- `onToggleShuffle?: () => void`
- `onToggleFlow?: () => void`
- `onOpenSettings: () => void`
- `onRestart?: () => void`
- Standard HTML div attrs, incl `className`

## PracticeSettingsScreen
Full-window practice preferences: Pace, Answers, Audio, Session tabs. Pace presets Comfortable/Balanced/Sprint + rhythm control + fine timing. Answers controls listening auto-check and auto-next. Quiz answers submit directly; auto-next hides the feedback overlay while advancing. Audio controls speed/timing. Session controls mistake recycling, character format, difficulty/reveals. Auto-next pauses while settings/mnemonics/breakdowns open.

**Props:**
- `isOpen`, `onClose`
- `preferences`, `onPreferencesChange`
- `onPaceChange`
- `onApplyPreset`
- `characterPreference`, `onCharacterPreferenceChange`
- Standard HTML div attrs, incl `className`

## PracticeRange
Accessible range with tactile thumb, filled track, value badge, optional endpoint labels.

**Props:**
- `label`, `value`, `min`, `max`, `onChange`
- `valueLabel?`
- `startLabel?`, `endLabel?`
- Standard HTML input attrs except `type` and native change handler

## PracticeSettingGroup
Unframed settings section with consistent title/description/spacing/divider.

## PracticeToggleRow
Tactile switch row with label + optional description.

**Props:**
- `checked`, `label`, `description?`
- Standard HTML button attrs, incl `className`

## PracticeSegmentedControl
Generic 2/3-column tactile mutually exclusive picker.

**Props:**
- `value`, `options`, `onChange`
- `columns?: 2 | 3`
- Standard HTML div attrs, incl `className`

## ProgressDashboard
Profile progress dashboard: streak, XP, cards learned, study time.

## ProgressMetricCard
Compact metric card with semantic icon, label, value, supporting detail. For real derived metrics.

**Props:**
- `label`, `value`, `detail`
- `icon?: AppIconName`
- `leadingContent?: React.ReactNode`
- `accentClassName?`, `iconBackgroundClassName?`
- Standard HTML div attrs, incl `className`

## RelatedWordsListModal
Slide-in full-screen modal grouping related words for character. Playful thick 3D borders + book markers.

**Props:**
- `initialChar: string`
- `relatedWords: Flashcard[]`
- `activeBook: any`
- `onClose: () => void`
- `onWordClick?: (w: string) => void`

## ScreenHeader
Canonical study/window header for practice, grammar, modals, and secondary screens. Its fixed maximized frame matches Character Breakdown and never compacts or minimizes on scroll. Specialized headers compose their center/right content inside this shared frame.

**Props:**
- `title?`, `eyebrow?`
- `centerContent?`
- `progress?`, `currentIndex?`, `totalCount?`
- `onClose?`, `onBack?`
- `rightAction?`
- `accentBgClassName?`, `maxWidth?`, `className?`

## ScreenLayout
Screen content wrapper with consistent padding, max-width, scroll behavior.

## ScreenSkeleton
Skeleton loader for activity content. It assumes the shared practice header is already mounted, mirrors each activity's current geometry, uses semantic tokens and reduced-motion-safe pulse animation, and avoids duplicate header chrome.

## SideNav
Floating navigation rail for Books, Dictionary, Library, Profile, and Settings. The rail has no shadow or side outline and uses one 6px neutral bottom edge for restrained 3D separation. It retains the branded illustration family; the active row uses a quiet neutral surface, book-colored text, and a 4px book-colored bottom edge.

**Props:**
- `activeTab`, `activeActivity`
- `onTabChange`, `onSettingsClick`
- `accentClass?`, `buttonEdgeClass?`

## SearchBar3D
Large tactile search form with built-in submit. Used for dictionary homepage/prominent search.

**Props:**
- `initialValue?: string`
- `value?: string`
- `onValueChange?: (value: string) => void`
- `placeholder?: string`
- `submitLabel?: string`
- `showSubmit?: boolean`
- `onSubmit: (value: string) => void`
- Standard HTML form attrs, incl `className`

Placeholder uses shared interface font bold for legibility.

## SentenceSpine
Interactive grammar visual mapping a sentence into subject/verb/object slots. Uses one white teaching surface with quiet role labels, generous Chinese, an optional positive/negative selector, and subtle note strips.

**Props:**
- `spine: GrammarSentenceSpine`
- `characterPreference`
- `showPinyin`, `showTranslation`
- Standard HTML div attrs, incl `className`

## Skeleton
Generic animated loading skeleton.

## SmartSentence
Chinese sentence with clickable characters for dictionary/breakdown.

## Soft3DButton
Legacy tactile compatibility button. New work uses `ActionButton`; keep only where tactile feedback intentional or migration pending.

**Props:**
- `children: React.ReactNode`
- `onClick?: () => void`
- `accent?: string`
- `className?: string`
- Standard HTML button attrs

## StrokeOrderBox
Stroke order animation via Hanzi Writer.

## UsedAsListModal
Modal showing vocab words using given character/component.

**Props:**
- `char: string`
- `onClose: () => void`
- `onWordClick?: (word: string) => void`
