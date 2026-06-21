# Shared Widgets Library

This document tracks the reusable UI components in `src/lib/widgets/`.

All widgets are exported from `src/lib/widgets/index.ts` and can be imported as:
```ts
import { Soft3DButton, MainHeader, ... } from '../lib/widgets';
```

---

## ActivityModalWrapper
Full-screen modal wrapper for activity screens (flashcards, quiz, listening, writing). Provides the animated backdrop and close handling.

## BottomDrawer
A slide-up drawer panel from the bottom of the screen. Used for secondary content like mnemonics, examples, and settings.

## BreakdownSkeleton
Skeleton loader for the character breakdown view. Shows animated placeholder shapes while decomposition data loads.

## Card3D
A 3D-styled card component with thick bottom borders and press animation. Used for character nodes in the breakdown tree.

## CharacterBreakdown
Interactive character decomposition tree. Shows a character's radicals/components in an expandable tree structure with visual structure indicators (⿰, ⿱, etc.).

### AiMnemonicCard
Displays an AI-generated memory hook (mnemonic) for a Chinese character. Auto-loads pre-generated mnemonics from Supabase cache — shows instantly if pre-generated, otherwise auto-generates on mount. Only shows a "Generate AI Story" button if generation fails.

**Location:** `src/lib/widgets/CharacterBreakdown.tsx`

**Props:**
- `char: string` — The Chinese character to generate a mnemonic for.
- `data: DBCharacterBreakdown | null` — Character breakdown data from Supabase.
- `accentBgClass?: string` — Tailwind class for button background (default: `'bg-[#FF9600]'`).
- `accentTextClass?: string` — Tailwind class for accent text (default: `'text-[#FF9600]'`).
- `buttonEdgeClass?: string` — Tailwind class for button 3D edge (default: `'border-[#E57A00]'`).

**Behavior:**
1. On mount, checks in-memory cache → Supabase DB cache (instant if pre-generated)
2. If not cached, auto-generates via Gemini API with loading spinner
3. If generation fails, shows "Generate AI Story" button for manual retry
4. Only renders for characters with decomposition components > 1

### CharNodeItem
A clickable character node in the breakdown tree. Visualizes a single character component and its meaning.

### BreakdownComponentCard
A card showing the details of a character component (meaning, pinyin, decomposition).

### UsedAsCompactItem
A compact list item displaying a vocabulary word that uses a specific character component.

### BottomCharacterTabs
Tab navigation for switching between multiple characters in a word when viewing breakdowns.

### SingleBreakdownView
A unified view component that handles fetching and displaying the breakdown for a single character, including its structural decomposition, meaning, and components.

## CharacterBreakdownOverlay
Full-screen overlay for deep character breakdown. Wraps `CharacterBreakdown` with navigation between multiple characters in a word.

## CourseIcons
Icon components for each course/book. Provides themed icons for the curriculum library.

## CustomProgressBar
Animated progress bar with Duolingo-style rounded corners and accent colors.

## DeepBreakdownModal
Modal wrapper for the deep character breakdown view. Includes a lightbulb button in the header to show AI mnemonics.

## DraggableFlashcard
The main flashcard component with drag-to-swipe gesture support. Shows front (Chinese) and back (pinyin + English) with 3D flip animation. Characters are tappable to open breakdown overlay.

**Props:**
- `card: any` — The flashcard data (front, back, pinyin, etc.)
- `exitX`, `exitY` — Exit animation coordinates for swipe
- `exitAction` — Type of exit animation ('learned' | 'again' | 'nav')
- `isFlipped`, `setIsFlipped` — Flip state
- `setActiveBreakdown` — Callback to open character breakdown
- `setActiveMemoryHook` — Callback to open memory hook overlay
- `activeBook` — Current book for theming
- `handleDragStart`, `handleDrag`, `handleDragEnd` — Drag gesture handlers
- `onCardTap` — Tap handler for flip

## DynamicBackground
Animated gradient background that changes color based on the active book theme.

## EmptyReviewState
Empty state component shown when there are no cards to study. Displays a friendly message with the book's accent colors.

## ExpandableSearch
An animated, pill-shaped search bar that is small when empty/unfocused and expands to full width when focused.

## FeedbackBottomBar
Bottom bar for user feedback (e.g., "Was this helpful?"). Used in quiz and review screens.

## Floating3DButton
A floating action button with 3D border effect. Used for primary actions like "Add" or "Create".

## GlassCard
A card with glassmorphism effect (blur, transparency). Used for overlay content.

## GlobalDictionaryModal
Full-screen dictionary search modal. Allows users to search the global dictionary by Chinese, pinyin, or English.

## IconButton3D
A small icon button with 3D border effect and press animation. Used for secondary actions in headers and toolbars.

## LayoutShell
The main app layout shell. Wraps the entire app with the side navigation and main content area.

## LessonComplete
End-of-lesson celebration screen. Shows stats (learned, unlearned) and options to review or continue.

## LoadingScreen
Full-screen loading screen with animated logo and progress indicator. Shown during app initialization.

## LottiePlayer
Wrapper for Lottie animation files. Used for celebratory animations and loading states.

## MainHeader
The global app header. Shows the current screen title, navigation, and settings. Reused across all screens via `App.tsx`.

## PracticeHeader
Header for practice/activity screens. Shows progress bar, card count, lightbulb button (for mnemonics), and settings.

**Props:**
- `maxWidth` — Max width constraint
- `onClose` — Close callback
- `progress` — Progress percentage (0-100)
- `currentIndex`, `totalCount` — Card position indicator
- `accentBgClassName` — Accent color class
- `showLightbulb` — Whether to show the mnemonic button
- `onLightbulbClick` — Mnemonic button callback
- `onSettingsClick` — Settings button callback

## ProgressDashboard
Dashboard showing user progress stats (streak, XP, cards learned, study time). Used in the profile screen.

## RelatedWordsListModal
A slide-in full-screen modal that groups and displays all related words for a given character, styled with playful thick 3D borders and book-colored markers.

**Props:**
- `initialChar: string` — The character being queried.
- `relatedWords: Flashcard[]` — All vocabulary items containing this character.
- `activeBook: any` — The currently active book object.
- `onClose: () => void` — Callback to close the list overlay.
- `onWordClick?: (w: string) => void` — Callback triggered when clicking on a related word.

## ScreenHeader
Simple header bar with back button and title. Used in modals and secondary screens.

## ScreenLayout
Layout wrapper for screen content. Provides consistent padding, max-width, and scroll behavior.

## ScreenSkeleton
Skeleton loader for screen content. Shows animated placeholder shapes while screen data loads.

## Skeleton
Generic skeleton loader component. Animated placeholder for loading states.

## SmartSentence
Renders a Chinese sentence with clickable characters. Each character can trigger a dictionary lookup or breakdown overlay.

## Soft3DButton
The primary button component with 3D border effect, press animation, and accent colors. Used throughout the app for all primary actions.

**Props:**
- `children: React.ReactNode` — Button content
- `onClick?: () => void` — Click handler
- `accent?: string` — Accent color class
- `className?: string` — Additional CSS classes
- Standard HTML button attributes

## StrokeOrderBox
Shows the stroke order animation for a Chinese character using Hanzi Writer.

## UsedAsListModal
Modal showing all vocabulary words that use a given character as a component. Used in the character breakdown overlay.

**Props:**
- `char: string` — The character to look up
- `onClose: () => void` — Close callback
- `onWordClick?: (word: string) => void` — Word click callback
