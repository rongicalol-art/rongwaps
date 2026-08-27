import React from 'react';
import { WorkspaceDetailShell } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { UsedAsCompactItem } from './breakdown/UsedAsCompactItem';
import { UsedAsGlyphItem } from './breakdown/UsedAsGlyphItem';
import { vocabularyCache } from '../../../utils/cache';
import { FLASHCARDS_DATA } from '../../../data/flashcards';
import type { Flashcard } from '../../../data/flashcards';
import { SAMPLE_BOOKS } from '../../../data/books';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface UsedAsListModalProps {
  initialChar: string;
  usedAsComponents: string[];
  activeBook: CourseBook;
  onClose: () => void;
  onWordClick?: (w: string) => void;
}

export function UsedAsListModal({ initialChar, usedAsComponents, activeBook, onClose, onWordClick }: UsedAsListModalProps) {
  const { setDictionaryWord } = useAppStore();
  const { inCourseItems, outOfCourseItems } = React.useMemo(() => {
    const keys = ['vocab-all-all', 'vocab-1-all', 'vocab-2-all', 'vocab-3-all', 'vocab-4-all', 'vocab-5-all', 'vocab-6-all'];
    const loadedList: Flashcard[] = [];
    keys.forEach(k => {
      const v = vocabularyCache.get<Flashcard[]>(k);
      if (v && v.length > 0) {
        loadedList.push(...v);
      }
    });

    const uniqueMap = new Map<string, Flashcard>();
    loadedList.forEach(c => uniqueMap.set(c.id, c));
    let allVocabs = Array.from(uniqueMap.values());

    if (allVocabs.length === 0) {
      allVocabs = FLASHCARDS_DATA;
    }
    
    const items = usedAsComponents.map(c => {
      const exact = allVocabs.find(card => card.front === c);
      const containing = allVocabs.filter(card => card.front.includes(c) && card.front !== c);
      
      let badgeInfo = null;
      if (exact) {
        badgeInfo = { bookId: exact.bookId, lessonId: exact.lessonId };
      } else if (containing.length > 0) {
        const sortedContaining = [...containing].sort((a, b) => {
          if (a.bookId !== b.bookId) return a.bookId - b.bookId;
          return a.lessonId - b.lessonId;
        });
        badgeInfo = { bookId: sortedContaining[0].bookId, lessonId: sortedContaining[0].lessonId };
      }
      
      return {
        char: c,
        badgeInfo,
      };
    });

    const inCourse = items.filter(item => item.badgeInfo !== null);
    const outOfCourse = items.filter(item => item.badgeInfo === null);

    // Sort course items by book and lesson
    inCourse.sort((a, b) => {
      if (a.badgeInfo!.bookId !== b.badgeInfo!.bookId) {
        return a.badgeInfo!.bookId - b.badgeInfo!.bookId;
      }
      return a.badgeInfo!.lessonId - b.badgeInfo!.lessonId;
    });

    return {
      inCourseItems: inCourse,
      outOfCourseItems: outOfCourse,
    };
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
                    <div key={bookId} className="flex w-full flex-col overflow-hidden rounded-[20px] bg-ui-surface shadow-sm">
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
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2.5">
                {outOfCourseItems.map((item) => (
                  <UsedAsGlyphItem
                    key={item.char}
                    character={item.char}
                    accentClassName={activeBook.accent}
                    onClick={() => (onWordClick || setDictionaryWord)(item.char)}
                  />
                ))}
              </div>
            </div>
          )}
    </WorkspaceDetailShell>
  );
}
