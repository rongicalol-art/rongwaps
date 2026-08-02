import { memo } from 'react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import type { DictionaryListEntry } from '../../../types/models';

interface DictionaryCardProps {
  entry: DictionaryListEntry;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

function formatDefinitions(definitions: DictionaryListEntry['definitions']): string {
  if (typeof definitions === 'string') return definitions;
  if (Array.isArray(definitions)) return definitions.join(' • ');
  return Object.values(definitions).join(' • ');
}

export const DictionaryCard = memo(function DictionaryCard({
  entry,
  isFavorite,
  onToggleFavorite,
  onClick,
}: DictionaryCardProps) {
  const book = entry.bookId ? SAMPLE_BOOKS.find((item) => item.id === entry.bookId) : null;

  return (
    <article
      className="group flex w-full flex-row items-center gap-3 rounded-[24px] border-2 border-ui-border bg-ui-surface px-4 py-3 transition-colors hover:border-brand-primary focus-within:border-brand-primary focus-within:ring-4 focus-within:ring-brand-primary/20 sm:gap-4 sm:px-5 sm:py-4"
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 min-w-0 flex-1 flex-col items-start overflow-hidden rounded-[16px] text-left outline-none"
        aria-label={`Open ${entry.traditional}: ${formatDefinitions(entry.definitions)}`}
      >
        <div className="relative mb-1 flex w-full items-center gap-3">
          <span className="shrink-0 pt-1 font-chinese text-[28px] font-bold leading-none text-ui-ink transition-colors group-hover:text-[#1CB0F6] sm:text-[32px]">
            {entry.traditional}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold uppercase tracking-widest text-ui-muted sm:text-[14px]">
              {entry.pinyin_accented}
            </span>
            {book && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-ui-border bg-ui-canvas px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-ui-muted">
                {book.label}
                <span className={`h-2 w-2 shrink-0 rounded-full ${book.accentBg}`} />
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 line-clamp-2 w-full break-words text-[15px] font-bold leading-snug text-ui-ink">
          {formatDefinitions(entry.definitions)}
        </div>
      </button>

      <IconActionButton
        type="button"
        size="lg"
        variant="surface"
        className={isFavorite ? 'border-brand-secondary/30 text-brand-secondary hover:text-brand-secondary' : undefined}
        label={isFavorite ? `Remove ${entry.traditional} from saved words` : `Save ${entry.traditional}`}
        onClick={onToggleFavorite}
        icon={<AppIcon name={isFavorite ? 'bookmarkFilled' : 'bookmark'} size={23} />}
      />
    </article>
  );
});
