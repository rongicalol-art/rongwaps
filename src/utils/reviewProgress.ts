import type { SessionProgress } from '../types/models';
import {
  calculateNextReview,
  type Quality,
  type SRSData,
} from './srsEngine';

export interface ReviewProgressState {
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  sessionProgress: SessionProgress;
}

export type ReviewProgressUpdate = Pick<
  ReviewProgressState,
  'srsData' | 'learnedCards' | 'sessionProgress'
>;

export interface ClearedReviewProgress extends ReviewProgressUpdate {
  sessionProgressIndex: Record<string, number>;
}

export function createEmptySessionProgress(): SessionProgress {
  return {
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
      cardsReviewed: state.sessionProgress.cardsReviewed + 1,
      cardsLearned: state.sessionProgress.cardsLearned + (isFirstSuccessfulReview ? 1 : 0),
    },
  };
}

export function createClearedReviewProgress(): ClearedReviewProgress {
  return {
    srsData: {},
    learnedCards: [],
    sessionProgress: createEmptySessionProgress(),
    sessionProgressIndex: {},
  };
}
