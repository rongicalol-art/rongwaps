import { create } from 'zustand';
import { SRSData, Quality, calculateNextReview } from '../utils/srsEngine';
import { calculateXpForReview } from '../utils/xpSystem';
import type { SessionProgress } from '../types/models';

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

  lastActivity: 'flashcards' | 'flashcards-review' | 'listening' | 'quiz' | 'writing' | 'personal-vocab' | null;
  setLastActivity: (activity: 'flashcards' | 'flashcards-review' | 'listening' | 'quiz' | 'writing' | 'personal-vocab' | null) => void;

  sessionProgressIndex: Record<string, number>;
  setSessionProgressIndex: (key: string, index: number) => void;
  clearSessionProgressIndex: (key: string) => void;

  resetProgress: () => void;
}

const initialSessionProgress: SessionProgress = {
  xpEarned: 0,
  cardsReviewed: 0,
  cardsLearned: 0,
  startTime: null as unknown as number,
};

export const useSrsStore = create<SrsState>()((set, get) => ({
  srsData: {},
  learnedCards: [],
  setSrsDataAndLearnedCards: (srs, learned) => set({ srsData: srs, learnedCards: learned }),

  markCardReviewed: (cardId, quality) => {
    const state = get();
    const existing = state.srsData[cardId];
    const updatedData = calculateNextReview(existing, cardId, quality);
    const isNew = !existing || existing.repetition === 0;
    const xpGained = calculateXpForReview(quality, isNew, state.currentStreak);

    set((s) => ({
      srsData: { ...s.srsData, [cardId]: updatedData },
      learnedCards: isNew && quality >= 3
        ? [...new Set([...s.learnedCards, cardId])]
        : s.learnedCards,
      sessionProgress: {
        ...s.sessionProgress,
        xpEarned: s.sessionProgress.xpEarned + xpGained,
        cardsReviewed: s.sessionProgress.cardsReviewed + 1,
        cardsLearned: isNew && quality >= 3
          ? s.sessionProgress.cardsLearned + 1
          : s.sessionProgress.cardsLearned,
      },
    }));
  },

  sessionProgress: { ...initialSessionProgress },
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
  resetSessionProgress: () => set({ sessionProgress: { ...initialSessionProgress } }),

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
    const { [key]: _, ...rest } = s.sessionProgressIndex;
    return { sessionProgressIndex: rest };
  }),

  resetProgress: () => set({
    srsData: {},
    learnedCards: [],
    sessionProgress: { ...initialSessionProgress },
    sessionProgressIndex: {},
  }),
}));