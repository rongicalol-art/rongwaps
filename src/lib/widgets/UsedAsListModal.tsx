import React from 'react';
import { motion } from 'motion/react';
import { ScreenHeader } from './ScreenHeader';
import { useAppStore } from '../../store/useAppStore';
import { UsedAsCompactItem } from './breakdown/UsedAsCompactItem';
import { vocabularyCache } from '../../utils/cache';
import { FLASHCARDS_DATA } from '../../data/flashcards';
import type { Flashcard } from '../../data/flashcards';
import { useCompactHeaderOnScroll } from '../../hooks/useCompactHeaderOnScroll';

interface UsedAsListModalProps {
  initialChar: string;
  usedAsComponents: string[];
  activeBook: any;
  onClose: () => void;
  onWordClick?: (w: string) => void;
}

export function UsedAsListModal({ initialChar, usedAsComponents, activeBook, onClose, onWordClick }: UsedAsListModalProps) {
  const { setDictionaryWord } = useAppStore();
  const { isHeaderCompact, handleHeaderScroll } = useCompactHeaderOnScroll();

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
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 z-[400] w-full h-full bg-[#F7F7F7] flex flex-col pt-0 font-sans shadow-2xl"
    >
      <ScreenHeader 
         onClose={onClose}
         title={`Characters with ${initialChar}`}
         compact={isHeaderCompact}
         className="bg-white border-b-[3px] border-[#E5E5E5] w-full max-w-full px-4 sm:px-6 shadow-sm"
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar" onScroll={handleHeaderScroll}>
        <div className="max-w-[768px] mx-auto w-full px-4 py-6 sm:py-8 flex flex-col pb-24 relative min-h-full gap-5">
          {(() => {
            if (inCourseItems.length === 0) return null;
            const groups: { [key: number]: typeof inCourseItems } = {};
            inCourseItems.forEach(item => {
              const bId = item.badgeInfo!.bookId;
              if (!groups[bId]) groups[bId] = [];
              groups[bId].push(item);
            });
            const sortedIds = Object.keys(groups).map(Number).sort((a, b) => a - b);

            return (
              <div className="flex flex-col gap-5">
                {sortedIds.map(bookId => {
                  const items = groups[bookId];
                  return (
                    <div key={bookId} className="flex flex-col w-full bg-white rounded-[20px] border-[2px] border-[#E5E5E5] border-b-[4px] overflow-hidden">
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
              <div className="text-[12px] font-black uppercase tracking-wider text-[#AFB6BB] ml-3 select-none">
                Other Characters
              </div>
              <div className="flex flex-col w-full bg-white rounded-[20px] border-[2px] border-[#E5E5E5] border-b-[4px] overflow-hidden">
                {outOfCourseItems.map((item, idx) => (
                  <UsedAsCompactItem
                    key={item.char}
                    c={item.char}
                    setDictionaryWord={onWordClick || setDictionaryWord}
                    activeBook={activeBook}
                    badgeInfo={item.badgeInfo}
                    isLast={idx === outOfCourseItems.length - 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
