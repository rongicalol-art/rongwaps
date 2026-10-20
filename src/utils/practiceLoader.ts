import type { ActivityType } from '../types/models';
import { loadActivityDeck } from '../hooks/useActivityDataLoader';
import { loadPracticeScreen, practiceScreenKey, type PracticeScreenKey } from '../screens/activities/practiceScreens';

/** Fetches the activity-screen chunk (the modal shell itself is eager). Resolves once it can render synchronously. */
export async function preloadPracticeChunks(activity?: ActivityType | null): Promise<void> {
  await loadPracticeScreen(practiceScreenKey(activity ?? 'flashcards') ?? 'flashcards');
}

/** Warm only reachable modes; cleanup cancels work if the session closes first. */
export function preloadRemainingPracticeChunks(activity: ActivityType, hasDock: boolean): (() => void) | undefined {
  if (typeof window === 'undefined' || !activity) return;
  const current = practiceScreenKey(activity);
  const modes: PracticeScreenKey[] = hasDock ? ['flashcards', 'quiz', 'listening', 'writing', 'pinyin', 'tones']
    : current === 'flashcards' ? ['quiz'] : [];
  if (modes.length === 0) return;
  const run = () => {
    if (!document.hidden) for (const mode of modes) {
      if (mode !== current) void loadPracticeScreen(mode).catch(() => {});
    }
  };
  if (window.requestIdleCallback && window.cancelIdleCallback) {
    const id = window.requestIdleCallback(run, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 150);
  return () => window.clearTimeout(id);
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
