import type { ActivityType } from '../types/models';
import { loadActivityDeck } from '../hooks/useActivityDataLoader';

/**
 * Preloads the chunk for the given activity (and ActivityModals shell)
 * so that when the study window opens, the JavaScript bundle is ready.
 */
export async function preloadPracticeChunks(activity?: ActivityType | null): Promise<void> {
  const promises: Promise<unknown>[] = [
    import('../screens/activities/ActivityModals'),
  ];

  if (!activity || activity === 'flashcards' || activity === 'flashcards-review' || activity === 'flashcards-library') {
    promises.push(import('../screens/flashcard'));
  } else if (activity === 'quiz') {
    promises.push(import('../screens/quiz'));
  } else if (activity === 'listening') {
    promises.push(import('../screens/listening'));
  } else if (activity === 'writing') {
    promises.push(import('../screens/writing'));
  }

  await Promise.all(promises);
}

/**
 * In idle time, preloads the remaining practice activity chunks so
 * mode switching in PracticeModeDock is instantaneous with zero stutter.
 */
export function preloadRemainingPracticeChunks(): void {
  if (typeof window === 'undefined') return;

  const run = () => {
    void import('../screens/flashcard');
    void import('../screens/quiz');
    void import('../screens/listening');
    void import('../screens/writing');
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 150);
  }
}

export interface LoadPracticeSessionOptions {
  activeBookId: number;
  selectedLessons: number[];
  activity: ActivityType;
  isLibraryMode?: boolean;
  isReviewMode?: boolean;
}

/**
 * Pipelined session loader that fetches the activity code chunks,
 * lesson card data, and audio pre-warming concurrently.
 */
export async function loadPracticeSession(options: LoadPracticeSessionOptions): Promise<void> {
  await Promise.all([
    preloadPracticeChunks(options.activity),
    loadActivityDeck({
      activeBookId: options.activeBookId,
      selectedLessons: options.selectedLessons,
      isReviewDeck: options.isReviewMode || options.activity === 'flashcards-review',
      isLibraryDeck: options.isLibraryMode || options.activity === 'flashcards-library',
    }),
  ]);

  // Once active session is ready, schedule pre-warming for remaining modes
  preloadRemainingPracticeChunks();
}

/**
 * Returns the appropriate message for the loading screen.
 */
export function getPracticeLoadingMessage(
  activity: ActivityType | null,
  isReviewMode = false,
  isLibraryMode = false,
): string {
  if (isReviewMode || activity === 'flashcards-review') {
    return 'Loading review…';
  }
  if (isLibraryMode || activity === 'flashcards-library') {
    return 'Loading deck…';
  }
  return 'Loading lesson…';
}
