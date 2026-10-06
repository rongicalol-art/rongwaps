import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { Skeleton } from '../../../../lib/widgets';
import { UsedAsCompactItem } from './UsedAsCompactItem';
import { deriveUsedAsItems, groupUsedAsByBook } from '../../utils/deriveUsedAsItems';
import { useLevels } from '../../../../hooks/useLevels';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface UsedAsComponentSectionProps {
  usedAsComponents: string[];
  activeBook: CourseBook;
  setDictionaryWord: (w: string) => void;
  openUsedAsBreakdown: () => void;
  isUsedAsLoading?: boolean;
}

/** The "Used As Component" list with its loading skeleton and compact grouping. */
export const UsedAsComponentSection: React.FC<UsedAsComponentSectionProps> = ({
  usedAsComponents,
  activeBook,
  setDictionaryWord,
  openUsedAsBreakdown,
  isUsedAsLoading = false,
}) => {
  const levels = useLevels();
  const { inCourseItems, outOfCourseItems } = useMemo(
    () => deriveUsedAsItems(usedAsComponents),
    [usedAsComponents],
  );

  if (!isUsedAsLoading && usedAsComponents.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-row items-center justify-between ml-2">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-ui-muted">
          Used As Component
        </h3>
        {!isUsedAsLoading && usedAsComponents.length > 6 && (
          <button type="button" onClick={openUsedAsBreakdown} className={`min-h-11 rounded-compact px-2 text-xs font-extrabold uppercase tracking-wider transition-colors hover:bg-ui-hover focus-ring ${activeBook.accent}`}>
            Show All ({usedAsComponents.length})
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isUsedAsLoading ? (
          <motion.div
            key="skeleton-used"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-3"
          >
            <div className="flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex w-full flex-row items-center gap-4 border-b-2 border-ui-divider bg-ui-surface px-4 py-3 last:border-0">
                  <Skeleton className="w-[32px] h-[32px] rounded-compact shrink-0" />
                  <div className="flex flex-col flex-1 gap-1.5 justify-center min-w-0">
                    <div className="flex flex-row items-center justify-between gap-2 w-full">
                      <Skeleton className="w-12 h-3.5 rounded-compact" />
                      <Skeleton className="w-20 h-3 rounded-xs" />
                    </div>
                    <Skeleton className="w-32 h-3.5 rounded-compact" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="loaded-used"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            {(() => {
              if (inCourseItems.length === 0) return null;
              // Order the whole list first so the 5 shown are the right 5.
              let remaining = 5;
              const groups = groupUsedAsByBook(inCourseItems, { activeBookId: activeBook.id, levels }).flatMap((group) => {
                const cards = group.cards.slice(0, remaining);
                remaining -= cards.length;
                return cards.length > 0 ? [{ ...group, cards }] : [];
              });

              return (
                <div className="flex flex-col gap-3">
                  {groups.map(({ bookId, cards: items }) => {
                    return (
                      <div key={bookId} className="flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
                        {items.map((item, idx) => (
                          <UsedAsCompactItem
                            key={item.char}
                            c={item.char}
                            setDictionaryWord={setDictionaryWord}
                            activeBook={activeBook}
                            badgeInfo={item.badgeInfo}
                            isLast={idx === items.length - 1}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {outOfCourseItems.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
                  {outOfCourseItems.slice(0, Math.max(2, 5 - inCourseItems.length)).map((item, idx) => {
                    const limit = Math.max(2, 5 - inCourseItems.length);
                    return (
                      <UsedAsCompactItem
                        key={item.char}
                        c={item.char}
                        setDictionaryWord={setDictionaryWord}
                        activeBook={activeBook}
                        badgeInfo={item.badgeInfo}
                        isLast={idx === Math.min(outOfCourseItems.length, limit) - 1}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
