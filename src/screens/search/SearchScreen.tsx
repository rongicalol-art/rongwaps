import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../data/books';
import { FEATURED_DICTIONARY_TERMS } from '../../data/dictionaryHome';
import { useDictionarySearch } from '../../hooks/useDictionarySearch';
import {
  AppIcon,
  IconActionButton,
  SearchBar3D,
} from '../../lib/widgets';
import { searchVocabulary } from '../../services/vocabularyService';
import { useAppStore } from '../../store/useAppStore';
import type { DictionaryListEntry } from '../../types/models';
import { DictionaryHome } from './components/DictionaryHome';
import {
  DictionaryModeTabs,
  type DictionaryMode,
} from './components/DictionaryModeTabs';
import { DictionaryResults } from './components/DictionaryResults';
import { useSavedDictionaryPreview } from './hooks/useSavedDictionaryPreview';

export function SearchScreen() {
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setIsSearchOpen = useAppStore((state) => state.setIsSearchOpen);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const learnedCards = useAppStore((state) => state.learnedCards);
  const totalCardsLearned = useAppStore((state) => state.totalCardsLearned);
  const totalCardsReviewed = useAppStore((state) => state.totalCardsReviewed);

  const [mode, setMode] = useState<DictionaryMode>('dictionary');
  const [courseResults, setCourseResults] = useState<DictionaryListEntry[]>([]);
  const [isSearchingCourses, setIsSearchingCourses] = useState(false);
  const [courseSearchError, setCourseSearchError] = useState<string | null>(null);

  const query = searchQuery.trim();
  const deferredQuery = useDeferredValue(query);
  const { results: dictionaryResults, isSearching, searchError } = useDictionarySearch(deferredQuery);
  const { items: savedWords, isLoading: isLoadingSavedWords } = useSavedDictionaryPreview(favorites);
  const selectedCourseBookId: number | null = null;

  const wordOfTheDay = useMemo(() => {
    const now = new Date();
    const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
    return FEATURED_DICTIONARY_TERMS[dayNumber % FEATURED_DICTIONARY_TERMS.length];
  }, []);

  useEffect(() => {
    if (!deferredQuery) {
      setCourseResults([]);
      setIsSearchingCourses(false);
      setCourseSearchError(null);
      return;
    }

    let isCurrent = true;
    setIsSearchingCourses(true);
    setCourseSearchError(null);

    const timer = window.setTimeout(() => {
      searchVocabulary(deferredQuery)
        .then((cards) => {
          if (!isCurrent) return;
          const filteredCards = selectedCourseBookId
            ? cards.filter((card) => card.bookId === selectedCourseBookId)
            : cards;

          setCourseResults(filteredCards.map((card) => ({
            id: card.id,
            simplified: card.front,
            traditional: card.front,
            pinyin_accented: card.pinyin || '',
            definitions: [card.back],
            bookId: card.bookId,
          })));
        })
        .catch((error) => {
          console.error('SearchScreen: course vocabulary search failed:', error);
          if (isCurrent) {
            setCourseResults([]);
            setCourseSearchError('Course vocabulary search is unavailable right now. Try again in a moment.');
          }
        })
        .finally(() => {
          if (isCurrent) setIsSearchingCourses(false);
        });
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [deferredQuery, selectedCourseBookId]);

  const handleHomeSearch = (nextQuery: string) => {
    setMode('dictionary');
    setSearchQuery(nextQuery);
    setIsSearchOpen(true);
  };

  const handleResultsSearch = (nextQuery: string) => {
    setSearchQuery(nextQuery);
    setIsSearchOpen(Boolean(nextQuery.trim()));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleViewSavedWords = () => {
    setIsSearchOpen(false);
    setActiveTab('library');
  };

  const studySnapshot = {
    savedWordCount: favorites.length,
    learnedWordCount: Math.max(totalCardsLearned, learnedCards.length),
    reviewedWordCount: totalCardsReviewed,
    availableBookCount: SAMPLE_BOOKS.length,
  };

  const activeResults = mode === 'dictionary' ? dictionaryResults : courseResults;
  const activeError = mode === 'dictionary' ? searchError : courseSearchError;
  const isLoading = query !== deferredQuery || (mode === 'dictionary' ? isSearching : isSearchingCourses);

  return (
    <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden text-ui-ink">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-4">
        <AnimatePresence mode="wait" initial={false}>
          {!query ? (
            <motion.div
              key="dictionary-home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <DictionaryHome
                savedWords={savedWords}
                isLoadingSavedWords={isLoadingSavedWords}
                wordOfTheDay={wordOfTheDay}
                studySnapshot={studySnapshot}
                onSearch={handleHomeSearch}
                onOpenWord={setDictionaryWord}
                onViewSavedWords={handleViewSavedWords}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dictionary-results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8 pt-1"
            >
              <div className="sticky top-0 z-20 flex w-full items-center gap-2 bg-ui-canvas/95 py-1 backdrop-blur-sm">
                <SearchBar3D
                  value={searchQuery}
                  onValueChange={handleResultsSearch}
                  onSubmit={handleResultsSearch}
                  showSubmit={false}
                  placeholder="Search characters, pinyin, or English"
                  aria-label="Search the Chinese dictionary"
                  className="min-w-0 flex-1 rounded-[20px]"
                />
                <IconActionButton
                  size="lg"
                  variant="surface"
                  onClick={handleClearSearch}
                  label="Clear dictionary search"
                  icon={<AppIcon name="close" size={19} />}
                />
              </div>
              <DictionaryModeTabs
                mode={mode}
                selectedBookId={selectedCourseBookId}
                onChange={setMode}
              />
              <DictionaryResults
                mode={mode}
                query={query}
                results={activeResults}
                favorites={favorites}
                isLoading={isLoading}
                error={activeError}
                onOpenWord={setDictionaryWord}
                onToggleFavorite={toggleFavorite}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
