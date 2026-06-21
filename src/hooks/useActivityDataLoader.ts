import { useState, useEffect, useMemo } from 'react';
import { Flashcard } from '../data/flashcards';
import { fetchVocabulary } from '../services/vocabularyService';
import { getDictionaryEntriesBatch } from '../services/dictionaryService';
import { flashcardService } from '../services/flashcardService';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from './useAuth';


export function useActivityDataLoader(activeBookId: number, selectedLessons: number[], isReviewDeck: boolean = false, isLibraryDeck: boolean = false) {
  const { libraryActiveFolder } = useAppStore();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const stableSelectedLessonsKey = useMemo(() => {
    return (selectedLessons || []).join(',');
  }, [selectedLessons]);

  // ── Main data loader ─────────────────────────────────────────────────
  // Loads cards from three possible sources:
  //   1. Library deck (starred words or custom folders from Supabase)
  //   2. Review deck (SRS-filtered due cards from all books)
  //   3. Normal curriculum (book/lesson vocabulary, with optional lesson filter)
  useEffect(() => {
    let unsubscribe: any = null;
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      const { favorites, srsData } = useAppStore.getState();

      if (isLibraryDeck) {
        if (libraryActiveFolder === 'starred') {
          if (favorites.length === 0) {
            if (isMounted) {
              setCards([]);
              setIsLoading(false);
            }
            return;
          }
          try {
            const batchResults = await getDictionaryEntriesBatch(favorites);
            const results: Flashcard[] = [];
            for (const word of favorites) {
              if (batchResults.has(word)) {
                const entry = batchResults.get(word)!;
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
              setCards(results);
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
          if (currentUser) {
            const sub = flashcardService.subscribeToUserFlashcards(currentUser.id, (customCards) => {
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
              setCards(results);
              setIsLoading(false);
            });

            if (!isMounted) {
              sub();
            } else {
              unsubscribe = sub;
            }
          } else {
            if (isMounted) {
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
            // Normal mode: filter by selected lessons
            filtered = filtered.filter(c => parsedLessons.includes(c.lessonId));
          }
        }
        
        if (isMounted) {
          setCards(filtered);
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
  }, [activeBookId, stableSelectedLessonsKey, isReviewDeck, isLibraryDeck, libraryActiveFolder, currentUser]);

  return { cards, isLoading, error };
}
