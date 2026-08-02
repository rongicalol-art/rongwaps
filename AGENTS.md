# Prompt/Agent Instructions

Auto-injected each project session. Keep code structure + user preferences.

**Core Rules for AI Agent:**

1. **Separation of Concerns:**
   - **Designs & UI:** Reusable buttons/cards/style widgets go in `src/lib/widgets/`. No massive SVG/JSX inside screens.
   - **Page Layouts:** Screens/pages go in `src/screens/`.
   - **Logic & State:** Complex React logic goes in hooks inside `src/hooks/`.
   - **Functions:** Pure JS helpers go in `src/utils/`.
   - **Data:** Static content/types go in `src/data/`.

2. **Clean Code Philosophy:**
   - Prefer small composable components over huge files.
   - Screens glue hooks + dumb UI widgets.

3. **Design Aesthetics (Premium-Playful Learning UI):**
   - Playful approachable study tool. Duolingo clarity, vivid flat colors. Tactile depth only for emphasis. DO NOT USE default Tailwind grays like `slate-400` or `gray-200`.
   - **Neutral Border/Shape:** `border-ui-border`, `bg-ui-border`, or `var(--color-ui-border)`
   - **Neutral Active Text:** `text-ui-ink` or `var(--color-ui-ink)`
   - **Neutral Muted Text:** `text-ui-muted` or `var(--color-ui-muted)`
   - **Neutral BG:** `bg-ui-canvas` or `bg-ui-surface`
   - **Buttons:** Use shared action hierarchy. Strong depth for primary next action + direct manipulation only. Secondary restrained. Nav/settings/audio/close utility quiet.
   - **Icons:** Use semantic `AppIcon` gateway + approved Phosphor family. Add semantic name there.

4. **Self-Updating Documentation (Living Docs):**
   - New reusable button/widget => update `WIDGETS.md` props + usage.
   - New project-wide user rule => append to `AGENTS.md`.

5. **Screen Refactoring & Cleanups:**
   - Extract distinct views/modal wrappers to `src/screens/`; no huge inline `motion.div` placeholders in `App.tsx`.
   - Keep `App.tsx` high-level routing/state + global shell only.
   - Reusable icons/SVGs live in `src/lib/widgets/` or `src/assets/`.

6. **State & Persistence:**
   - Use Zustand store `src/store/useAppStore.ts` for global state: `activeBookId`, `learnedCards`, `srsData`.
   - Never lift heavy state into `App.tsx`.

7. **Top-Level Navigation & Headers:**
   - Top-level tab screens (`Books`, `Dictionary`, `Library`, `Profile`) headerless on desktop.
   - Desktop/wide (`md`+) side nav permanent/open. Mobile may closable drawer.
   - Keep compact global `MainHeader` on mobile.
   - Desktop actions live in screen workspace, contextual actions, or floating tactile selection action.
   - `ScreenHeader`/`PracticeHeader` for overlays, drill-downs, active study sessions.

8. **Remote Data, Services, & Caching:**
   - External fetching (Supabase) goes inside `src/services/`.
   - UI (`src/screens/`, `src/lib/widgets/`) NEVER query Supabase directly. Use service layer.
   - High-frequency lookups use in-memory app cache, e.g. `Map` in `src/utils/cache.ts`.

9. **Strict UI Reusability (Anti-Spaghetti Protocol):**
   - **Reuse Before Creating:** Check `src/lib/widgets/` before new Button/Card/Modal/Input. Avoid raw hardcoded buttons/cards in screens.
   - **Make New UI Reusable Default:** New reusable UI goes in `src/lib/widgets/`, unopinionated.
   - **Prop-Driven Design:** Reusable UI accepts standard HTML attrs (e.g. `extends React.HTMLAttributes<HTMLDivElement>`) + `className`.

10. **Architectural Guardrails:**
    - **Component Rules:**
      - File max rough: screen containers/hooks 250 lines; presentational widgets/helpers 150 lines. Extract when bigger.
      - Components dumb when possible; pass data/callbacks.
      - Structure: `[Hooks/State] -> [Derived Data] -> [UI Rendering]`.
    - **Styling Rules (Tailwind CSS):**
      - Use Tailwind utility classes.
      - Extract repeated class strings into variables/widgets.
      - Premium-playful aesthetic: rounded geometry, vivid semantic accents, depth proportional to importance.
    - **Data Rules:**
      - Backend fetching resides in `src/services/`.
      - Screens/components no raw fetch, Axios, direct DB client. Use hook => service.
    - **State Rules:**
      - **Local State** (`useState`, `useReducer`): visual-only state.
      - **Global State** (`Zustand`): persisted cross-screen state.
      - Never lift complex app state into `App.tsx`.

11. **Anti-Spaghetti & Feature Architecture:**
    - **Feature-Based Folder Structure (Vertical Slices):**
      - Complex screens become feature folder, e.g. `src/screens/library/`.
      - Feature folder may contain `components/`, `hooks/`, `utils/`.
      - Use `index.ts` to export public API only.
    - **Strict Container vs. Presenter Pattern:**
      - **Containers (Smart):** data fetching via hooks, state, props down.
      - **Presenters (Dumb):** pure props; avoid `useAppStore`/services unless needed.
    - **Centralized Types:**
      - DB/API types in `src/types/database.ts`.
      - App/UI models in `src/types/models.ts`.
      - No complex shared interfaces inline.
    - **No Service Leakage:**
      - Direct `supabase` imports inside `/src/screens/` or `/src/lib/widgets/` STRICTLY FORBIDDEN.
      - UI calls hook (e.g. `useDictionarySearch`) => service (e.g. `dictionaryService.ts`) => only service touches Supabase.

12. **Memory Hooks (Pre-generated Mnemonics):**
    - **Concept:** Mnemonics pre-generated by batch script, stored in Supabase `mnemonics`. Frontend checks DB cache first for instant display.
    - **Key convention:** Word mnemonic id `word_{text}` (e.g. `word_你好`); character id `{char}` (e.g. `好`). Applies batch script, frontend cache, pre-generation hook, Supabase `mnemonics.id`.
    - **Pre-generation hook:** `preGenerateMnemonics(items[])` in `src/services/aiService.ts`; called entering study session.
    - **Batch script:** `scripts/batchMnemonics.ts`; reads vocab from Supabase, generates via Gemini + OpenRouter fallback, saves to `mnemonics`. Run `npx tsx scripts/batchMnemonics.ts`. Supports `--start`/`--end`.
    - **Server API:** `POST /api/generate-mnemonic`; single endpoint for character + word. Used frontend on-demand + pre-generation.
    - **Static mnemonics:** `src/data/pregeneratedMnemonics.ts`; checked before API.

13. **Design System Foundations:**
    - Use semantic `AppIcon` for functional icons. Phosphor default. Add semantic name instead of duplicate icon family.
    - Shared design values live in `src/data/designTokens.ts` + Tailwind tokens in `src/index.css`.
    - Branded nav illustrations must be coherent family. Current Adventure Time SVGs temporary; replace with licensed/original RongWaps art before public launch.

14. **Semantic Neutral Colors:**
    - Never hardcode neutral border/disabled/divider/surface/hover/text hex in components. Use `ui-*` tokens: `ui-border`, `ui-divider`, `ui-muted`, `ui-ink`, `ui-canvas`, `ui-surface`.
    - Non-Tailwind APIs use `DESIGN_TOKENS.color` from `src/data/designTokens.ts`.
    - Adjust neutral contrast centrally only.

15. **Typography Roles:**
    - Use `font-sans` for UI copy + mixed Latin/Chinese. Stack uses Nunito + LXGW WenKai-based Chinese.
    - Every Chinese glyph uses single `font-chinese` stack: controls, labels, examples, inputs, dictionary, handwriting, teaching.
    - Never hardcode `font-family` in components. Tailwind tokens / `DESIGN_TOKENS.font` own families.
    - Default letter spacing zero. Only short uppercase category labels may positive tracking. Headings + Chinese normal tracking.

16. **Workspace-Bounded Windows:**
    - Full-screen study windows/drawers/settings/dictionary/breakdowns/top overlays stay inside main workspace on desktop/wide; never cover permanent left nav.
    - Use shared `workspace-window` utility for top-level fixed/root absolute windows. Mobile full viewport; `md`+ offset by nav width.
    - Nested overlays inside workspace-bounded parent inherit bounds; do not offset twice.

17. **Country Flags:**
    - Never use platform flag emoji. Use `CountryFlag` widget + committed vector assets for consistent rectangle ratio/weight.
    - Flags flat; no shadow.

18. **Reading-Centered Lesson Parts:**
    - Lesson `Part` = one source-book `Reading` section (`短文／Reading`), not one grammar point/dialogue.
    - `Reading` umbrella content type: dialogue/story/narrative/self-intro/letter/article/etc.
    - Grammar points for same Reading stay grouped in same lesson/part. No duplicate parts because multiple grammar points.
    - Store source Reading once; reference from every grammar point in part. Preserve format; keep `Reading` top-level curriculum identity.
    - Track grammar progress in part; complete part after required grammar + final Reading/comprehension.

19. **Self-Paced Grammar Navigation:**
    - Grammar explanation + exercise are two modes of one grammar point. Header exposes only `Grammar` and `Reading`; internal modes `Learn`/`Practice`.
    - Multi-grammar part needs Previous/Next grammar controls in learn + review. Learners revisit or move forward without sequence restart.
    - Changing grammar with Previous/Next returns to Learn. Switching Learn/Practice keeps current grammar selected.

20. **Temporary Grammar-Only Lesson Experience:**
    - Preserve source Reading data. Hide Reading nav/completion when dedicated Reading experience missing; expose implemented Reading only.
    - Current product direction: hide learner-facing Reading path/window entirely for now. Do not render Reading cards, open Reading overlays, or count Reading as required progress until re-enabled.
    - Active flow: `Grammar Learn + Practice -> next Grammar -> Part complete`. Part completes after every grammar exercise complete.
    - Grammar lessons: flat book-reading workspace, full-width header, left `Grammar X of Y`, long progress bar, quiet Prev/Next, unframed reading content, bottom Learn/Practice dock.
    - Grammar practice uses `bg-ui-canvas`, never solid white page. White surfaces only for profile/question/feedback/mode cards.
    - Study header owns `Grammar X of Y`. Do not repeat `語法 · Grammar X` / `Practice · Grammar X` eyebrow in content.
    - Learn content one grammar title only. No duplicate focus-character blue subtitle. Printed-page badge in right title column, no wrap under title.
    - Grammar examples/practice/blanks/answer tiles use shared compact teaching-text scale.
    - Pattern tables/example lists keep one semantic DOM + same reading order mobile/desktop. Breakpoints adjust proportions only. Pattern meanings span full row below Chinese structure. Example controls align with sentence.
    - Every Chinese grammar-learning glyph (titles, explanations, notes, sentence spine, contrasts, examples) gets shared hover/focus + dictionary click. Lesson contextual meanings beat generic dictionary glosses.
    - Fill-in answer tiles compact character controls, restrained depth. Blank width reflects expected answer length.

21. **Purposeful Action Hierarchy:**
    - Use `ActionButton` for primary/secondary/quiet/danger; `IconActionButton` for icon utilities; `SegmentedControl` for modes. Legacy `Soft3DButton`/`IconButton3D` compatibility only.
    - One dominant primary action per surface/group. Check/Continue/Complete/Start/destructive confirm may strong depth when clear next step.
    - Reset/Review/Retry/Cancel/alternatives secondary or quiet unless workflow makes one primary.
    - Close/Back/Previous/Next/Settings/Audio/Expand/overflow quiet/light surface, no thick tactile edge.
    - Learn/Practice and similar modes are segmented navigation, not separate tactile CTAs.
    - Selected control keeps persistent signal across hover/focus. Hover never demotes selected to gray. Selected color not duplicated on selector + result panel.
    - No tactile buttons inside tactile container. No card depth on plain page sections. Use layout/type/whitespace before border/shadow.

22. **Grammar Reading Aids & Phrase Lookup:**
    - Pinyin supports Chinese; it stays visually quieter and smaller than characters and translations.
    - Audio is a quiet inline utility, never a competing card action.
    - If a tapped teaching phrase has no exact dictionary entry, segment it into useful words and show each word’s definitions. Do not default to a “not found” dead end or character-by-character breakdown.
    - Teaching glossary tokens may be words, established short phrases, or the grammar form being taught. Never register a complete clause or sentence as one dictionary lookup target.
    - Practice section labels appear once per group. Do not repeat labels such as “Learned skills” above every question.
    - Grammar Learn pages should include at least four varied examples when authored beyond source minimum, with visual manipulation or contrast when word order is hard to understand.

23. **Grammar Workspace Texture & Pattern Maps:**
    - Grammar workspaces use a calm solid canvas. Grid/paper texture belongs inside a clearly bounded work-mat panel, following Library’s graph-panel treatment; never use floating texture scraps or full-page wallpaper.
    - Pattern tables use a blue formula bar/header only. Lower sentence cards stay neutral white with quiet solid dividers; no highlighted column wash and no dotted connector rails.
    - Pattern columns follow authored sentence structure. Never invent or preserve an empty spacer column to force a three-column table.
    - One-, two-, and three-part patterns share the same component; populated groups determine the visible columns and available width.
    - The active header segment uses a distinct deeper blue bottom edge so it does not blend into the header shadow.
    - Grammar example number badges use the Dictionary's yellow-gold family for a small repeated accent.
    - Practice groups may sit inside one graph-paper work mat. Questions use solid surfaces and restrained card lift. Avoid dotted wallpaper and decorative noise.
    - Interactive grammar labs are texture-free and reading-first: strong title hierarchy, one compact segmented choice rail, one spacious white teaching surface, and one quiet takeaway strip. Avoid nested cards and repeated graph texture.

24. **Lesson Part Practice Selection:**
    - Lesson tiles never render part selectors beneath the lesson card.
    - Current lesson parts live in the course progress panel as one segmented practice rail.
    - Selecting a lesson enables only its first available part by default.
    - At least one part must remain enabled for a selected lesson.
    - Curriculum practice loading and session keys must respect enabled parts.
    - Active practice progress may split into labeled part segments; shuffled sessions fall back to one continuous bar.

25. **Typing Pinyin Quiz:**
    - Quiz entry exposes Multiple Choice and Type Pinyin as explicit modes.
    - Type Pinyin grades pronunciation only, never the English meaning.
    - Pinyin matching ignores case, spacing, punctuation, tone marks, and tone numbers.
    - Parenthesized pinyin is optional, and either slash-separated pronunciation is accepted.
    - Keep misspellings incorrect; forgiving input formatting must not become fuzzy spelling correction.

26. **Quiz Answer Progression:**
    - Multiple-choice quiz answers grade immediately when an option is selected; quiz screens do not render a Check action.
    - Type Pinyin answers submit with Enter; manual feedback exposes only Continue.
    - A wrong-answer Continue action resets the current card for another attempt; it never advances the session.
    - When the selected auto-next setting applies to the result, hide the feedback action overlay while the timer advances to the next card.
    - The shared Check action remains available to activities that still use explicit checking, such as Writing.

27. **Source-First Grammar Learn Pages:**
    - The source-book rule, pattern, examples, page reference, and exercise sequence are the lesson authority.
    - Grammar Learn headers provide a quiet `View book page` action. It opens only the referenced printed pages exported from the owned source PDFs; do not expose whole source PDFs in the learner UI.
    - Default Learn view shows the source explanation, pattern, and examples before any supplemental teaching.
    - Put the one primary teaching interaction and added mistake/contrast help inside one quiet disclosure after the source examples. Keep it closed by default.
    - Prefer the authored specialized lab over a second generic discovery lab.
    - Keep the Learn opening concise: one title and one plain-language explanation. Do not repeat the same promise in a separate callout.
    - Lesson context, character art, and illustrations appear only when they clarify meaning that text and sentence structure cannot show more directly.
    - Default order: concise explanation → source pattern → source examples → collapsed optional interactive help.

28. **Consistent Neutral Borders:**
    - Neutral outlines use one consistent 2px width across headers, cards, docks, progress rails, inputs, selectors, and practice surfaces.
    - Neutral cards and utility containers stay flat; do not create depth with a thicker bottom border.
    - Thicker bottom edges are reserved for the single primary action, destructive confirmation, or direct-manipulation control whose tactile role is intentional.
