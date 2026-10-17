import type { ReviewContext, ReviewEvent } from './reviewEvents';
import type { SessionProgress } from '../../types/models';
import {
  calculateNextReview,
  type Quality,
  type SRSData,
} from './srsEngine';

export interface ReviewProgressState {
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  sessionProgress: SessionProgress;
  reviewEvents?: ReviewEvent[];
}

export type ReviewProgressUpdate = Pick<
  ReviewProgressState,
  'srsData' | 'learnedCards' | 'sessionProgress'
>;

export interface ClearedReviewProgress extends ReviewProgressUpdate {
  sessionProgressIndex: Record<string, number>;
  sessionCardOrder: Record<string, string[]>;
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
  context?: ReviewContext,
): ReviewProgressUpdate & { reviewEvents?: ReviewEvent[]; pendingReviewEvents?: ReviewEvent[] } {
  const now = Date.now();
  const history = state.reviewEvents ?? [];
  if (context && history.some(event => event.id === context.id)) return { srsData: state.srsData, learnedCards: state.learnedCards, sessionProgress: state.sessionProgress };
  const existingReview = state.srsData[cardId];
  const alreadyInLearnedCards = state.learnedCards.includes(cardId);
  const wasPreviouslyLearned = alreadyInLearnedCards || (existingReview?.repetition ?? 0) > 0;
  const isSuccessfulReview = quality >= 3;
  const isFirstSuccessfulReview = isSuccessfulReview && !wasPreviouslyLearned;
  const shouldRepairLearnedCards = isSuccessfulReview && !alreadyInLearnedCards;

  // Immediate follow-up quizzes/replays are observations, not another spaced
  // success. Only due cards (or genuinely new cards) advance the scheduler.
  const scheduled = !context?.practiceOnly && (!existingReview || existingReview.nextReviewDate <= now);
  const after = scheduled ? calculateNextReview(existingReview, cardId, quality, now) : existingReview;
  const event: ReviewEvent | null = context ? {
    ...context, durationMs: Math.max(0, Math.min(300_000, context.durationMs)),
    cardId, quality, reviewedAt: now, scheduled, before: existingReview ?? null, after: after ?? null,
  } : null;
  return {
    ...(event ? { reviewEvents: [...history, event] } : {}),
    srsData: {
      ...state.srsData,
      ...(after ? { [cardId]: after } : {}),
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
    sessionCardOrder: {},
  };
}
