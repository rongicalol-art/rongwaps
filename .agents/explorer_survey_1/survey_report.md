# RongWaps Fresh-Foundation Survey Report: Documentation Cleanup (R1) & AGENTS.md Rewrite (R3)

**Author**: `explorer_survey_1`  
**Date**: 2026-09-04  
**Working Directory**: `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_1`  
**Target Project**: RongWaps (`/Users/ronianb.gica/Projects/rongwaps`)  
**Scope**: Requirement 1 (R1 — Documentation nuclear cleanup) and Requirement 3 (R3 — AGENTS.md rewrite)

---

## Executive Summary

A comprehensive, ground-truth audit was conducted across every markdown document and related configuration file in RongWaps. 

### Key Findings
1. **Repository Markdown Bloat**: There are currently **41 markdown files** across the project root (9 files) and `docs/` (32 files), totaling **6,394 lines of documentation**. In addition, 2 markdown files exist inside `.hermes/` (36 lines), and 1 JSON configuration file exists in `.openai/`.
2. **Backup & Dead Artifacts**: Two stale `.original.md` backup files exist in the project root (`AGENTS.md.original.md` at 154 lines, `WIDGETS.md.original.md` at 474 lines). Both `.hermes/` and `.openai/` directories are obsolete leftover tool configurations.
3. **Fictitious Deletions in CHANGELOG.md**: `docs/CHANGELOG.md` explicitly claimed in version 1.1.0 (2026-07-10) that `docs/PROGRESS_AND_PLANS.md`, `docs/team.md`, and `ARCHITECT_LOG.md` were deleted. In reality, **all three files are still present on disk** (totaling 414 lines).
4. **DECISIONS.md Contamination**: `DECISIONS.md` (219 lines) contains **29 recorded decisions**, of which **12 are superseded** (6 contain explicit "superseded" / "supersedes" annotations in their titles or text, and 6 are obsolete intermediate design iterations). Exactly **17 decisions remain active**.
5. **docs/INDEX.md Broken State**: `docs/INDEX.md` links to 7 deleted, stale, or backup files (including `.original.md` files and files claimed deleted in `CHANGELOG.md`), while completely omitting **15 existing documentation files** (including foundational documents such as `DESIGN_TOKENS.md`).
6. **AGENTS.md Drift & Inaccuracies**:
   - Falsely claims mnemonics are documented in `docs/API_SPEC.md` (`API_SPEC.md` only documents `/api/audio/*`).
   - Cites `src/services/aiService.ts` for mnemonics, which is a 7-line legacy debug stub; the actual runtime cache is in `mnemonicCache.ts` and `DATABASE_SCHEMA.md`.
   - References deleted documentation ("the relevant grammar plan").
   - Imposes unrealistic absolutes: "The shell `main` is the only workspace scroll container. Do not add nested `overflow-y-auto`/`h-full` screen scrollers", directly contradicted by modal dialogs, drawers, and even its own subsequent modal sizing paragraph.
   - Enforces hyper-specific implementation details and exact pixel values (`h-[520px] max-h-[85vh]`, `min-h-11`/`h-12`).
   - Embeds temporary beta flow details ("currently use...", "practice is temporarily hidden") into durable agent instructions.
   - References `Axios` in rules despite being an unused dependency slated for removal in R2.

### Target Outcome
- **Total Surviving Markdown Files**: **10 files** (or 11 if `OFFICIAL_AUDIO_SOURCES.md` is retained), easily satisfying the **≤ 12 markdown files** requirement (excluding `README.md`).
- **30 files slated for immediate deletion** (saving ~4,500 lines of dead text).
- Complete draft texts for **trimmed `DECISIONS.md`**, **rewritten `docs/INDEX.md`**, and **rewritten `AGENTS.md`** are provided below.

---

## 1. Complete Catalog of Markdown Files (Project Root & docs/)

Every markdown file in root and `docs/` was inspected for line count, contents, status, and retention recommendation.

| # | File Path | Lines | Category / Classification | Description / Purpose | Recommendation |
|---|---|---|---|---|---|
| 1 | `AGENTS.md` | 50 | Active Reference | Agent developer instructions and architectural rules | **KEEP (Rewrite)** |
| 2 | `AGENTS.md.original.md` | 154 | Backup File | Backup copy of legacy agent instructions | **DELETE** |
| 3 | `ARCHITECT_LOG.md` | 137 | Legacy Log | Session notes from June 2026 OWL autonomous session; claimed deleted in CHANGELOG | **DELETE** |
| 4 | `DECISIONS.md` | 219 | Active Reference | Architectural decisions; currently contains 12 superseded entries | **KEEP (Trim)** |
| 5 | `README.md` | 102 | Project Readme | Primary repository overview and developer instructions | **KEEP (Excluded from count)** |
| 6 | `TASK_TEMPLATE.md` | 25 | Stale Template | Empty task template for agent dispatch briefs | **DELETE** |
| 7 | `WIDGETS.md` | 153 | Active Reference | Public shared widget catalog mirroring `src/lib/widgets/index.ts` | **KEEP** |
| 8 | `WIDGETS.md.original.md` | 474 | Backup File | Legacy backup copy of widget documentation | **DELETE** |
| 9 | `WORK_CONTEXT.md` | 27 | Stale Template | Empty work context template; never populated or updated | **DELETE** |
| 10 | `docs/API_SPEC.md` | 17 | Active Reference | Express backend media streaming API endpoint (`/api/audio/*`) | **KEEP** |
| 11 | `docs/ARCHITECTURE.md` | 114 | Active Reference | System architecture, directory layout, dependency boundaries, ESLint rules | **KEEP** |
| 12 | `docs/AUDIT_2026-08-16.md` | 177 | Point-in-time Audit | Historical overnight full-stack audit (August 16, 2026) | **DELETE** |
| 13 | `docs/AUDIT_2026-08-24.md` | 95 | Point-in-time Audit | Historical full app audit (August 24, 2026) | **DELETE** |
| 14 | `docs/AUDIT_2026-08-26_dictionary_breakdown_consistency.md` | 97 | Point-in-time Audit | Historical deep dive on dictionary breakdown data consistency | **DELETE** |
| 15 | `docs/CHANGELOG.md` | 49 | Stale Log / Falsehoods | Stale changelog (last July 2026) containing false deletion and store claims | **DELETE** |
| 16 | `docs/CHARACTER_BREAKDOWN_HANDOFF.md` | 75 | Experimental Artifact | Handoff notes for experimental V3 character breakdown runtime | **DELETE** |
| 17 | `docs/COURSE_EXAMPLES.md` | 79 | Active Reference | Flashcard example sentences pack system, runtime matching, and export | **KEEP** |
| 18 | `docs/COURSE_EXAMPLE_COVERAGE.md` | 37 | Point-in-time Audit | Generated coverage stats for Book 1 example sentences | **DELETE** |
| 19 | `docs/DATABASE_SCHEMA.md` | 144 | Active Reference | Live Supabase database schema, tables, RPCs, and pack-first fetch paths | **KEEP** |
| 20 | `docs/DESIGN_TOKENS.md` | 50 | Active Reference | Standard UI design tokens (radii, depth, ambient shadows, colors, focus rings) | **KEEP** |
| 21 | `docs/GRAMMAR_CONVERSATION_QUEST.md` | 400 | Superseded Plan | Blueprint for grammar quest; explicitly marked superseded in its header | **DELETE** |
| 22 | `docs/GRAMMAR_EXPERIENCE_PILOTS.md` | 31 | Experimental Artifact | Notes on grammar pilot approaches; superseded by template | **DELETE** |
| 23 | `docs/GRAMMAR_LESSON_TEMPLATE.md` | 151 | Active Reference | Authoring rules, contracts, and supported exercises for grammar lessons | **KEEP** |
| 24 | `docs/GRAMMAR_PART_TWO_PLAN.md` | 134 | Completed Plan | Completed plan for Lesson 1 Part 2 grammar implementation | **DELETE** |
| 25 | `docs/GRAMMAR_SCREEN_IMPLEMENTATION_PLAN.md` | 342 | Completed Plan | Completed implementation plan for grammar screen simplification | **DELETE** |
| 26 | `docs/GRAMMAR_SCREEN_REVIEW_PLAN.md` | 400 | Completed Plan | Completed review plan for grammar screen and book viewer v2 | **DELETE** |
| 27 | `docs/INDEX.md` | 68 | Active Reference | Documentation navigation index | **KEEP (Rewrite)** |
| 28 | `docs/LESSON_9_GRAMMAR_PLAN.md` | 587 | Stale Plan | Stale plan proposing features that contradict current decisions | **DELETE** |
| 29 | `docs/MEMORY_HOOK_BOOK1_PILOT.md` | 128 | Experimental Artifact | Pilot proposal for Book 1 character memory hooks | **DELETE** |
| 30 | `docs/MEMORY_HOOK_BOOK1_PILOT_RESULTS.md` | 117 | Experimental Artifact | Draft results from Book 1 memory hook pilot | **DELETE** |
| 31 | `docs/MEMORY_HOOK_LABEL_SCENE_SHARED_REPORT.md` | 239 | Experimental Artifact | Report on scene-viability v2 experiments | **DELETE** |
| 32 | `docs/MEMORY_HOOK_METADATA_ENRICHMENT.md` | 52 | Experimental Artifact | Development-only preparation layer notes | **DELETE** |
| 33 | `docs/MEMORY_HOOK_QUALITY_PROPOSAL.md` | 147 | Experimental Artifact | Quality architecture proposal for memory hook generation pilot | **DELETE** |
| 34 | `docs/OFFICIAL_AUDIO_SOURCES.md` | 135 | Active Reference / Research | Research notes on Modern Chinese official audio, mapping, and karaoke pipeline | **KEEP (or Delete for leaner set)** |
| 35 | `docs/PROGRESS_AND_PLANS.md` | 81 | Stale Plan / Log | Early development checklist; claimed deleted in CHANGELOG | **DELETE** |
| 36 | `docs/ROADMAP.md` | 72 | Stale Plan | 3-month roadmap from July 2026 proposing unbuilt features | **DELETE** |
| 37 | `docs/RONGWAPS_CHARACTER_BIBLE.md` | 86 | Authoring Guidelines | Visual and narrative character guide for story dialogue | **DELETE (or Archive)** |
| 38 | `docs/SEARCH_SPEC.md` | 75 | Stale Blueprint | Early dictionary search proposal; recommends client-trie dropped in cleanup | **DELETE** |
| 39 | `docs/UI_CONSISTENCY_AUDIT.md` | 76 | Point-in-time Audit | Application audit from July 2026 | **DELETE** |
| 40 | `docs/WIDGET_ARCHITECTURE_REFACTOR_PLAN.md` | 726 | Completed Plan | Phased refactor plan from June/July 2026; completed | **DELETE** |
| 41 | `docs/team.md` | 196 | Stale Legacy Artifact | Outdated team structure / sub-agent setup; claimed deleted in CHANGELOG | **DELETE** |

### Additional Tool / Backup Artifacts
- `.openai/hosting.json` (1 file): Leftover OpenAI tool hosting configuration -> **DELETE directory `.openai/`**
- `.hermes/last-report.md` (21 lines) & `.hermes/improvement-log.md` (15 lines): Leftover Hermes tool logs -> **DELETE directory `.hermes/`**
- Data files in `docs/`: `docs/audio_index_book1.json` and `docs/audio_manifest_book1.json` are binary/JSON production data assets. As explicitly required, **PRESERVE both JSON files**.

---

## 2. Verification of Fictitious Deletions in CHANGELOG.md

In `docs/CHANGELOG.md`, under entry `## [1.1.0] - 2026-07-10`, lines 36–40:
```markdown
### Removed
- Deleted 13 root-level dead/debug scripts (including security risks containing plaintext service_role keys).
- Deleted 18 obsolete scripts from scripts/ folder.
- Deleted obsolete markdown files (docs/PROGRESS_AND_PLANS.md, docs/team.md, ARCHITECT_LOG.md).
```

### Verification Finding
All three markdown files claimed deleted are **still present in the repository**:
1. `ARCHITECT_LOG.md`: Present at `/Users/ronianb.gica/Projects/rongwaps/ARCHITECT_LOG.md` (137 lines).
2. `docs/team.md`: Present at `/Users/ronianb.gica/Projects/rongwaps/docs/team.md` (196 lines).
3. `docs/PROGRESS_AND_PLANS.md`: Present at `/Users/ronianb.gica/Projects/rongwaps/docs/PROGRESS_AND_PLANS.md` (81 lines).

Furthermore, in `docs/CHANGELOG.md` under `## [1.0.0] - 2026-06-22`, line 45:
```markdown
- Split the monolithic Zustand store into domain-specific stores (useAuthStore, useNavigationStore, useSrsStore, useUiStore, useLibraryStore, useSyncStore).
```
Investigation confirms these 6 store files were created as phantom files, but were never imported by any component; `useAppStore.ts` remained the active monolithic store.

**Action**: Delete `docs/PROGRESS_AND_PLANS.md`, `docs/team.md`, `ARCHITECT_LOG.md`, and delete `docs/CHANGELOG.md` itself as an inaccurate, unmaintained historical artifact.

---

## 3. Analysis of DECISIONS.md (Active vs. Superseded)

`DECISIONS.md` currently contains **29 decisions**. A meticulous audit categorized them into 12 superseded decisions and 17 active decisions.

### Superseded Decisions (Slated for Removal)

1. **`2026-08-07 — Minimal grammar lesson chrome`**: Removed bottom dock and introduced an in-content Learn/Practice rail. Superseded by `2026-08-10 — Simplified linear grammar lesson`.
2. **`2026-08-08 — Grammar workspace alignment polish`**: Polished alignment of the in-content rail that was subsequent deleted. Superseded by `2026-08-10 — Simplified linear grammar lesson`.
3. **`2026-08-08 — Grammar header reuses practice-mode part rail, dock returns`**: Returned `GrammarBottomDock`. Superseded by `2026-08-10 — Simplified linear grammar lesson` which deleted `GrammarBottomDock.tsx`.
4. **`2026-08-09 — Focused grammar workbook`**: Designed symmetrical capsule dock. Superseded by `2026-08-10 — Simplified linear grammar lesson`.
5. **`2026-08-10 — Pattern rows as separate cards`**: Outlined cards per example row. Superseded by `2026-08-10 — Unified grammar pattern table` and `2026-08-27 — Content-driven grammar pattern columns`.
6. **`2026-08-10 — Section-level adaptive pattern columns`**: JS template calculation. Superseded by `2026-08-27 — Content-driven grammar pattern columns` (single shared CSS grid).
7. **`2026-08-10 — Softer grammar pattern table surface (superseded)`**: Explicitly marked superseded in title.
8. **`2026-08-10 — Separate example tables with shared geometry (superseded)`**: Explicitly marked superseded in title.
9. **`2026-08-10 — Unified grammar pattern table`**: Table surface superseded by `2026-08-27 — Content-driven grammar pattern columns`.
10. **`2026-08-10 — Immersive fullscreen book viewer (supersedes the workspace-bounded viewer)`**: Interaction pattern superseded by `2026-08-10 — Reliable book reference viewer`.
11. **`2026-08-25 — Example sentences fill the bottom of the memory hook`**: Placed sentences inside memory hook card. Superseded by `2026-08-25 — Example sentences become their own block with a Show more toggle`.
12. **`2026-08-27 — Slot legend becomes first-row captions`**: Put slot headings inside the first row. Superseded by `2026-08-27 — Separate nowrap slot header`.

### Active Decisions (17 Entries to Preserve)

1. `2026-08-10 — Simplified linear grammar lesson` (Title cleaned of `(supersedes 2026-08-09)`)
2. `2026-08-10 — Slot legend colors are uniform`
3. `2026-08-10 — Reliable book reference viewer` (Title cleaned of `(supersedes auto-hide viewer)`)
4. `2026-08-10 — Grammar-only beta progression`
5. `2026-08-10 — Close on grammar part completion`
6. `2026-08-10 — Temporarily hide pattern exploration`
7. `2026-08-24 — Per-book theme via runtime brand tokens`
8. `2026-08-25 — Rank memory-hook example sentences by character usefulness`
9. `2026-08-25 — Example sentences become their own block with a Show more toggle`
10. `2026-08-26 — Flip no longer relies on backface culling; calmer, magnetic memory-hook popover`
11. `2026-08-26 — Magnetic memory-hook characters in practice mode`
12. `2026-08-26 — Scroll-to-expand flashcard examples`
13. `2026-08-26 — Wide reference-style flashcard sentence stream`
14. `2026-08-27 — Content-driven grammar pattern columns`
15. `2026-08-27 — Separate nowrap slot header` (Title cleaned of `(supersedes first-row captions)`)
16. `2026-08-27 — Wide viewports spread proportionally; table overflow scrolls`
17. `2026-08-28 — Flashcard list mode with per-deck include/exclude curation`

The trimmed `DECISIONS.md` will contain **zero entries marked "superseded"**, zero superseded prototypes, and only active, production-verified decisions arranged in chronological order.

---

## 4. Audit of docs/INDEX.md (Missing Docs & Broken Links)

### Broken & Stale Links in Current `docs/INDEX.md`
- `../AGENTS.md.original.md` (links to stale backup file)
- `../WIDGETS.md.original.md` (links to stale backup file)
- `../ARCHITECT_LOG.md` (links to dead session log)
- `team.md` (links to obsolete agent team doc)
- `PROGRESS_AND_PLANS.md` (links to June 2026 checklist)
- `GRAMMAR_CONVERSATION_QUEST.md` (links to superseded blueprint)
- `WIDGET_ARCHITECTURE_REFACTOR_PLAN.md` (links to completed archival plan)
- `LESSON_9_GRAMMAR_PLAN.md` (links to stale feature plan)
- `../WORK_CONTEXT.md` (links to empty template)
- `../TASK_TEMPLATE.md` (links to empty template)
- `UI_CONSISTENCY_AUDIT.md` (links to point-in-time audit)
- `ROADMAP.md` (links to stale 3-month roadmap)

### Missing Active Documents in Current `docs/INDEX.md`
The current index omits 15 markdown files present in `docs/`:
1. `docs/DESIGN_TOKENS.md` (Core active token system)
2. `docs/AUDIT_2026-08-16.md`
3. `docs/AUDIT_2026-08-24.md`
4. `docs/AUDIT_2026-08-26_dictionary_breakdown_consistency.md`
5. `docs/CHARACTER_BREAKDOWN_HANDOFF.md`
6. `docs/GRAMMAR_EXPERIENCE_PILOTS.md`
7. `docs/GRAMMAR_SCREEN_IMPLEMENTATION_PLAN.md`
8. `docs/GRAMMAR_SCREEN_REVIEW_PLAN.md`
9. `docs/MEMORY_HOOK_BOOK1_PILOT.md`
10. `docs/MEMORY_HOOK_BOOK1_PILOT_RESULTS.md`
11. `docs/MEMORY_HOOK_LABEL_SCENE_SHARED_REPORT.md`
12. `docs/MEMORY_HOOK_METADATA_ENRICHMENT.md`
13. `docs/MEMORY_HOOK_QUALITY_PROPOSAL.md`
14. `docs/OFFICIAL_AUDIO_SOURCES.md`
15. `docs/RONGWAPS_CHARACTER_BIBLE.md`

Rewriting `docs/INDEX.md` will eliminate all broken/stale links and create a tight, 100% accurate map to surviving documentation.

---

## 5. Audit of AGENTS.md vs. Codebase Reality

| AGENTS.md Item | Current Text | Codebase Reality | Discrepancy & Correction |
|---|---|---|---|
| **Mnemonics Documentation** | `consult docs/API_SPEC.md, docs/DATABASE_SCHEMA.md, and src/services/aiService.ts` | `docs/API_SPEC.md` has only 18 lines and strictly covers `/api/audio/*`. `src/services/aiService.ts` is 7 lines (legacy re-export). | **Factual error**. Mnemonics use pack-first/Supabase cached data documented in `docs/DATABASE_SCHEMA.md` and `src/services/mnemonicCache.ts`. Generation is disabled. |
| **Scroll Container Absolutes** | `The shell main is the only workspace scroll container. Do not add nested overflow-y-auto/h-full screen scrollers.` | Modals (`ActivityModalWrapper`), drawers (`BottomDrawer`), book viewer (`BookPageViewer`), and flashcard lists (`FlashcardList`) intentionally use internal scroll containers. | **Contradictory absolute**. Clarify that `main` is the primary screen-level scroll container, while overlays/drawers manage bounded internal scrolling. |
| **Modal Sizing & Exact Pixels** | `lock the container to a consistent fixed height (h-[520px] max-h-[85vh] with internal scroll)... touch targets (min-h-11/h-12)` | Embeds arbitrary pixel values into permanent guidelines, violating the project's own rule against hardcoding magic numbers. | **Hyper-specific detail**. Express the principle (stable modal heights to prevent tab shifts, comfortable touch targets) without magic pixel constants. |
| **Temporary Beta Phrasing** | `currently use Grammar -> next Grammar -> Part complete... practice is temporarily hidden while the beta flow is grammar-only` | Puts transient beta experiment status into durable agent instructions. | **Temporary status bleed**. Keep AGENTS.md focused on durable architectural patterns (source Reading stored once, linear part structure); defer flow rules to `GRAMMAR_LESSON_TEMPLATE.md` and `DECISIONS.md`. |
| **Stale Doc References** | `read docs/GRAMMAR_LESSON_TEMPLATE.md, the relevant grammar plan/source, and DECISIONS.md` | Stale grammar plans (`LESSON_9_GRAMMAR_PLAN.md`, etc.) are being deleted. | **Dead doc reference**. Remove "relevant grammar plan" reference. |
| **Dead Library Reference** | `Screens and widgets must not import Supabase, fetch, Axios, or direct DB clients` | `axios` is completely unused in `src/` and is being removed in R2. | **Dead dependency**. Remove Axios mention; maintain prohibition against direct Supabase/fetch calls from UI. |
| **Store Architecture** | `Use src/store/useAppStore.ts for persisted cross-screen state...` | `useAppStore.ts` (471 lines) is the actual monolithic store. | **Accurate reflection**. Retain this rule, contrasting with the false claim in `CHANGELOG.md`. |

---

## 6. Proposed Surviving Markdown Files (Meeting ≤ 12 Target)

The acceptance criteria specify:
`Total markdown files in root + docs/ combined ≤ 12 (excluding README)`

### Recommended Set: 10 Total Markdown Files (3 Root + 7 docs/)

#### Project Root (3 files, excluding `README.md`):
1. `/AGENTS.md` — Fresh, accurate developer instructions reflecting real conventions.
2. `/DECISIONS.md` — Trimmed record containing only the 17 active decisions.
3. `/WIDGETS.md` — Catalog of reusable shared UI primitives in `src/lib/widgets/`.
*(plus `/README.md` which is explicitly excluded from the count)*

#### `docs/` Directory (7 files):
4. `docs/INDEX.md` — Rewritten documentation directory and routing map.
5. `docs/ARCHITECTURE.md` — System architecture, module boundaries, ESLint import restrictions.
6. `docs/DATABASE_SCHEMA.md` — Supabase database schema, tables, RPCs, pack-first strategy.
7. `docs/DESIGN_TOKENS.md` — Design tokens (border radius, depth, shadows, focus rings, colors).
8. `docs/GRAMMAR_LESSON_TEMPLATE.md` — Authoring rules, contracts, and supported exercises for grammar.
9. `docs/API_SPEC.md` — Express backend media streaming API endpoints (`/api/audio/*`).
10. `docs/COURSE_EXAMPLES.md` — Course example sentence packs, matching logic, and export scripts.

*(Optional 11th file: `docs/OFFICIAL_AUDIO_SOURCES.md` can be preserved if desired to document audio provenance and alignment scripts; 11 ≤ 12).*

### 30 Files to Delete in R1

#### Root deletions (5 files):
- `AGENTS.md.original.md`
- `WIDGETS.md.original.md`
- `ARCHITECT_LOG.md`
- `WORK_CONTEXT.md`
- `TASK_TEMPLATE.md`

#### `docs/` deletions (25 files):
- `docs/AUDIT_2026-08-16.md`
- `docs/AUDIT_2026-08-24.md`
- `docs/AUDIT_2026-08-26_dictionary_breakdown_consistency.md`
- `docs/CHANGELOG.md`
- `docs/CHARACTER_BREAKDOWN_HANDOFF.md`
- `docs/COURSE_EXAMPLE_COVERAGE.md`
- `docs/GRAMMAR_CONVERSATION_QUEST.md`
- `docs/GRAMMAR_EXPERIENCE_PILOTS.md`
- `docs/GRAMMAR_PART_TWO_PLAN.md`
- `docs/GRAMMAR_SCREEN_IMPLEMENTATION_PLAN.md`
- `docs/GRAMMAR_SCREEN_REVIEW_PLAN.md`
- `docs/LESSON_9_GRAMMAR_PLAN.md`
- `docs/MEMORY_HOOK_BOOK1_PILOT.md`
- `docs/MEMORY_HOOK_BOOK1_PILOT_RESULTS.md`
- `docs/MEMORY_HOOK_LABEL_SCENE_SHARED_REPORT.md`
- `docs/MEMORY_HOOK_METADATA_ENRICHMENT.md`
- `docs/MEMORY_HOOK_QUALITY_PROPOSAL.md`
- `docs/PROGRESS_AND_PLANS.md`
- `docs/ROADMAP.md`
- `docs/RONGWAPS_CHARACTER_BIBLE.md`
- `docs/SEARCH_SPEC.md`
- `docs/UI_CONSISTENCY_AUDIT.md`
- `docs/WIDGET_ARCHITECTURE_REFACTOR_PLAN.md`
- `docs/team.md`
- *(and `docs/OFFICIAL_AUDIO_SOURCES.md` if using the 10-file leanest set)*

#### Directory deletions:
- `.hermes/` (including `last-report.md`, `improvement-log.md`)
- `.openai/` (including `hosting.json`)

---

## 7. Draft: Proposed Rewritten AGENTS.md

```markdown
# Prompt/Agent Instructions

Auto-injected each project session. Keep these core rules concise; read the linked docs only when the task needs them.

## Code structure

- Shared UI primitives and patterns used by two or more features live in `src/lib/widgets/`; feature-specific components and containers stay beside their screen under `src/screens/<feature>/`. Cross-screen domain UI reused by multiple screens lives under `src/features/<domain>/`; generic presentation still belongs in `src/lib/widgets/`. Complex logic belongs in hooks; pure helpers in `src/utils/`; static content and types in `src/data/` or `src/types/`.
- Keep screens as small containers: `[hooks/state] -> [derived data] -> [UI]`. Prefer feature folders with `components/`, `hooks/`, `utils/`, and a public `index.ts` as complexity grows.
- Keep `App.tsx` to routing, global shell, and lightweight state. Do not lift complex cross-screen state there.
- Shared DB/API types go in `src/types/database.ts`; domain and UI models go in `src/types/models.ts` (with domain splits such as `grammar.ts` where appropriate).
- Rough size targets: screens/hooks under 250 lines; presentational widgets/helpers under 150. Extract when a file becomes hard to reason about.

## State, data, and security

- Use `src/store/useAppStore.ts` for persisted cross-screen state such as `activeBookId`, `learnedCards`, and `srsData`; keep visual-only state local.
- External fetching belongs in `src/services/`. Screens and widgets must not import Supabase, fetch, or direct database clients; use hooks that call services.
- Reference content follows a **pack-first** strategy (`public/data/...` cached in IndexedDB via `staticContentService`) with database fallbacks.
- Cache high-frequency lookups in memory where useful, such as a `Map` in `src/utils/cache.ts`.
- Mnemonics use pre-cached static/DB data and IDs (`word_{text}` for words, `{char}` for characters); learner-facing generation is disabled. Consult `docs/DATABASE_SCHEMA.md` and `src/services/mnemonicCache.ts` for data contracts.

## UI system

- RongWaps is premium-playful: clear Duolingo-like hierarchy, vivid semantic accents, rounded geometry, and tactile depth only for primary/direct-manipulation actions.
- Reuse existing widgets before creating new buttons, cards, inputs, or modals. Promote a component to `src/lib/widgets/` only when it is prop-driven, presentation-first, and clearly shared (or is an app-wide primitive such as `AppIcon`, a button, header, or dialog). Feature components may own feature hooks/services; shared widgets should not own app fetching or global feature state. Document only stable public widgets in `WIDGETS.md`, with props and one usage example.
- Use `ActionButton`, `IconActionButton`, and `SegmentedControl` for shared action patterns. Keep utility actions quiet; use one dominant primary action per surface.
- Functional icons go through semantic `AppIcon` using the approved Phosphor family. Do not introduce competing icon families or platform flag emoji; use `CountryFlag`.
- Use semantic tokens, never hardcoded neutral colors: `ui-border`, `ui-divider`, `ui-muted`, `ui-ink`, `ui-canvas`, `ui-surface`, `brand-*`, and `feedback-*`. Do not use hardcoded hex values (`#FFF`, `#E5E5E5`) or arbitrary pixel values (`rounded-[14px]`). See `docs/DESIGN_TOKENS.md` for the full scale.
- Use the standard `.focus-ring` (or `.focus-ring-inline`) class instead of manual ring utilities.
- Use `font-sans` for UI copy and `font-chinese` for Chinese glyphs. Never hardcode font families; keep normal letter spacing except short uppercase labels.
- Do not put tactile buttons inside tactile containers or use card depth on plain page sections. Use the borderless bottom-edge tactile pattern (`border-b-[length:var(--depth-sm)] active:border-b-0 active:translate-y-[length:var(--depth-sm)]`) for interactive surfaces. Preserve accessibility labels, reduced motion, loading/empty/error states, and long-text behavior.
- Keep settings panels and control popovers minimal, tactile, and uncluttered: prefer direct label-and-control pairs without redundant explanatory body copy, and use quiet category labels (`text-xs font-black uppercase tracking-wider text-ui-muted-strong`) over heavy section banners.

## Layout and responsive behavior

- RongWaps is mobile-first. Validate substantial UI work at mobile and desktop sizes.
- The shell `main` is the primary screen-level scroll container. Avoid accidental nested screen scrollers, while bounded overlays (dialogs, drawers, book viewer, popovers) manage their own internal scrolling.
- Top-level workspace headers use the canonical sticky fade: `sticky top-0 z-40 bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent backdrop-blur-[2px]`.
- Desktop Books keeps permanent side navigation. Other top-level workspaces may hide it and show a quiet restore control. Mobile uses the closable drawer and compact `MainHeader`.
- Full-screen study windows, drawers, settings, dictionary views, and overlays stay inside the desktop workspace and use the shared `workspace-window` bounds; mobile may use the full viewport.
- Dialog sizing & tab stability: Ensure comfortable touch targets on mobile. In multi-tab modals and settings panels, embed segmented tab controls directly in the header bar to avoid stacked chrome, and use stable container heights with internal scroll so switching tabs does not cause vertical layout shifts.

## Backend and server

- The Express backend server lives in `server/` and provides media streaming endpoints (e.g. `/api/audio/*`). Keep backend code strictly isolated from the client React application in `src/`.

## Grammar and feature-specific guidance

- Grammar is source-first and reading-centered: keep the source Reading stored once and group its grammar points in the same Part.
- For grammar architecture, content contracts, and authoring rules, consult `docs/GRAMMAR_LESSON_TEMPLATE.md` and active decisions in `DECISIONS.md` before modifying grammar screens or lesson data.
- For other feature-specific work, inspect the relevant document in `docs/` instead of expanding this file with a permanent rule.

## Documentation and judgment

- Add a project-wide user rule here only when it is genuinely durable. Update `WIDGETS.md` when adding a reusable widget. Keep docs and code aligned.
- Prefer the simplest structure that meets the current requirement. Reuse or consolidate before adding abstractions, configuration, or dependencies. Flag only real trade-offs; never remove required validation, security, accessibility, or error handling.
```

---

## 8. Draft: Proposed Rewritten docs/INDEX.md

```markdown
# RongWaps Docs Index

Use this file to locate active system documentation. All listed documents are actively maintained and accurately reflect current application behavior, schema, or conventions.

## Read First & Core Directives

- `../AGENTS.md` — Core instructions, architecture boundaries, and conventions for coding agents.
- `../README.md` — Project overview, architecture summary, and local development commands.
- `../DECISIONS.md` — Active architectural, interaction, and design decisions that must remain stable.

## Architecture & Data Contracts

- `ARCHITECTURE.md` — Source folder layout, module boundaries, ESLint import restrictions, and component ownership.
- `DATABASE_SCHEMA.md` — Supabase database schema, tables, RPCs, RLS policies, and pack-first fetch paths.
- `DESIGN_TOKENS.md` — Semantic design tokens (border radius, tactile depth, ambient shadows, focus rings, and colors).
- `API_SPEC.md` — Express backend API specification for media streaming proxy endpoints (`/api/audio/*`).

## Curriculum & Feature Specifications

- `GRAMMAR_LESSON_TEMPLATE.md` — Specification for interactive grammar lessons, data contracts, supported exercises, and plain-English guidelines.
- `COURSE_EXAMPLES.md` — Specification for course example sentence packs, runtime matching, and OCR export workflow.
- `../WIDGETS.md` — Public shared widget catalog mirroring `src/lib/widgets/index.ts`.
- `OFFICIAL_AUDIO_SOURCES.md` — Modern Chinese official audio sources, track mapping (`B1-LL-P-T`), karaoke alignment pipeline, and audio caching.

## Task Routing

| Task | Read |
| --- | --- |
| Any code change | `../AGENTS.md`, relevant feature code |
| Shared UI / reusable widgets | `../WIDGETS.md`, `DESIGN_TOKENS.md`, `src/lib/widgets/` |
| UI styling & tokens | `DESIGN_TOKENS.md`, `src/index.css` |
| Grammar lessons | `GRAMMAR_LESSON_TEMPLATE.md`, `../DECISIONS.md`, `src/screens/grammar-lesson/` |
| Data model or Supabase RPC | `DATABASE_SCHEMA.md`, `src/services/`, `src/types/database.ts` |
| Flashcard examples & matching | `COURSE_EXAMPLES.md`, `src/services/courseExamplePackService.ts` |
| Audio & karaoke alignment | `OFFICIAL_AUDIO_SOURCES.md`, `API_SPEC.md`, `src/services/audioService.ts` |
| Architectural boundary changes | `ARCHITECTURE.md`, `../AGENTS.md`, `../DECISIONS.md` |
```

---

## 9. Draft: Proposed Trimmed DECISIONS.md

```markdown
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
```

---

## 10. Verification Commands & Acceptance Check

Downstream agents executing the cleanup can verify their work with the following commands:

```bash
# 1. Verify total markdown files in root + docs/ <= 12 (excluding README)
python3 -c "
import os
root = [f for f in os.listdir('.') if f.endswith('.md') and f != 'README.md']
docs = [f for f in os.listdir('docs') if f.endswith('.md')]
print(f'Root files ({len(root)}):', root)
print(f'Docs files ({len(docs)}):', docs)
total = len(root) + len(docs)
print(f'Total markdown files (excl README): {total}')
assert total <= 12, f'Expected <= 12, found {total}'
"

# 2. Verify zero .original.md backup files exist anywhere
find . -name "*.original.md" -not -path "*/node_modules/*" -not -path "*/.git/*"

# 3. Verify .hermes and .openai directories are gone
test ! -d .hermes && test ! -d .openai && echo "Directories removed successfully"

# 4. Verify DECISIONS.md has zero entries marked "superseded"
grep -in "supersed" DECISIONS.md || echo "Zero superseded entries found"

# 5. Verify all links in docs/INDEX.md resolve to existing files
python3 -c "
import os, re
with open('docs/INDEX.md') as f:
    content = f.read()
links = re.findall(r'\[.*?\]\((.*?\.md)\)|`(\.\./.*?\.md|[a-zA-Z0-9_-]+\.md)`', content)
for l in links:
    path = l[0] or l[1]
    full = os.path.normpath(os.path.join('docs', path))
    assert os.path.exists(full), f'Broken link in docs/INDEX.md: {path} -> {full}'
print('All links in docs/INDEX.md are valid!')
"

# 6. Verify full test suite, lesson content validation, and build
npm test
npm run content:validate
npm run lint
npm run build
```
