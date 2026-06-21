# Prompt/Agent Instructions

These instructions are automatically injected into my brain every time we start working on this project. This ensures I never forget how you like your code structured.

**Core Rules for AI Agent:**

1. **Separation of Concerns:**
   - **Designs & UI:** Reusable buttons, cards, and styling components *MUST* go in `src/lib/widgets/`. Do not bloat screens with massive SVG/JSX definitions. Extract them.
   - **Page Layouts:** Entire pages/screens go in `src/screens/` (e.g., CurriculumLibrary).
   - **Logic & State:** Any complex React logic (like spaced repetition drawing, scoring) goes into custom hooks inside `src/hooks/`.
   - **Functions:** Pure javascript helper functions (math, formatting, text processing) belong in `src/utils/`.
   - **Data:** Static content and types go in `src/data/`.

2. **Clean Code Philosophy:**
   - Always prefer smaller, composable components over huge monolithic files.
   - Screen files (`src/screens/`) should primarily be "glue" code that calls a hook (`useFlashcards()`) and passes data down to "dumb" UI widgets.

3. **Design Aesthetics (Duolingo-Style UI & Vibes - STRICT CODES):**
   - We are building a playful, approachable study tool with a Duolingo-inspired UI. It must have chunky 3D borders, glassmorphism, and bold, vivid flat colors. DO NOT USE default Tailwind grays like `slate-400` or `gray-200`.
   - **Neutral Border/Shape:** `#E5E5E5`
   - **Neutral Active Text:** `#4B4B4B`
   - **Neutral Muted Text:** `#AFB6BB`
   - **Neutral BG:** `bg-[#F7F7F7]` or `bg-white`
   - **Buttons:** ALWAYS make buttons 3D tactile. Give them thick bottom borders without side/top borders, e.g. `border-b-[6px] active:border-b-[0px] active:translate-y-[6px] rounded-[24px]` (or similar proportional values). Do not use full borders (like `border-2`) on buttons unless it's an outlined styling specifically requested.
   - **Icons:** Use `react-icons` for all icons. You can mix and match from different packs (e.g. `react-icons/fa6`, `react-icons/hi2`, `react-icons/lu`, `react-icons/io5` etc.). This explicitly overrides rules limiting icons to `lucide-react`.

4. **Self-Updating Documentation (Living Docs):**
   - If I (the AI) create a new reusable button or widget, I MUST automatically update `WIDGETS.md` to document its props and usage.
   - If the user specifies a new project-wide rule or convention, I MUST automatically append it to this `AGENTS.md` file so it is permanently remembered.

5. **Screen Refactoring & Cleanups:**
   - Always extract distinct "views" or modal wrappers into their own files in `src/screens/` rather than keeping massive inline `motion.div` blocks with placeholder UI inside `App.tsx`.
   - Ensure the `App.tsx` retains only the high-level routing/state logic and the global layout shell.
   - Any reusable icons, especially SVGs, should be placed in `src/lib/widgets/` or `src/assets/` to prevent cluttering standard components.

6. **State & Persistence:**
   - Always use the Zustand store (`src/store/useAppStore.ts`) for global state like `activeBookId`, `learnedCards`, and `srsData`.
   - Never lift heavy state into `App.tsx`.

7. **Header Management:**
   - Always reuse the global `MainHeader` widget inside `App.tsx` instead of creating standalone headers for different screens.
   - If a screen or mode needs a different title, left icon, or right action, pass these via `title`, `leftIcon`, and `rightContent` props down to `MainHeader`.

8. **Remote Data, Services, & Caching:**
   - All external data fetching (e.g. Supabase) MUST go inside `src/services/`.
   - UI Components (`src/screens/`, `src/lib/widgets/`) MUST NEVER query Supabase directly. They must use the service layer.
   - For high-frequency lookups (like dictionary terms, character breakdowns), the service layer MUST implement an in-memory application cache (e.g., a `Map` in `src/utils/cache.ts`) to avoid duplicate network paths and preserve fast UI responsiveness.

9. **Strict UI Reusability (Anti-Spaghetti Protocol):**
   - **Reuse Before Creating:** ALWAYS check `src/lib/widgets/` to see if a component (Button, Card, Modal, Input) already exists before building a new one from scratch. Do not hardcode raw `<button className="...">` or `<div className="rounded-xl border...">` inside screen components if a widget already handles it.
   - **Make New UI Reusable Default:** If you must create a *new* UI element that could be used elsewhere, you MUST build it as an unopinionated, reusable React component in `src/lib/widgets/` rather than burying it inside a specific page structure.
   - **Prop-Driven Design:** Every reusable UI component must accept standard HTML attributes (via `extends React.HTMLAttributes<HTMLDivElement>`) and a `className` override so it remains highly composable without needing to be duplicated in the future.

## PHASE 3: Architectural Guardrails

- **Component Rules:** 
  - Maximum line count per file should generally not exceed 150 lines. If a component grows beyond this, extract UI blocks into `src/lib/widgets/` or distinct feature components in the local directory.
  - Components must remain "dumb" wherever possible. Pass data and callbacks as props.
  - Strict Component Structure: `[Hooks/State] -> [Derived Data] -> [UI Rendering]`. Do not mix data fetching logic inside JSX elements.

- **Styling Rules (Tailwind CSS):** 
  - Strictly use Tailwind CSS utility classes.
  - Extract repetitive class strings into variables, or ideally, into reusable widgets in `src/lib/widgets/` for elements like Buttons and Cards.
  - Maintain the Duolingo-style aesthetic: playful `rounded-[24px]`, `border-b-[Xpx]`, and solid hex color borders.

- **Data Rules:** 
  - All data fetching from the backend (Supabase) must reside inside `src/services/`.
  - Screens and Components MUST NEVER contain raw fetch calls, Axios logic, or direct DB client queries. They must use a custom hook (e.g., `useVocabulary()`) which then calls the service layer.

- **State Rules:** 
  - **Local State** (`useState`, `useReducer`): Use for purely visual component states (toggles, input fields, open/closed modals).
  - **Global State** (`Zustand`): Use strictly for cross-screen data that persists throughout the session (e.g., active user configuration, SRS progress, selected curriculums).
  - Never lift complex application state into `App.tsx`. Use Zustand instead.

## PHASE 4: Anti-Spaghetti & Feature Architecture

- **Feature-Based Folder Structure (Vertical Slices):**
  - As screens grow complex (e.g., `LibraryScreen.tsx`), they MUST be broken down into a dedicated feature folder (e.g., `src/screens/library/`).
  - Inside a feature folder, subdivide further if needed: `components/` (local UI), `hooks/` (local logic), `utils/`.
  - Use `index.ts` files inside feature folders to export only the public interfaces/components. This encapsulates internal helpers and avoids deep import chains.

- **Strict Container vs. Presenter Pattern:**
  - **Containers (Smart):** A top-level screen component should handle data fetching (via custom hooks), state management, and passing props down.
  - **Presenters (Dumb):** Sub-components must be pure functions of their props. They should not directly call `useAppStore` or services unless absolutely necessary.
  
- **Centralized Types:**
  - Database schemas and API response types go in `src/types/database.ts`.
  - Application models and UI interfaces go in `src/types/models.ts`.
  - Do not define complex shared interfaces inline within component files.

- **No Service Leakage:**
  - Direct imports of `supabase` client inside `/src/screens/` or `/src/lib/widgets/` is STRICTLY FORBIDDEN.
  - UI must call a hook (e.g., `useDictionarySearch`), which then calls a function in `/src/services/` (e.g., `dictionaryService.ts`), which is the ONLY place allowed to touch the Supabase client.

## Memory Hooks (Pre-generated Mnemonics)

- **Concept:** Mnemonics are pre-generated via batch script and stored in Supabase `mnemonics` table. The frontend checks DB cache first, so users see mnemonics instantly without waiting for AI.
- **Key convention:** Word mnemonics use `id: "word_{text}"` (e.g. `"word_你好"`), character mnemonics use `id: "{char}"` (e.g. `"好"`). This applies everywhere: batch script, frontend cache, pre-generation hook, and Supabase `mnemonics.id` field.
- **Pre-generation hook:** `preGenerateMnemonics(items[])` in `src/services/aiService.ts` — called when entering a study session to background-generate mnemonics for all characters/words in the lesson.
- **Batch script:** `scripts/batchMnemonics.ts` — reads vocab from Supabase, generates via Gemini + OpenRouter fallback, saves to `mnemonics` table. Run: `npx tsx scripts/batchMnemonics.ts`. Supports `--start` and `--end` flags for parallel runs.
- **Server API:** `POST /api/generate-mnemonic` — single endpoint for both character and word mnemonics. Called by frontend on-demand and by pre-generation hook.
- **Static mnemonics:** `src/data/pregeneratedMnemonics.ts` — hand-written mnemonics for common words/characters, checked before API calls.


