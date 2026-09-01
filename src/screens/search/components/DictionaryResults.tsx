import type { DictionaryListEntry } from '../../../types/models';
import { DictionaryCard } from './DictionaryCard';
import type { DictionaryMode } from './DictionaryModeTabs';

interface DictionaryResultsProps {
  mode: DictionaryMode;
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
    <div className="flex w-full flex-col">
      {isLoading && results.length === 0 && (
        <div
          role="status"
          aria-label="Searching dictionary"
          className="flex w-full flex-col gap-2"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex w-full items-center gap-4 rounded-feature border-b-[length:var(--depth-sm)] border-ui-divider bg-ui-surface px-5 py-4"
            >
              <div className="flex flex-1 flex-col gap-3">
                <div className="h-8 w-40 animate-pulse rounded-sm bg-ui-border/70" />
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-ui-border/60" />
              </div>
              <div className="h-12 w-12 animate-pulse rounded-control bg-ui-border/60" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          role="status"
          className="rounded-control border-b-[length:var(--depth-sm)] border-feedback-danger-edge/30 bg-feedback-danger-surface px-4 py-3 text-center text-sm font-bold text-feedback-danger"
        >
          {error}
        </div>
      )}

      {!error && !isLoading && results.length === 0 && (
        <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface px-6 py-12 text-center">
          <p className="text-[18px] font-black text-ui-ink">No match for “{query}”</p>
          <p className="mt-2 text-[14px] font-bold text-ui-muted">
            {mode === 'courses'
              ? 'Try another word or the full dictionary.'
              : 'Try characters, pinyin, or English.'}
          </p>
        </div>
      )}

      {results.slice(0, 50).map((entry) => (
        <DictionaryCard
          key={`${mode}-${entry.id}-${entry.traditional}`}
          entry={entry}
          isFavorite={favorites.includes(entry.traditional)}
          onToggleFavorite={() => onToggleFavorite(entry.traditional)}
          onClick={() => onOpenWord(entry.traditional)}
        />
      ))}
    </div>
  );
}
