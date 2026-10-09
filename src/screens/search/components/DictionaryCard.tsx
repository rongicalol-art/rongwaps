import { memo, useMemo } from 'react';
import { LevelTag } from '../../../lib/widgets';
import { useLevels } from '../../../hooks/useLevels';
import { resolveLevel } from '../../../utils/lesson/levels';
import { FavoriteButton } from '../../../features/library';
import type { DictionaryListEntry } from '../../../types/models';
import { DictionaryRow } from './DictionaryRow';

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
  const meaning = formatDefinitions(entry.definitions);

  return (
    <DictionaryRow
      glyph={entry.traditional}
      pinyin={entry.pinyin_accented}
      meaning={meaning}
      pos={entry.pos}
      onOpen={() => onOpen(entry.traditional)}
      ariaLabel={`Open ${entry.traditional}: ${meaning}`}
      trailing={<LevelTag bookId={entry.bookId ?? undefined} lessonId={entry.lessonId ?? undefined} level={level} />}
      action={(
        <FavoriteButton
          word={entry.traditional}
          traditional={entry.traditional}
          simplified={entry.simplified}
          pinyin={entry.pinyin_accented || undefined}
          definitions={entry.definitions}
          size="lg"
          variant="ghost"
        />
      )}
    />
  );
});
