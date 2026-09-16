import { useEffect, useMemo, useRef, useState } from 'react';
import { Flashcard } from '../data/flashcards';
import { fetchVocabulary, fetchVocabularyByIds, prepareVocabulary, getCourseVocabLookupMap } from '../services/vocabularyService';
import { fetchAllVocabularyPacks } from '../services/vocabularyPackService';
import { userService } from '../services/userService';
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
import { buildReviewSession } from '../utils/reviewSession';
import type { SRSData } from '../utils/srsEngine';

function isSameCards(a: Flashcard[], b: Flashcard[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((card, idx) => card.id === b[idx].id);
}

/**
 * Review-deck assembly.
 *
 * Fresh session (`pinnedIds` null): due-card ids come from the server first
 * (`get_due_card_ids` RPC — reviews made on other devices count without
 * waiting for the client pull), falling back to the local SRS due filter.
 * The due pool is then capped and prioritized by `buildReviewSession`
 * (learning-phase backlog first, then most-overdue/weakest, capped at
 * REVIEW_SESSION_CAP), and pinned into the store so the deck cannot mutate
 * mid-session.
 *
 * Content resolution is pack-first in every branch (IndexedDB-cached); the
 * Supabase paths fetch only the needed rows by id instead of paginating the
 * whole book_vocabulary table.
 *
 * `knownIds` feeds exclusion pruning and is the FULL vocabulary id universe
 * whenever one is available; when only a partial fetch was possible it is
 * null and the caller must skip pruning rather than prune against a partial
 * set (see deckExclusions.ts — a not-due-today card must keep its exclusion).
 */
async function loadReviewDeck(
  srsData: Record<string, SRSData>,
  pinnedIds: string[] | null,
): Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }> {
  // Every branch resolves to a pool: pack-first when packs exist, otherwise a
  // by-id fetch, otherwise the full vocabulary list. There is deliberately no
  // `null` arm — callers dereference the result directly.
  const resolveByIds = async (ids: string[]): Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }> => {
    const idSet = new Set(ids);
    const packedRows = await fetchAllVocabularyPacks();
    if (packedRows) {
      const allCards = prepareVocabulary(packedRows);
      return {
        cards: allCards.filter((card) => idSet.has(card.id)),
        knownIds: new Set(packedRows.map((row) => String(row.id))),
      };
    }
    const rowsById = await fetchVocabularyByIds(ids);
    if (rowsById) {
      // No full id universe this load — pruning must be skipped.
      return { cards: rowsById, knownIds: null };
    }
    const data = await fetchVocabulary();
    return {
      cards: data.filter((card) => idSet.has(card.id)),
      knownIds: new Set(data.map((card) => card.id)),
    };
  };

  if (pinnedIds) {
    return resolveByIds(pinnedIds);
  }

  const dueIds = await userService.getDueCardIds();
  if (dueIds) {
    const pool = await resolveByIds(dueIds);
    return { cards: buildReviewSession(pool.cards, srsData), knownIds: pool.knownIds };
  }

  // No server due set available (RPC absent/failed): derive due ids from the
  // local SRS map and rebuild the session with cap + smart ordering.
  const now = Date.now();
  const localDueIds = Object.keys(srsData).filter((id) => srsData[id]?.nextReviewDate <= now);
  const pool = await resolveByIds(localDueIds);
  return { cards: buildReviewSession(pool.cards, srsData), knownIds: pool.knownIds };
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
  // cards that are simply not due today, so it prunes against the FULL
  // vocabulary id universe (the pre-due-set source), never against the due
  // set. A null `ids` means only a partial fetch was possible — pruning is
  // skipped for that load rather than run against the partial set.
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
            const [batchResults, vocabMap] = await Promise.all([
              getDictionaryEntriesBatch(favorites),
              getCourseVocabLookupMap().catch(() => new Map<string, Flashcard>()),
            ]);
            const results: Flashcard[] = [];
            const knownIds = new Set<string>();
            for (const word of favorites) {
              if (batchResults.has(word)) {
                const entry = batchResults.get(word)!;
                knownIds.add(`star-${entry.traditional}`);
                const courseMatch =
                  vocabMap.get(entry.traditional) ||
                  vocabMap.get(entry.simplified) ||
                  vocabMap.get(word);
                results.push({
                  id: `star-${entry.traditional}`,
                  bookId: courseMatch?.bookId || 0,
                  lessonId: courseMatch?.lessonId || 0,
                  front: entry.traditional || entry.simplified,
                  back: entry.definitions ? (Array.isArray(entry.definitions) ? entry.definitions.join(' • ') : Object.values(entry.definitions).join(' • ')) : '',
                  pinyin: entry.pinyin ? entry.pinyin.join(', ') : (courseMatch?.pinyin || ''),
                  audio: courseMatch?.audio || '',
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

              void getCourseVocabLookupMap()
                .catch(() => new Map<string, Flashcard>())
                .then((vocabMap) => {
                  if (!isMounted) return;
                  const results: Flashcard[] = filtered.map((c) => {
                    const courseMatch =
                      vocabMap.get(c.traditional || '') ||
                      vocabMap.get(c.simplified || '');
                    return {
                      id: `custom-${c.id}`,
                      bookId: courseMatch?.bookId || 0,
                      lessonId: courseMatch?.lessonId || 0,
                      front: c.traditional || c.simplified,
                      back: c.translation,
                      pinyin: c.pinyin || courseMatch?.pinyin || '',
                      audio: courseMatch?.audio || '',
                      notes: c.notes || '',
                    };
                  });
                  knownIdsRef.current = {
                    key: deckExclusionKey,
                    ids: new Set(results.map((c) => c.id)),
                  };
                  setCards((prev) => (isSameCards(prev, results) ? prev : results));
                  setIsLoading(false);
                });
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
        let filtered: Flashcard[];
        let knownIds: Set<string> | null;

        // Review deck: due-card session (pinned resume or fresh smart build).
        if (isReviewDeck) {
          const { activeReviewSessionCards, setActiveReviewSessionCards } = useAppStore.getState();
          const review = await loadReviewDeck(srsData, activeReviewSessionCards);
          filtered = review.cards;
          knownIds = review.knownIds;
          if (!activeReviewSessionCards) {
            setActiveReviewSessionCards(filtered.map(c => c.id));
          }
        } else {
          const data = await fetchVocabulary(activeBookId);
          filtered = data;
          knownIds = new Set(data.map(c => c.id));

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
