import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { LevelTag, Skeleton } from '../../../../lib/widgets';
import { useLevels } from '../../../../hooks/useLevels';
import { resolveLevel } from '../../../../utils/lesson/levels';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { useAppStore } from '../../../../store/useAppStore';
import { groupWordsByBook } from '../../../../utils/vocabulary/wordOrdering';
import type { Flashcard } from '../../../../data/flashcards';

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
  const { relatedGroups, totalRelatedCount, hasMore } = useMemo(() => {
    // Related words from ALL books: current book first, then 1-4, dictionary last.
    const ordered = groupWordsByBook(relatedWords, { activeBookId: activeBook.id, levels });
    // Limit total related words in compact view
    const groupsList: { bookId: number; cards: Flashcard[] }[] = [];
    let count = 0;
    for (const { bookId, cards } of ordered) {
      if (count >= MAX_RELATED_IN_COMPACT) break;
      const remaining = MAX_RELATED_IN_COMPACT - count;
      const sliced = cards.slice(0, remaining);
      groupsList.push({ bookId, cards: sliced });
      count += sliced.length;
    }
    return {
      relatedGroups: groupsList,
      totalRelatedCount: count,
      hasMore: relatedWords.length > MAX_RELATED_IN_COMPACT
    };
  }, [relatedWords, activeBook.id, levels]);

  if (!isRelatedLoading && totalRelatedCount === 0) return null;

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex flex-row items-center justify-between ml-2">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-ui-muted">
          Related Words
        </h3>
        {!isRelatedLoading && hasMore && (
          <button
            type="button"
            onClick={openRelatedBreakdown}
            className={`min-h-11 rounded-compact px-2 text-xs font-extrabold uppercase tracking-wider transition-colors hover:bg-ui-hover focus-ring ${activeBook.accent}`}
          >
            Show All ({relatedWords.length})
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isRelatedLoading ? (
          <motion.div
            key="skeleton-related"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface"
          >
            {[1, 2].map((i) => (
              <div key={i} className="flex w-full flex-row items-center gap-4 border-b-2 border-ui-divider bg-ui-surface px-4 py-[13.5px] last:border-0">
                <Skeleton className="w-[32px] h-[32px] rounded-compact shrink-0" />
                <div className="flex flex-col flex-1 gap-1.5 justify-center min-w-0">
                  <div className="flex flex-row items-center justify-between gap-2 w-full">
                    <Skeleton className="w-24 h-3.5 rounded-compact" />
                    <Skeleton className="w-20 h-3 rounded-xs" />
                  </div>
                  <Skeleton className="w-40 h-3.5 rounded-compact" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="loaded-related"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            {relatedGroups.map(group => {
              return (
                <div key={group.bookId} className="flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
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
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
