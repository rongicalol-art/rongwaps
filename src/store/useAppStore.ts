/**
 * @fileoverview Main app store — delegates to domain-specific stores.
 *
 * This file maintains backward compatibility by re-exporting the full AppState
 * interface while delegating state management to focused domain stores:
 *   - useAuthStore: currentUser
 *   - useNavigationStore: activeTab, activeActivity, selectedLessons, selectedBooks
 *   - useSrsStore: srsData, learnedCards, sessionProgress, stats, etc.
 *   - useUiStore: isSearchOpen, isOverlayOpen, practiceHeader, etc.
 *   - useLibraryStore: favorites, dictionaryWord, customFolders
 *   - useSyncStore: syncStatus, syncError, lastCloudUpdate
 *
 * New code should import directly from the domain stores.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { SRSData, Quality } from '../utils/srsEngine';
import {
  applyCardReview,
  createClearedReviewProgress,
  createEmptySessionProgress,
} from '../utils/reviewProgress';
import type {
  LessonPartSelectionMap,
  PartSegment,
  PracticeHeaderActions,
  ActivityType,
  SessionProgress,
  UserFlashcard,
} from '../types/models';
import type { UserSnapshot } from './useAuthStore';

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

// Re-export UserSnapshot for backward compatibility
export type { UserSnapshot } from './useAuthStore';

// Re-export the full AppState interface for backward compatibility
export interface AppState {
  // Auth
  currentUser: UserSnapshot | null;
  setCurrentUser: (user: UserSnapshot | null) => void;
  // Persisted owner of the locally cached progress. Used by the sync layer to
  // detect account switches that survive page reloads (e.g. OAuth redirects),
  // so one user's cached SRS data is never merged into or uploaded to
  // another user's account.
  lastActiveUserId: string | null;
  setLastActiveUserId: (userId: string | null) => void;

  // App Config
  activeBookId: number;
  setActiveBookId: (id: number) => void;
  characterPreference: 'traditional' | 'simplified';
  setCharacterPreference: (pref: 'traditional' | 'simplified') => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;

  // Global Dictionary
  dictionaryWord: string | null;
  setDictionaryWord: (word: string | null) => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (word: string) => void;

  // SRS and Tracking
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  setSrsDataAndLearnedCards: (srs: Record<string, SRSData>, learned: string[]) => void;
  markCardReviewed: (cardId: string, quality: Quality) => void;

  // Session Progress
  sessionProgress: SessionProgress;
  startSession: () => void;
  addSessionXp: (amount: number) => void;
  incrementSessionCardsReviewed: (isNew: boolean) => void;
  resetSessionProgress: () => void;

  // Aggregate Progress Stats
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  totalCardsReviewed: number;
  totalCardsLearned: number;
  lastStudyDate: string | null;
  setProgressStats: (stats: Partial<{
    currentStreak: number;
    longestStreak: number;
    totalXp: number;
    totalCardsReviewed: number;
    totalCardsLearned: number;
    lastStudyDate: string | null;
  }>) => void;

  // Last Activity
  lastActivity: 'flashcards' | 'flashcards-review' | 'listening' | 'quiz' | 'writing' | 'personal-vocab' | null;
  setLastActivity: (activity: 'flashcards' | 'flashcards-review' | 'listening' | 'quiz' | 'writing' | 'personal-vocab' | null) => void;

  // Session Progress Index
  sessionProgressIndex: Record<string, number>;
  setSessionProgressIndex: (key: string, index: number) => void;
  clearSessionProgressIndex: (key: string) => void;

  // Navigation State
  activeTab: 'path' | 'search' | 'library' | 'profile';
  setActiveTab: (tab: 'path' | 'search' | 'library' | 'profile') => void;
  activeActivity: ActivityType;
  setActiveActivity: (activity: ActivityType) => void;
  selectedLessons: number[];
  setSelectedLessons: (lessons: number[] | ((prev: number[]) => number[])) => void;
  selectedBooks: number[];
  setSelectedBooks: (books: number[] | ((prev: number[]) => number[])) => void;
  selectedLessonParts: LessonPartSelectionMap;
  setSelectedLessonParts: (
    parts: LessonPartSelectionMap | ((prev: LessonPartSelectionMap) => LessonPartSelectionMap)
  ) => void;

  // Cloud Sync
  lastCloudUpdate: string | null;
  setLastCloudUpdate: (ts: string | null) => void;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'success') => void;
  syncError: string | null;
  setSyncError: (error: string | null) => void;

  // UI State
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isMainHeaderCompact: boolean;
  setIsMainHeaderCompact: (compact: boolean) => void;
  isOverlayOpen: boolean;
  setIsOverlayOpen: (open: boolean) => void;
  isInteractionActive: boolean;
  setIsInteractionActive: (active: boolean) => void;
  swipeFeedback: { text: string; type: 'learned' | 'review' } | null;
  setSwipeFeedback: (feedback: { text: string; type: 'learned' | 'review' } | null) => void;
  isReviewMode: boolean;
  setIsReviewMode: (review: boolean) => void;
  activeReviewSessionCards: string[] | null;
  setActiveReviewSessionCards: (cards: string[] | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  librarySearchQuery: string;
  setLibrarySearchQuery: (query: string) => void;
  practiceHeader: {
    progress: number;
    currentIndex: number;
    totalCount: number;
    showLightbulb: boolean;
    partSegments: PartSegment[];
  };
  setPracticeHeader: (state: Partial<AppState['practiceHeader']>) => void;
  practiceHeaderActions: PracticeHeaderActions;
  setPracticeHeaderActions: (actions: Partial<AppState['practiceHeaderActions']>) => void;

  // Library State
  libraryActiveFolder: string;
  setLibraryActiveFolder: (folderId: string) => void;
  libraryActiveView: 'home' | 'folder';
  setLibraryActiveView: (view: 'home' | 'folder') => void;
  customFolders: { id: string; name: string; color: string }[];
  setCustomFolders: (folders: { id: string; name: string; color: string }[]) => void;
  addCustomFolder: (name: string, color: string, id?: string) => void;
  deleteCustomFolder: (id: string) => void;
  localFlashcards: UserFlashcard[];
  addLocalFlashcard: (card: UserFlashcard) => void;
  deleteLocalFlashcard: (id: string) => void;
  resetProgress: () => void;
}

// For backward compatibility, useAppStore delegates to domain stores.
// New code should import directly from the domain stores.
export { useAuthStore } from './useAuthStore';
export { useNavigationStore } from './useNavigationStore';
export { useSrsStore } from './useSrsStore';
export { useUiStore } from './useUiStore';
export { useLibraryStore } from './useLibraryStore';
export { useSyncStore } from './useSyncStore';

// Keep the persisted store for backward compatibility
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      lastActiveUserId: null,
      setLastActiveUserId: (userId) => set({ lastActiveUserId: userId }),

      // App Config
      activeBookId: 1,
      setActiveBookId: (id) => set({ activeBookId: id }),
      characterPreference: 'traditional',
      setCharacterPreference: (pref) => set({ characterPreference: pref }),
      isSettingsOpen: false,
      setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),

      // Global Dictionary
      dictionaryWord: null,
      setDictionaryWord: (word) => set({ dictionaryWord: word }),

      // Favorites
      favorites: [],
      toggleFavorite: (word) => set((state) => ({
        favorites: state.favorites.includes(word)
          ? state.favorites.filter(w => w !== word)
          : [...state.favorites, word],
      })),

      // SRS and Tracking
      srsData: {},
      learnedCards: [],
      setSrsDataAndLearnedCards: (srs, learned) => set({ srsData: srs, learnedCards: learned }),
      markCardReviewed: (cardId: string, quality: Quality) => set((state) => (
        applyCardReview(state, cardId, quality)
      )),

      // Session Progress
      sessionProgress: createEmptySessionProgress(),
      startSession: () => set((s) => ({
        sessionProgress: { ...s.sessionProgress, startTime: Date.now() },
      })),
      addSessionXp: (amount) => set((s) => ({
        sessionProgress: { ...s.sessionProgress, xpEarned: s.sessionProgress.xpEarned + amount },
      })),
      incrementSessionCardsReviewed: (isNew) => set((s) => ({
        sessionProgress: {
          ...s.sessionProgress,
          cardsReviewed: s.sessionProgress.cardsReviewed + 1,
          cardsLearned: isNew ? s.sessionProgress.cardsLearned + 1 : s.sessionProgress.cardsLearned,
        },
      })),
      resetSessionProgress: () => set({ sessionProgress: createEmptySessionProgress() }),

      // Aggregate Progress Stats
      currentStreak: 0,
      longestStreak: 0,
      totalXp: 0,
      totalCardsReviewed: 0,
      totalCardsLearned: 0,
      lastStudyDate: null,
      setProgressStats: (stats) => set((s) => ({
        currentStreak: stats.currentStreak ?? s.currentStreak,
        longestStreak: stats.longestStreak ?? s.longestStreak,
        totalXp: stats.totalXp ?? s.totalXp,
        totalCardsReviewed: stats.totalCardsReviewed ?? s.totalCardsReviewed,
        totalCardsLearned: stats.totalCardsLearned ?? s.totalCardsLearned,
        lastStudyDate: stats.lastStudyDate ?? s.lastStudyDate,
      })),

      // Last Activity
      lastActivity: null,
      setLastActivity: (activity) => set({ lastActivity: activity }),

      // Session Progress Index
      sessionProgressIndex: {},
      setSessionProgressIndex: (key, index) => set((s) => ({
        sessionProgressIndex: { ...s.sessionProgressIndex, [key]: index },
      })),
      clearSessionProgressIndex: (key) => set((s) => {
        const nextProgress = { ...s.sessionProgressIndex };
        delete nextProgress[key];
        return { sessionProgressIndex: nextProgress };
      }),

      // Navigation State
      activeTab: 'path',
      setActiveTab: (tab) => set({ activeTab: tab }),
      activeActivity: null,
      setActiveActivity: (activity) => set({ activeActivity: activity }),
      selectedLessons: [],
      setSelectedLessons: (lessons) => set((state) => ({
        selectedLessons: typeof lessons === 'function' ? lessons(state.selectedLessons) : lessons,
      })),
      selectedBooks: [],
      setSelectedBooks: (books) => set((state) => ({
        selectedBooks: typeof books === 'function' ? books(state.selectedBooks) : books,
      })),
      selectedLessonParts: {},
      setSelectedLessonParts: (parts) => set((state) => ({
        selectedLessonParts: typeof parts === 'function'
          ? parts(state.selectedLessonParts)
          : parts,
      })),

      // Cloud Sync
      lastCloudUpdate: null,
      setLastCloudUpdate: (ts) => set({ lastCloudUpdate: ts }),
      syncStatus: 'idle',
      setSyncStatus: (status) => set({ syncStatus: status }),
      syncError: null,
      setSyncError: (error) => set({ syncError: error }),

      // UI State
      isSearchOpen: false,
      setIsSearchOpen: (open) => set({ isSearchOpen: open }),
      isMainHeaderCompact: false,
      setIsMainHeaderCompact: (compact) => set({ isMainHeaderCompact: compact }),
      isOverlayOpen: false,
      setIsOverlayOpen: (open) => set({ isOverlayOpen: open }),
      isInteractionActive: false,
      setIsInteractionActive: (active) => set({ isInteractionActive: active }),
      swipeFeedback: null,
      setSwipeFeedback: (feedback) => set({ swipeFeedback: feedback }),
      isReviewMode: false,
      setIsReviewMode: (review) => set({ isReviewMode: review }),
      activeReviewSessionCards: null,
      setActiveReviewSessionCards: (cards) => set({ activeReviewSessionCards: cards }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      librarySearchQuery: '',
      setLibrarySearchQuery: (query) => set({ librarySearchQuery: query }),
      practiceHeader: { progress: 0, currentIndex: 0, totalCount: 0, showLightbulb: false, partSegments: [] },
      setPracticeHeader: (headerState) => set((state) => ({
        practiceHeader: { ...state.practiceHeader, ...headerState },
      })),
      practiceHeaderActions: {},
      setPracticeHeaderActions: (actions) => set((state) => ({
        practiceHeaderActions: { ...state.practiceHeaderActions, ...actions },
      })),

      // Library State
      libraryActiveFolder: 'all',
      setLibraryActiveFolder: (folderId) => set({ libraryActiveFolder: folderId }),
      libraryActiveView: 'home' as 'home' | 'folder',
      setLibraryActiveView: (view) => set({ libraryActiveView: view }),
      customFolders: [],
      setCustomFolders: (folders) => set({ customFolders: folders }),
      addCustomFolder: (name, color, id) => set((s) => ({
        customFolders: [...s.customFolders, { id: id || crypto.randomUUID(), name, color }],
      })),
      deleteCustomFolder: (id) => set((s) => ({
        customFolders: s.customFolders.filter(f => f.id !== id),
      })),
      localFlashcards: [],
      addLocalFlashcard: (card) => set((s) => ({
        localFlashcards: [...s.localFlashcards, card],
      })),
      deleteLocalFlashcard: (id) => set((s) => ({
        localFlashcards: s.localFlashcards.filter(c => c.id !== id),
      })),

      // Reset
      resetProgress: () => set({
        ...createClearedReviewProgress(),
        lastActivity: null,
        isReviewMode: false,
        activeReviewSessionCards: null,
        swipeFeedback: null,
      }),
    }),
    {
      name: 'rongwaps-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        lastActiveUserId: state.lastActiveUserId,
        activeBookId: state.activeBookId,
        characterPreference: state.characterPreference,
        favorites: state.favorites,
        srsData: state.srsData,
        learnedCards: state.learnedCards,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        totalXp: state.totalXp,
        totalCardsReviewed: state.totalCardsReviewed,
        totalCardsLearned: state.totalCardsLearned,
        lastStudyDate: state.lastStudyDate,
        sessionProgressIndex: state.sessionProgressIndex,
        activeTab: state.activeTab,
        selectedLessons: state.selectedLessons,
        selectedBooks: state.selectedBooks,
        selectedLessonParts: state.selectedLessonParts,
        customFolders: state.customFolders,
        libraryActiveFolder: state.libraryActiveFolder,
        localFlashcards: state.localFlashcards,
      }),
    }
  )
);
