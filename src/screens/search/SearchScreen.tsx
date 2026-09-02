import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DAILY_CHARACTERS } from '../../data/dictionaryHome';
import { useDictionarySearch } from '../../hooks/useDictionarySearch';
import { StickyWorkspaceHeader, type StickyWorkspaceHeaderMenuToggle } from '../../lib/widgets';
import { searchVocabulary } from '../../services/vocabularyService';
import { useAppStore } from '../../store/useAppStore';
import type { DictionaryListEntry } from '../../types/models';
import { DictionaryHome } from './components/DictionaryHome';
import { DictionaryResults } from './components/DictionaryResults';
import { SearchModeDock, type SearchMode } from './components/SearchModeDock';
import { useSavedDictionaryPreview } from './hooks/useSavedDictionaryPreview';

interface SearchScreenProps {
  /** Mobile hamburger shown overlaid left in the sticky header (Dictionary). */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
}

function DictionaryStickyHeader({
  searchQuery,
  onSearchChange,
  menuToggle,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
}) {
  return (
    <StickyWorkspaceHeader
      title="Dictionary"
      align="left"
      menuToggle={menuToggle}
      searchValue={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search characters, pinyin, or English"
      searchLabel="search dictionary"
    />
  );
}

export function SearchScreen({ menuToggle }: SearchScreenProps) {
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const activeBookId = useAppStore((state) => state.activeBookId);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const [mode, setMode] = useState<SearchMode>('global');
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([1, 2, 3, 4]);
  const [courseResults, setCourseResults] = useState<DictionaryListEntry[]>([]);
  const [isSearchingCourses, setIsSearchingCourses] = useState(false);
  const [courseSearchError, setCourseSearchError] = useState<string | null>(null);

  const query = searchQuery.trim();
  const deferredQuery = useDeferredValue(query);
  const { results: dictionaryResults, isSearching, searchError } = useDictionarySearch(deferredQuery);
  const { items: savedWords, isLoading: isLoadingSavedWords } = useSavedDictionaryPreview(favorites);

  const characterOfTheDay = useMemo(() => {
    const now = new Date();
    const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
    return DAILY_CHARACTERS[dayNumber % DAILY_CHARACTERS.length];
  }, []);

  const handleToggleBook = (bookId: number) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId].sort((a, b) => a - b),
    );
  };

  const handleSelectAllBooks = () => {
    setSelectedBookIds([1, 2, 3, 4]);
  };

  const handleClearBooks = () => {
    setSelectedBookIds([]);
  };

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
          const filteredCards = cards.filter((card) =>
            selectedBookIds.includes(card.bookId),
          );

          setCourseResults(
            filteredCards.map((card) => ({
              id: card.id,
              simplified: card.simplified || card.front,
              traditional: card.traditional || card.front,
              pinyin_accented: card.pinyin || '',
              definitions: [card.back],
              bookId: card.bookId,
              lessonId: card.lessonId,
              pos: card.pos,
              audio: card.audio,
            })),
          );
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
  }, [deferredQuery, selectedBookIds]);

  const handleResultsSearch = (nextQuery: string) => {
    setSearchQuery(nextQuery);
  };

  const handleViewSavedWords = () => {
    setSearchQuery('');
    setActiveTab('library');
  };

  const activeResults = mode === 'global' ? dictionaryResults : courseResults;
  const activeError = mode === 'global' ? searchError : courseSearchError;
  const isLoading = query !== deferredQuery || (mode === 'global' ? isSearching : isSearchingCourses);

  return (
    <div className="relative flex w-full flex-1 flex-col text-ui-ink">
      <DictionaryStickyHeader
        searchQuery={searchQuery}
        onSearchChange={handleResultsSearch}
        menuToggle={menuToggle}
      />

      <AnimatePresence mode="wait" initial={false}>
        {!query ? (
          <motion.div
            key="dictionary-home"
            className="flex min-h-full w-full flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <DictionaryHome
              savedWords={savedWords}
              isLoadingSavedWords={isLoadingSavedWords}
              characterOfTheDay={characterOfTheDay}
              activeBookId={selectedBookIds[0] || activeBookId || 1}
              onOpenWord={setDictionaryWord}
              onViewSavedWords={handleViewSavedWords}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dictionary-results"
            className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 px-4 pb-28 pt-0 sm:pb-32 md:px-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
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

      <AnimatePresence>
        {Boolean(query) && (
          <SearchModeDock
            mode={mode}
            onChangeMode={setMode}
            selectedBookIds={selectedBookIds}
            onToggleBook={handleToggleBook}
            onSelectAllBooks={handleSelectAllBooks}
            onClearBooks={handleClearBooks}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
