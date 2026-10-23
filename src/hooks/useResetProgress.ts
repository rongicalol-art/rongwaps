import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { userService } from '../services/userService';

interface UseResetProgressOptions {
  currentUser: { id: string } | null;
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
    const owner = useAppStore.getState().currentUser;
    if ((owner?.id ?? null) !== (currentUser?.id ?? null)) throw new Error('Account changed before reset.');
    const isCurrent = () => useAppStore.getState().currentUser === owner;
    if (currentUser && useAppStore.getState().syncStatus === 'syncing') {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          unsubscribe();
          reject(new Error('Cloud sync did not become idle before reset.'));
        }, 10_000);
        const unsubscribe = useAppStore.subscribe((state) => {
          if (state.currentUser === owner && state.syncStatus === 'syncing') return;
          window.clearTimeout(timeout);
          unsubscribe();
          if (state.currentUser === owner) resolve();
          else reject(new Error('Account changed before reset.'));
        });
      });
    }
    if (!isCurrent()) return;
    // Snapshot after active sync settles so a failed reset restores its latest
    // acknowledged outbox and progress, not the state from before the wait.
    const appState = useAppStore.getState();
    const appSnapshot = {
      reviewEvents: appState.reviewEvents,
      pendingReviewEvents: appState.pendingReviewEvents,
      dailyReviewPlan: appState.dailyReviewPlan,
      learningBatches: appState.learningBatches,
      wordConfusions: appState.wordConfusions,
      srsData: appState.srsData,
      learnedCards: appState.learnedCards,
      sessionProgress: appState.sessionProgress,
      sessionProgressIndex: appState.sessionProgressIndex,
      sessionCardOrder: appState.sessionCardOrder,
      lastActivity: appState.lastActivity,
      isReviewMode: appState.isReviewMode,
      activeReviewSessionCards: appState.activeReviewSessionCards,
      swipeFeedback: appState.swipeFeedback,
      startedPartIds: appState.startedPartIds,
      completedPageIds: appState.completedPageIds,
      completedPartIds: appState.completedPartIds,
    };

    appState.resetProgress();
    appState.resetGrammarProgress();

    try {
      if (currentUser) {
        // Remember the reset epoch so this device does not wipe itself again
        // when the next pull reports the reset it just performed.
        const resetAt = await userService.resetLearningProgress(currentUser.id);
        if (!isCurrent()) return;
        if (resetAt) useAppStore.getState().setProgressResetSeen(currentUser.id, resetAt);
      }
      onActivityCleared();
      onGrammarCleared();
    } catch (error) {
      if (isCurrent()) useAppStore.setState(appSnapshot);
      throw error;
    }
  }, [currentUser, onActivityCleared, onGrammarCleared]);
}
