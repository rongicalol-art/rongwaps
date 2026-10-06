import { debugLogger } from '../../utils/debugLogger';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DAILY_CHARACTERS } from '../../data/dictionaryHome';
import { useDictionarySearch } from '../../hooks/useDictionarySearch';
import { useTocflReadiness } from '../../hooks/useTocflReadiness';
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
  const isSearching = searchQuery.trim().length > 0;
  return (
    <StickyWorkspaceHeader
      title={isSearching ? 'Search' : 'Dictionary'}
      align="left"
      menuToggle={isSearching ? undefined : menuToggle}
      onBack={isSearching ? () => onSearchChange('') : undefined}
      searchValue={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder="Hanzi, pinyin, English"
      searchLabel="search dictionary"
    />
  );
}

/** Curriculum search covers every book. */
const selectedBookIds = [1, 2, 3, 4];

export function SearchScreen({ menuToggle }: SearchScreenProps) {
  const favorites = useAppStore((state) => state.favorites);
  const activeBookId = useAppStore((state) => state.activeBookId);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const [mode, setMode] = useState<SearchMode>('global');
  const [courseResults, setCourseResults] = useState<DictionaryListEntry[]>([]);
  const [isSearchingCourses, setIsSearchingCourses] = useState(false);
  const [courseSearchError, setCourseSearchError] = useState<string | null>(null);

  const readiness = useTocflReadiness();

  const query = searchQuery.trim();
  const deferredQuery = useDeferredValue(query);
  const { results: dictionaryResults, isSearching, searchError } = useDictionarySearch(deferredQuery);
  const { items: savedWords, isLoading: isLoadingSavedWords } = useSavedDictionaryPreview(favorites);

  const characterOfTheDay = useMemo(() => {
    const now = new Date();
    const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
    return DAILY_CHARACTERS[dayNumber % DAILY_CHARACTERS.length];
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
          debugLogger.error('Supabase', 'SearchScreen: course vocabulary search failed:', error);
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
  }, [deferredQuery]);

  const handleResultsSearch = (nextQuery: string) => {
    setSearchQuery(nextQuery);
  };

  const handleViewSavedWords = () => {
    setSearchQuery('');
    setActiveTab('library');
  };

  // Hide the dock while scrolling down, bring it back on scroll up (same as the flashcard list).
  const [isDockVisible, setIsDockVisible] = useState(true);
  useEffect(() => {
    setIsDockVisible(true);
    if (!query) return;
    let lastTop = 0;
    const onScroll = (e: Event) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (!el) return;
      const top = el.scrollTop;
      const delta = top - lastTop;
      if (top <= 15 || delta < -8) setIsDockVisible(true);
      else if (delta > 8 && top > 40) setIsDockVisible(false);
      lastTop = top;
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [query]);

  useEffect(() => {
    if (!query) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchQuery('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [query, setSearchQuery]);

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
              readiness={readiness}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dictionary-results"
            className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 px-4 pb-dock-clearance pt-0 md:px-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <DictionaryResults
              mode={mode}
              query={query}
              results={activeResults}
              isLoading={isLoading}
              error={activeError}
              onOpenWord={setDictionaryWord}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zero-height sticky anchor: pins the dock to the scroller's bottom edge.
          Negative offset cancels the workspace scroller's bottom padding (LayoutShell pb-12 md:pb-6). */}
      <div className="pointer-events-none sticky -bottom-12 z-dock md:-bottom-6 h-0 w-full">
        {Boolean(query) && !isDockVisible && (
          <div
            aria-hidden
            onMouseEnter={() => setIsDockVisible(true)}
            className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 h-14"
          />
        )}
        {Boolean(query) && isDockVisible && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-ui-canvas via-ui-canvas/90 to-transparent"
          />
        )}
        <AnimatePresence>
          {Boolean(query) && (
            <SearchModeDock
              mode={mode}
              visible={isDockVisible}
              onChangeMode={setMode}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
