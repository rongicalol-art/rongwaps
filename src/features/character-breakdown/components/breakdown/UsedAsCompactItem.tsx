import React from 'react';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { LevelTag, Skeleton } from '../../../../lib/widgets';
import { useLevels } from '../../../../hooks/useLevels';
import { resolveLevel } from '../../../../utils/lesson/levels';
import { useCharBreakdownState } from '../../../../hooks/useCharBreakdown';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { isPureVariantDefinition } from '../../../../utils/vocabulary/dictionaryDefinitions';
import { CharacterGlyph } from './CharacterGlyph';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface UsedAsCompactItemProps {
  c: string;
  setDictionaryWord: (w: string) => void;
  activeBook: CourseBook;
  isLast?: boolean;
  badgeInfo?: { bookId: number; lessonId: number } | null;
}

export const UsedAsCompactItem: React.FC<UsedAsCompactItemProps> = ({
  c,
  setDictionaryWord,
  activeBook,
  isLast,
  badgeInfo
}) => {
  const levels = useLevels();
  const { data, isLoading } = useCharBreakdownState(c);
  const pinyin = data?.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : '';
  const definition = data?.definition?.split(';')[0]?.trim() || '';

  const itemBookAccent = activeBook.accent;

  // Skip characters without definitions or characters that are pure variants
  if (!isLoading && (!definition || isPureVariantDefinition(definition))) {
    return null;
  }

  const hasMetadata = Boolean(pinyin || definition);

  return (
    <button
      onClick={() => setDictionaryWord(c)}
      className={`group flex min-h-[68px] w-full flex-row items-center gap-4 bg-ui-surface px-4 py-3 transition-colors hover:bg-ui-surface-hover active:bg-ui-hover focus-ring focus-visible:ring-inset ${!isLast ? 'border-b-2 border-ui-divider' : ''}`}
    >
      <CharacterGlyph character={c} className={`shrink-0 text-2xl leading-none sm:text-3xl ${itemBookAccent}`} />
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center overflow-hidden text-left">
        <div className="flex w-full flex-row items-center justify-between gap-2 pr-1">
          <div className="min-w-0 flex-1 text-left">
            {isLoading ? (
              <Skeleton className="h-3 w-20 rounded-xs" />
            ) : hasMetadata ? (
              <>
                {pinyin && <span className="block truncate text-xs font-bold tracking-wide text-ui-muted sm:text-sm">{pinyin}</span>}
                {definition && <span className="mt-0.5 block truncate text-xs font-bold text-ui-ink sm:text-sm">{definition}</span>}
              </>
            ) : null}
          </div>
          {badgeInfo ? <LevelTag bookId={badgeInfo.bookId} lessonId={badgeInfo.lessonId} /> : <LevelTag level={resolveLevel(c, levels)} />}
        </div>
      </div>
    </button>
  );
};
