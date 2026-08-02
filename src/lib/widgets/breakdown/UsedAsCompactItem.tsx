import React, { useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { Skeleton } from '../Skeleton';
import { useCharBreakdown } from '../../../hooks/useCharBreakdown';
import { numberToToneMarks } from '../../../utils/pinyin';

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
  const data = useCharBreakdown(c);
  
  const itemBookAccent = useMemo(() => {
    return activeBook.accent;
  }, [activeBook]);

  return (
    <button
      onClick={() => setDictionaryWord(c)}
      className={`group flex w-full flex-row items-center gap-4 bg-ui-surface px-4 py-3 outline-none transition-colors hover:bg-ui-surface-hover active:bg-ui-hover focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-primary/25 ${!isLast ? 'border-b-2 border-ui-divider' : ''}`}
    >
      <span className={`text-[28px] sm:text-[32px] leading-none font-chinese ${itemBookAccent} transition-all shrink-0 pt-1`}>
        {c}
      </span>
      <div className="flex flex-col items-start justify-center flex-1 min-w-0 text-left overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full pr-1">
          <div className="h-[20px] flex-1 flex items-center text-left">
            <span className="truncate text-left text-[13px] font-bold tracking-widest text-ui-muted sm:text-[14px]">
              {data ? (data.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : ' ') : <Skeleton className="w-12 h-3 rounded-[3px]" />}
            </span>
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
        <div className="w-full mt-0.5 h-[20px] flex items-center">
          <span className="w-full truncate text-left text-[13px] font-bold text-ui-ink sm:text-[14px]">
            {data ? (data.definition ? data.definition.split(';')[0] : ' ') : <Skeleton className="w-32 h-3.5 rounded-[4px]" />}
          </span>
        </div>
      </div>
    </button>
  );
};
