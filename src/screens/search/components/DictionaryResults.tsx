import type { DictionaryListEntry } from '../../../types/models';
import { DictionaryCard } from './DictionaryCard';
import type { SearchMode } from './SearchModeDock';
import { Skeleton } from '../../../lib/widgets';

interface DictionaryResultsProps {
  mode: SearchMode;
  query: string;
  results: DictionaryListEntry[];
  favorites: string[];
  isLoading: boolean;
  error: string | null;
  onOpenWord: (word: string) => void;
  onToggleFavorite: (word: string) => void;
}

export function DictionaryResults({
  mode,
  query,
  results,
  favorites,
  isLoading,
  error,
  onOpenWord,
  onToggleFavorite,
}: DictionaryResultsProps) {
  return (
    <div className="w-full">
      {error && (
        <div
          role="status"
          className="mb-4 rounded-control border-b-[length:var(--depth-sm)] border-feedback-danger-edge/30 bg-feedback-danger-surface px-4 py-3 text-center text-sm font-bold text-feedback-danger"
        >
          {error}
        </div>
      )}

      {!error && !isLoading && results.length === 0 && (
        <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-6 py-12 text-center">
          <p className="text-[18px] font-black text-ui-ink">No match for “{query}”</p>
          <p className="mt-2 text-[14px] font-bold text-ui-muted">
            {mode === 'curriculum'
              ? 'Try enabling more books in the bottom dock or switch to Global search.'
              : 'Try searching characters, pinyin, or English.'}
          </p>
        </div>
      )}

      {(isLoading || results.length > 0) && (
        <section
          aria-label="Search results"
          className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-5 sm:px-6"
        >
          <div className="flex flex-col [&>*+*]:border-t-2 [&>*+*]:border-ui-divider">
            {isLoading && results.length === 0
              ? Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex w-full items-center gap-3 py-3.5 sm:gap-4">
                    <Skeleton className="h-8 w-20 shrink-0 sm:w-24" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-4 w-44 max-w-full" />
                    </div>
                  </div>
                ))
              : results.slice(0, 50).map((entry) => (
                  <DictionaryCard
                    key={`${mode}-${entry.id}-${entry.traditional}`}
                    entry={entry}
                    isFavorite={favorites.includes(entry.traditional)}
                    onToggleFavorite={() => onToggleFavorite(entry.traditional)}
                    onClick={() => onOpenWord(entry.traditional)}
                  />
                ))}
          </div>
        </section>
      )}
    </div>
  );
}
