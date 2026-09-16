import { memo } from 'react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { AppIcon, PosBadge } from '../../../lib/widgets';
import type { DictionaryListEntry } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface DictionaryCardProps {
  entry: DictionaryListEntry;
  isFavorite: boolean;
  /**
   * Word-based, not pre-bound: the list passes one stable function for every
   * row and the card applies it to its own entry, so `memo` below can bail out
   * while the search query changes (see DictionaryResults).
   */
  onToggleFavorite: (word: string) => void;
  onOpen: (word: string) => void;
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
  onOpen,
}: DictionaryCardProps) {
  const book = entry.bookId ? SAMPLE_BOOKS.find((item) => item.id === entry.bookId) : null;

  return (
    <div
      className="group flex w-full items-center gap-3 py-3.5 text-left outline-none sm:gap-4"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }}
    >
      <button
        type="button"
        onClick={() => onOpen(entry.traditional)}
        aria-label={`Open ${entry.traditional}: ${formatDefinitions(entry.definitions)}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-ring rounded-sm sm:gap-4"
      >
        <span className="shrink-0 font-chinese text-2xl font-bold leading-none text-ui-ink transition-colors group-hover:text-brand-primary sm:text-3xl">
          {entry.traditional}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate text-xs font-extrabold text-ui-muted sm:text-sm">
              {entry.pinyin_accented || '\u00A0'}
            </span>
            {entry.pos && <PosBadge pos={entry.pos} />}
            {book && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-xs bg-ui-canvas px-2 py-0.5 text-xs font-bold text-ui-muted">
                {book.label}{entry.lessonId ? ` · L${entry.lessonId}` : ''}
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', book.accentBg)} />
              </span>
            )}
          </span>
          <span className="line-clamp-1 text-sm font-bold leading-snug text-ui-ink">
            {formatDefinitions(entry.definitions) || '\u00A0'}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(entry.traditional);
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
