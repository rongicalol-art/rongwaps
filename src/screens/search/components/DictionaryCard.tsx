import { memo } from 'react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { AppIcon, PosBadge } from '../../../lib/widgets';
import type { DictionaryListEntry } from '../../../types/models';
import { cn } from '../../../utils/cn';

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
    <div className="group flex w-full items-center gap-3 py-3.5 text-left outline-none sm:gap-4">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Open ${entry.traditional}: ${formatDefinitions(entry.definitions)}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-ring rounded-sm sm:gap-4"
      >
        <span className="shrink-0 font-chinese text-[26px] font-bold leading-none text-ui-ink transition-colors group-hover:text-brand-primary sm:text-[30px]">
          {entry.traditional}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate text-[13px] font-extrabold text-ui-muted sm:text-[14px]">
              {entry.pinyin_accented || '\u00A0'}
            </span>
            {entry.pos && <PosBadge pos={entry.pos} />}
            {book && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ui-canvas px-2 py-0.5 text-[11px] font-bold text-ui-muted">
                {book.label}{entry.lessonId ? ` · L${entry.lessonId}` : ''}
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', book.accentBg)} />
              </span>
            )}
          </span>
          <span className="line-clamp-1 text-[14px] font-bold leading-snug text-ui-ink sm:text-[15px]">
            {formatDefinitions(entry.definitions) || '\u00A0'}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={isFavorite ? `Remove ${entry.traditional} from saved words` : `Save ${entry.traditional}`}
        aria-pressed={isFavorite}
        className={cn(
          'shrink-0 p-2 rounded-control text-ui-muted outline-none transition-colors hover:text-brand-secondary focus-ring',
          isFavorite && 'text-brand-secondary',
        )}
      >
        <AppIcon
          name={isFavorite ? 'bookmarkFilled' : 'bookmark'}
          size={22}
          className={isFavorite ? 'text-brand-secondary' : undefined}
        />
      </button>
    </div>
  );
});
