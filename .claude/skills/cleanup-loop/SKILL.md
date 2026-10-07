---
name: cleanup-loop
description: Autonomous code-reduction loop for Ron's Mandarin — finds the best ways to DELETE lines (duplication, dead code, over-engineering, UI inconsistencies solved by reuse) and lands ONE verified, net-negative commit per iteration. Run as `/loop /cleanup-loop`; continues until the owner says "done".
---

# Cleanup loop

**Goal: fewer lines of code, same behavior.** Every iteration must land a commit with a **net-negative line count** (`git diff --cached --shortstat` deletions > insertions), verified and logged. Splitting a file, moving code around, or adding abstractions does NOT count as progress unless the total shrinks. Bug fixes found along the way are the only exception (log them, keep them tiny). Never batch unrelated fixes.

**Scope = shipped code only: `src/` and `server/`** (`.ts .tsx .css`), excluding `src/data/` content tables. Baseline: `git ls-files src server | grep -E '\.(tsx?|css)$' | grep -v '^src/data/' | xargs wc -l 2>/dev/null | tail -1`.
- `scripts/` — off-limits. Not deployed, but needed to regenerate `public/data/` packs.
- `tests/` — the loop's safety net. Don't trim them; only delete tests for code you deleted, and update tests when a refactor renames what they import.
- Audits (§2) scan only `src/` and `server/`.

Never ask questions mid-loop — the owner is away; anything that needs a decision goes to the "Needs owner" queue and you move on.

State lives in `.audit/cleanup-loop/` (gitignored scratch, the loop's memory between iterations):
- `LEDGER.md` — backlog (ranked), done log, needs-owner queue, skipped.
- `REPORT.md` — the human-readable rolling report the owner reads when back.

## 0. Every iteration starts here

1. If the owner said "done"/"stop": write the final summary to `REPORT.md` (see §6), stop the loop (`ScheduleWakeup` with `stop: true`), reply in ≤5 lines.
2. `git status --short` and `git branch --show-current`.
   - **First iteration** (no `LEDGER.md`): working tree must be clean. If dirty → write "Commit or stash your current work, then rerun `/loop /cleanup-loop`" to `REPORT.md`, stop the loop. If clean → `git checkout -b chore/cleanup-loop-<YYYY-MM-DD>`, create `LEDGER.md` + `REPORT.md` from the templates in §7, record the baseline LOC, then **copy every `- [ ]` item from [PLAN.md](PLAN.md) into the Backlog in the same order** (keep the W-ids). Do not run audits yet.
   - **Later iterations**: must be on the `chore/cleanup-loop-*` branch. If the tree is dirty from a previous failed iteration → `git stash push -m "cleanup-loop abandoned"`, log it under Skipped, continue.
3. Read `LEDGER.md`. Only once every PLAN.md item is done/skipped: if the backlog has < 3 open items, run the next audit pass in rotation (§2) before picking.

## 1. Pick

**While PLAN.md items remain, take the next one in plan order** (waves are ordered by safety; within a wave, by yield). Read its notes in PLAN.md before starting. After that, take the open backlog item with the **largest estimated net lines removed** (every backlog line carries `~-N`). Ties → lower risk first. Highest-yield patterns, roughly in order:
1. **Dead code**: unused files, exports, components, props, branches, feature flags, debug leftovers, commented-out code, unused CSS classes, stale tests for deleted code. (Use `npx -y knip@5 --config .claude/skills/cleanup-loop/knip.json --no-progress --no-exit-code` read-only for candidates; verify each with grep — do NOT add them as dependencies.)
2. **Duplication collapsed**: 2+ near-identical components/hooks/functions/services → one; copy-pasted JSX → `.map()` over data; parallel switch/if chains → lookup table.
3. **Reuse existing widgets/utils**: hand-rolled buttons, headers, modals, empty/loading states, formatters replaced by `src/lib/widgets/` or existing utils (this also fixes UI inconsistency — two wins).
4. **Over-engineering removed**: wrappers that only forward props, one-caller abstractions inlined, needless `useMemo`/`useCallback`/`useEffect` (derived state computed inline), redundant types re-declaring inferred ones, defensive checks the types already guarantee, verbose class strings that a token/utility class replaces.
5. **Simpler idioms**: long imperative loops → array methods, nested ternaries → early returns or maps, repeated try/catch boilerplate → existing helper.
6. **Architecture fixes that also shrink code** (duplicated business rule → single owner, rule 5; ad-hoc fetch → existing service).

Never shrink by: cramming multiple statements per line, removing a11y labels, deleting error/loading/empty states, removing tests that cover live code, minifying names, or disabling lint rules.

Skip items marked `needs-owner`. If an item has failed verification twice, mark it Skipped with the reason.

## 2. Audit passes (rotate: A → B → C → D → A …; record last pass in LEDGER)

Each pass adds findings to the backlog as one line: `- [ ] [pass] ~-N path:line — problem → intended fix` (N = estimated net lines removed; skip findings that don't remove lines unless they are real bugs). Dedupe against existing lines. Cap 15 new items per pass; keep the best ones.

### A. UI static scan (grep, scoped to `src/screens src/features src/lib/widgets src/app`)
Load `.claude/rules/ui.md` and `docs/WIDGETS.md` first. Look for:
- Hex / rgb colors in classNames or style props: `#[0-9a-fA-F]{3,8}\b`, `rgb\(`, `style=\{\{[^}]*color`
- Arbitrary Tailwind values: `-\[[0-9.]+(px|rem)\]`, `text-\[`, `font-\[`
- Hardcoded font families outside `index.css`
- `rounded-full` on pills/chips (should be squarish)
- Raw `<button` in screens/features that duplicate `ActionButton` / `IconActionButton` / `SegmentedControl`
- Icon imports not via `AppIcon` (`react-icons`, direct `@phosphor-icons` imports outside `AppIcon.tsx`), flag emoji instead of `CountryFlag`
- Nested scrollers: `overflow-y-auto` / `overflow-auto` + `h-full`/`h-screen` on screen roots
- Sticky headers not using the canonical fade class; `border-b` on headers/menu bars
- Hand-rolled sidebar offsets instead of `WorkspaceWindow`
- Missing `aria-label` on icon-only buttons
- Same visual pattern implemented differently on 2+ screens (card, header, empty state, loading state)

### B. UI browser scan (one or two screens per pass, round-robin; record which in LEDGER)
- `preview_start` with `{name: "dev"}`. Visit the screen at 390×844 and 1440×1000 (`resize_window`), screenshot both.
- Check: clipping/overflow, horizontal scroll, inconsistent spacing/header vs sibling screens, tactile depth misuse, pure-white page backgrounds, nav covered by window on desktop, empty/loading states, console errors (`read_console_messages`).
- Reset viewport with preset `desktop` when finished.
- Screen list: build it once from the router in `src/App.tsx` / `src/app/` and store it in LEDGER.

### C. Spaghetti / code-architecture scan
- Biggest files: `find src server -name '*.ts*' | xargs wc -l | sort -rn | head -25` — read them looking for code to DELETE or collapse, not to split (data files under `src/data/` are exempt).
- Dead code candidates: `npx -y knip@5 --config .claude/skills/cleanup-loop/knip.json --no-progress --no-exit-code` (read-only; confirm each with grep before deleting).
- Duplicate blocks: `npx -y jscpd src server --min-lines 8 --reporters console --silent` (read-only).
- Components with > 6 `useState` or > 3 `useEffect`, effects that sync derived state, nested ternaries 3+ deep in JSX, functions > 60 lines.
- `grep -rn "supabase\|fetch(" src --include=*.ts* | grep -v src/services/` (rule 6).
- Same business rule in 2+ places (grep distinctive constants, regexes, thresholds).
- `any`, `as unknown as`, `eslint-disable`, `@ts-ignore`, dead exports (exported symbol with no importer), unused files.
- Cross-feature imports that bypass a feature's public surface; `server/` importing from `src/` (non-types).

### D. File-architecture scan
Read `docs/ARCHITECTURE.md` first. Look for:
- Shared UI used by 2+ features not in `src/lib/widgets/` (rule 10), or widgets used by only one feature.
- Feature-only components sitting in `src/screens/` or vice versa; hooks/utilities in the wrong layer.
- Cross-screen state not in `src/store/slices/` (rule 1); `*PackService` that should be `createPackLoader` (rule 2).
- Directories with mixed concerns or inconsistent naming (`components/` vs flat, `useX.ts` vs `x.hook.ts`).

## 3. Fix

- Smallest change that fully resolves the item. Reuse widgets/tokens before adding new ones.
- Allowed autonomously: deleting provably dead code/files (no importers, not referenced by tests, routes, scripts, `index.html`, dynamic `import()` or string-based lookups — grep the name AND the file path); collapsing duplicates into one existing or new shared module **if net lines drop**; inlining one-caller wrappers; replacing hand-rolled UI with existing widgets; moving files with `git mv` when every importer is updated in the same iteration.
- Extracting/splitting is allowed only when it is the vehicle for removing duplication and the commit is still net-negative.
- Refactors must be behavior-preserving. If a refactor touches > 8 files, split it across iterations (each one green and net-negative on its own).
- Before committing: `git add` the touched files, run `git diff --cached --shortstat`. If insertions ≥ deletions (and it isn't a bug fix) → rethink or abandon the item.
- Update `docs/ARCHITECTURE.md` / `docs/WIDGETS.md` when a move or new widget changes what they describe. Docs describe what EXISTS.

**Never autonomous → add to "Needs owner" with a one-paragraph proposal instead:**
new dependency · Supabase schema/RPC change · `public/data/` packs or pack generators · deleting a user-facing feature/screen/route · changing visible product behavior or copy beyond fixing an obvious bug · design changes that are a matter of taste (not a rule violation) · weakening a lint/jev rule · touching `.env*`, keys, `scripts/.config.json`.

## 4. Verify (every iteration, scoped)

Use the `verify-change` skill table. Minimum for any `src/`/`server/` change: `npm run typecheck && npm run lint && npm test && npm run jev:lint`.
UI changes: also screenshot the affected screen at 390×844 and 1440×1000 and compare with the pre-fix screenshot.

- Green → commit.
- Red → fix once. Still red → `git restore` + `git clean` only the files this iteration touched (never others), mark the item `failed(1|2)`, move on.

## 5. Commit + log

- `git add` only the files this iteration touched. Commit: `refactor(<area>): <what>` / `fix(ui): <what>` / `chore(arch): <what>`; body = one line why. End with the attribution line the harness provides. Never push, never amend, never rebase.
- Update `LEDGER.md`: tick the item, append to Done with the commit short-SHA.
- Append one line to `REPORT.md`: `- <sha> -N: <what> (<files>)`.
- Update the LOC counter in LEDGER (`now: X · removed so far: Y`). Reply to the owner in ≤3 lines: item, `-N lines`, verify result, total removed so far. Then schedule the next iteration: `ScheduleWakeup` with `delaySeconds: 60`, `noop: false`, `prompt: "/cleanup-loop"`, a specific `reason`.
- If the backlog is empty after all four passes in a row found nothing new: write the final summary and wake every 1800s with `noop: true` instead of churning.

## 6. Final summary (on "done" or idle)

Top of `REPORT.md`: baseline LOC → current LOC (total and %), iterations run, commits, biggest wins, items left by category, Needs-owner proposals (numbered, each with recommendation), anything skipped and why. Then send `REPORT.md` with `SendUserFile` (`status: proactive`).

## 7. Templates

`LEDGER.md`:
```md
# Cleanup ledger
branch: chore/cleanup-loop-YYYY-MM-DD · iteration: 0 · last pass: - · browser screens done: -
baseline LOC: X · now: X · removed so far: 0
## Screens
## Backlog
## Done
## Needs owner
## Skipped
```

`REPORT.md`:
```md
# Cleanup loop report
## Summary
(filled on done)
## Commits
## Needs owner
```

## Guardrails

- Never read or print secrets (`AGENTS.md` hard rules). Never edit `public/data/`.
- Do not "improve" code you are not fixing in this iteration — log it as a new backlog item.
- Do not create new abstractions with one caller; prefer deleting to restructuring. Name the duplication (2+ real call sites) before extracting.
- Keep replies terse; the report is the deliverable.
