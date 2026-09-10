import type { SRSData, Quality } from '../../utils/srsEngine';
import {
  applyCardReview,
  createClearedReviewProgress,
  createEmptySessionProgress,
} from '../../utils/reviewProgress';
import type {
  LessonPartSelectionMap,
  PartSegment,
  PracticeHeaderActions,
  SessionProgress,
} from '../../types/models';

export interface LearningState {
  // SRS and Tracking
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  setSrsDataAndLearnedCards: (srs: Record<string, SRSData>, learned: string[]) => void;
  markCardReviewed: (cardId: string, quality: Quality) => void;

  // Session Progress
  sessionProgress: SessionProgress;
  startSession: () => void;
  incrementSessionCardsReviewed: (isNew: boolean) => void;
  resetSessionProgress: () => void;

  // Last Activity
  lastActivity: 'flashcards' | 'flashcards-review' | 'listening' | 'quiz' | 'writing' | 'personal-vocab' | null;
  setLastActivity: (activity: LearningState['lastActivity']) => void;

  // Session Progress Index
  sessionProgressIndex: Record<string, number>;
  setSessionProgressIndex: (key: string, index: number) => void;
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
  learnedCards: string[];
  sessionProgress: SessionProgress;
  lastActivity: LearningState['lastActivity'];
  sessionProgressIndex: Record<string, number>;
  deckExclusions: Record<string, string[]>;
  // Cross-domain flags cleared by the manual progress reset.
  isReviewMode: boolean;
  activeReviewSessionCards: string[] | null;
  swipeFeedback: { text: string; type: 'learned' | 'review' } | null;
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
    setSessionProgressIndex: (key, index) => set((s) => ({
      sessionProgressIndex: { ...s.sessionProgressIndex, [key]: index },
    })),
    clearSessionProgressIndex: (key) => set((s) => {
      const nextProgress = { ...s.sessionProgressIndex };
      delete nextProgress[key];
      return { sessionProgressIndex: nextProgress };
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
  'deckExclusions',
] as const;

/**
 * Keys this domain clears when the signed-in account changes. NOTE: today the
 * account switch deliberately does NOT clear deckExclusions (content
 * curation), matching the previous hand-written reset — flagged in
 * DECISIONS.md as an open question, not silently changed.
 */
export const LEARNING_ACCOUNT_SWITCH_DEFAULTS = {
  srsData: {},
  learnedCards: [],
  sessionProgress: createEmptySessionProgress(),
  sessionProgressIndex: {},
  lastActivity: null,
};

export type PracticeHeaderState = {
  progress: number;
  currentIndex: number;
  totalCount: number;
  showLightbulb: boolean;
  partSegments: PartSegment[];
};

export type PracticeHeaderActionsState = PracticeHeaderActions;
