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

import { createProfileSlice, PROFILE_PERSISTED_KEYS, PROFILE_ACCOUNT_SWITCH_DEFAULTS, type ProfileState } from './slices/profileSlice';
import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { debugLogger } from '../utils/debug/debugLogger';
import { migrateLegacyLessonSelection } from '../utils/lesson/lessonPartSelection';
import { migrateLegacyStores } from '../utils/sync/legacyStoreMigration';
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
  type QuizFormatPreference,
  type QuizQuestionType,
  type QuizChoiceType,
  type ListeningChoiceType,
  type TypingPromptType,
  type MatchPairType,
  type PracticeDockStyle,
  getPaceTimings,
  getPaceLabel,
  DEFAULT_PREFERENCES,
  selectPracticePreferences,
} from './slices/practicePreferencesSlice';
import {
  createSocialSlice,
  SOCIAL_PERSISTED_KEYS,
  SOCIAL_ACCOUNT_SWITCH_DEFAULTS,
  type SocialState,
} from './slices/socialSlice';

export type {
  UserSnapshot,
  SyncStatus,
  GrammarProgressState,
  PracticePreferencesState,
  PracticePreferences,
  PracticePreset,
  MistakeRepeat,
  CharacterFont,
  QuizFormatPreference,
  QuizQuestionType,
  QuizChoiceType,
  ListeningChoiceType,
  TypingPromptType,
  MatchPairType,
  PracticeDockStyle,
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
  & ProfileState
  & AuthState
  & LearningState
  & NavigationState
  & LibraryState
  & UiState
  & SyncState
  & GrammarProgressState
  & PracticePreferencesState
  & SocialState;

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

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', flushPendingPersist);
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingPersist();
    });
  }
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
    } catch (error) {
      // Graceful degradation: IndexedDB blocked; fall back to unpersisted memory state
      debugLogger.warn('Sync', 'IndexedDB read failed in idbStorage.getItem', error);
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
    } catch (error) {
      // Graceful degradation: cache write failed; never block the in-memory store
      debugLogger.warn('Sync', 'IndexedDB write debouncing failed in idbStorage.setItem', error);
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
    } catch (error) {
      // Graceful degradation: persistent storage unavailable during removeItem
      debugLogger.warn('Sync', 'IndexedDB delete failed in idbStorage.removeItem', error);
    }
  },
};

/**
 * Every persisted slice, derived from the domain lists.
 */
export const PERSISTED_KEYS = [
  ...AUTH_PERSISTED_KEYS,
  ...PROFILE_PERSISTED_KEYS,
  ...LEARNING_PERSISTED_KEYS,
  ...NAVIGATION_PERSISTED_KEYS,
  ...LIBRARY_PERSISTED_KEYS,
  ...UI_PERSISTED_KEYS,
  ...SYNC_PERSISTED_KEYS,
  ...GRAMMAR_PROGRESS_PERSISTED_KEYS,
  ...PRACTICE_PREFERENCES_PERSISTED_KEYS,
  ...SOCIAL_PERSISTED_KEYS,
] as const;

function derivePersistedState(state: AppState): Partial<AppState> {
  const persisted: Record<string, unknown> = {};
  for (const key of PERSISTED_KEYS) {
    persisted[key] = state[key];
  }
  return persisted as Partial<AppState>;
}

/**
 * Persisted slice fields whose runtime shape is an array. IndexedDB is
 * untrusted input (hand edits, interrupted writes, older app versions), and a
 * non-array here crashes render trees far from the store — e.g. `favorites:
 * null` detonates the Library tab boundary. Coerce to the empty default and
 * say so in the debug log instead.
 */
const PERSISTED_ARRAY_KEYS = [
  'favorites',
  'customFolders',
  'localFlashcards',
  'learnedCards',
  'reviewEvents',
  'pendingReviewEvents',
  'selectedBooks',
  'startedPartIds',
  'completedPageIds',
  'completedPartIds',
] as const;

/** Persisted slice fields whose runtime shape is a plain record. */
const PERSISTED_RECORD_KEYS = [
  'selectedLessonParts',
  'lastOpenedLessons',
  'srsData',
  'learningBatches',
  'sessionProgressIndex',
  'sessionCardOrder',
  'deckExclusions',
  'progressResetSeen',
  'wordConfusions',
  'sharedFolderCopies',
] as const;

function sanitizePersistedState(state: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...state };
  // Retired social preference: discard saved blocks from older clients.
  delete cleaned.blockedUsers;
  for (const key of PERSISTED_ARRAY_KEYS) {
    if (key in cleaned && !Array.isArray(cleaned[key])) {
      debugLogger.warn('Sync', `Persisted "${key}" was not an array; using an empty list.`, cleaned[key]);
      cleaned[key] = [];
    }
  }
  for (const key of PERSISTED_RECORD_KEYS) {
    const value = cleaned[key];
    if (key in cleaned && (value === null || typeof value !== 'object' || Array.isArray(value))) {
      debugLogger.warn('Sync', `Persisted "${key}" was not a record; using an empty record.`, value);
      cleaned[key] = {};
    }
  }
  return cleaned;
}

export const ACCOUNT_SWITCH_DEFAULTS = {
  ...AUTH_ACCOUNT_SWITCH_DEFAULTS,
  ...PROFILE_ACCOUNT_SWITCH_DEFAULTS,
  ...LEARNING_ACCOUNT_SWITCH_DEFAULTS,
  ...NAVIGATION_ACCOUNT_SWITCH_DEFAULTS,
  ...LIBRARY_ACCOUNT_SWITCH_DEFAULTS,
  ...UI_ACCOUNT_SWITCH_DEFAULTS,
  ...SYNC_ACCOUNT_SWITCH_DEFAULTS,
  ...GRAMMAR_PROGRESS_ACCOUNT_SWITCH_DEFAULTS,
  ...PRACTICE_PREFERENCES_ACCOUNT_SWITCH_DEFAULTS,
  ...SOCIAL_ACCOUNT_SWITCH_DEFAULTS,
} as Partial<AppState>;

export interface AppStoreActions {
  /** Clears all account-scoped state (see ACCOUNT_SWITCH_DEFAULTS). */
  resetAccountScopedState: () => void;
}

export const useAppStore = create<AppState & AppStoreActions>()(
  persist(
    (set) => ({
      ...createAuthSlice(set),
      ...createProfileSlice(set),
      ...createLearningSlice(set),
      ...createNavigationSlice(set),
      ...createLibrarySlice(set),
      ...createUiSlice(set),
      ...createSyncSlice(set),
      ...createGrammarProgressSlice(set),
      ...createPracticePreferencesSlice(set),
      ...createSocialSlice(set),
      resetAccountScopedState: () => set({ ...ACCOUNT_SWITCH_DEFAULTS }),
    }),
    {
      name: 'rongwaps-storage',
      version: 3,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;
        if (version < 1) {
          migrateLegacyLessonSelection(state);
        }
        if (version < 2) {
          migrateLegacyStores(state);
        }
        if (version < 3) state.characterPreference = 'traditional';
        return state as unknown as AppState;
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedState((persistedState ?? {}) as Record<string, unknown>),
      }),
      storage: idbStorage,
      partialize: derivePersistedState,
    },
  ),
);
