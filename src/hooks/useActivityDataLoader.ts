import { debugLogger } from '../utils/debugLogger';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Flashcard } from '../data/flashcards';
import { getCourseVocabLookupMap } from '../services/vocabularyService';
import { flashcardService } from '../services/flashcardService';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from './useAuth';
import { getDeckIdentityKey } from '../utils/lessonPartSelection';
import { filterDeckByExclusions, pruneExcludedIds } from '../utils/deckExclusions';
import { audioService } from '../services/audioService';
import {
  isSameCards,
  mapCustomCardsToFlashcards,
} from '../utils/activityDataDerivations';
import {
  loadReviewDeck,
  fetchStarredDeckData,
  fetchCurriculumDeckData,
} from '../services/activityDeckFetcher';

interface CachedDeckEntry {
  cards: Flashcard[];
  knownIds: Set<string> | null;
  timestamp: number;
}

const activityDeckCache = new Map<string, CachedDeckEntry>();

export function getCachedActivityDeck(key: string): CachedDeckEntry | undefined {
  return activityDeckCache.get(key);
}

export function setCachedActivityDeck(key: string, entry: { cards: Flashcard[]; knownIds: Set<string> | null }) {
  activityDeckCache.set(key, { ...entry, timestamp: Date.now() });
}

export function clearActivityDeckCache() {
  activityDeckCache.clear();
}

function preloadDeckAudio(cards: Flashcard[]): void {
  if (cards.length === 0) return;
  audioService.preload(cards.slice(0, 10).map((c) => c.audio));
  const initialWarm = cards
    .slice(0, 4)
    .filter((card) => !audioService.isAudioFileName(card.audio))
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
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const deckExclusions = useAppStore((state) => state.deckExclusions);
  const setDeckExclusions = useAppStore((state) => state.setDeckExclusions);
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? null;

  const stableSelectedLessonsKey = useMemo(() => (selectedLessons || []).join(','), [selectedLessons]);

  const deckExclusionKey = useMemo(() => getDeckIdentityKey({
    activeBookId,
    selectedLessons: selectedLessons || [],
    selectedLessonParts,
    libraryActiveFolder,
    isReviewDeck,
    isLibraryDeck,
  }), [activeBookId, isLibraryDeck, isReviewDeck, libraryActiveFolder, selectedLessonParts, selectedLessons]);

  const cachedEntry = activityDeckCache.get(deckExclusionKey);
  const [cards, setCards] = useState<Flashcard[]>(() => cachedEntry?.cards ?? []);
  const [isLoading, setIsLoading] = useState(() => !cachedEntry);
  const [error, setError] = useState<string | null>(null);

  const [currentKey, setCurrentKey] = useState(deckExclusionKey);
  if (currentKey !== deckExclusionKey) {
    setCurrentKey(deckExclusionKey);
    const nextCached = activityDeckCache.get(deckExclusionKey);
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
      setIsLoading(true);
      setError(null);
      const { favorites, srsData } = useAppStore.getState();

      if (isLibraryDeck) {
        if (libraryActiveFolder === 'starred') {
          if (favorites.length === 0) {
            if (isMounted) {
              knownIdsRef.current = null;
              setCards([]);
              setIsLoading(false);
            }
            return;
          }
          try {
            const { cards: results, knownIds } = await fetchStarredDeckData(favorites);
            if (isMounted) {
              knownIdsRef.current = { key: deckExclusionKey, ids: knownIds };
              setCachedActivityDeck(deckExclusionKey, { cards: results, knownIds });
              setCards((prev) => (isSameCards(prev, results) ? prev : results));
              setIsLoading(false);
            }
          } catch (err) {
            debugLogger.error('App', 'useActivityDataLoader: failed to load starred favorites:', err);
            if (isMounted) {
              setError(err instanceof Error ? err.message : 'Failed to load starred words');
              setCards([]);
              setIsLoading(false);
            }
          }
        } else if (currentUserId) {
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
        let filtered: Flashcard[];
        let knownIds: Set<string> | null;

        if (isReviewDeck) {
          const { activeReviewSessionCards, setActiveReviewSessionCards } = useAppStore.getState();
          const review = await loadReviewDeck(srsData, activeReviewSessionCards);
          filtered = review.cards;
          knownIds = review.knownIds;
          if (!activeReviewSessionCards) {
            setActiveReviewSessionCards(filtered.map((c) => c.id));
          }
        } else {
          const parsedLessons = stableSelectedLessonsKey ? stableSelectedLessonsKey.split(',').map(Number) : [];
          const currentLessonParts = useAppStore.getState().selectedLessonParts;
          const result = await fetchCurriculumDeckData(activeBookId, parsedLessons, currentLessonParts);
          filtered = result.cards;
          knownIds = result.knownIds;
        }

        if (isMounted) {
          knownIdsRef.current = { key: deckExclusionKey, ids: knownIds };
          setCachedActivityDeck(deckExclusionKey, { cards: filtered, knownIds });
          setCards((prev) => (isSameCards(prev, filtered) ? prev : filtered));
          preloadDeckAudio(filtered);
        }
      } catch (err) {
        debugLogger.error('App', 'useActivityDataLoader failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load cards');
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
  }, [activeBookId, stableSelectedLessonsKey, isReviewDeck, isLibraryDeck, libraryActiveFolder, currentUserId, deckExclusionKey]);

  return { cards: visibleCards, deckCards: cards, isLoading, error, deckExclusionKey, excludedIds };
}

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
}): Promise<{ cards: Flashcard[]; deckCards: Flashcard[]; excludedIds: Set<string> }> {
  const store = useAppStore.getState();
  const libraryActiveFolder = store.libraryActiveFolder;
  const selectedLessonParts = store.selectedLessonParts;
  const deckExclusions = store.deckExclusions;

  const deckExclusionKey = getDeckIdentityKey({
    activeBookId,
    selectedLessons: selectedLessons || [],
    selectedLessonParts,
    libraryActiveFolder,
    isReviewDeck,
    isLibraryDeck,
  });

  const cached = activityDeckCache.get(deckExclusionKey);
  const excludedIds = new Set(deckExclusions[deckExclusionKey] ?? []);

  if (cached && Date.now() - cached.timestamp < 60_000) {
    return {
      cards: filterDeckByExclusions(cached.cards, excludedIds),
      deckCards: cached.cards,
      excludedIds,
    };
  }

  let cards: Flashcard[] = [];
  let knownIds: Set<string> | null = null;

  if (isLibraryDeck) {
    if (libraryActiveFolder === 'starred') {
      const result = await fetchStarredDeckData(store.favorites);
      cards = result.cards;
      knownIds = result.knownIds;
    }
  } else if (isReviewDeck) {
    const { activeReviewSessionCards, setActiveReviewSessionCards, srsData } = store;
    const review = await loadReviewDeck(srsData, activeReviewSessionCards);
    cards = review.cards;
    knownIds = review.knownIds;
    if (!activeReviewSessionCards) {
      setActiveReviewSessionCards(cards.map((c) => c.id));
    }
  } else {
    const result = await fetchCurriculumDeckData(activeBookId, selectedLessons || [], selectedLessonParts);
    cards = result.cards;
    knownIds = result.knownIds;
  }

  setCachedActivityDeck(deckExclusionKey, { cards, knownIds });
  preloadDeckAudio(cards);

  return {
    cards: filterDeckByExclusions(cards, excludedIds),
    deckCards: cards,
    excludedIds,
  };
}
