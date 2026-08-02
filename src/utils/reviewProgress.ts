import type { SessionProgress } from '../types/models';
import {
  calculateNextReview,
  type Quality,
  type SRSData,
} from './srsEngine';
import { calculateXpForReview } from './xpSystem';

export interface ReviewProgressState {
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  sessionProgress: SessionProgress;
  currentStreak: number;
  totalXp: number;
  totalCardsReviewed: number;
  totalCardsLearned: number;
}

export type ReviewProgressUpdate = Pick<
  ReviewProgressState,
  | 'srsData'
  | 'learnedCards'
  | 'sessionProgress'
  | 'totalXp'
  | 'totalCardsReviewed'
  | 'totalCardsLearned'
>;

export interface ClearedReviewProgress extends ReviewProgressUpdate {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: null;
  sessionProgressIndex: Record<string, number>;
}

export function createEmptySessionProgress(): SessionProgress {
  return {
    xpEarned: 0,
    cardsReviewed: 0,
    cardsLearned: 0,
    startTime: null as unknown as number,
  };
}

export function applyCardReview(
  state: ReviewProgressState,
  cardId: string,
  quality: Quality,
): ReviewProgressUpdate {
  const existingReview = state.srsData[cardId];
  const alreadyInLearnedCards = state.learnedCards.includes(cardId);
  const wasPreviouslyLearned = alreadyInLearnedCards || (existingReview?.repetition ?? 0) > 0;
  const isSuccessfulReview = quality >= 3;
  const isFirstSuccessfulReview = isSuccessfulReview && !wasPreviouslyLearned;
  const shouldRepairLearnedCards = isSuccessfulReview && !alreadyInLearnedCards;
  const xpGained = isSuccessfulReview
    ? calculateXpForReview(quality, isFirstSuccessfulReview, state.currentStreak)
    : 0;

  return {
    srsData: {
      ...state.srsData,
      [cardId]: calculateNextReview(existingReview, cardId, quality),
    },
    learnedCards: shouldRepairLearnedCards
      ? [...state.learnedCards, cardId]
      : state.learnedCards,
    sessionProgress: {
      ...state.sessionProgress,
      xpEarned: state.sessionProgress.xpEarned + xpGained,
      cardsReviewed: state.sessionProgress.cardsReviewed + 1,
      cardsLearned: state.sessionProgress.cardsLearned + (isFirstSuccessfulReview ? 1 : 0),
    },
    totalXp: state.totalXp + xpGained,
    totalCardsReviewed: state.totalCardsReviewed + 1,
    totalCardsLearned: state.totalCardsLearned + (isFirstSuccessfulReview ? 1 : 0),
  };
}

export function createClearedReviewProgress(): ClearedReviewProgress {
  return {
    srsData: {},
    learnedCards: [],
    sessionProgress: createEmptySessionProgress(),
    currentStreak: 0,
    longestStreak: 0,
    totalXp: 0,
    totalCardsReviewed: 0,
    totalCardsLearned: 0,
    lastStudyDate: null,
    sessionProgressIndex: {},
  };
}
