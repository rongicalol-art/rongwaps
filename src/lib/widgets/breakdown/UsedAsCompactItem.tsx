import React, { useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { Skeleton } from '../Skeleton';
import { useCharBreakdown } from '../../../hooks/useCharBreakdown';
import { numberToToneMarks } from '../../../utils/pinyin';

interface UsedAsCompactItemProps {
  c: string;
  setDictionaryWord: (w: string) => void;
  activeBook: any;
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
      className={`w-full bg-white px-4 py-3 flex flex-row items-center gap-4 active:bg-[#F2F2F2] hover:bg-[#F9F9F9] transition-all group outline-none ${!isLast ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}
    >
      <span className={`text-[28px] sm:text-[32px] leading-none font-chinese ${itemBookAccent} transition-all shrink-0 pt-1`}>
        {c}
      </span>
      <div className="flex flex-col items-start justify-center flex-1 min-w-0 text-left overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full pr-1">
          <div className="h-[20px] flex-1 flex items-center text-left">
            <span className="text-[13px] sm:text-[14px] font-bold text-[#AFB6BB] tracking-widest line-clamp-1 truncate text-left">
              {data ? (data.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : ' ') : <Skeleton className="w-12 h-3 rounded-[3px]" />}
            </span>
          </div>
          {badgeInfo && (() => {
            const bookInfo = SAMPLE_BOOKS.find(b => b.id === badgeInfo.bookId);
            const dotColorClass = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
            return (
              <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-[#AFB6BB] tracking-widest uppercase opacity-80 select-none">
                <span>B{badgeInfo.bookId} · L{badgeInfo.lessonId}</span>
                <span className={`w-2 h-2 rounded-full ${dotColorClass} shrink-0`} />
              </span>
            );
          })()}
        </div>
        <div className="w-full mt-0.5 h-[20px] flex items-center">
          <span className="text-[13px] sm:text-[14px] font-bold text-[#4B4B4B] line-clamp-1 truncate w-full text-left">
            {data ? (data.definition ? data.definition.split(';')[0] : ' ') : <Skeleton className="w-32 h-3.5 rounded-[4px]" />}
          </span>
        </div>
      </div>
    </button>
  );
};
