import type { SRSData, Quality } from '../../utils/srs/srsEngine';
import { reviewSessionKey } from '../../utils/srs/sessionProgress';
import {
  applyCardReview,
  createClearedReviewProgress,
  createEmptySessionProgress,
} from '../../utils/srs/reviewProgress';
import type {
  PracticeHeaderActions,
  SessionProgress,
} from '../../types/models';

export interface LearningState {
  // SRS and Tracking
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  setSrsDataAndLearnedCards: (srs: Record<string, SRSData>, learned: string[]) => void;
  markCardReviewed: (cardId: string, quality: Quality) => void;
  /**
   * Per-user reset epoch last applied on this device (user id -> ISO time of
   * `user_profiles.progress_reset_at`). Keyed by user so it survives account
   * switches; compared on every pull to wipe progress reset on another device.
   */
  progressResetSeen: Record<string, string>;
  setProgressResetSeen: (userId: string, resetAt: string) => void;
  /** Words the learner mixed up, both ways (card id -> up to 3 recent card ids): the quiz offers them as wrong choices. */
  wordConfusions: Record<string, string[]>;
  recordConfusion: (cardId: string, confusedWithId: string) => void;

  // Session Progress
  sessionProgress: SessionProgress;
  startSession: () => void;
  incrementSessionCardsReviewed: (isNew: boolean) => void;
  resetSessionProgress: () => void;

  // Last Activity
  lastActivity: 'flashcards' | 'flashcards-review' | 'listening' | 'quiz' | 'writing' | 'tones' | 'personal-vocab' | null;
  setLastActivity: (activity: LearningState['lastActivity']) => void;

  // Session Progress Index
  sessionProgressIndex: Record<string, number>;
  /** Card ids in the order a shuffled session was left in; absent when the deck is in its natural order. */
  sessionCardOrder: Record<string, string[]>;
  /**
   * Saves where a session stopped; pass the card order only when it is shuffled, and
   * `reviewIds` (the missed cards, in order) only while a flashcard review pass is running.
   * Review ids live in `sessionCardOrder` under `reviewSessionKey(key)`.
   */
  setSessionProgressIndex: (key: string, index: number, cardOrder?: string[] | null, reviewIds?: string[] | null) => void;
  clearSessionProgressIndex: (key: string) => void;

  // Deck Exclusions
  /**
   * Per-deck include/exclude curation: deck key → ids the user removed from
   * the deck. Persisted so a curated vocabulary list survives reloads; an
   * absent/empty entry means "include everything".
   */
  deckExclusions: Record<string, string[]>;
  /** Replace the whole exclusion list for a deck key (empty writes delete the key). */
  setDeckExclusions: (key: string, excludedIds: string[]) => void;
  /** Toggle one card in a deck's exclusion list. */
  toggleCardExclusion: (key: string, cardId: string) => void;
  /** Restore a deck to "include everything". */
  clearDeckExclusions: (key: string) => void;

  resetProgress: () => void;
}

interface LearningSetState {
  srsData: Record<string, SRSData>;
  progressResetSeen: Record<string, string>;
  wordConfusions: Record<string, string[]>;
  learnedCards: string[];
  sessionProgress: SessionProgress;
  lastActivity: LearningState['lastActivity'];
  sessionProgressIndex: Record<string, number>;
  sessionCardOrder: Record<string, string[]>;
  deckExclusions: Record<string, string[]>;
  // Cross-domain flags cleared by the manual progress reset.
  isReviewMode: boolean;
  activeReviewSessionCards: string[] | null;
  swipeFeedback: { text: string; type: 'learned' | 'review' | 'neutral' } | null;
}

type SetState = (partial: Partial<LearningSetState> | ((state: LearningSetState) => Partial<LearningSetState>)) => void;

export function createLearningSlice(set: SetState): LearningState {
  return {
    srsData: {},
    learnedCards: [],
    setSrsDataAndLearnedCards: (srs, learned) => set({ srsData: srs, learnedCards: learned }),
    markCardReviewed: (cardId, quality) => set((state) => (
      applyCardReview(state, cardId, quality)
    )),
    progressResetSeen: {},
    setProgressResetSeen: (userId, resetAt) => set((s) => (
      s.progressResetSeen[userId] === resetAt
        ? {}
        : { progressResetSeen: { ...s.progressResetSeen, [userId]: resetAt } }
    )),
    wordConfusions: {},
    recordConfusion: (cardId, confusedWithId) => set((s) => {
      if (cardId === confusedWithId) return {};
      const add = (id: string, other: string) => [other, ...(s.wordConfusions[id] ?? []).filter((x) => x !== other)].slice(0, 3);
      return {
        wordConfusions: { ...s.wordConfusions, [cardId]: add(cardId, confusedWithId), [confusedWithId]: add(confusedWithId, cardId) },
      };
    }),

    sessionProgress: createEmptySessionProgress(),
    startSession: () => set((s) => ({
      sessionProgress: { ...s.sessionProgress, startTime: Date.now() },
    })),
    incrementSessionCardsReviewed: (isNew) => set((s) => ({
      sessionProgress: {
        ...s.sessionProgress,
        cardsReviewed: s.sessionProgress.cardsReviewed + 1,
        cardsLearned: isNew ? s.sessionProgress.cardsLearned + 1 : s.sessionProgress.cardsLearned,
      },
    })),
    resetSessionProgress: () => set({ sessionProgress: createEmptySessionProgress() }),

    lastActivity: null,
    setLastActivity: (activity) => set({ lastActivity: activity }),

    sessionProgressIndex: {},
    sessionCardOrder: {},
    setSessionProgressIndex: (key, index, cardOrder = null, reviewIds = null) => set((s) => {
      const nextOrder = { ...s.sessionCardOrder };
      if (cardOrder) nextOrder[key] = cardOrder;
      else delete nextOrder[key];
      if (reviewIds) nextOrder[reviewSessionKey(key)] = reviewIds;
      else delete nextOrder[reviewSessionKey(key)];
      return {
        sessionProgressIndex: { ...s.sessionProgressIndex, [key]: index },
        sessionCardOrder: nextOrder,
      };
    }),
    clearSessionProgressIndex: (key) => set((s) => {
      const nextProgress = { ...s.sessionProgressIndex };
      const nextOrder = { ...s.sessionCardOrder };
      delete nextProgress[key];
      delete nextOrder[key];
      delete nextOrder[reviewSessionKey(key)];
      return { sessionProgressIndex: nextProgress, sessionCardOrder: nextOrder };
    }),

    deckExclusions: {},
    setDeckExclusions: (key, excludedIds) => set((s) => {
      const next = { ...s.deckExclusions };
      if (excludedIds.length === 0) {
        delete next[key];
      } else {
        next[key] = Array.from(new Set(excludedIds));
      }
      return { deckExclusions: next };
    }),
    toggleCardExclusion: (key, cardId) => set((s) => {
      const current = s.deckExclusions[key] ?? [];
      const nextList = current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId];
      const next = { ...s.deckExclusions };
      if (nextList.length === 0) {
        delete next[key];
      } else {
        next[key] = nextList;
      }
      return { deckExclusions: next };
    }),
    clearDeckExclusions: (key) => set((s) => {
      if (!(key in s.deckExclusions)) return {};
      const next = { ...s.deckExclusions };
      delete next[key];
      return { deckExclusions: next };
    }),

    resetProgress: () => set({
      ...createClearedReviewProgress(),
      wordConfusions: {},
      lastActivity: null,
      isReviewMode: false,
      activeReviewSessionCards: null,
      swipeFeedback: null,
    }),
  };
}

/** Persisted slices owned by this domain. */
export const LEARNING_PERSISTED_KEYS = [
  'srsData',
  'learnedCards',
  'sessionProgressIndex',
  'sessionCardOrder',
  'deckExclusions',
  'progressResetSeen',
  'wordConfusions',
] as const;

/** Keys this domain clears when the signed-in account changes. */
export const LEARNING_ACCOUNT_SWITCH_DEFAULTS = {
  srsData: {},
  learnedCards: [],
  sessionProgress: createEmptySessionProgress(),
  sessionProgressIndex: {},
  sessionCardOrder: {},
  lastActivity: null,
  // Deck curation is user-scoped content: it must not leak across accounts.
  deckExclusions: {},
  wordConfusions: {},
};

export type PracticeHeaderActionsState = PracticeHeaderActions;
