# 🏛️ System Architecture

This document describes the core architecture of the **RongWaps** application.

---

## 📂 Feature-Based Folder Structure (Vertical Slices)

The codebase is organized into vertical feature directories to encapsulate code, make components manageable, and reduce cross-imports.

```
src/
├── screens/
│   ├── library/          # Curriculum Library & Custom Folders Screen
│   │   ├── components/   # Screen-local components
│   │   ├── hooks/        # Screen-local hooks
│   │   └── LibraryScreen.tsx
│   ├── flashcard/        # Flashcards study session
│   ├── quiz/             # Quiz review screen
│   ├── writing/          # Canvas writing screen
│   └── ...               # (activities, auth, debug, profile, search)
```

### 🧩 Component Hierarchy Guidelines
- **Smart Containers (`src/screens/{feature}/`)**: Responsible for connecting to store states, fetching data via services, and binding event handlers. They should be clean and delegate layout/styling to presentational widgets.
- **Dumb Presenters (`src/lib/widgets/`)**: Located in a shared widgets library. They are pure functions of their inputs (`props`), do not bind directly to stores (unless for minor global overlays), and contain the styling variables.

---

## 🎨 UI Architecture: Playful & Tactile

The interface follows a **Duolingo-inspired** design system, featuring custom flat layouts, thick 3D borders, and spring animations.

### 1. 3D Tactile Buttons
Instead of browser-default gradients or subtle box-shadows, buttons use solid thick borders to feel clicky and real:
- **Default State**: `border-[2px] border-b-[6px] rounded-[24px]`
- **Active State**: `active:border-b-[0px] active:translate-y-[6px]` (gives the mechanical feeling of a spring button).

### 2. Variable-Based Theming
To support instant theme swapping when users switch between different textbook modules (e.g. HSK vs TOCFL), elements utilize Tailwind styling coupled with CSS Variables:
- Colors are declared in `src/data/bookThemes.ts`.
- Selecting a book updates the root element CSS variables, instantly styling headers, progress bars, and buttons.

### 3. Motion System
Animations are handled via `framer-motion` (using the modern `motion` import) for:
- Bouncy spring pops (`type: "spring", bounce: 0.4`).
- Swipe gesture thresholds (using motion drag attributes in `DraggableFlashcard.tsx`).
- Smooth fade-in screen transitions.

---

## 💾 State Management & Persistence

### 1. Zustand Slices
To avoid monolithic code, global state is divided into domain slices in `src/store/`:
- `useAuthStore` — User credentials, active token, and session variables.
- `useNavigationStore` — App routing state.
- `useLibraryStore` — Custom folders, custom flashcard creation.
- `useSrsStore` — Local card progress caching.
- `useUiStore` — Sidebar state, modals visibility.
- `useSyncStore` — Auto-saves throttling state.

### 2. Persistence Layer
State persistence relies on Zustand's `persist` middleware with IndexedDB key-value storage. This ensures study progress isn't lost on browser refresh.

---

## 🧠 Spaced Repetition (SRS) Algorithm

The application schedules reviews using a modified **SM-2 algorithm**:

1. **Rating (1 to 4)**:
   - `1 (Hard)`: resets repetition count to `0` and interval to `1` day.
   - `2 (Bad)`: repetitions reset to `0`, interval set to `1` day, and `efactor` reduced by `0.15`.
   - `3 (Good)`: increments repetition. If first repeat, interval is `1` day; second repeat, `3` days; subsequent repeats, `interval * efactor`.
   - `4 (Easy)`: increments repetition. Interval grows aggressively: `interval * efactor * 1.2` and `efactor` increased by `0.15`.

2. **Next Review calculation**:
   - `next_review_date = Date.now() + interval * 24 * 60 * 60 * 1000`.
   - The queue displays cards where `next_review_date` is less than or equal to the current time.
