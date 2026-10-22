import type { ActivityType, LessonPartSelectionMap } from '../types/models';
import { loadActivityDeck } from '../hooks/useActivityDataLoader';
import { loadPracticeScreen, practiceScreenKey } from '../screens/activities/practiceScreens';
import { isHanziChar } from './characters/hanzi';
import { warmChineseFont } from './browser/fontWarmup';
import { FLASHCARD_EXTRAS_CACHE_LIMIT } from './vocabulary/flashcardExtrasPack';

/** Fetches the activity-screen chunk (the modal shell itself is eager). Resolves once it can render synchronously. */
export async function preloadPracticeChunks(activity?: ActivityType | null): Promise<void> {
  warmChineseFont();
  await loadPracticeScreen(practiceScreenKey(activity ?? 'flashcards') ?? 'flashcards');
}

/** Warm only reachable modes; cleanup cancels work if the session closes first. */
export function preloadRemainingPracticeChunks(activity: ActivityType): (() => void) | undefined {
  if (typeof window === 'undefined' || !activity) return;
  const current = practiceScreenKey(activity);
  // A dock is navigation, not intent to download every other activity.
  if (current !== 'flashcards') return;
  const run = () => {
    if (!document.hidden) void loadPracticeScreen('quiz').catch(() => {});
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
  selectedLessonParts?: LessonPartSelectionMap;
  activity: ActivityType;
  isLibraryMode?: boolean;
  isReviewMode?: boolean;
}

/**
 * Prefetch on intent (lesson window shown, pointerdown on Start): the screen chunk and the
 * deck land in the same caches the modal reads, so the real open is warm.
 */
export function prefetchPractice(intent: PracticeIntent): Promise<unknown> {
  const isCurriculumDeck = !intent.isReviewMode && !intent.isLibraryMode
    && intent.activity !== 'flashcards-review' && intent.activity !== 'flashcards-library';
  const deckPromise = isCurriculumDeck
    ? loadActivityDeck({
      activeBookId: intent.activeBookId,
      selectedLessons: intent.selectedLessons,
      selectedLessonParts: intent.selectedLessonParts,
    }).then(({ cards }) => {
      const firstCard = cards[0];
      if (!firstCard || intent.activity !== 'flashcards') return;
      const characters = Array.from(new Set(Array.from(firstCard.front).filter(isHanziChar)));
      void Promise.all([
        import('../features/flashcards').then(({ preloadFlashcardContent }) => preloadFlashcardContent([firstCard])),
        import('../services/breakdownService').then(({ getMultipleBreakdowns }) => getMultipleBreakdowns(characters)),
      ]).catch(() => {});
    })
    : undefined;

  return Promise.all([
    preloadPracticeChunks(intent.activity),
    deckPromise,
  ]).catch(() => undefined);
}

/** Normal lessons prepare completely; bulk review keeps a bounded initial working set. */
export async function preparePracticeData(cards: readonly import('../data/flashcards').Flashcard[], signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const studyCards = cards.slice(0, FLASHCARD_EXTRAS_CACHE_LIMIT);
  const [content, dictionary, packs, audio] = await Promise.all([
    import('../features/flashcards/content/flashcardContent'),
    import('../services/dictionaryService'), import('../services/contentPacks'), import('../services/audioService'),
  ]);
  signal.throwIfAborted();
  await packs.prepareStudyPacks(studyCards, signal);
  signal.throwIfAborted();
  const words = [...new Set(studyCards.flatMap((card) => [card.front, card.traditional, card.simplified]).filter((word): word is string => Boolean(word)))];
  let audioFailed = false;
  await Promise.all([
    content.preloadFlashcardContent(studyCards, signal),
    dictionary.getDictionaryEntriesBatch(words, signal),
    audio.audioService.preload(studyCards.slice(0, 4).map((card) => card.audio), signal, (progress) => { audioFailed = progress.failed > 0; }),
  ]);
  signal.throwIfAborted();
  if (audioFailed) throw new Error('Recording download failed');
  await audio.audioService.prepareRecording(studyCards[0]?.audio, signal);
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
