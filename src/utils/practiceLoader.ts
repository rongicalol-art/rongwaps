import type { ActivityType } from '../types/models';
import { loadActivityDeck } from '../hooks/useActivityDataLoader';
import { loadPracticeScreen, practiceScreenKey } from '../screens/activities/practiceScreens';

/** Fetches the activity-screen chunk (the modal shell itself is eager). Resolves once it can render synchronously. */
export async function preloadPracticeChunks(activity?: ActivityType | null): Promise<void> {
  await loadPracticeScreen(practiceScreenKey(activity ?? 'flashcards') ?? 'flashcards');
}

/** In idle time, preloads the remaining activity chunks so mode switching in the dock is instant. */
export function preloadRemainingPracticeChunks(): void {
  if (typeof window === 'undefined') return;
  const run = () => {
    void loadPracticeScreen('flashcards');
    void loadPracticeScreen('quiz');
    void loadPracticeScreen('listening');
    void loadPracticeScreen('writing');
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 150);
  }
}

export interface PracticeIntent {
  activeBookId: number;
  selectedLessons: number[];
  activity: ActivityType;
  isLibraryMode?: boolean;
  isReviewMode?: boolean;
}

/**
 * Prefetch on intent (lesson window shown, pointerdown on Start): the screen chunk and the
 * deck land in the same caches the modal reads, so the real open is warm.
 */
export function prefetchPractice(intent: PracticeIntent): Promise<unknown> {
  return Promise.all([
    preloadPracticeChunks(intent.activity),
    // Review and library decks depend on live state (SRS, folders); only curriculum decks are prefetched.
    intent.isReviewMode || intent.isLibraryMode || intent.activity === 'flashcards-review' || intent.activity === 'flashcards-library'
      ? undefined
      : loadActivityDeck({ activeBookId: intent.activeBookId, selectedLessons: intent.selectedLessons }),
  ]).catch(() => undefined);
}

/** Loader message for the practice modal. */
export function getPracticeLoadingMessage(
  activity: ActivityType | null,
  isReviewMode = false,
  isLibraryMode = false,
): string {
  if (isReviewMode || activity === 'flashcards-review') return 'Loading review…';
  if (isLibraryMode || activity === 'flashcards-library') return 'Loading deck…';
  return 'Loading lesson…';
}
