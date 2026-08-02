import { create } from 'zustand';
import { SRSData, Quality } from '../utils/srsEngine';
import {
  applyCardReview,
  createClearedReviewProgress,
  createEmptySessionProgress,
} from '../utils/reviewProgress';
import type { LastActivityType, SessionProgress } from '../types/models';

interface SrsState {
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  setSrsDataAndLearnedCards: (srs: Record<string, SRSData>, learned: string[]) => void;
  markCardReviewed: (cardId: string, quality: Quality) => void;

  sessionProgress: SessionProgress;
  startSession: () => void;
  addSessionXp: (amount: number) => void;
  incrementSessionCardsReviewed: (isNew: boolean) => void;
  resetSessionProgress: () => void;

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

  lastActivity: LastActivityType;
  setLastActivity: (activity: LastActivityType) => void;

  sessionProgressIndex: Record<string, number>;
  setSessionProgressIndex: (key: string, index: number) => void;
  clearSessionProgressIndex: (key: string) => void;

  resetProgress: () => void;
}

export const useSrsStore = create<SrsState>()((set) => ({
  srsData: {},
  learnedCards: [],
  setSrsDataAndLearnedCards: (srs, learned) => set({ srsData: srs, learnedCards: learned }),

  markCardReviewed: (cardId, quality) => set((state) => (
    applyCardReview(state, cardId, quality)
  )),

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

  lastActivity: null,
  setLastActivity: (activity) => set({ lastActivity: activity }),

  sessionProgressIndex: {},
  setSessionProgressIndex: (key, index) => set((s) => ({
    sessionProgressIndex: { ...s.sessionProgressIndex, [key]: index },
  })),
  clearSessionProgressIndex: (key) => set((s) => {
    const nextProgress = { ...s.sessionProgressIndex };
    delete nextProgress[key];
    return { sessionProgressIndex: nextProgress };
  }),

  resetProgress: () => set({
    ...createClearedReviewProgress(),
    lastActivity: null,
  }),
}));
