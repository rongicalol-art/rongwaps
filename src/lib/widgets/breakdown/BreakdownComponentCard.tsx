import React, { useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { Skeleton } from '../Skeleton';
import { useCharBreakdown } from '../../../hooks/useCharBreakdown';
import { useComponentVocabRelation } from '../../../hooks/useComponentVocabRelation';
import { numberToToneMarks } from '../../../utils/pinyin';

interface BreakdownComponentCardProps {
  c: string;
  chars: string[];
  setBreakdownCharIndex: (i: number) => void;
  activeBook: any;
  setDictionaryWord: (w: string) => void;
}

export const BreakdownComponentCard: React.FC<BreakdownComponentCardProps> = ({
  c,
  activeBook,
  setDictionaryWord
}) => {
  const data = useCharBreakdown(c);
  const { exactVocab, usedInVocabs, hasRelation } = useComponentVocabRelation(c);

  // Choose component card styles
  const cardColors = useMemo(() => {
    return {
      border: 'border-[#E5E5E5]',
      borderActive: 'active:border-b-[2px]',
      borderBottom: 'border-b-[#E5E5E5]',
      bgLight: 'bg-white',
      textAccent: activeBook.accent || 'text-[#FF9600]',
    };
  }, [activeBook]);

  const badgeInfo = useMemo(() => {
    if (!hasRelation) return null;
    if (exactVocab) {
      return { bookId: exactVocab.bookId, lessonId: exactVocab.lessonId };
    }
    if (usedInVocabs && usedInVocabs.length > 0) {
      return { bookId: usedInVocabs[0].bookId, lessonId: usedInVocabs[0].lessonId };
    }
    return null;
  }, [hasRelation, exactVocab, usedInVocabs]);

  return (
    <button
      onClick={() => {
        setDictionaryWord(c);
      }}
      className={`w-full ${cardColors.bgLight} rounded-[20px] p-3 flex flex-col items-center justify-center border-[3px] ${cardColors.border} border-b-[6px] ${cardColors.borderBottom} active:border-b-[2px] ${cardColors.borderActive} active:translate-y-[4px] hover:brightness-[0.98] transition-all group min-h-[110px] sm:min-h-[120px] outline-none relative overflow-hidden`}
    >
      <div className="flex items-center justify-center gap-1.5 mb-1.5 h-[18px] w-full px-1 text-[12px] sm:text-[13px] font-bold text-[#AFB6BB] tracking-widest leading-none">
        <div className="flex items-center justify-center h-[18px] min-w-8">
          <span className="line-clamp-1 truncate text-center w-full block">
            {data ? (data.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : ' ') : <Skeleton className="w-8 h-3 rounded-[3px]" />}
          </span>
        </div>
        {badgeInfo && (() => {
          const bookInfo = SAMPLE_BOOKS.find(b => b.id === badgeInfo.bookId);
          const dotColorClass = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
          return (
            <span className="shrink-0 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-[#AFB6BB] tracking-widest uppercase opacity-80 select-none">
              <span>B{badgeInfo.bookId} · L{badgeInfo.lessonId}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass} shrink-0`} />
            </span>
          );
        })()}
      </div>
      <span className={`text-[36px] sm:text-[40px] leading-none font-chinese ${cardColors.textAccent} transition-all block mb-1`}>
        {c}
      </span>
      <div className="text-[12px] sm:text-[13px] font-bold text-[#4B4B4B] w-full px-1 mb-1 flex items-center justify-center min-h-[16px] h-[16px]">
        <span className="line-clamp-1 truncate text-center w-full">
          {data ? (data.definition ? data.definition.split(';')[0] : ' ') : <Skeleton className="w-16 h-3 rounded-[3px] mx-auto" />}
        </span>
      </div>
    </button>
  );
};
