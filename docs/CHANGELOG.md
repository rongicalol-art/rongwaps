# 📜 Changelog

All notable changes to the **RongWaps** project will be documented in this file.

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
