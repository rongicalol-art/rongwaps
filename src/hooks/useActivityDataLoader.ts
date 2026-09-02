import { useEffect, useMemo, useRef, useState } from 'react';
import { Flashcard } from '../data/flashcards';
import { fetchVocabulary } from '../services/vocabularyService';
import { getDictionaryEntriesBatch } from '../services/dictionaryService';
import { flashcardService } from '../services/flashcardService';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from './useAuth';
import {
  getCurriculumSelectionFingerprint,
  isCardInPartSelection,
} from '../utils/lessonPartSelection';
import {
  filterDeckByExclusions,
  pruneExcludedIds,
} from '../utils/deckExclusions';

function isSameCards(a: Flashcard[], b: Flashcard[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((card, idx) => card.id === b[idx].id);
}

/**
 * Shared deck loader for every practice activity (flashcards, quiz,
 * listening, writing, review, library decks).
 *
 * Cards are fetched once per selection and then the user's include/exclude
 * curation (`deckExclusions`, keyed per deck) is applied as a derived filter
 * so all activities agree on the same deck. Stale exclusion ids (deleted
 * cards, removed vocabulary) are pruned only when their deck is loaded.
 */
export function useActivityDataLoader(activeBookId: number, selectedLessons: number[], isReviewDeck: boolean = false, isLibraryDeck: boolean = false) {
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const deckExclusions = useAppStore((state) => state.deckExclusions);
  const setDeckExclusions = useAppStore((state) => state.setDeckExclusions);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? null;

  const stableSelectedLessonsKey = useMemo(() => {
    return (selectedLessons || []).join(',');
  }, [selectedLessons]);
  const stablePartSelectionKey = useMemo(
    () => getCurriculumSelectionFingerprint(activeBookId, selectedLessons || [], selectedLessonParts),
    [activeBookId, selectedLessonParts, selectedLessons],
  );

  const deckExclusionKey = useMemo(() => {
    if (isReviewDeck) return 'shared_deck_review';
    if (isLibraryDeck) return `shared_deck_library_${libraryActiveFolder}`;
    return `shared_deck_${activeBookId}_${stablePartSelectionKey}`;
  }, [
    activeBookId,
    isLibraryDeck,
    isReviewDeck,
    libraryActiveFolder,
    stablePartSelectionKey,
  ]);

  const excludedIds = useMemo(
    () => new Set(deckExclusions[deckExclusionKey] ?? []),
    [deckExclusionKey, deckExclusions],
  );
  // `cards` is the study deck (exclusions applied); `deckCards` is the full
  // selection so the list view can show excluded rows in place.
  const visibleCards = useMemo(
    () => filterDeckByExclusions(cards, excludedIds),
    [cards, excludedIds],
  );

  // For pruning we must know which card ids really existed in this deck.
  // Review is the special case: its exclusion list is global and must survive
  // cards that are simply not due today, so it prunes against ALL fetched
  // vocabulary ids (the pre-due-set fetch), never against the due set.
  const knownIdsRef = useRef<{ key: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    const record = deckExclusions[deckExclusionKey];
    if (!record || record.length === 0) return;
    const known = knownIdsRef.current;
    if (!known || known.key !== deckExclusionKey) return;
    const pruned = pruneExcludedIds(record, known.ids);
    if (pruned.length !== record.length) {
      setDeckExclusions(deckExclusionKey, pruned);
    }
  }, [cards, deckExclusionKey, deckExclusions, setDeckExclusions]);

  // ── Main data loader ─────────────────────────────────────────────────
  // Loads cards from three possible sources:
  //   1. Library deck (starred words or custom folders from Supabase)
  //   2. Review deck (SRS-filtered due cards from all books)
  //   3. Normal curriculum (book/lesson vocabulary, with optional lesson filter)
  //
  // The fetch depends only on the *selection* — exclusions are layered in as
  // a derived filter so toggling them never refetches the network.
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
            const batchResults = await getDictionaryEntriesBatch(favorites);
            const results: Flashcard[] = [];
            const knownIds = new Set<string>();
            for (const word of favorites) {
              if (batchResults.has(word)) {
                const entry = batchResults.get(word)!;
                knownIds.add(`star-${entry.traditional}`);
                results.push({
                  id: `star-${entry.traditional}`,
                  bookId: 0,
                  lessonId: 0,
                  front: entry.traditional || entry.simplified,
                  back: entry.definitions ? (Array.isArray(entry.definitions) ? entry.definitions.join(' • ') : Object.values(entry.definitions).join(' • ')) : '',
                  pinyin: entry.pinyin ? entry.pinyin.join(', ') : '',
                  audio: '',
                  notes: ''
                });
              }
            }
            if (isMounted) {
              knownIdsRef.current = { key: deckExclusionKey, ids: knownIds };
              setCards((prev) => (isSameCards(prev, results) ? prev : results));
              setIsLoading(false);
            }
          } catch (err) {
            console.error("useActivityDataLoader: failed to load starred favorites:", err);
            if (isMounted) {
              setError(err instanceof Error ? err.message : "Failed to load starred words");
              setCards([]);
              setIsLoading(false);
            }
          }
        } else {
          // ── Library deck: custom folders (Supabase real-time) ────────
          // Subscribe to real-time flashcard service for custom folders
          if (currentUserId) {
            const sub = flashcardService.subscribeToUserFlashcards(currentUserId, (customCards) => {
              if (!isMounted) {
                sub();
                return;
              }
              let filtered = customCards;
              if (libraryActiveFolder !== 'custom') {
                  filtered = customCards.filter(c => c.folderId === libraryActiveFolder);
              } else if (libraryActiveFolder === 'custom') {
                  filtered = customCards.filter(c => !c.folderId || c.folderId === 'custom');
              }

              const results: Flashcard[] = filtered.map(c => ({
                id: `custom-${c.id}`,
                bookId: 0,
                lessonId: 0,
                front: c.traditional || c.simplified,
                back: c.translation,
                pinyin: c.pinyin || '',
                audio: '',
                notes: c.notes || ''
              }));
              if (isMounted) {
                knownIdsRef.current = {
                  key: deckExclusionKey,
                  ids: new Set(results.map(c => c.id)),
                };
                setCards((prev) => (isSameCards(prev, results) ? prev : results));
                setIsLoading(false);
              }
            });

            if (!isMounted) {
              sub();
            } else {
              unsubscribe = sub;
            }
          } else {
            if (isMounted) {
              knownIdsRef.current = null;
              setCards([]);
              setIsLoading(false);
            }
          }
        }
        return;
      }

      // ── Default curriculum load ─────────────────────────────────────
      try {
        const data = await fetchVocabulary(isReviewDeck ? undefined : activeBookId); 
        let filtered = data;
        let knownIds = new Set(data.map(c => c.id));
        
        // Review deck: only show cards that are due for SRS review
        if (isReviewDeck) {
          const { activeReviewSessionCards, setActiveReviewSessionCards } = useAppStore.getState();
          if (activeReviewSessionCards) {
            filtered = filtered.filter(c => activeReviewSessionCards.includes(c.id));
          } else {
            const now = Date.now();
            filtered = filtered.filter(c => {
              const srs = srsData[c.id];
              return srs && srs.nextReviewDate <= now;
            });
            setActiveReviewSessionCards(filtered.map(c => c.id));
          }
        } else {
          const parsedLessons = stableSelectedLessonsKey ? stableSelectedLessonsKey.split(',').map(Number) : [];
          if (parsedLessons.length > 0) {
            // Normal mode: filter by the selected lessons and their selected parts.
            const currentLessonParts = useAppStore.getState().selectedLessonParts;
            filtered = filtered.filter((card) => (
              parsedLessons.includes(card.lessonId)
              && isCardInPartSelection(card, currentLessonParts)
            ));
            knownIds = new Set(filtered.map(c => c.id));
          }
        }
        
        if (isMounted) {
          knownIdsRef.current = { key: deckExclusionKey, ids: knownIds };
          setCards((prev) => (isSameCards(prev, filtered) ? prev : filtered));
        }
      } catch (err) {
        console.error("useActivityDataLoader failed:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load cards");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
    };
  }, [
    activeBookId,
    stableSelectedLessonsKey,
    stablePartSelectionKey,
    isReviewDeck,
    isLibraryDeck,
    libraryActiveFolder,
    currentUserId,
    deckExclusionKey,
  ]);

  return { cards: visibleCards, deckCards: cards, isLoading, error, deckExclusionKey, excludedIds };
}
