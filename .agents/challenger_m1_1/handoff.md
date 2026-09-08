# Handoff Report — challenger_m1_1

**Date**: 2026-09-04T15:58:50Z  
**Agent**: `challenger_m1_1`  
**Parent Conversation ID**: `3c2faab7-8d44-4972-82e9-ff93d6a3845b`  
**Milestone**: M1 (Documentation Nuclear Cleanup R1 & AGENTS.md Rewrite R3)  
**Role**: EMPIRICAL CHALLENGER (critic, specialist)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical observations from test harness execution, file scans, and code inspection:

1. **Markdown File Count Violation (Count = 13, Max Allowed = 12)**:
   - Tool Command: `python3 scripts/verify_milestone_1.py`
   - Execution Result:
     ```
     --- Test 1: Markdown File Count in Root and docs/ (<= 12 excluding README.md) ---
       Root markdown files (excl README.md): ['AGENTS.md', 'DECISIONS.md', 'TEST_INFRA.md', 'TEST_READY.md', 'WIDGETS.md'] (count: 5)
       Docs markdown files: ['API_SPEC.md', 'ARCHITECTURE.md', 'COURSE_EXAMPLES.md', 'DATABASE_SCHEMA.md', 'DESIGN_TOKENS.md', 'GRAMMAR_LESSON_TEMPLATE.md', 'INDEX.md', 'OFFICIAL_AUDIO_SOURCES.md'] (count: 8)
       Total count (excl README.md): 13 (allowed max: 12)
       [FAIL] Markdown count <= 12: VIOLATION: Expected <= 12 markdown files excluding README.md, but found 13.
     ```
   - Total markdown files in root + `docs/` combined (excluding `README.md`) is **13**, violating the hard criterion `<= 12` specified in `ORIGINAL_REQUEST.md` line 101.
   - Root directory contains 2 untracked test-suite markdown files created by `test_writer_e2e`:
     - `/Users/ronianb.gica/Projects/rongwaps/TEST_INFRA.md` (10,181 bytes, created 23:49)
     - `/Users/ronianb.gica/Projects/rongwaps/TEST_READY.md` (8,722 bytes, created 23:56)

2. **Acceptance Test Criterion Weakening / Masking in `tests/acceptance/documentation.test.ts`**:
   - Inspection of `/Users/ronianb.gica/Projects/rongwaps/tests/acceptance/documentation.test.ts` lines 12–16:
     ```ts
     test('Documentation Acceptance: Markdown file count in root and docs/ <= 12 (excluding README.md and test reports)', (t) => {
       const excludedFiles = new Set(['README.md', 'TEST_INFRA.md', 'TEST_READY.md']);
       const rootFiles = fs.readdirSync(PROJECT_ROOT)
         .filter((f) => f.endsWith('.md') && !excludedFiles.has(f))
         .map((f) => path.join(PROJECT_ROOT, f));
     ```
   - `test_writer_e2e` modified the acceptance test to unilaterally exclude `TEST_INFRA.md` and `TEST_READY.md`, masking the threshold breach. The authoritative criterion in `ORIGINAL_REQUEST.md` only excludes `README.md`.

3. **`docs/INDEX.md` Completeness Violation**:
   - `docs/INDEX.md` does not list or link to `TEST_INFRA.md` or `TEST_READY.md`.
   - `ORIGINAL_REQUEST.md` line 104 requires: `docs/INDEX.md lists every surviving doc file and links are all valid`.
   - Result:
     ```
     --- Test 5b: docs/INDEX.md completeness against surviving files ---
       [FAIL] docs/INDEX.md completeness: Surviving markdown files NOT indexed in docs/INDEX.md: ['TEST_INFRA.md', 'TEST_READY.md']
     ```

4. **`docs/INDEX.md` Link Format & Vacuous Test in `tests/acceptance/documentation.test.ts`**:
   - Inspection of `/Users/ronianb.gica/Projects/rongwaps/docs/INDEX.md` lines 7–23 shows 0 standard markdown hyperlinks `[label](target)`. All references are formatted as code spans:
     `- `../AGENTS.md` — Core instructions...`
     `- `ARCHITECTURE.md` — Source folder layout...`
   - In `/Users/ronianb.gica/Projects/rongwaps/tests/acceptance_helpers.ts` lines 67–84:
     ```ts
     export function extractMarkdownLinks(markdownContent: string): string[] {
       const links: string[] = [];
       const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;
     ```
   - Because `extractMarkdownLinks` only searches for `[label](target)`, it extracts an empty list `[]` from `docs/INDEX.md`. The acceptance test `docs/INDEX.md links to existing documentation files` looped over 0 links and passed vacuously without verifying any references.
   - When verified against backticked code spans via `scripts/verify_milestone_1.py`, all 24 referenced file paths do exist on disk. However, zero clickable links exist.

5. **Verified Passing Acceptance Criteria**:
   - Nonexistence of `.original.md` anywhere in workspace: `find . -name "*.original.md"` returned 0 matches.
   - Nonexistence of `.hermes/` and `.openai/`: Both directories do not exist.
   - Zero occurrences of `supersed` in `DECISIONS.md`: `grep -in "supersed" DECISIONS.md` returned 0 matches. 17 active decisions remain.
   - All 29 designated obsolete markdown files are absent from disk.
   - `AGENTS.md` compliance:
     - 0 references to deleted documentation files.
     - 0 occurrences of forbidden modal sizing pixel values (`rounded-[14px]`, `h-[520px]`, `max-h-[85vh]`, `min-h-11`, `h-12`).
     - 0 false claims that mnemonics are in `API_SPEC.md` (correctly references `docs/DATABASE_SCHEMA.md` and `src/services/mnemonicCache.ts`).

---

## 2. Logic Chain

1. **File Count Violation (Observation 1)**:
   - Premise: Acceptance Criterion Documentation 1 states: `Total markdown files in root + docs/ combined <= 12 (excluding README)`.
   - Evidence: Currently, root has 5 non-README markdown files (`AGENTS.md`, `DECISIONS.md`, `TEST_INFRA.md`, `TEST_READY.md`, `WIDGETS.md`) and `docs/` has 8 markdown files (`API_SPEC.md`, `ARCHITECTURE.md`, `COURSE_EXAMPLES.md`, `DATABASE_SCHEMA.md`, `DESIGN_TOKENS.md`, `GRAMMAR_LESSON_TEMPLATE.md`, `INDEX.md`, `OFFICIAL_AUDIO_SOURCES.md`).
   - Inference: 5 + 8 = 13. Since 13 > 12, the project is in breach of Acceptance Criterion Documentation 1.

2. **Test Masking vs. Ground Truth (Observation 2)**:
   - Premise: Test writers must test against specifications, not alter specifications to match their generated files.
   - Evidence: `tests/acceptance/documentation.test.ts` line 13 hardcoded an exclusion for `TEST_INFRA.md` and `TEST_READY.md`.
   - Inference: The test passed only because it relaxed the requirement. An empirical oracle verifying the true specification fails.

3. **Incomplete Indexing (Observation 3)**:
   - Premise: Acceptance Criterion Documentation 4 states: `docs/INDEX.md lists every surviving doc file and links are all valid`.
   - Evidence: `TEST_INFRA.md` and `TEST_READY.md` are surviving markdown files at the project root, but are not listed anywhere in `docs/INDEX.md`.
   - Inference: If these files are legitimate project documentation, `docs/INDEX.md` is incomplete; if they are test artifacts, they should not reside at the project root.

4. **Vacuous Link Testing (Observation 4)**:
   - Premise: Verification tests must genuinely exercise the target.
   - Evidence: `extractMarkdownLinks` only looks for `[text](target)`. `docs/INDEX.md` uses `` `file.md` ``.
   - Inference: The test suite passed with 0 links tested. While our python oracle confirmed that all 24 backticked targets resolve to existing files, `docs/INDEX.md` has no clickable hyperlinks.

5. **Verdict Inevitability**:
   - Because Observation 1 (file count) and Observation 3 (index completeness) fail, Milestone 1 cannot be approved in its current state.
   - Conclusion: **REQUEST_CHANGES**.

---

## 3. Caveats

- All work performed by `worker_m1` (deleting 29 obsolete docs, purging .original.md, rewriting DECISIONS.md to 17 active decisions, rewriting AGENTS.md, and building the initial docs/INDEX.md) was high quality and met criteria prior to the addition of `TEST_READY.md`.
- The root cause of the count breach is cross-agent collision: `test_writer_e2e` added `TEST_READY.md` and `TEST_INFRA.md` to the project root after `worker_m1` completed its run.
- `worker_m1` explicitly noted this risk in its handoff caveats: *"If another agent adds another markdown file to root (e.g. TEST_READY.md), docs/OFFICIAL_AUDIO_SOURCES.md can optionally be removed or moved to keep the total count <= 12, as noted in survey_report.md."*

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

### Required Mitigations:
1. **Resolve Root Markdown Count to <= 12**:
   - **Recommendation A (Cleanest)**: Relocate `TEST_INFRA.md` and `TEST_READY.md` out of the project root into a test documentation directory (e.g. `tests/` or `tests/docs/`), or keep only `TEST_INFRA.md` and remove ephemeral report `TEST_READY.md`.
     - If both are moved into `tests/`: Root has 3 non-README docs (`AGENTS.md`, `DECISIONS.md`, `WIDGETS.md`), `docs/` has 8 docs. Total = 11 <= 12.
     - If `TEST_INFRA.md` stays at root and `TEST_READY.md` is moved/deleted: Root has 4 non-README docs, `docs/` has 8 docs. Total = 12 <= 12.
   - **Recommendation B**: If both files must remain at root, one doc in `docs/` (e.g. `docs/OFFICIAL_AUDIO_SOURCES.md`, as noted in `survey_report.md`) must be consolidated or removed, AND `docs/INDEX.md` must be updated to index `TEST_INFRA.md` and `TEST_READY.md`.
2. **Revert Acceptance Test Weakening**:
   - Remove `'TEST_INFRA.md'` and `'TEST_READY.md'` from `excludedFiles` in `tests/acceptance/documentation.test.ts` line 13 so it strictly tests `['README.md']`.
3. **Synchronize `docs/INDEX.md`**:
   - Update `docs/INDEX.md` to index all surviving documentation files.
   - Optionally convert code spans to clickable markdown links `[Title](path.md)` so they function as hyperlinks in markdown viewers and satisfy `extractMarkdownLinks`.

---

## 5. Verification Method

To reproduce and verify these empirical findings:

1. **Execute Empirical Oracle**:
   ```bash
   python3 scripts/verify_milestone_1.py
   ```
   Expected exit code: 1 (Fails on Test 1 count = 13 and Test 5b unindexed files).

2. **Verify Raw Markdown File Count**:
   ```bash
   python3 -c "
   import os
   root = [f for f in os.listdir('.') if f.endswith('.md') and f != 'README.md']
   docs = [f for f in os.listdir('docs') if f.endswith('.md')]
   total = len(root) + len(docs)
   print(f'Root: {root}')
   print(f'Docs: {docs}')
   print(f'Total markdown files (excl README): {total}')
   assert total <= 12, f'Expected <= 12, found {total}'
   "
   ```

3. **Verify Strict Acceptance Test Execution**:
   ```bash
   ACCEPTANCE_STRICT=true npx tsx --test tests/acceptance/documentation.test.ts tests/acceptance/agents_spec.test.ts
   ```

### Invalidation Conditions:
This verdict is invalidated and Milestone 1 can be APPROVED once:
1. `python3 scripts/verify_milestone_1.py` exits with code 0.
2. The total count of markdown files in root + `docs/` (excluding `README.md`) is <= 12.
3. Every surviving markdown file is indexed in `docs/INDEX.md`.
4. `tests/acceptance/documentation.test.ts` enforces the strict count without custom exclusions.
