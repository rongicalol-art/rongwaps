import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useGrammarLessonStore } from '../store/useGrammarLessonStore';
import { userService } from '../services/userService';

interface UseResetProgressOptions {
  currentUser: unknown;
  onActivityCleared: () => void;
  onGrammarCleared: () => void;
}

/**
 * Resets all learning progress (app SRS, grammar store)
 * and mirrors the reset to Supabase when signed in.
 *
 * If cloud sync is currently running, waits for it to become idle before
 * resetting so a stale sync cannot re-overwrite the cleared state.
 * On failure, restores the pre-reset snapshots and rethrows.
 */
export function useResetProgress({
  currentUser,
  onActivityCleared,
  onGrammarCleared,
}: UseResetProgressOptions) {
  return useCallback(async () => {
    const appState = useAppStore.getState();
    const grammarState = useGrammarLessonStore.getState();
    const appSnapshot = {
      srsData: appState.srsData,
      learnedCards: appState.learnedCards,
      sessionProgress: appState.sessionProgress,
      currentStreak: appState.currentStreak,
      longestStreak: appState.longestStreak,
      totalXp: appState.totalXp,
      totalCardsReviewed: appState.totalCardsReviewed,
      totalCardsLearned: appState.totalCardsLearned,
      lastStudyDate: appState.lastStudyDate,
      sessionProgressIndex: appState.sessionProgressIndex,
      lastActivity: appState.lastActivity,
      isReviewMode: appState.isReviewMode,
      activeReviewSessionCards: appState.activeReviewSessionCards,
      swipeFeedback: appState.swipeFeedback,
    };
    const grammarSnapshot = {
      startedPartIds: grammarState.startedPartIds,
      completedPageIds: grammarState.completedPageIds,
      completedPartIds: grammarState.completedPartIds,
    };

    if (currentUser && appState.syncStatus === 'syncing') {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          unsubscribe();
          reject(new Error('Cloud sync did not become idle before reset.'));
        }, 10_000);
        const unsubscribe = useAppStore.subscribe((state) => {
          if (state.syncStatus === 'syncing') return;
          window.clearTimeout(timeout);
          unsubscribe();
          resolve();
        });
      });
    }

    appState.resetProgress();
    grammarState.resetProgress();

    try {
      if (currentUser) await userService.resetLearningProgress();
      onActivityCleared();
      onGrammarCleared();
    } catch (error) {
      useAppStore.setState(appSnapshot);
      useGrammarLessonStore.setState(grammarSnapshot);
      throw error;
    }
  }, [currentUser, onActivityCleared, onGrammarCleared]);
}