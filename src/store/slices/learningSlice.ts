import { archiveOldReviews, EMPTY_REVIEW_ARCHIVE, mergeReviewEvents, REVIEW_KEEP_MS, type ReviewArchive, type ReviewContext, type ReviewEvent } from '../../utils/srs/reviewEvents';
import { type DailyReviewPlan } from '../../utils/srs/reviewSession';
import type { SRSData, Quality } from '../../utils/srs/srsEngine';
import { reviewSessionKey } from '../../utils/srs/sessionProgress';
import {
  applyCardReview,
  createClearedReviewProgress,
  createEmptySessionProgress,
  type ReviewOptions,
} from '../../utils/srs/reviewProgress';
import type { SessionProgress } from '../../types/models';

export interface LearningState {
  learningBatches: Record<string, string[]>;
  setLearningBatch: (key: string, ids: string[] | null) => void;
  // SRS and Tracking
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  setSrsDataAndLearnedCards: (srs: Record<string, SRSData>, learned: string[]) => void;
  markCardReviewed: (cardId: string, quality: Quality, context?: ReviewContext, options?: ReviewOptions) => void;
  reviewEvents: ReviewEvent[];
  pendingReviewEvents: ReviewEvent[];
  /** Answers older than the keep window, as totals and study days (see `ReviewArchive`). */
  reviewArchive: ReviewArchive;
  /**
   * `after`: a reset happened then; drop everything before it. `full`: `events` is the server's whole history
   * (a first or full pull), so the archive is rebuilt from it; otherwise older answers in `events` are skipped,
   * because this device cannot tell whether its archive already counts them.
   */
  mergeReviewHistory: (events: ReviewEvent[], after?: number, full?: boolean) => void;
  acknowledgeReviewEvents: (ids: string[]) => void;
  dailyReviewPlan: DailyReviewPlan | null;
  setDailyReviewPlan: (plan: DailyReviewPlan | null) => void;
  /**
   * Per-user reset epoch last applied on this device (user id -> ISO time of
   * `user_profiles.progress_reset_at`). Keyed by user so it survives account
   * switches; compared on every pull to wipe progress reset on another device.
   */
  progressResetSeen: Record<string, string>;
  setProgressResetSeen: (userId: string, resetAt: string) => void;
  /** The local day (`localDay`) the streak moment last played on this device, so it plays once a day. */
  streakCelebratedDay: string | null;
  setStreakCelebratedDay: (day: string) => void;
  /** Words the learner mixed up, both ways (card id -> up to 3 recent card ids): the quiz offers them as wrong choices. */
  wordConfusions: Record<string, string[]>;
  recordConfusion: (cardId: string, confusedWithId: string) => void;

  // Session Progress
  sessionProgress: SessionProgress;
  startSession: () => void;
  incrementSessionCardsReviewed: (isNew: boolean) => void;
  resetSessionProgress: () => void;

  // Last Activity
  lastActivity: 'flashcards' | 'flashcards-review' | 'listening' | 'quiz' | 'writing' | 'pinyin' | 'tones' | 'sentences' | 'personal-vocab' | null;
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
  learningBatches: Record<string, string[]>;
  reviewEvents: ReviewEvent[];
  pendingReviewEvents: ReviewEvent[];
  reviewArchive: ReviewArchive;
  dailyReviewPlan: DailyReviewPlan | null;
  srsData: Record<string, SRSData>;
  progressResetSeen: Record<string, string>;
  streakCelebratedDay: string | null;
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
    learningBatches: {},
    setLearningBatch: (key, ids) => set(s => {
      const next = { ...s.learningBatches };
      if (ids?.length) next[key] = ids;
      else delete next[key];
      return { learningBatches: next };
    }),
    srsData: {},
    learnedCards: [],
    setSrsDataAndLearnedCards: (srs, learned) => set({ srsData: srs, learnedCards: learned }),
    reviewEvents: [],
    pendingReviewEvents: [],
    reviewArchive: EMPTY_REVIEW_ARCHIVE,
    dailyReviewPlan: null,
    setDailyReviewPlan: (dailyReviewPlan) => set({ dailyReviewPlan }),
    mergeReviewHistory: (events, after = 0, full = false) => set(s => {
      // Most pulls bring nothing new (only the overlap window again): keep the same arrays, so nothing re-renders or is saved.
      if (after <= 0 && !full) {
        const known = new Set(s.reviewEvents.map(e => e.id));
        const stillPending = new Set(s.pendingReviewEvents.map(e => e.id));
        if (events.every(e => known.has(e.id) && !stillPending.has(e.id))) return {};
      }
      const now = Date.now();
      const incoming = full || after > 0 ? events : events.filter(e => e.reviewedAt >= now - REVIEW_KEEP_MS);
      const kept = archiveOldReviews(mergeReviewEvents(s.reviewEvents, incoming, after), full || after > 0 ? EMPTY_REVIEW_ARCHIVE : s.reviewArchive, now);
      return {
        reviewEvents: kept.events,
        reviewArchive: kept.archive,
        pendingReviewEvents: s.pendingReviewEvents.filter(e => e.reviewedAt > after && !events.some(incoming => incoming.id === e.id)),
        dailyReviewPlan: after > 0 ? null : s.dailyReviewPlan,
      };
    }),
    acknowledgeReviewEvents: (ids) => set(s => {
      const uploaded = new Set(ids);
      return { pendingReviewEvents: s.pendingReviewEvents.filter(e => !uploaded.has(e.id)) };
    }),
    markCardReviewed: (cardId, quality, context, options) => set((state) => {
      const result = applyCardReview(state, cardId, quality, context, options);
      const event = result.reviewEvents?.at(-1);
      const isNewEvent = event && !state.reviewEvents.some(e => e.id === event.id);
      const plan = state.dailyReviewPlan;
      // Study time is added per answer (the same sum dailyReviewGoal makes from the events), never on a timer:
      // a saved value that changes every second rewrites the whole saved state every second.
      const addedMs = isNewEvent && !context?.practiceOnly ? Math.max(0, context?.durationMs ?? 0) : 0;
      const dailyReviewPlan = context?.source === 'daily' && plan && (addedMs > 0 || !(cardId in plan.answers))
        ? { ...plan, activeMs: plan.activeMs + addedMs,
          answers: cardId in plan.answers ? plan.answers : { ...plan.answers, [cardId]: quality } }
        : plan;
      // Fold answers that have aged out of the keep window into the archive (cheap check: the list is in time order).
      const kept = result.reviewEvents ? archiveOldReviews(result.reviewEvents, state.reviewArchive) : null;
      return { ...result, dailyReviewPlan,
        ...(kept && kept.events !== result.reviewEvents ? { reviewEvents: kept.events, reviewArchive: kept.archive } : {}),
        pendingReviewEvents: isNewEvent ? [...state.pendingReviewEvents, event] : state.pendingReviewEvents };
    }),
    progressResetSeen: {},
    setProgressResetSeen: (userId, resetAt) => set((s) => (
      s.progressResetSeen[userId] === resetAt
        ? {}
        : { progressResetSeen: { ...s.progressResetSeen, [userId]: resetAt } }
    )),
    streakCelebratedDay: null,
    setStreakCelebratedDay: (day) => set({ streakCelebratedDay: day }),
    wordConfusions: {},
    recordConfusion: (cardId, confusedWithId) => set((s) => {
      if (cardId === confusedWithId) return {};
      const add = (id: string, other: string) => [other, ...(s.wordConfusions[id] ?? []).filter((x) => x !== other)].slice(0, 3);
      // Reinsert touched words last so profile pairs retain recent-first order.
      const earlier = Object.fromEntries(Object.entries(s.wordConfusions)
        .filter(([id]) => id !== cardId && id !== confusedWithId));
      return {
        wordConfusions: { ...earlier, [confusedWithId]: add(confusedWithId, cardId), [cardId]: add(cardId, confusedWithId) },
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
      learningBatches: {},
      wordConfusions: {},
      reviewEvents: [],
      pendingReviewEvents: [],
      reviewArchive: EMPTY_REVIEW_ARCHIVE,
      dailyReviewPlan: null,
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
  'learningBatches',
  'reviewEvents',
  'pendingReviewEvents',
  'reviewArchive',
  'dailyReviewPlan',
  'learnedCards',
  'sessionProgressIndex',
  'sessionCardOrder',
  'deckExclusions',
  'progressResetSeen',
  'streakCelebratedDay',
  'wordConfusions',
] as const;

/** Keys this domain clears when the signed-in account changes. */
export const LEARNING_ACCOUNT_SWITCH_DEFAULTS = {
  learningBatches: {},
  reviewEvents: [],
  pendingReviewEvents: [],
  reviewArchive: EMPTY_REVIEW_ARCHIVE,
  dailyReviewPlan: null,
  srsData: {},
  learnedCards: [],
  sessionProgress: createEmptySessionProgress(),
  sessionProgressIndex: {},
  sessionCardOrder: {},
  lastActivity: null,
  // Deck curation is user-scoped content: it must not leak across accounts.
  deckExclusions: {},
  streakCelebratedDay: null,
  wordConfusions: {},
};
