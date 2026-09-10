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
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
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
  UI_PERSISTED_KEYS,
  UI_ACCOUNT_SWITCH_DEFAULTS,
  type UiState,
} from './slices/uiSlice';
import {
  createSyncSlice,
  SYNC_PERSISTED_KEYS,
  SYNC_ACCOUNT_SWITCH_DEFAULTS,
  type SyncState,
} from './slices/syncSlice';

export type { UserSnapshot };

export type AppState =
  & AuthState
  & LearningState
  & NavigationState
  & LibraryState
  & UiState
  & SyncState
  & AppStoreActions;

// A browser may block or lack IndexedDB; persistence is then best-effort.
// Swallowing here keeps a failed cache write from becoming an unhandled
// rejection — the in-memory store remains the source of truth.
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return (await get(name)) || null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await set(name, value);
    } catch {
      // Cache writes are optional and must never block the store.
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await del(name);
    } catch {
      // Ignore browsers where persistent storage is unavailable.
    }
  },
};

/**
 * Every persisted slice, derived from the domain lists. The contract test
 * asserts this set equals the legacy persisted state exactly — a new slice
 * key must be classified in its slice module or it will not survive reloads.
 */
export const PERSISTED_KEYS = [
  ...AUTH_PERSISTED_KEYS,
  ...LEARNING_PERSISTED_KEYS,
  ...NAVIGATION_PERSISTED_KEYS,
  ...LIBRARY_PERSISTED_KEYS,
  ...UI_PERSISTED_KEYS,
  ...SYNC_PERSISTED_KEYS,
] as const;

function derivePersistedState(state: AppState): Partial<AppState> {
  const persisted: Record<string, unknown> = {};
  for (const key of PERSISTED_KEYS) {
    persisted[key] = state[key];
  }
  return persisted as Partial<AppState>;
}

/**
 * Union of every domain's account-switch defaults: the state cleared when a
 * different user signs in, so no account's cached progress can leak into
 * another's. useCloudSync calls `resetAccountScopedState()` instead of
 * maintaining its own list.
 */
export const ACCOUNT_SWITCH_DEFAULTS = {
  ...AUTH_ACCOUNT_SWITCH_DEFAULTS,
  ...LEARNING_ACCOUNT_SWITCH_DEFAULTS,
  ...NAVIGATION_ACCOUNT_SWITCH_DEFAULTS,
  ...LIBRARY_ACCOUNT_SWITCH_DEFAULTS,
  ...UI_ACCOUNT_SWITCH_DEFAULTS,
  ...SYNC_ACCOUNT_SWITCH_DEFAULTS,
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
      resetAccountScopedState: () => set({ ...ACCOUNT_SWITCH_DEFAULTS }),
    }),
    {
      name: 'rongwaps-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: derivePersistedState,
    }
  )
);
