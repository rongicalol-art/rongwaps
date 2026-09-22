import { AppIcon, ReferenceRow, SectionEyebrow, Skeleton } from '../../../lib/widgets';
import { numberToToneMarks } from '../../../utils/pinyin';
import type { DictionarySavedPreview } from '../../../types/models';

const SEE_ALL_CLASSES =
  'min-h-9 shrink-0 rounded-compact px-2.5 text-xs font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring';
const MAX_PREVIEW_ITEMS = 4;

interface SavedWordsPreviewProps {
  items: DictionarySavedPreview[];
  isLoading: boolean;
  totalCount?: number;
  onOpenWord: (word: string) => void;
  onViewAll: () => void;
}

export function SavedWordsPreview({
  items,
  isLoading,
  totalCount,
  onOpenWord,
  onViewAll,
}: SavedWordsPreviewProps) {
  const visibleItems = items.slice(0, MAX_PREVIEW_ITEMS);
  const displayCount = totalCount ?? (items.length > 0 ? items.length : undefined);

  return (
    <section className="flex h-full min-w-0 flex-col rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6">
      <SectionEyebrow
        title="Saved"
        count={displayCount}
        icon={<AppIcon name="bookmark" className="text-feedback-warning-edge" size={16} />}
        action={
          items.length > 0 && (
            <button
              type="button"
              onClick={onViewAll}
              className={SEE_ALL_CLASSES}
            >
              See all
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="mt-1 divide-y divide-ui-divider/40 animate-in fade-in duration-200">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`saved-skeleton-${i}`} className="flex min-h-[54px] items-center gap-3 px-2 py-2">
              <Skeleton className="h-7 w-12 shrink-0 rounded-xs" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-14 rounded-xs" />
                <Skeleton className="mt-1.5 h-3.5 w-3/4 max-w-[12rem] rounded-xs" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length > 0 ? (
        <div className="mt-1 divide-y divide-ui-divider/40">
          {visibleItems.map((item) => (
            <ReferenceRow
              key={item.word}
              glyph={item.traditional || item.word}
              primary={numberToToneMarks(item.pinyin)}
              secondary={item.meaning || 'Saved word'}
              onClick={() => onOpenWord(item.word)}
              ariaLabel={`Open ${item.traditional || item.word}`}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex min-h-[120px] flex-1 items-center justify-center rounded-control bg-ui-canvas/40 px-4 text-center">
          <p className="text-sm font-bold text-ui-muted-strong">Saved words appear here.</p>
        </div>
      )}
    </section>
  );
}
