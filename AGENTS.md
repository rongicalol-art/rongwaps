# Ron's Mandarin (repo: rongwaps) — agent instructions

Chinese-learning PWA. React 19 + Vite + Zustand + Tailwind 4 + Express (`server/`) + Supabase. Core rules only; details load on demand (see Routing).

## Working style (owner preferences)

- **Terse.** Short answers. No recap of the diff, no restating the task, no tool narration. Lead with the result or the recommendation.
- **Intent over literal.** Prompts are short, informal, often a screenshot + "looks bad". Infer the real fix, state it in one line, act. When asked "what to do?", give one recommendation, not a menu.
- **Design or open-ended work → plan first.** Propose something thoughtful and creative (not just what was asked), stop, wait for "go". After "go": execute and verify, no more discussion.
- **Small tweak or bug → just do it.** One-line intent, then fix.
- **Ask before:** new dependency, new abstraction, moving/deleting files, multi-file refactor, schema or pack changes.
- **Plans must be self-contained** (files, steps, acceptance) — the owner often hands them to another model to execute.
- Handoff file for a fresh session only when asked: concise, current task only.

## Commands

`npm run dev` (http://localhost:3000) · `typecheck` · `lint` · `test` · `jev:lint` · `content:validate` · `build`

**Verify once at the end of a task, scoped to what changed** — not after every edit:
- `src/` `server/` `tests/` → typecheck, lint, test, `jev:lint`
- lesson/grammar content → `content:validate`
- UI → also check mobile (390 wide) and desktop (1440 wide); Safari + Chrome quirks matter (touchpad, audio).
Use the `verify-change` skill.

## Hard rules

- Never read, print or commit `.env*`, `.batch_key_env`, `.openrouter_key`, `scripts/.config.json`. Service-role and API keys are server/script-side only, never in `src/`.
- Never hand-edit `public/data/` packs; regenerate via npm scripts and commit manifests with them.
- `output/`, `.audit/`, `materials/`, `.agents/` are gitignored scratch. Never depend on them in code.
- Docs describe what EXISTS. Update `docs/WIDGETS.md` when adding a shared widget.
- Smallest change that meets the requirement. Reuse widgets/tokens before adding new ones. Name the duplication before adding an abstraction.

## Repo map (what ships vs what doesn't)

- `src/` client → `dist/` (ships) · `server/` Express API → `dist-server/` (ships; never imports `src/` except types)
- `public/` static assets (ships). `public/data/` is GENERATED from `content/` + scripts — never hand-edit
- `content/` authored source for packs (grammar, readings, dialogue alignment, `audio/` index+manifest)
- `scripts/` content/audio pipelines, dev-only; never imported by `src/` or `server/`
- `supabase/migrations/` DB schema, applied with `supabase db push`
- `tests/` · `docs/` (`docs/INDEX.md` routes) · `.claude/` agent rules/skills
- `worker/index.js` unused Cloudflare static-asset worker stub (nothing references it)
- Gitignored local scratch: `materials/` `output/` `.audit/` `.agents/`

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

## Routing — read only what the task needs

Path-scoped rules in `.claude/rules/` load automatically when you touch matching files. Task → doc map: `docs/INDEX.md`. Do not read `docs/archive/` or `docs/reference/` unless the task names them.

| Task | Skill / doc |
| --- | --- |
| Screen/component design, redesign, visual audit | `rongwaps-ui-director` skill |
| Start non-trivial work | `task-start` skill |
| Finish any change | `verify-change` skill |
| Grammar lessons | `docs/GRAMMAR_LESSON_TEMPLATE.md`, `docs/DECISIONS.md` |
| Data model / Supabase | `docs/DATABASE_SCHEMA.md` |
| Server / TTS / Jev grading | `docs/API_SPEC.md` |
