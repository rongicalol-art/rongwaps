# Handoff Report — explorer_survey_1

**Date**: 2026-09-04T15:42:00Z  
**Agent**: `explorer_survey_1`  
**Parent Conversation ID**: `3c2faab7-8d44-4972-82e9-ff93d6a3845b`  
**Mission**: Investigation and planning for Requirement 1 (Documentation nuclear cleanup) and Requirement 3 (AGENTS.md rewrite).

---

## 1. Observation

Direct observations from tool executions and codebase inspection:

1. **Total Markdown Files**:
   - Running Python cataloging across the repository revealed **41 markdown files** (9 in project root, 32 in `docs/`), comprising 6,394 lines:
     - Root: `AGENTS.md` (50), `AGENTS.md.original.md` (154), `ARCHITECT_LOG.md` (137), `DECISIONS.md` (219), `README.md` (102), `TASK_TEMPLATE.md` (25), `WIDGETS.md` (153), `WIDGETS.md.original.md` (474), `WORK_CONTEXT.md` (27).
     - `docs/`: 32 files including completed plans (`WIDGET_ARCHITECTURE_REFACTOR_PLAN.md` with 726 lines, `GRAMMAR_SCREEN_REVIEW_PLAN.md` with 400 lines), 5 memory-hook pilot docs (683 lines total), 4 point-in-time audit files (445 lines), and obsolete templates.
   - Running directory inspection revealed 2 additional markdown files in `.hermes/` (`last-report.md` [21 lines], `improvement-log.md` [15 lines]), and 1 JSON file in `.openai/` (`hosting.json`).
   - Binary/data assets in `docs/`: `audio_index_book1.json` (6,325 bytes) and `audio_manifest_book1.json` (4,524 bytes).

2. **Backup Files (`.original.md`)**:
   - `find . -name "*.original.md"` identified exactly two files:
     - `/Users/ronianb.gica/Projects/rongwaps/AGENTS.md.original.md`
     - `/Users/ronianb.gica/Projects/rongwaps/WIDGETS.md.original.md`

3. **Verbatim Claims in `docs/CHANGELOG.md`**:
   - Under `## [1.1.0] - 2026-07-10`, line 39 verbatim:
     `Deleted obsolete markdown files (docs/PROGRESS_AND_PLANS.md, docs/team.md, ARCHITECT_LOG.md).`
   - Direct filesystem inspection confirmed:
     - `/Users/ronianb.gica/Projects/rongwaps/ARCHITECT_LOG.md` exists (137 lines).
     - `/Users/ronianb.gica/Projects/rongwaps/docs/team.md` exists (196 lines).
     - `/Users/ronianb.gica/Projects/rongwaps/docs/PROGRESS_AND_PLANS.md` exists (81 lines).
   - Under `## [1.0.0] - 2026-06-22`, line 45 verbatim:
     `Split the monolithic Zustand store into domain-specific stores (useAuthStore, useNavigationStore, useSrsStore, useUiStore, useLibraryStore, useSyncStore).`
     Code inspection confirmed `src/store/useAppStore.ts` (471 lines) remained the actual monolithic store, and none of those 6 domain stores were imported by any component.

4. **Structure of `DECISIONS.md`**:
   - Contains 29 recorded decisions.
   - Parsing headings found 6 entries containing `(superseded)` or `(supersedes ...)` in their title:
     - `2026-08-10 — Simplified linear grammar lesson (supersedes 2026-08-09)`
     - `2026-08-10 — Softer grammar pattern table surface (superseded)`
     - `2026-08-10 — Separate example tables with shared geometry (superseded)`
     - `2026-08-10 — Immersive fullscreen book viewer (supersedes the workspace-bounded viewer)`
     - `2026-08-10 — Reliable book reference viewer (supersedes auto-hide viewer)`
     - `2026-08-27 — Separate nowrap slot header (supersedes first-row captions)`
   - 6 additional decisions represent prior intermediate iterations superseded by subsequent entries (`2026-08-07 Minimal grammar lesson chrome`, `2026-08-08 Grammar workspace alignment polish`, `2026-08-08 Grammar header reuses practice-mode part rail, dock returns`, `2026-08-09 Focused grammar workbook`, `2026-08-10 Pattern rows as separate cards`, `2026-08-25 Example sentences fill the bottom of the memory hook`).
   - Exactly 17 decisions are active and represent current production behavior.

5. **Structure and Links of `docs/INDEX.md`**:
   - `docs/INDEX.md` references 12 files that are either stale, completed plans, empty templates, backups, or claimed deleted: `../AGENTS.md.original.md`, `../WIDGETS.md.original.md`, `../ARCHITECT_LOG.md`, `team.md`, `PROGRESS_AND_PLANS.md`, `GRAMMAR_CONVERSATION_QUEST.md`, `WIDGET_ARCHITECTURE_REFACTOR_PLAN.md`, `LESSON_9_GRAMMAR_PLAN.md`, `../WORK_CONTEXT.md`, `../TASK_TEMPLATE.md`, `UI_CONSISTENCY_AUDIT.md`, `ROADMAP.md`.
   - `docs/INDEX.md` completely omits 15 existing markdown files in `docs/`: `DESIGN_TOKENS.md`, `AUDIT_2026-08-16.md`, `AUDIT_2026-08-24.md`, `AUDIT_2026-08-26_dictionary_breakdown_consistency.md`, `CHARACTER_BREAKDOWN_HANDOFF.md`, `GRAMMAR_EXPERIENCE_PILOTS.md`, `GRAMMAR_SCREEN_IMPLEMENTATION_PLAN.md`, `GRAMMAR_SCREEN_REVIEW_PLAN.md`, `MEMORY_HOOK_BOOK1_PILOT.md`, `MEMORY_HOOK_BOOK1_PILOT_RESULTS.md`, `MEMORY_HOOK_LABEL_SCENE_SHARED_REPORT.md`, `MEMORY_HOOK_METADATA_ENRICHMENT.md`, `MEMORY_HOOK_QUALITY_PROPOSAL.md`, `OFFICIAL_AUDIO_SOURCES.md`, `RONGWAPS_CHARACTER_BIBLE.md`.

6. **Inaccuracies in `AGENTS.md`**:
   - Line 18 states: `Mnemonics use the existing DB/API flow and IDs... consult docs/API_SPEC.md, docs/DATABASE_SCHEMA.md, and src/services/aiService.ts for implementation details.`
     Direct check of `docs/API_SPEC.md` shows it has 18 lines and strictly specifies `/api/audio/*` with zero mention of mnemonics. Direct check of `src/services/aiService.ts` shows it is 7 lines and merely re-exports from `mnemonicCache.ts`.
   - Line 35 states: `The shell main is the only workspace scroll container. Do not add nested overflow-y-auto/h-full screen scrollers.`
     Direct check of components shows modals (`ActivityModalWrapper`), bottom drawers (`BottomDrawer`), book viewer (`BookPageViewer`), and lists (`FlashcardList`) legitimately use internal scrolling; line 39 in `AGENTS.md` itself explicitly directs developers to `lock the container to a consistent fixed height (h-[520px] max-h-[85vh] with internal scroll)`.
   - Line 39 specifies hardcoded pixel sizes: `(min-h-11/h-12)` and `(h-[520px] max-h-[85vh])`.
   - Line 43 specifies transient beta state: `currently use Grammar -> next Grammar -> Part complete... learner-facing practice is temporarily hidden while the beta flow is grammar-only`.
   - Line 44 references: `the relevant grammar plan/source`, which are stale planning docs slated for deletion.

7. **Build and Test Baselines**:
   - `npm test`: 301 passed, 0 failed.
   - `npm run content:validate`: "Interactive lesson content valid." (exit 0).
   - `npm run lint`: 0 errors, 0 warnings (exit 0).
   - `npm run build`: built in 3.00s, `dist/server.js` generated (exit 0).

---

## 2. Logic Chain

1. **Derivation of Target Count (≤ 12 Markdown Files)**:
   - Observation 1 establishes that 41 markdown files currently exist in root + `docs/`.
   - The Acceptance Criteria require: `Total markdown files in root + docs/ combined ≤ 12 (excluding README)`.
   - In root, exactly 3 markdown files are durable and active: `AGENTS.md`, `DECISIONS.md`, and `WIDGETS.md` (`README.md` is preserved but excluded from the count).
   - Therefore, `docs/` can accommodate up to 12 - 3 = 9 markdown files.
   - Evaluating all 32 files in `docs/`:
     - 7 core reference docs are indispensable: `INDEX.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `DESIGN_TOKENS.md`, `GRAMMAR_LESSON_TEMPLATE.md`, `API_SPEC.md`, `COURSE_EXAMPLES.md`.
     - 1 additional doc, `OFFICIAL_AUDIO_SOURCES.md`, documents real audio files and alignment scripts.
     - Total surviving files: 3 in root + 7 in docs = **10 files** (or **11 files** including `OFFICIAL_AUDIO_SOURCES.md`). Both configurations satisfy ≤ 12.
     - Exactly 30 files are identified as dead, completed, superseded, or point-in-time audits, and can be deleted with zero application impact.

2. **Resolution of Fictitious Deletions and Stale Artifacts**:
   - Observation 3 proves that `docs/PROGRESS_AND_PLANS.md`, `docs/team.md`, and `ARCHITECT_LOG.md` were never actually deleted despite claims in `CHANGELOG.md`.
   - Because none of these files are referenced by application source code or build scripts (verified by grep across all `.ts`, `.tsx`, `.json`, `.mjs`), deleting them fulfills the acceptance criteria without breaking any feature.
   - Observation 2 proves `.original.md` files are exact backups of earlier versions of `AGENTS.md` and `WIDGETS.md`. Deleting them leaves only canonical documents.
   - Observation 1 proves `.hermes/` and `.openai/` contain only agent tool outputs and obsolete configs. Deleting them removes dead metadata.

3. **Purification of `DECISIONS.md`**:
   - Observation 4 identifies 12 superseded decisions and 17 active decisions.
   - Removing the 12 superseded entries and stripping the `(supersedes ...)` titles from active decisions produces a clean file where `grep -in "supersed"` returns zero matches, directly meeting acceptance criteria.

4. **Rebuilding `docs/INDEX.md` and `AGENTS.md`**:
   - Observations 5 and 6 demonstrate that both files suffered from severe drift, referencing deleted files and containing false factual claims.
   - Rewriting `docs/INDEX.md` to map strictly to the surviving 10 (or 11) files eliminates all broken links.
   - Rewriting `AGENTS.md` removes the false mnemonics claim, fixes the scroll container absolute, removes magic pixel constants, and eliminates transient beta flow copy.

---

## 3. Caveats

- **Character Bible**: `docs/RONGWAPS_CHARACTER_BIBLE.md` contains narrative profiles for story dialogue characters. It is not currently imported by code, but provides narrative context. If desired by the user in the future, it can be maintained in an offline design repo; for repository cleanup, it is classified for deletion to keep documentation lean.
- **Search Spec vs. Database Schema**: `docs/SEARCH_SPEC.md` was an early blueprint suggesting a client-trie architecture that was subsequently removed in migration `20260827000000_data_cleanup.sql` (as recorded in `DATABASE_SCHEMA.md`). The live database search RPC is already documented in `docs/DATABASE_SCHEMA.md`. Deleting `docs/SEARCH_SPEC.md` eliminates contradictory architecture advice.
- **Audio Sources Doc**: If `docs/OFFICIAL_AUDIO_SOURCES.md` is retained, the count is 11 files (≤ 12). If deleted, the count is 10 files (≤ 12). Both are fully compliant; the survey report provides draft indexes for both.

---

## 4. Conclusion

1. **Requirement 1 (R1) is fully mapped and planned**:
   - Delete 30 markdown files across root and `docs/`.
   - Delete `.hermes/` and `.openai/` directories.
   - Retain 10 (or 11) active markdown files (plus `README.md`).
   - Preserve `audio_index_book1.json` and `audio_manifest_book1.json`.
   - Trim `DECISIONS.md` to the 17 active decisions (zero superseded entries).
   - Rewrite `docs/INDEX.md` to accurately index only surviving documents.

2. **Requirement 3 (R3) is fully drafted**:
   - Full proposed text for `AGENTS.md` is provided in `survey_report.md`.
   - References to deleted docs, magic pixel values, false mnemonics references, and contradictory scroll absolutes have been removed.

---

## 5. Verification Method

Downstream implementers can independently verify compliance using the following checks:

1. **Verify Markdown File Count (≤ 12 excluding README)**:
   ```bash
   python3 -c "
   import os
   root = [f for f in os.listdir('.') if f.endswith('.md') and f != 'README.md']
   docs = [f for f in os.listdir('docs') if f.endswith('.md')]
   total = len(root) + len(docs)
   print(f'Total: {total}')
   assert total <= 12, f'Expected <= 12, found {total}'
   "
   ```

2. **Verify Backup and Hidden Directories Removed**:
   ```bash
   test $(find . -name "*.original.md" -not -path "*/node_modules/*" | wc -l) -eq 0
   test ! -d .hermes && test ! -d .openai
   ```

3. **Verify Zero Superseded Decisions**:
   ```bash
   ! grep -i "supersed" DECISIONS.md
   ```

4. **Verify All Links in docs/INDEX.md**:
   ```bash
   python3 -c "
   import os, re
   with open('docs/INDEX.md') as f:
       content = f.read()
   links = re.findall(r'`(\.\./.*?\.md|[a-zA-Z0-9_-]+\.md)`', content)
   for l in links:
       p = os.path.normpath(os.path.join('docs', l))
       assert os.path.exists(p), f'Missing: {p}'
   print('All links valid!')
   "
   ```

5. **Verify Full Test and Build Suite**:
   ```bash
   npm test
   npm run content:validate
   npm run lint
   npm run build
   ```
