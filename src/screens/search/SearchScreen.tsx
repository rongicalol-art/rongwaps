import { debugLogger } from '../../utils/debug/debugLogger';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { DAILY_CHARACTERS } from '../../data/dictionaryHome';
import { useDictionarySearch } from '../../hooks/useDictionarySearch';
import { AppFooter } from '../../app/components/AppFooter';
import { ProfileAvatarButton, StickyWorkspaceHeader, type StickyWorkspaceHeaderMenuToggle } from '../../lib/widgets';
import { searchVocabulary } from '../../services/vocabularyService';
import { useAppStore } from '../../store/useAppStore';
import type { DictionaryListEntry } from '../../types/models';
import { DictionaryAside } from './components/DictionaryAside';
import { DictionaryResults } from './components/DictionaryResults';
import { DictionarySearchBar, type SearchMode } from './components/DictionarySearchBar';
import { NO_SEARCH_FILTERS, SearchFilterMenu, type SearchFilters } from './components/SearchFilterMenu';
import { useLevels } from '../../hooks/useLevels';
import { resolveLevel, tocflLabel } from '../../utils/lesson/levels';
import { useSavedDictionaryPreview } from './hooks/useSavedDictionaryPreview';

interface SearchScreenProps {
  /** Mobile hamburger shown overlaid left in the sticky header (Dictionary). */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
  onProfileClick?: () => void;
}

function DictionaryStickyHeader({ menuToggle, onProfileClick }: SearchScreenProps) {
  return (
    <StickyWorkspaceHeader
      title="Dictionary"
      menuToggle={menuToggle}
      rightContent={onProfileClick ? <ProfileAvatarButton onClick={onProfileClick} /> : undefined}
    />
  );
}

/** With an empty search box the list shows this search, so the page is never blank. */
const DEFAULT_QUERY = 'hello';
const LEVEL_ORDER = ['Novice', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Rare'];

/** Curriculum search covers every book. */
const selectedBookIds = [1, 2, 3, 4];

export function SearchScreen({ menuToggle, onProfileClick }: SearchScreenProps) {
  const favorites = useAppStore((state) => state.favorites);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const [mode, setMode] = useState<SearchMode>('global');
  const [courseResults, setCourseResults] = useState<DictionaryListEntry[]>([]);
  const [isSearchingCourses, setIsSearchingCourses] = useState(false);
  const [courseSearchError, setCourseSearchError] = useState<string | null>(null);

  const query = searchQuery.trim();
  const searchTerm = query || DEFAULT_QUERY;
  const deferredQuery = useDeferredValue(searchTerm);
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

  const activeResults = mode === 'global' ? dictionaryResults : courseResults;

  // Filters narrow the current results by word type and level; they reset with the query or scope.
  const levels = useLevels();
  const [filters, setFilters] = useState<SearchFilters>(NO_SEARCH_FILTERS);
  const hasQuery = query.length > 0;
  useEffect(() => {
    setFilters(NO_SEARCH_FILTERS);
  }, [mode, hasQuery]);
  const resultMeta = useMemo(
    () => activeResults.map((entry) => {
      const resolved = resolveLevel(entry.traditional, levels);
      return { entry, bookId: 'bookId' in entry ? entry.bookId ?? null : null, lessonId: 'lessonId' in entry ? entry.lessonId ?? null : null, level: resolved ? tocflLabel(resolved.level) : null };
    }),
    [activeResults, levels],
  );
  const bookOptions = useMemo(
    () => [...new Set(resultMeta.map(({ bookId }) => bookId).filter((id): id is number => id !== null))].sort((a, b) => a - b),
    [resultMeta],
  );
  const lessonOptions = useMemo(
    () => [...new Set(resultMeta.filter(({ bookId }) => bookId === filters.bookId).map(({ lessonId }) => lessonId).filter((id): id is number => id !== null))].sort((a, b) => a - b),
    [resultMeta, filters.bookId],
  );
  const levelOptions = useMemo(() => {
    const present = new Set(resultMeta.map(({ level }) => level));
    return LEVEL_ORDER.filter((level) => present.has(level));
  }, [resultMeta]);
  const filteredResults = useMemo(
    () => resultMeta
      .filter(({ level, bookId, lessonId }) => (!filters.level || level === filters.level)
        && (filters.bookId === null || bookId === filters.bookId)
        && (filters.lessonId === null || lessonId === filters.lessonId))
      .map(({ entry }) => entry),
    [resultMeta, filters],
  );
  const isFiltered = Object.values(filters).some((filter) => filter !== null);
  const activeError = mode === 'global' ? searchError : courseSearchError;
  const isLoading = searchTerm !== deferredQuery || (mode === 'global' ? isSearching : isSearchingCourses);
  const resultSummary = !isLoading && filteredResults.length > 0
    ? (filteredResults.length > 50 ? 'Top 50 results' : `${filteredResults.length} ${filteredResults.length === 1 ? 'result' : 'results'}`)
    : undefined;

  return (
    <div className="relative flex w-full flex-1 flex-col text-ui-ink">
      <DictionaryStickyHeader menuToggle={menuToggle} onProfileClick={onProfileClick} />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-10 gap-y-7 px-4 pb-32 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-20">
        {/* Search and results stay in one cell: a taller side rail never stretches the two apart. */}
        <div className="order-1 flex min-w-0 flex-col gap-7 lg:col-start-1 lg:row-start-1">
          <DictionarySearchBar
            value={searchQuery}
            onChange={handleResultsSearch}
            mode={mode}
            onModeChange={setMode}
            summary={resultSummary}
            filterSlot={(
              <SearchFilterMenu levelOptions={levelOptions} bookOptions={mode === 'curriculum' ? bookOptions : []} lessonOptions={lessonOptions} value={filters} onChange={setFilters} />
            )}
          />

          <DictionaryResults
            mode={mode}
            query={searchTerm}
            results={filteredResults}
            isFiltered={isFiltered}
            isLoading={isLoading}
            error={activeError}
            onOpenWord={setDictionaryWord}
          />
        </div>

        <aside
          aria-label="Today and progress"
          className={`order-2 min-w-0 lg:col-start-2 lg:row-start-1 lg:self-start lg:sticky-rail ${query ? 'hidden lg:block' : ''}`}
        >
          <DictionaryAside
            savedWords={savedWords}
            isLoadingSavedWords={isLoadingSavedWords}
            characterOfTheDay={characterOfTheDay}
            onOpenWord={setDictionaryWord}
            onViewSavedWords={handleViewSavedWords}
          />
        </aside>

        <AppFooter className="order-4 pt-6 lg:hidden" />
      </div>
    </div>
  );
}
