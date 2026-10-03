import React from 'react';
import { WorkspaceDetailShell } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { UsedAsCompactItem } from './breakdown/UsedAsCompactItem';
import { SAMPLE_BOOKS } from '../../../data/books';
import { deriveUsedAsItems } from '../utils/deriveUsedAsItems';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface UsedAsListModalProps {
  initialChar: string;
  usedAsComponents: string[];
  activeBook: CourseBook;
  onClose: () => void;
  onWordClick?: (w: string) => void;
}

export function UsedAsListModal({ initialChar, usedAsComponents, activeBook, onClose, onWordClick }: UsedAsListModalProps) {
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const { inCourseItems, outOfCourseItems } = React.useMemo(() => {
    return deriveUsedAsItems(usedAsComponents);
  }, [usedAsComponents]);

  return (
    <WorkspaceDetailShell
      ariaLabel={`Characters containing ${initialChar}`}
      title={`Characters with ${initialChar}`}
      onClose={onClose}
      maxWidthClassName="max-w-[900px]"
      contentInnerClassName="flex flex-col gap-5 pb-24"
    >
      {(() => {
        if (inCourseItems.length === 0) return null;
        const groups: { [key: number]: typeof inCourseItems } = {};
        inCourseItems.forEach(item => {
          const bId = item.badgeInfo!.bookId;
          if (!groups[bId]) groups[bId] = [];
          groups[bId].push(item);
        });
        const sortedIds = Object.keys(groups).map(Number).sort((a, b) => {
          if (a === activeBook.id) return -1;
          if (b === activeBook.id) return 1;
          return a - b;
        });

        return (
          <div className="flex flex-col gap-5">
            {sortedIds.map(bookId => {
              const items = groups[bookId];
              return (
                <div key={bookId} className="flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
                  {items.map((item, idx) => (
                    <UsedAsCompactItem
                      key={item.char}
                      c={item.char}
                      setDictionaryWord={onWordClick || setDictionaryWord}
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
        <div className="flex flex-col gap-3">
          {inCourseItems.length > 0 && (
            <div className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">
              Other Characters
            </div>
          )}
          <div className="flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
            {outOfCourseItems.map((item, idx) => (
              <UsedAsCompactItem
                key={item.char}
                c={item.char}
                setDictionaryWord={onWordClick || setDictionaryWord}
                activeBook={activeBook}
                badgeInfo={null}
                isLast={idx === outOfCourseItems.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </WorkspaceDetailShell>
  );
}
