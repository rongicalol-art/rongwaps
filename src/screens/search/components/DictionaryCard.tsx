import { memo, useMemo } from 'react';
import { LevelTag, PosBadge } from '../../../lib/widgets';
import { useLevels } from '../../../hooks/useLevels';
import { resolveLevel } from '../../../utils/levels';
import { FavoriteButton } from '../../../features/library';
import type { DictionaryListEntry } from '../../../types/models';

interface DictionaryCardProps {
  entry: DictionaryListEntry;
  onOpen: (word: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (word: string) => void;
}

function formatDefinitions(definitions: DictionaryListEntry['definitions']): string {
  if (typeof definitions === 'string') return definitions;
  if (Array.isArray(definitions)) return definitions.join(' • ');
  return Object.values(definitions).join(' • ');
}

export const DictionaryCard = memo(function DictionaryCard({
  entry,
  onOpen,
}: DictionaryCardProps) {
  const levels = useLevels();
  const level = useMemo(() => resolveLevel(entry.traditional, levels), [entry.traditional, levels]);

  return (
    <div
      className="group flex w-full items-center gap-3 py-3.5 text-left outline-none sm:gap-4"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }}
    >
      <button
        type="button"
        onClick={() => onOpen(entry.traditional)}
        aria-label={`Open ${entry.traditional}: ${formatDefinitions(entry.definitions)}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-ring rounded-sm sm:gap-4 cursor-pointer"
      >
        <span className="shrink-0 font-chinese text-2xl font-bold leading-none text-ui-ink transition-colors group-hover:text-brand-primary sm:text-3xl">
          {entry.traditional}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate text-xs font-extrabold text-ui-muted sm:text-sm">
              {entry.pinyin_accented || '\u00A0'}
            </span>
            <LevelTag bookId={entry.bookId ?? undefined} lessonId={entry.lessonId ?? undefined} level={level} />
          </span>
          <span className="line-clamp-1 text-sm font-bold leading-snug text-ui-ink">
            {formatDefinitions(entry.definitions) || '\u00A0'}
          </span>
        </span>
      </button>

      {entry.pos && (
        <span className="shrink-0">
          <PosBadge pos={entry.pos} />
        </span>
      )}

      <FavoriteButton
        word={entry.traditional}
        traditional={entry.traditional}
        simplified={entry.simplified}
        pinyin={entry.pinyin_accented || undefined}
        definitions={entry.definitions}
        size="lg"
        variant="ghost"
      />
    </div>
  );
});
