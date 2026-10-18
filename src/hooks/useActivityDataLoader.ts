import { debugLogger } from '../utils/debug/debugLogger';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Flashcard } from '../data/flashcards';
import { getCourseVocabLookupMap } from '../services/courseVocabLookup';
import { flashcardService } from '../services/flashcardService';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from './useAuth';
import { getDeckIdentityKey } from '../utils/lesson/lessonPartSelection';
import { filterDeckByExclusions, pruneExcludedIds } from '../utils/srs/deckExclusions';
import { audioService } from '../services/audioService';
import {
  isSameCards,
  mapCustomCardsToFlashcards,
} from '../utils/vocabulary/activityDataDerivations';
import {
  loadReviewDeck,
  fetchStarredDeckData,
  fetchCurriculumDeckData,
} from '../services/activityDeckFetcher';

interface CachedDeckEntry {
  cards: Flashcard[];
  knownIds: Set<string> | null;
  timestamp: number;
  userId: string | null;
  source?: object;
}

const activityDeckCache = new Map<string, CachedDeckEntry>();
const pendingDecks = new Map<string, {
  source?: object;
  userId: string | null;
  promise: Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }>;
}>();

export function getCachedActivityDeck(key: string): CachedDeckEntry | undefined {
  const cached = activityDeckCache.get(key);
  return cached?.userId === (useAppStore.getState().currentUser?.id ?? null) ? cached : undefined;
}

export function setCachedActivityDeck(key: string, entry: { cards: Flashcard[]; knownIds: Set<string> | null; source?: object }) {
  activityDeckCache.set(key, { ...entry, userId: useAppStore.getState().currentUser?.id ?? null, timestamp: Date.now() });
}

export function clearActivityDeckCache() {
  activityDeckCache.clear();
  pendingDecks.clear();
}

function preloadDeckAudio(cards: Flashcard[]): void {
  if (cards.length === 0) return;
  audioService.preload(cards.slice(0, 1).map((c) => c.audio));
  const initialWarm = cards
    .slice(0, 1)
    .filter((card) => card.source !== 'dictionary' && !audioService.isAudioFileName(card.audio))
    .map((c) => c.front.trim())
    .filter(Boolean);
  if (initialWarm.length > 0) {
    void audioService.preloadNeural(initialWarm);
  }
}

export function useActivityDataLoader(
  activeBookId: number,
  selectedLessons: number[],
  isReviewDeck: boolean = false,
  isLibraryDeck: boolean = false,
) {
  const effectiveLibraryDeck = isLibraryDeck && !isReviewDeck;
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const deckExclusions = useAppStore((state) => state.deckExclusions);
  const setDeckExclusions = useAppStore((state) => state.setDeckExclusions);
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? null;
  const starredFavorites = useAppStore((state) => effectiveLibraryDeck && libraryActiveFolder === 'starred' ? state.favorites : null);

  const stableSelectedLessonsKey = useMemo(() => (selectedLessons || []).join(','), [selectedLessons]);

  const deckExclusionKey = useMemo(() => getDeckIdentityKey({
    activeBookId,
    selectedLessons: selectedLessons || [],
    selectedLessonParts,
    libraryActiveFolder,
    isReviewDeck,
    isLibraryDeck: effectiveLibraryDeck,
  }), [activeBookId, effectiveLibraryDeck, isReviewDeck, libraryActiveFolder, selectedLessonParts, selectedLessons]);

  const cachedEntry = getCachedActivityDeck(deckExclusionKey);
  const [cards, setCards] = useState<Flashcard[]>(() => cachedEntry?.cards ?? []);
  const [isLoading, setIsLoading] = useState(() => !cachedEntry);
  const [error, setError] = useState<string | null>(null);

  const [currentKey, setCurrentKey] = useState(deckExclusionKey);
  if (currentKey !== deckExclusionKey) {
    setCurrentKey(deckExclusionKey);
    const nextCached = getCachedActivityDeck(deckExclusionKey);
    setCards(nextCached?.cards ?? []);
    setIsLoading(!nextCached);
    setError(null);
  }

  const excludedIds = useMemo(
    () => new Set(deckExclusions[deckExclusionKey] ?? []),
    [deckExclusionKey, deckExclusions],
  );
  const visibleCards = useMemo(
    () => filterDeckByExclusions(cards, excludedIds),
    [cards, excludedIds],
  );

  const knownIdsRef = useRef<{ key: string; ids: Set<string> | null } | null>(null);

  useEffect(() => {
    const record = deckExclusions[deckExclusionKey];
    if (!record || record.length === 0) return;
    const known = knownIdsRef.current;
    if (!known || known.key !== deckExclusionKey || !known.ids) return;
    const pruned = pruneExcludedIds(record, known.ids);
    if (pruned.length !== record.length) {
      setDeckExclusions(deckExclusionKey, pruned);
    }
  }, [cards, deckExclusionKey, deckExclusions, setDeckExclusions]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    async function loadData() {
      // Stale-while-revalidate: a cached deck (e.g. loaded by the practice modal) stays visible, no loading flip.
      if (!getCachedActivityDeck(deckExclusionKey)) setIsLoading(true);
      setError(null);
      if (effectiveLibraryDeck && libraryActiveFolder !== 'starred') {
        if (currentUserId) {
          const subHolder: { current?: () => void } = {};
          subHolder.current = flashcardService.subscribeToUserFlashcards(currentUserId, (customCards) => {
            if (!isMounted) {
              subHolder.current?.();
              return;
            }
            void getCourseVocabLookupMap()
              .catch(() => new Map<string, Flashcard>())
              .then((vocabMap) => {
                if (!isMounted) return;
                const { cards: results, knownIds } = mapCustomCardsToFlashcards(customCards, vocabMap, libraryActiveFolder);
                knownIdsRef.current = { key: deckExclusionKey, ids: knownIds };
                setCachedActivityDeck(deckExclusionKey, { cards: results, knownIds });
                setCards((prev) => (isSameCards(prev, results) ? prev : results));
                setIsLoading(false);
              });
          });

          if (!isMounted) {
            subHolder.current?.();
          } else {
            unsubscribe = subHolder.current;
          }
        } else if (isMounted) {
          knownIdsRef.current = null;
          setCards([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const result = await loadActivityDeck({
          activeBookId,
          selectedLessons: stableSelectedLessonsKey ? stableSelectedLessonsKey.split(',').map(Number) : [],
          isReviewDeck,
          isLibraryDeck: effectiveLibraryDeck,
        });
        if (isMounted) {
          knownIdsRef.current = { key: deckExclusionKey, ids: result.knownIds };
          setCards((prev) => (isSameCards(prev, result.deckCards) ? prev : result.deckCards));
        }
      } catch (err) {
        debugLogger.error('App', 'useActivityDataLoader failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load cards');
          if (effectiveLibraryDeck) setCards([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeBookId, stableSelectedLessonsKey, isReviewDeck, effectiveLibraryDeck, libraryActiveFolder, currentUserId, deckExclusionKey, starredFavorites]);

  return { cards: visibleCards, deckCards: cards, isLoading, error, deckExclusionKey, excludedIds };
}

/** Shared by mounted activities and intent prefetch; one request per unchanged source. */
export async function loadActivityDeck({
  activeBookId,
  selectedLessons,
  isReviewDeck = false,
  isLibraryDeck = false,
}: {
  activeBookId: number;
  selectedLessons: number[];
  isReviewDeck?: boolean;
  isLibraryDeck?: boolean;
}): Promise<{ cards: Flashcard[]; deckCards: Flashcard[]; knownIds: Set<string> | null; excludedIds: Set<string> }> {
  const effectiveLibraryDeck = isLibraryDeck && !isReviewDeck;
  const store = useAppStore.getState();
  const userId = store.currentUser?.id ?? null;
  // Pinned review ids define a fixed session; a fresh review depends on today's SRS.
  const deckExclusionKey = getDeckIdentityKey({
    activeBookId,
    selectedLessons,
    selectedLessonParts: store.selectedLessonParts,
    libraryActiveFolder: store.libraryActiveFolder,
    isReviewDeck,
    isLibraryDeck: effectiveLibraryDeck,
  });
  const pinnedReviewCards = store.activeReviewSessionCards?.length ? store.activeReviewSessionCards : null;
  const source = effectiveLibraryDeck ? store.favorites : isReviewDeck ? pinnedReviewCards ?? store.srsData : undefined;
  const cached = getCachedActivityDeck(deckExclusionKey);
  const pending = pendingDecks.get(deckExclusionKey);
  let result: { cards: Flashcard[]; knownIds: Set<string> | null };

  if (cached && cached.source === source && Date.now() - cached.timestamp < 60_000) {
    result = cached;
  } else if (pending && pending.userId === userId && pending.source === source) {
    result = await pending.promise;
  } else {
    const request: Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }> = Promise.resolve().then(async () => {
      const loaded = await (effectiveLibraryDeck
        ? store.libraryActiveFolder === 'starred' ? fetchStarredDeckData(store.favorites) : Promise.resolve({ cards: [], knownIds: null })
        : isReviewDeck ? loadReviewDeck(store.srsData, pinnedReviewCards)
        : fetchCurriculumDeckData(activeBookId, selectedLessons, store.selectedLessonParts));
      if ((useAppStore.getState().currentUser?.id ?? null) !== userId) return { cards: [], knownIds: null };
      const latest = useAppStore.getState();
      const latestPinned = latest.activeReviewSessionCards?.length ? latest.activeReviewSessionCards : null;
      const latestSource = effectiveLibraryDeck ? latest.favorites : isReviewDeck ? latestPinned ?? latest.srsData : undefined;
      // A cleared cache, switched account or changed source must not receive an old result.
      if (pendingDecks.get(deckExclusionKey)?.promise === request
        && (latest.currentUser?.id ?? null) === userId && (latestSource === source || !isReviewDeck && !effectiveLibraryDeck)) {
        if (isReviewDeck && !effectiveLibraryDeck && !pinnedReviewCards && loaded.cards.length > 0) {
          latest.setActiveReviewSessionCards(loaded.cards.map((card) => card.id));
        }
        setCachedActivityDeck(deckExclusionKey, {
          ...loaded,
          source: isReviewDeck && !effectiveLibraryDeck
            ? (useAppStore.getState().activeReviewSessionCards?.length ? useAppStore.getState().activeReviewSessionCards : latest.srsData) ?? undefined
            : source,
        });
        preloadDeckAudio(loaded.cards);
      }
      return loaded;
    }).finally(() => {
      if (pendingDecks.get(deckExclusionKey)?.promise === request) pendingDecks.delete(deckExclusionKey);
    });
    pendingDecks.set(deckExclusionKey, { source, userId, promise: request });
    result = await request;
  }

  const excludedIds = new Set(useAppStore.getState().deckExclusions[deckExclusionKey] ?? []);
  return { cards: filterDeckByExclusions(result.cards, excludedIds), deckCards: result.cards, knownIds: result.knownIds, excludedIds };
}
