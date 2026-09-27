/**
 * @fileoverview Global app store — composed from domain slices.
 *
 * A single persisted Zustand store (IndexedDB key 'rongwaps-storage') built
 * from domain slice modules under `src/store/slices/`. Each slice owns its
 * state, actions, persisted-key list, and account-switch defaults;
 * `useAppStore` only composes them and derives the persistence contract:
 *
 *   - Persisted keys come from the slices' PERSISTED_KEYS lists (see
 *     tests/storeContract.test.ts — adding a slice key without declaring its
 *     persistence class fails the contract test).
 *   - Account switches reset exactly the ACCOUNT_SWITCH_DEFAULTS of each
 *     domain via `resetAccountScopedState()`; useCloudSync calls it and must
 *     not hand-write a reset list.
 *
 * New cross-screen state: add it to the matching slice (or create a new
 * slice module) and classify it there.
 */

import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { migrateLegacyLessonSelection } from '../utils/lessonPartSelection';
import { migrateLegacyStores } from '../utils/legacyStoreMigration';
import {
  createAuthSlice,
  AUTH_PERSISTED_KEYS,
  AUTH_ACCOUNT_SWITCH_DEFAULTS,
  type AuthState,
  type UserSnapshot,
} from './slices/authSlice';
import {
  createLearningSlice,
  LEARNING_PERSISTED_KEYS,
  LEARNING_ACCOUNT_SWITCH_DEFAULTS,
  type LearningState,
} from './slices/learningSlice';
import {
  createNavigationSlice,
  NAVIGATION_PERSISTED_KEYS,
  NAVIGATION_ACCOUNT_SWITCH_DEFAULTS,
  type NavigationState,
} from './slices/navigationSlice';
import {
  createLibrarySlice,
  LIBRARY_PERSISTED_KEYS,
  LIBRARY_ACCOUNT_SWITCH_DEFAULTS,
  type LibraryState,
} from './slices/librarySlice';
import {
  createUiSlice,
  selectIsActivityOverlayOpen,
  UI_PERSISTED_KEYS,
  UI_ACCOUNT_SWITCH_DEFAULTS,
  type UiState,
} from './slices/uiSlice';
import {
  createSyncSlice,
  SYNC_PERSISTED_KEYS,
  SYNC_ACCOUNT_SWITCH_DEFAULTS,
  type SyncState,
  type SyncStatus,
} from './slices/syncSlice';
import {
  createGrammarProgressSlice,
  GRAMMAR_PROGRESS_PERSISTED_KEYS,
  GRAMMAR_PROGRESS_ACCOUNT_SWITCH_DEFAULTS,
  type GrammarProgressState,
} from './slices/grammarProgressSlice';
import {
  createPracticePreferencesSlice,
  PRACTICE_PREFERENCES_PERSISTED_KEYS,
  PRACTICE_PREFERENCES_ACCOUNT_SWITCH_DEFAULTS,
  type PracticePreferencesState,
  type PracticePreferences,
  type PracticePreset,
  type MistakeRepeat,
  type CharacterFont,
  type QuizQuestionType,
  type QuizChoiceType,
  type ListeningChoiceType,
  type TypingPromptType,
  getPaceTimings,
  getPaceLabel,
  DEFAULT_PREFERENCES,
  selectPracticePreferences,
} from './slices/practicePreferencesSlice';

export type {
  UserSnapshot,
  SyncStatus,
  GrammarProgressState,
  PracticePreferencesState,
  PracticePreferences,
  PracticePreset,
  MistakeRepeat,
  CharacterFont,
  QuizQuestionType,
  QuizChoiceType,
  ListeningChoiceType,
  TypingPromptType,
};
export {
  selectIsActivityOverlayOpen,
  getPaceTimings,
  getPaceLabel,
  DEFAULT_PREFERENCES,
  selectPracticePreferences,
};

/** Data-only store shape (state, no actions) — lets consumers key off real keys. */
export type AppStoreData =
  & AuthState
  & LearningState
  & NavigationState
  & LibraryState
  & UiState
  & SyncState
  & GrammarProgressState
  & PracticePreferencesState;

export type AppState = AppStoreData & AppStoreActions;

const PERSIST_DEBOUNCE_MS = 1_000;
let pendingWrite: { name: string; value: unknown } | null = null;
let pendingWriteLastValue: unknown | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function flushPendingPersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const pending = pendingWrite;
  if (!pending) return;
  pendingWrite = null;

  if (typeof indexedDB === 'undefined') return;
  pendingWriteLastValue = pending.value;
  void set(pending.name, pending.value).catch(() => {
    // Cache writes are optional and must never block the store.
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPendingPersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingPersist();
  });
}

const idbStorage: PersistStorage<Partial<AppState>> = {
  getItem: async (name) => {
    try {
      const item = (await get(name)) || null;
      if (!item) {
        const initialLegacyState: Record<string, unknown> = {};
        const migrated = migrateLegacyStores(initialLegacyState);
        if (migrated) {
          return { state: initialLegacyState as Partial<AppState>, version: 2 };
        }
      }
      return item;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      const isValueEqual = (
        a: { state?: Record<string, unknown>; version?: number } | null | undefined,
        b: { state?: Record<string, unknown>; version?: number } | null | undefined,
      ) => {
        if (a === b) return true;
        if (!a || !b) return false;
        if (a.version !== b.version) return false;
        const stateA = a.state;
        const stateB = b.state;
        if (stateA === stateB) return true;
        if (!stateA || !stateB) return false;
        for (const key of PERSISTED_KEYS) {
          if (stateA[key] !== stateB[key]) return false;
        }
        return true;
      };

      type StoredVal = { state?: Record<string, unknown>; version?: number } | null | undefined;
      if (isValueEqual(value, pendingWriteLastValue as StoredVal) && pendingWrite === null) return;
      if (isValueEqual(value, pendingWrite?.value as StoredVal)) return;

      pendingWrite = { name, value };
      if (!persistTimer) {
        persistTimer = setTimeout(flushPendingPersist, PERSIST_DEBOUNCE_MS);
      }
    } catch {
      // Cache writes are optional and must never block the store.
    }
  },
  removeItem: async (name) => {
    try {
      pendingWrite = null;
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      await del(name);
    } catch {
      // Ignore browsers where persistent storage is unavailable.
    }
  },
};

/**
 * Every persisted slice, derived from the domain lists.
 */
export const PERSISTED_KEYS = [
  ...AUTH_PERSISTED_KEYS,
  ...LEARNING_PERSISTED_KEYS,
  ...NAVIGATION_PERSISTED_KEYS,
  ...LIBRARY_PERSISTED_KEYS,
  ...UI_PERSISTED_KEYS,
  ...SYNC_PERSISTED_KEYS,
  ...GRAMMAR_PROGRESS_PERSISTED_KEYS,
  ...PRACTICE_PREFERENCES_PERSISTED_KEYS,
] as const;

function derivePersistedState(state: AppState): Partial<AppState> {
  const persisted: Record<string, unknown> = {};
  for (const key of PERSISTED_KEYS) {
    persisted[key] = state[key];
  }
  return persisted as Partial<AppState>;
}

export const ACCOUNT_SWITCH_DEFAULTS = {
  ...AUTH_ACCOUNT_SWITCH_DEFAULTS,
  ...LEARNING_ACCOUNT_SWITCH_DEFAULTS,
  ...NAVIGATION_ACCOUNT_SWITCH_DEFAULTS,
  ...LIBRARY_ACCOUNT_SWITCH_DEFAULTS,
  ...UI_ACCOUNT_SWITCH_DEFAULTS,
  ...SYNC_ACCOUNT_SWITCH_DEFAULTS,
  ...GRAMMAR_PROGRESS_ACCOUNT_SWITCH_DEFAULTS,
  ...PRACTICE_PREFERENCES_ACCOUNT_SWITCH_DEFAULTS,
} as Partial<AppState>;

export interface AppStoreActions {
  /** Clears all account-scoped state (see ACCOUNT_SWITCH_DEFAULTS). */
  resetAccountScopedState: () => void;
}

export const useAppStore = create<AppState & AppStoreActions>()(
  persist(
    (set) => ({
      ...createAuthSlice(set),
      ...createLearningSlice(set),
      ...createNavigationSlice(set),
      ...createLibrarySlice(set),
      ...createUiSlice(set),
      ...createSyncSlice(set),
      ...createGrammarProgressSlice(set),
      ...createPracticePreferencesSlice(set),
      resetAccountScopedState: () => set({ ...ACCOUNT_SWITCH_DEFAULTS }),
    }),
    {
      name: 'rongwaps-storage',
      version: 2,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;
        if (version < 1) {
          migrateLegacyLessonSelection(state);
        }
        if (version < 2) {
          migrateLegacyStores(state);
        }
        return state as unknown as AppState;
      },
      storage: idbStorage,
      partialize: derivePersistedState,
    },
  ),
);
