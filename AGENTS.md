# Ron's Mandarin (repo: rongwaps)

Chinese-learning PWA for Shu-Te University students (18+), built on the *Modern Chinese* textbooks. React 19 + Vite + Zustand + Tailwind 4, Express (`server/`), Supabase, a Cloudflare Worker (`games/`). Live: https://ronsmandarin.com. This file is the shared rulebook for every AI (Claude, Codex).

## Working with the owner

- The owner owns the product: what learners see, do and learn. You own the technical side; decide it yourself and give the reason in a line. The owner trusts your judgment when it makes the app better for learners: propose the better idea and say why.
- Ask first only for product decisions, and before anything that touches real learners or their data, deletes something, changes hosting or provider settings, or costs money. Ask with options and one recommendation.
- The owner works at night, often from a phone. Lead with the result in plain words: what you did, what's left, what they must decide.
- Requests are short, often a screenshot and "looks bad". Find the specific cause, name it in a line, fix that.
- Tweaks, bugs and polish inside the existing look: build it, look at it, show screenshots. New screens and big redesigns: a clickable prototype with 2-3 directions and one recommendation, then build the owner's pick.
- Any UI, motion or copy work: read `.claude/OWNER_PREFERENCES.md` first. It is the only home for the owner's taste; when the owner corrects a design, update the matching line there instead of adding a rule somewhere else.
- Helpers (subagents, Codex) may write content batches and mechanical code from an exact plan you wrote, and you check the result. Design and UI styling stay with the lead, because a helper once restyled a screen nobody asked it to. Helpers spend the owner's usage: use one where one will do.
- Done means you verified it: say what you checked and what you couldn't.

## Shipping (`docs/RELEASING.md`)

- Work in your own worktree on a branch from `origin/main`; push it and open a PR into `main`. Several sessions share the main folder, so it stays on `main` and you leave files you didn't create alone.
- `main` is staging and deploys itself. `production` is the live site and changes only when the owner merges the Release PR. Merge into `main` when the owner says so. Guards block direct pushes to both.
- Database changes go expand → migrate → contract so the previous app version keeps working. Production migrations run only through the owner's *Migrate production* workflow. An applied migration is never edited.

## Facts that bite

- Secrets: `.env*`, `.batch_key_env`, `.openrouter_key`, `scripts/.config.json` are never read, printed or committed, and keys never reach `src/`. Typing passwords or pasting secrets is the owner's step.
- `public/data/` packs are generated: change the source, run the npm script, commit the manifest with it. Pack and authored-content changes are product decisions.
- `output/`, `.audit/`, `materials/`, `.agents/` are gitignored scratch that shipped code can't depend on. `materials/` holds copyrighted book scans.
- `scripts/` is dev-only tooling; `src/` and `server/` don't import it.
- `docs/archive/` is superseded history.

## Checks

`npm run dev` (http://localhost:3000) · `typecheck` · `lint` · `test` · `content:validate` · `gate`

- Run what fits your change as you go. Before a PR run `npm run gate` and paste `output/gate/summary.md` into it: CI on PRs into `main` runs only the secret scan and migration check, so the gate is the real test. A failing check is yours until you have shown its cause is elsewhere. No Docker (cloud or phone sessions): label the PR `full-ci`.
- UI: look at the result yourself at the sizes and themes the change can affect (390 and 1440 wide, light and dark; all four for a new screen). The DEV window (Ctrl+Shift+0 → UI Previews) reaches hard-to-get states quickly; testing on the owner's account, progress included, is fine.

## Where to look

`docs/INDEX.md` routes every task to its doc. Rules that load by path for Claude, and that Codex reads when its task matches:

| Work | Read |
| --- | --- |
| App code (`src/`, `server/`, `shared/`) | `.claude/rules/code.md` |
| Screens, widgets, styling | `.claude/rules/ui.md` |
| Content, packs, scripts | `.claude/rules/content.md` |
| Server, Jev tooling | `.claude/rules/server-jev.md` |

Skills live in `.claude/skills/<name>/SKILL.md`.
