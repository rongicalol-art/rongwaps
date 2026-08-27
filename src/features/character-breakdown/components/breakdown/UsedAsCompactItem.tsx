import React, { useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { Skeleton } from '../../../../lib/widgets';
import { useCharBreakdownState } from '../../../../hooks/useCharBreakdown';
import { numberToToneMarks } from '../../../../utils/pinyin';
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
  const { data, isLoading } = useCharBreakdownState(c);
  const pinyin = data?.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : '';
  const definition = data?.definition?.split(';')[0]?.trim() || '';
  const hasMetadata = Boolean(pinyin || definition);
  
  const itemBookAccent = useMemo(() => {
    return activeBook.accent;
  }, [activeBook]);

  return (
    <button
      onClick={() => setDictionaryWord(c)}
      className={`group flex min-h-[68px] w-full flex-row items-center gap-4 bg-ui-surface px-4 py-3 outline-none transition-colors hover:bg-ui-surface-hover active:bg-ui-hover focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-primary/25 ${!isLast ? 'border-b border-ui-divider' : ''}`}
    >
      <CharacterGlyph character={c} className={`shrink-0 text-[28px] leading-none sm:text-[32px] ${itemBookAccent}`} />
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center overflow-hidden text-left">
        <div className="flex w-full flex-row items-center justify-between gap-2 pr-1">
          <div className="min-w-0 flex-1 text-left">
            {isLoading ? (
              <Skeleton className="h-3 w-20 rounded-[3px]" />
            ) : hasMetadata ? (
              <>
                {pinyin && <span className="block truncate text-[13px] font-bold tracking-wide text-ui-muted sm:text-[14px]">{pinyin}</span>}
                {definition && <span className="mt-0.5 block truncate text-[13px] font-bold text-ui-ink sm:text-[14px]">{definition}</span>}
              </>
            ) : null}
          </div>
          {badgeInfo && (() => {
            const bookInfo = SAMPLE_BOOKS.find(b => b.id === badgeInfo.bookId);
            const dotColorClass = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
            return (
              <span className="flex shrink-0 select-none items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ui-muted opacity-80">
                <span>B{badgeInfo.bookId} · L{badgeInfo.lessonId}</span>
                <span className={`w-2 h-2 rounded-full ${dotColorClass} shrink-0`} />
              </span>
            );
          })()}
        </div>
      </div>
    </button>
  );
};
