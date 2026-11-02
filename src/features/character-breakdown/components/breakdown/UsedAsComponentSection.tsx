import React, { useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { UsedAsCompactItem } from './UsedAsCompactItem';
import { BREAKDOWN_LIST_CARD, BreakdownListSection, capGroups } from './BreakdownListSection';
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
  // Order the whole list first so the 5 shown are the right 5.
  const groups = capGroups(groupUsedAsByBook(inCourseItems, { activeBookId: activeBook.id, levels }), 5);
  const outOfCourseShown = outOfCourseItems.slice(0, Math.max(2, 5 - inCourseItems.length));

  return (
    <BreakdownListSection
      title="Used As Component"
      total={usedAsComponents.length}
      hasMore={usedAsComponents.length > 6}
      onShowAll={openUsedAsBreakdown}
      accent={activeBook.accent}
      loading={isUsedAsLoading}
      skeletonRows={3}
      gap="gap-3"
    >
      {groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map(({ bookId, cards: items }) => (
            <div key={bookId} className={BREAKDOWN_LIST_CARD}>
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
          ))}
        </div>
      )}

      {outOfCourseShown.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className={BREAKDOWN_LIST_CARD}>
            {outOfCourseShown.map((item, idx) => (
              <UsedAsCompactItem
                key={item.char}
                c={item.char}
                setDictionaryWord={setDictionaryWord}
                activeBook={activeBook}
                badgeInfo={item.badgeInfo}
                isLast={idx === outOfCourseShown.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </BreakdownListSection>
  );
};
