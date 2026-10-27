import { motion } from 'motion/react';
import type { DictionaryListEntry } from '../../../types/models';
import { DictionaryCard } from './DictionaryCard';
import type { SearchMode } from './DictionarySearchBar';
import { ActionButton, AlertBanner, EmptyState, Skeleton } from '../../../lib/widgets';

interface DictionaryResultsProps {
  mode: SearchMode;
  query: string;
  results: DictionaryListEntry[];
  favorites?: string[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  /** Filters are narrowing the list, so an empty list says so. */
  isFiltered?: boolean;
  onOpenWord: (word: string) => void;
  onToggleFavorite?: (word: string) => void;
}

export function DictionaryResults({
  mode,
  query,
  results,
  isLoading,
  error,
  onRetry,
  isFiltered = false,
  onOpenWord,
}: DictionaryResultsProps) {

  return (
    <div className="w-full">
      {error && (
        <AlertBanner variant="danger" message={error} className="mb-4"
          action={onRetry ? <ActionButton variant="quiet" size="sm" onClick={onRetry}>Try again</ActionButton> : undefined} />
      )}

      {isLoading && <p role="status" className="mb-3 text-sm text-ui-muted">Searching…</p>}

      {!error && !isLoading && results.length === 0 && (
        <EmptyState
          icon="search"
          iconBg="bg-ui-surface"
          iconColor="text-ui-muted"
          title={`No match for “${query}”`}
          description={
            isFiltered
              ? 'No results match these filters. Clear them to see everything.'
              : mode === 'curriculum'
              ? 'Try the pinyin without tones, or switch to All words.'
              : 'Try the pinyin without tones, or an English word.'
          }
        />
      )}

      {(isLoading || results.length > 0) && (
        <section aria-label="Search results">
          <div className="flex flex-col">
            {isLoading && results.length === 0 ? (
              <motion.div
                key="dictionary-skeleton-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="flex min-h-[70dvh] flex-col"
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="flex w-full items-center gap-4 border-b-2 border-ui-divider px-1 py-3.5 last:border-b-0">
                    {/* Character Box */}
                    <Skeleton className="h-8 w-12 sm:w-14 shrink-0 rounded-xs" />
                    {/* Middle lines */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-4 w-10 rounded-xs" />
                        <Skeleton className="h-4 w-16 rounded-xs" />
                      </div>
                      <Skeleton className="h-4 w-3/4 max-w-sm" />
                    </div>
                    {/* Bookmark Icon Button Placeholder */}
                    <Skeleton className="h-8 w-8 shrink-0 rounded-control" />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="dictionary-results-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                {results.slice(0, 50).map((entry) => (
                  <DictionaryCard
                    key={`${mode}-${entry.id}-${entry.traditional}`}
                    entry={entry}
                    onOpen={onOpenWord}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
