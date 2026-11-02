import React, { useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { LevelTag } from '../../../../lib/widgets';
import { useLevels } from '../../../../hooks/useLevels';
import { resolveLevel } from '../../../../utils/lesson/levels';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { useAppStore } from '../../../../store/useAppStore';
import { groupWordsByBook } from '../../../../utils/vocabulary/wordOrdering';
import type { Flashcard } from '../../../../data/flashcards';
import { BREAKDOWN_LIST_CARD, BreakdownListSection, capGroups } from './BreakdownListSection';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

const MAX_RELATED_IN_COMPACT = 5;

interface RelatedWordsSectionProps {
  relatedWords: Flashcard[];
  activeBook: CourseBook;
  openRelatedBreakdown: () => void;
  isRelatedLoading?: boolean;
}

/** Related words grouped by book, capped for the compact view, with skeleton state. */
export const RelatedWordsSection: React.FC<RelatedWordsSectionProps> = ({
  relatedWords,
  activeBook,
  openRelatedBreakdown,
  isRelatedLoading = false,
}) => {
  const levels = useLevels();
  // Related words from ALL books: current book first, then 1-4, dictionary last; the compact view shows the first few.
  const relatedGroups = useMemo(
    () => capGroups(groupWordsByBook(relatedWords, { activeBookId: activeBook.id, levels }), MAX_RELATED_IN_COMPACT),
    [relatedWords, activeBook.id, levels],
  );

  if (!isRelatedLoading && relatedGroups.length === 0) return null;

  return (
    <BreakdownListSection
      title="Related Words"
      total={relatedWords.length}
      hasMore={relatedWords.length > MAX_RELATED_IN_COMPACT}
      onShowAll={openRelatedBreakdown}
      accent={activeBook.accent}
      loading={isRelatedLoading}
      skeletonRows={2}
      gap="gap-5"
    >
      {relatedGroups.map((group) => (
        <div key={group.bookId} className={BREAKDOWN_LIST_CARD}>
          {group.cards.map((card, idx) => {
            const isLast = idx === group.cards.length - 1;
            return (
              <button
                key={idx}
                onClick={() => useAppStore.getState().setDictionaryWord(card.front)}
                className={`group flex w-full flex-row items-center gap-4 bg-ui-surface px-4 py-3 transition-colors hover:bg-ui-surface-hover active:bg-ui-hover focus-ring focus-visible:ring-inset ${!isLast ? 'border-b-2 border-ui-divider' : ''}`}
              >
                <span className={`text-2xl sm:text-3xl leading-none font-chinese pt-1 ${activeBook.accent} transition-all shrink-0`}>
                  {card.front}
                </span>
                <div className="flex flex-col items-start justify-center flex-1 min-w-0 text-left overflow-hidden">
                  <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full pr-1">
                    <span className="h-5 flex-1 truncate text-left text-xs font-bold tracking-widest text-ui-muted sm:text-sm">
                      {numberToToneMarks(card.pinyin)}
                    </span>
                    {card.bookId <= 0 ? <LevelTag level={resolveLevel(card.front, levels)} /> : <LevelTag bookId={card.bookId} lessonId={card.lessonId} />}
                  </div>
                  <span className="mt-0.5 h-[20px] w-full truncate text-[13px] font-bold text-ui-ink sm:text-[14px]">
                    {card.back}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </BreakdownListSection>
  );
};
