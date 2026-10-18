import { SectionEyebrow, Skeleton } from '../../../lib/widgets';
import type { DictionarySavedPreview } from '../../../types/models';

const MAX_PREVIEW_ITEMS = 8;

interface SavedWordsPreviewProps {
  items: DictionarySavedPreview[];
  isLoading: boolean;
  totalCount?: number;
  onOpenWord: (word: string) => void;
  onViewAll: () => void;
}

/** Saved words sit in a tidy two-column grid so the rail never reads as a ragged pile. */
export function SavedWordsPreview({ items, isLoading, totalCount, onOpenWord, onViewAll }: SavedWordsPreviewProps) {
  const visibleItems = items.slice(0, MAX_PREVIEW_ITEMS);
  const displayCount = totalCount ?? (items.length > 0 ? items.length : undefined);

  return (
    <section aria-label="Saved words" className="min-w-0">
      <SectionEyebrow
        title="Saved"
        count={displayCount}
        action={items.length > visibleItems.length && (
          <button
            type="button"
            onClick={onViewAll}
            className="min-h-9 shrink-0 rounded-compact px-2.5 text-sm font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring"
          >
            See all
          </button>
        )}
      />
      {isLoading ? (
        <div className="grid min-h-12 grid-cols-2 gap-2.5">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12 w-full rounded-control" />)}
        </div>
      ) : visibleItems.length > 0 ? (
        <div className="grid min-h-12 grid-cols-2 gap-2.5">
          {visibleItems.map((item) => (
            <button
              key={item.word}
              type="button"
              onClick={() => onOpenWord(item.word)}
              aria-label={`Open ${item.traditional || item.word}`}
              className="flex h-12 min-w-0 items-center gap-2 rounded-control border-2 border-b-4 border-ui-divider bg-ui-surface px-3 py-1.5 transition-transform active:translate-y-0.5 active:border-b-2 focus-ring"
            >
              <span className="font-chinese text-2xl leading-none text-ui-ink-strong">{item.traditional || item.word}</span>
              <span className="min-w-0 flex-1 truncate text-left text-[13px] font-extrabold text-ui-muted">{(item.meaning || '').split(';')[0]}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="flex min-h-12 items-center text-[15px] font-bold text-ui-muted">Tap the bookmark on any word to keep it here.</p>
      )}
    </section>
  );
}
