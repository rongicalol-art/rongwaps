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
    <div className="flex w-full flex-col gap-3">
      {isLoading && results.length === 0 && (
        <div
          role="status"
          aria-label="Searching dictionary"
          className="flex w-full flex-col gap-3"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex w-full items-center gap-4 rounded-[24px] border-2 border-b-[6px] border-ui-border bg-white px-5 py-4"
            >
              <div className="flex flex-1 flex-col gap-3">
                <div className="h-8 w-40 animate-pulse rounded-[12px] bg-ui-border/70" />
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-ui-border/60" />
              </div>
              <div className="h-12 w-12 animate-pulse rounded-[16px] bg-ui-border/60" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          role="status"
          className="rounded-[16px] border-2 border-feedback-danger-edge/20 bg-feedback-danger-surface px-4 py-3 text-center text-sm font-bold text-feedback-danger"
        >
          {error}
        </div>
      )}

      {!error && !isLoading && results.length === 0 && (
        <div className="rounded-[24px] border-2 border-b-[6px] border-ui-border bg-white px-6 py-12 text-center">
          <p className="text-[18px] font-black text-ui-ink">No match for “{query}”</p>
          <p className="mt-2 text-[14px] font-bold text-ui-muted">
            {mode === 'courses'
              ? 'Try another word or switch to the full dictionary.'
              : 'Try Chinese characters, pinyin without tones, or English.'}
          </p>
        </div>
      )}

      {results.slice(0, 50).map((entry, index) => (
        <DictionaryCard
          key={`${mode}-${entry.id}-${entry.traditional}-${index}`}
          entry={entry}
          isFavorite={favorites.includes(entry.traditional)}
          onToggleFavorite={() => onToggleFavorite(entry.traditional)}
          onClick={() => onOpenWord(entry.traditional)}
        />
      ))}
    </div>
  );
}
