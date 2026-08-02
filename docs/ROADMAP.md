# 🗺️ 3-Month Development Roadmap: RongWaps

This document defines the 3-month strategic development plan for the **RongWaps** Chinese learning application.

---

## 🎯 High-Level Goals
1. **Bulletproof Offline-First Sync**: Polish our Zustand + IndexedDB + Supabase sync process so data is never lost.
2. **Enhanced AI-Powered Learning**: Leverage Gemini to generate context-aware sentences, grammar breakdowns, and personalized quizzes.
3. **Immersive UX & Tactile Feel**: Expand Duolingo-style widgets, animations, and micro-interactions.
4. **Comprehensive Test Coverage**: Set up a robust testing suite for SRS scheduling logic and custom services.

---

## 🗓️ Timeline

### 📅 Month 1: Core Stability & Technical Debt
*Focus: Code organization, data resilience, testing, and documentation.*

- **Sprint 1: Architecture Consolidation**
  - [x] Clear out dead files and migration scripts from repo root.
  - [x] Standardize screen files into vertical slice folders (`src/screens/{feature}/`).
  - [x] Address service layer leakage by routing all DB queries through services.
  - [ ] Standardize the store by removing deprecated `useAppStore` wrapping in favor of direct domain stores.

- **Sprint 2: Offline Resilience & Sync Polish**
  - [ ] Implement exponential backoff, transaction retries, and offline queueing for card syncs in `useCloudSync.ts`.
  - [ ] Resolve conflict resolution rules (e.g., "latest timestamp wins" for local vs cloud progress).
  - [ ] Build a visual indicator in the header showing sync status (Online / Syncing / Saved Offline / Sync Error).

- **Sprint 3: Testing Framework Setup**
  - [ ] Set up **Vitest** for unit testing.
  - [ ] Add 100% coverage tests for the SRS algorithm (`src/utils/srs.ts`).
  - [ ] Add mock unit tests for `authService` and `userService`.

---

### 📅 Month 2: Immersive Study & Active Recall
*Focus: Adding interactivity, better stroke validation, and richer dictionary content.*

- **Sprint 4: Active Writing Canvas**
  - [ ] Refactor `WritingModeScreen` to validate stroke sequences actively using Hanzi Writer callbacks.
  - [ ] Add visual hints (showing next stroke outline when user is stuck for >3 seconds).
  - [ ] Implement "Radical Matcher" to detect if the user wrote the correct component but incorrect proportions.

- **Sprint 5: Smart Sentences & Audio Proxy**
  - [ ] Integrate text-to-speech (TTS) voice generation proxy via Gemini or a secondary translation API.
  - [ ] Support clicking components inside `SmartSentence` to open mini-definitions directly in the study modal.
  - [ ] Support recording audio to check pronunciation (basic speech comparison).

- **Sprint 6: Advanced Dictionary & Search Spec**
  - [ ] Implement the Trie-based pinyin autocomplete from `docs/SEARCH_SPEC.md` for client-side sub-1ms search.
  - [ ] Add radical-based search index in the dictionary modal (let users tap components to find characters).

---

### 📅 Month 3: Gamification, Progression, & Social
*Focus: Retaining users, motivating study habits, and expanding curriculums.*

- **Sprint 7: Streak Retention & XP Systems**
  - [ ] Create a detailed streak calculation helper in Postgres (RPC) to prevent timezone bugs.
  - [ ] Add custom streak freezes (purchaseable with "XP" or gems).
  - [ ] Add celebratory Lottie animations when hitting streak milestones (e.g., 7-day, 30-day).

- **Sprint 8: Curriculums & Custom Content**
  - [ ] Add HSK 1-6 and TOCFL Novice-Fluent preset decks in `src/data/`.
  - [ ] Allow users to import cards via CSV or OCR (taking a picture of Chinese characters and parsing them using Gemini Vision).
  - [ ] Add card exporting to Anki formats.

- **Sprint 9: Custom Decks & Folders**
  - [ ] Implement folder-sharing (sharing a custom vocabulary list via a short link).
  - [ ] Add a public curriculum library where users can browse community decks.
