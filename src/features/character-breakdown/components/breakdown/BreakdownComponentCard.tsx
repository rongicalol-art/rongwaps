import React, { useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { LevelTag, Skeleton } from '../../../../lib/widgets';
import { useLevels } from '../../../../hooks/useLevels';
import { resolveLevel } from '../../../../utils/levels';
import { useCharBreakdown } from '../../../../hooks/useCharBreakdown';
import { useComponentVocabRelation } from '../../../../hooks/useComponentVocabRelation';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { formatCompactMeaning } from '../../../../utils/dictionaryDefinitions';

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
  const levels = useLevels();
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
      className={`group relative flex min-h-[110px] w-full flex-col items-center justify-center overflow-hidden rounded-feature border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface p-3 transition-[transform,background-color,border-color] hover:bg-ui-surface-hover active:scale-[0.98] focus-ring sm:min-h-[120px]`}
    >
      <div className="mb-1.5 flex h-[18px] w-full items-center justify-center gap-1.5 px-1 text-xs font-bold leading-none tracking-widest text-ui-muted">
        <div className="flex items-center justify-center h-[18px] min-w-8">
          <span className="line-clamp-1 truncate text-center w-full block">
            {data ? (data.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : ' ') : <Skeleton className="w-8 h-3 rounded-xs" />}
          </span>
        </div>
        {badgeInfo ? <LevelTag bookId={badgeInfo.bookId} lessonId={badgeInfo.lessonId} /> : <LevelTag level={resolveLevel(c, levels)} />}
      </div>
      <span className={`text-4xl sm:text-5xl leading-none font-chinese ${cardColors.textAccent} transition-all block mb-1`}>
        {c}
      </span>
      <div className="mb-1 flex h-4 min-h-4 w-full items-center justify-center px-1 text-xs font-bold text-ui-ink">
        <span className="line-clamp-1 truncate text-center w-full">
          {data ? (data.definition ? formatCompactMeaning(data.definition) : ' ') : <Skeleton className="w-16 h-3 rounded-xs mx-auto" />}
        </span>
      </div>
    </button>
  );
};
