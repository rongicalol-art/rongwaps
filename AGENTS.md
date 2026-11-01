# Ron's Mandarin (repo: rongwaps) — agent instructions

Chinese-learning PWA for Shu-Te University students (school Google accounts, 18+), built on the *Modern Chinese* textbooks. React 19 + Vite + Zustand + Tailwind 4 + Express (`server/`) + Supabase + a Cloudflare Worker (`games/`). Live: https://ronsmandarin.com. Rules for every AI (Claude, Codex); details in `docs/` (map: `docs/INDEX.md`).

## Roles and communication

- **The owner owns the product vision; you own the technical side.** Decide tools, structure, tests and infrastructure yourself (the best setup, not the simplest) and give the reason in one line.
- **Ask the owner only** for product decisions (what learners see, do or learn) and before anything that could affect real learners or their data, deletes something, changes hosting/domain/provider settings, or costs money. Ask with options and one recommendation.
- The owner works at night, often from a phone. Updates are short: what you did, what's left, what they must decide. Lead with the result, plain words, no diff recaps.
- Prompts are short (often a screenshot + "looks bad"): find the specific cause, name it in a line, fix it. "What should I do?" gets one recommendation.
- Small tweak or bug → just do it. Design, motion, copy or open-ended work → plan, then a clickable prototype, then the owner's pick, then build. Read `.claude/OWNER_PREFERENCES.md` before any UI, design, motion or copy work.
- Plans are self-contained (files, steps, acceptance checks): the owner may hand them to another model. Handoff notes only when asked.
- Build everything yourself. Subagents only for parallel read-only research and independent reviews; they never edit files.
- **Done means verified**: the checks below ran, UI was looked at, CI is green. Say what you checked and what you couldn't.

## How changes ship (`docs/RELEASING.md`)

- **Never commit to or push `main` or `production`** (git, Claude and Codex guards block it). Work on a branch; commit and push it freely; open a PR into `main`.
- **Several sessions share this folder: never switch its branch or stash/clean/commit files you didn't create.** Make code changes in your own worktree branched from `origin/main` (the app's per-session worktree, Codex's, or `git worktree add` in a scratch folder; remove it when done). This folder stays on `main`.
- `main` = staging (deploys itself after CI). `production` = ronsmandarin.com, which changes only when the owner merges the Release PR. Merge into `main` only when the owner says so.
- Database changes: expand → migrate → contract (the previous app version must keep working; CI enforces it). They reach staging automatically; production only through the owner-run *Migrate production* workflow. Never point staging at production.

## Hard rules

- Never read, print or commit `.env*`, `.batch_key_env`, `.openrouter_key`, `scripts/.config.json`. Never type a password or paste a secret into any page or file: those steps are the owner's. Keys stay server/script-side, never in `src/`.
- Never hand-edit `public/data/` packs; regenerate with the npm scripts and commit manifests with them. Pack and authored-content changes need the owner's OK (product).
- `output/`, `.audit/`, `materials/`, `.agents/` are gitignored scratch; shipped code never depends on them. `materials/` (book scans) is copyrighted: never commit it.
- `scripts/` is dev-only: never imported by `src/` or `server/`. Migrations live in `supabase/migrations/`; an applied migration is never edited.
- Root-cause fixes: grep every caller of what you touch and fix the shared root once, never one caller's symptom.
- Reuse before adding (`src/lib/widgets/`, `src/utils/`, design tokens). No speculative abstractions or "for later" scaffolding; name the duplication before extracting.
- Docs describe what exists. Update `docs/WIDGETS.md` when adding a shared widget.

## Architecture (binding)

1. New cross-screen state → matching `src/store/slices/` slice with persistence class declared.
2. Pack-first content → `createPackLoader`; no new `*PackService`.
3. Card-session mechanics live in `useCardSession`; activities own only answer UX.
4. SRSData ↔ DB row conversion only in `src/utils/srs/srsRowMapping.ts`.
5. One owner file per business rule; never duplicated across UI and services.
6. `server/` never imports browser app code (types only shared). Client never imports Supabase/fetch outside `src/services/`.
7. Authored content must not need new engine code unless it is a genuinely new behavior type.
8. Dev-only tooling behind `import.meta.env.DEV`.
9. Screens are small containers: hooks/state → derived data → UI. `App.tsx` = routing + shell only.
10. Shared UI used by 2+ features → `src/lib/widgets/`; feature-only UI beside its screen.
11. Folder split: `screens/<name>/` = route-level slice (own components/hooks/utils; sibling screens only via `index.ts`) · `features/<name>/` = cross-screen domain package (hooks + components + content, public `index.ts`) · `lib/widgets/` = generic UI, no screen/feature imports · `app/` = shell wiring (routes, overlays, launchers) · `hooks/` = app-wide hooks no single screen owns · `utils/<domain>/` = pure helpers, grouped by domain (pinyin, grammar, lesson, srs, sync, vocabulary, characters, browser, debug).

## Checks

`npm run dev` (http://localhost:3000) · `typecheck` · `lint` · `test` · `jev:lint` · `content:validate` · `build` · `perf:check` · `test:e2e` (local Supabase; `docs/TESTING.md`)

- While working, run the checks for what you touch. Before opening a PR: typecheck, lint, test, jev:lint, build. CI repeats them, adds the secret scan, migration safety and browser journeys, and must be green.
- Content → `content:validate`. Course examples → `docs/TESTING.md` (Jev judgments never authorize invented pinyin or verification flags).
- UI → look at it at 390 and 1440 wide, light and dark; Safari and Chrome quirks matter (touchpad, audio).
- Testing on the owner's account is allowed, including quiz/flashcard/SRS progress; the DEV window (Ctrl+Shift+0 → UI Previews) is quicker for UI-only checks.

## Where things are

Before editing, read the matching path rules in `.claude/rules/` (UI `ui.md`; stores/services/hooks/utils/types `state-services.md`; server/Jev `server-jev.md`; scripts/packs/data `content-pipelines.md`); Codex must read them explicitly. Skills: `.claude/skills/` is the source (Codex mirrors in `.agents/skills/` may lag; `.claude/` wins). `docs/archive/` is superseded history, never current.

| Task | Read |
| --- | --- |
| Releasing, undo, backups, incidents, environments | `docs/RELEASING.md` |
| Tests, browser journeys, Jev | `docs/TESTING.md` |
| Screen/component design, visual audit | `.claude/OWNER_PREFERENCES.md`, `rongwaps-ui-director` skill |
| Start non-trivial work / finish any change | `task-start` / `verify-change` skills |
| Grammar lessons | `docs/GRAMMAR_LESSON_TEMPLATE.md`, `docs/DECISIONS.md` |
| Data model / Supabase | `docs/DATABASE_SCHEMA.md` |
| Server / TTS / Jev grading | `docs/API_SPEC.md` |
