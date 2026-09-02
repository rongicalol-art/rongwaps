import React, { useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { Skeleton } from '../../../../lib/widgets';
import { useCharBreakdown } from '../../../../hooks/useCharBreakdown';
import { useComponentVocabRelation } from '../../../../hooks/useComponentVocabRelation';
import { numberToToneMarks } from '../../../../utils/pinyin';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface BreakdownComponentCardProps {
  c: string;
  chars: string[];
  setBreakdownCharIndex: (i: number) => void;
  activeBook: CourseBook;
  setDictionaryWord: (w: string) => void;
}

export const BreakdownComponentCard: React.FC<BreakdownComponentCardProps> = ({
  c,
  activeBook,
  setDictionaryWord
}) => {
  const data = useCharBreakdown(c);
  const { exactVocab, usedInVocabs, hasRelation } = useComponentVocabRelation(c);

  const cardColors = useMemo(() => {
    return {
      bgLight: 'bg-ui-surface',
      textAccent: activeBook.accent || 'text-brand-secondary',
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
      className={`group relative flex min-h-[110px] w-full flex-col items-center justify-center overflow-hidden rounded-[20px] border-b-4 border-ui-border p-3 outline-none transition-[transform,background-color,border-color] hover:bg-ui-surface-hover active:translate-y-[3px] active:border-b focus-visible:ring-4 focus-visible:ring-brand-primary/25 sm:min-h-[120px] ${cardColors.bgLight}`}
    >
      <div className="mb-1.5 flex h-[18px] w-full items-center justify-center gap-1.5 px-1 text-[12px] font-bold leading-none tracking-widest text-ui-muted sm:text-[13px]">
        <div className="flex items-center justify-center h-[18px] min-w-8">
          <span className="line-clamp-1 truncate text-center w-full block">
            {data ? (data.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : ' ') : <Skeleton className="w-8 h-3 rounded-[3px]" />}
          </span>
        </div>
        {badgeInfo && (() => {
          const bookInfo = SAMPLE_BOOKS.find(b => b.id === badgeInfo.bookId);
          const dotColorClass = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
          return (
            <span className="flex shrink-0 select-none items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ui-muted opacity-80 sm:text-[11px]">
              <span>B{badgeInfo.bookId} · L{badgeInfo.lessonId}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass} shrink-0`} />
            </span>
          );
        })()}
      </div>
      <span className={`text-[36px] sm:text-[40px] leading-none font-chinese ${cardColors.textAccent} transition-all block mb-1`}>
        {c}
      </span>
      <div className="mb-1 flex h-[16px] min-h-[16px] w-full items-center justify-center px-1 text-[12px] font-bold text-ui-ink sm:text-[13px]">
        <span className="line-clamp-1 truncate text-center w-full">
          {data ? (data.definition ? data.definition.split(';')[0] : ' ') : <Skeleton className="w-16 h-3 rounded-[3px] mx-auto" />}
        </span>
      </div>
    </button>
  );
};
