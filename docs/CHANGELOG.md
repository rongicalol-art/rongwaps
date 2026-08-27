# 📜 Changelog

All notable changes to the **RongWaps** project will be documented in this file.

---

## [Unreleased]
### Changed
- Redesigned the Practice settings surface: the mode tabs live inside the header itself, and controls use the character-breakdown row language — white strips separated by bottom hairlines only, no boxes or outlines, with toggle switches and radio-style options (character set, mistake recycling).
- Restructured Practice settings into 3 focused sections: Quiz mode, Flow mode, and General.
- Quiz mode owns everything answer-related: auto-next (continue after correct/wrong) and replay after answering.
- Flow mode owns speaking and pacing: Speak Chinese, Speak definition, a "Speak sentence" placeholder (coming soon), plus visible "Next speed" and "Next card speed" sliders.
- General covers appearance, audio, and session: character set, pinyin/English reveals, playback speed, and mistake recycling.
- "Continue after correct answers" is now the default, and presets no longer switch it off.
- Quiz answers are always checked immediately on selection — removed the "Check answers as soon as I choose" toggle (instant checking is now fixed behavior).
- Practice preferences store migration v4 drops the instant-check preference and restores the auto-next default for preset-held values.

### Removed
- Removed the separate Display, Audio, Session, Pace, and Answers tabs in favor of the 3-section layout.

---

## [1.1.0] - 2026-07-10
### Added
- Created `docs/ROADMAP.md` covering the 3-month feature roadmap.
- Created `docs/DATABASE_SCHEMA.md` detailing Supabase entity relations and RPCs.
- Created `docs/API_SPEC.md` documenting server-side Express endpoints.

### Changed
- Refactored `useCloudSync.ts` to query `userService` instead of importing the `supabase` client directly.
- Added custom folder retrieval and upsert functions to `userService.ts`.
- Rewrote the main project `README.md` to detail the actual Chinese learning tool features, configuration, and execution instructions.
- Streamlined `docs/ARCHITECTURE.md` to align with the vertical slices structure and remove stale proposals.
- Updated `.gitignore` to prevent committing dataset downloads (`ids.txt`), debug files, and local backups.

### Removed
- Deleted 13 root-level dead/debug scripts (including security risks containing plaintext `service_role` keys).
- Deleted 18 obsolete scripts from `scripts/` folder.
- Deleted obsolete markdown files (`docs/PROGRESS_AND_PLANS.md`, `docs/team.md`, `ARCHITECT_LOG.md`).

---

## [1.0.0] - 2026-06-22
### Added
- Split the monolithic Zustand store into domain-specific stores (`useAuthStore`, `useNavigationStore`, `useSrsStore`, `useUiStore`, `useLibraryStore`, `useSyncStore`).
- Created `authService` to encapsulate all `supabase.auth` client calls.
- Added index migrations for `user_card_progress` and `user_folders` to improve lookup times.
- Implemented PostgreSQL RPC `upsert_daily_progress` and `get_user_aggregate_stats` to improve database performance.
- Added `ErrorBoundary.tsx` widget.
