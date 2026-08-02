import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AiMnemonicCard } from './CharacterBreakdown';
import { numberToToneMarks } from '../../utils/pinyin';
import { StrokeOrderBox } from './StrokeOrderBox';
import { SAMPLE_BOOKS } from '../../data/books';
import { FLASHCARDS_DATA } from '../../data/flashcards';
import type { Flashcard } from '../../data/flashcards';
import { vocabularyCache } from '../../utils/cache';
import { Skeleton } from './Skeleton';
import { audioService } from '../../services/audioService';
import { DBCharacterBreakdown } from '../../types/database';
import { BreakdownComponentCard } from './breakdown/BreakdownComponentCard';
import { UsedAsCompactItem } from './breakdown/UsedAsCompactItem';
import { useAppStore } from '../../store/useAppStore';
import { AppIcon } from './AppIcon';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface BreakdownWordInfoProps {
  activeChar: string;
  charData: DBCharacterBreakdown | null;
  charCardsInfo: Flashcard[];
  activeBook: CourseBook;
  components: string[];
  usedAsComponents: string[];
  relatedWords: Flashcard[];
  setDictionaryWord: (w: string) => void;
  chars: string[];
  setBreakdownCharIndex: (i: number) => void;
  openDeepBreakdown: () => void;
  openUsedAsBreakdown: () => void;
  openRelatedBreakdown: () => void;
  isUsedAsLoading?: boolean;
  isRelatedLoading?: boolean;
}

export const BreakdownWordInfo: React.FC<BreakdownWordInfoProps> = ({
  activeChar,
  charData,
  charCardsInfo,
  activeBook,
  components,
  usedAsComponents,
  relatedWords,
  setDictionaryWord,
  chars,
  setBreakdownCharIndex,
  openDeepBreakdown,
  openUsedAsBreakdown,
  openRelatedBreakdown,
  isUsedAsLoading = false,
  isRelatedLoading = false,
}) => {
  const MAX_RELATED_IN_COMPACT = 5;

  const { relatedGroups, totalRelatedCount, hasMore } = useMemo(() => {
    // Show related words from ALL books, sorted by book priority (current book first)
    const groupsMap: { [key: number]: Flashcard[] } = {};
    relatedWords.forEach(card => {
      if (!groupsMap[card.bookId]) {
        groupsMap[card.bookId] = [];
      }
      groupsMap[card.bookId].push(card);
    });
    // Sort book IDs: current book first, then others descending
    const sortedBookIds = Object.keys(groupsMap).map(Number).sort((a, b) => {
      if (a === activeBook.id) return -1;
      if (b === activeBook.id) return 1;
      return b - a;
    });
    // Limit total related words in compact view
    const groupsList: { bookId: number; cards: Flashcard[] }[] = [];
    let count = 0;
    for (const bookId of sortedBookIds) {
      const cards = groupsMap[bookId];
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
  }, [relatedWords, activeBook.id]);

  const { inCourseItems, outOfCourseItems } = useMemo(() => {
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
    <div className="flex h-full w-full flex-col gap-7">
      {/* Top Character Area */}
      <section className="relative flex flex-col overflow-hidden rounded-[24px] bg-ui-surface shadow-sm sm:rounded-[28px]">
        
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10 text-center sm:text-left">
           {/* Big Character focus */}
           <div className="flex flex-col items-center">
             <div className="mb-3 text-[14px] font-extrabold tracking-[0.2em] text-ui-muted sm:text-[16px]">
               {charData?.pinyin?.[0] ? numberToToneMarks(charData.pinyin[0]) : ' '}
             </div>
             <div className="mb-5">
               <StrokeOrderBox char={activeChar} size={140} accentHex={activeBook.accentHex || '#1CB0F6'} />
             </div>
             
             {charData?.audio && (
               <button
                 className="flex min-h-11 flex-row items-center gap-2 rounded-[14px] bg-ui-canvas px-4 py-2 text-[14px] font-bold text-ui-ink transition-colors hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
                 onClick={() => {
                   audioService.play(charData.audio).catch(e => console.error("Audio error", e));
                 }}
               >
                 <AppIcon name="pronounce" size={18} />
                 Play Audio
               </button>
             )}
           </div>
           
           {/* Meaning & Course Usages */}
           <div className="flex-1 w-full flex flex-col gap-5 pt-2 text-left">
             {/* Dictionary Base Meaning */}
             <div className="flex flex-col gap-1 items-start text-left w-full">
                 <div className="mb-1 text-left text-[11px] font-extrabold uppercase tracking-widest text-ui-muted">
                   Dictionary
                 </div>
                 <p className="w-full text-left text-[17px] font-bold leading-snug text-ui-ink sm:text-[19px]">
                   {charData?.definition || charCardsInfo?.[0]?.back || 'Loading definition...'}
                 </p>
             </div>

             {/* Course Words */}
             {(() => {
                if (!charCardsInfo || charCardsInfo.length === 0) return null;
                
                return (
                  <div className="flex w-full flex-col items-start gap-2 border-t-2 border-ui-divider pt-3 text-left">
                     <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-ui-muted">
                       In Your Course
                     </div>
                     <div className="flex flex-col gap-2 w-full text-left items-start">
                       {charCardsInfo.map((card, idx) => {
                         const cardBook = SAMPLE_BOOKS.find(b => b.id === card.bookId) || activeBook;
                         return (
                           <div key={idx} className="flex flex-row gap-3 items-baseline text-left w-full justify-start">
                              <span className="shrink-0 text-left text-[11px] font-bold tracking-widest text-ui-muted">
                                <span className="flex items-center gap-1.5 py-0.5">
                                  <span>B{card.bookId} · L{card.lessonId}</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cardBook.accentBg} shrink-0`} />
                                </span>
                              </span>
                              <p className="break-words text-left text-[15px] font-bold leading-snug text-ui-ink sm:text-[16px]">
                                {card.back}
                              </p>
                           </div>
                         );
                       })}
                     </div>
                  </div>
                );
             })()}
           </div>
        </div>
      </section>

      {/* Component Breakdown Section */}
      {components.length > 0 && (
         <div className="flex flex-col gap-3">
           <div className="flex flex-row items-center justify-between ml-2">
             <h3 className="text-[15px] font-extrabold uppercase tracking-[0.05em] text-ui-muted">
               Components
             </h3>
             <button type="button" onClick={openDeepBreakdown} className={`min-h-11 rounded-xl px-2 text-[13px] font-extrabold uppercase tracking-wider transition-colors hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 ${activeBook.accent}`}>
               Show Tree
             </button>
           </div>
           <div className="grid grid-cols-2 gap-3 min-[640px]:grid-cols-[repeat(auto-fit,minmax(180px,220px))]">
             {components.map((c, index) => (
               <BreakdownComponentCard
                 key={`${c}-${index}`}
                 c={c}
                 chars={chars}
                 setBreakdownCharIndex={setBreakdownCharIndex}
                 activeBook={activeBook}
                 setDictionaryWord={setDictionaryWord}
               />
             ))}
           </div>
           <AiMnemonicCard
             char={activeChar}
             data={charData}
             accentBgClass={activeBook.accentBg}
             accentTextClass={activeBook.accent}
             buttonEdgeClass={activeBook.buttonEdge}
             compact
           />
         </div>
      )}

      {/* Used As Component Part */}
      {(isUsedAsLoading || usedAsComponents.length > 0) && (
        <div className="flex flex-col gap-3 pt-2">
           <div className="flex flex-row items-center justify-between ml-2">
              <h3 className="text-[15px] font-extrabold uppercase tracking-[0.05em] text-ui-muted">
                Used As Component
              </h3>
              {!isUsedAsLoading && usedAsComponents.length > 6 && (
                <button type="button" onClick={openUsedAsBreakdown} className={`min-h-11 rounded-xl px-2 text-[13px] font-extrabold uppercase tracking-wider transition-colors hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 ${activeBook.accent}`}>
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
                 <div className="flex w-full flex-col overflow-hidden rounded-[20px] bg-ui-surface shadow-sm">
                   {[1, 2, 3].map((i) => (
                     <div key={i} className="flex w-full flex-row items-center gap-4 border-b-2 border-ui-divider bg-ui-surface px-4 py-[13.5px] last:border-0">
                       <Skeleton className="w-[32px] h-[32px] rounded-[8px] shrink-0" />
                       <div className="flex flex-col flex-1 gap-1.5 justify-center min-w-0">
                         <div className="flex flex-row items-center justify-between gap-2 w-full">
                           <Skeleton className="w-12 h-3.5 rounded-[4px]" />
                           <Skeleton className="w-20 h-3 rounded-[3px]" />
                         </div>
                         <Skeleton className="w-32 h-3.5 rounded-[4px]" />
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
                   const sliced = inCourseItems.slice(0, 5);
                   const groups: { [key: number]: typeof inCourseItems } = {};
                   sliced.forEach(item => {
                     const bId = item.badgeInfo!.bookId;
                     if (!groups[bId]) groups[bId] = [];
                     groups[bId].push(item);
                   });
                   const sortedIds = Object.keys(groups).map(Number).sort((a, b) => a - b);

                   return (
                     <div className="flex flex-col gap-3">
                       {sortedIds.map(bookId => {
                         const items = groups[bookId];
                         return (
                           <div key={bookId} className="flex w-full flex-col overflow-hidden rounded-[20px] bg-ui-surface shadow-sm">
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
                      <div className="ml-3 select-none text-[12px] font-black uppercase tracking-wider text-ui-muted">
                        Other Characters
                      </div>
                      <div className="flex w-full flex-col overflow-hidden rounded-[20px] bg-ui-surface shadow-sm">
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
      )}

      {/* Related Words grouped by Book or Loading Skeleton */}
      {(isRelatedLoading || totalRelatedCount > 0) && (
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-row items-center justify-between ml-2">
            <h3 className="text-[15px] font-extrabold uppercase tracking-[0.05em] text-ui-muted">
              Related Words
            </h3>
            {!isRelatedLoading && hasMore && (
              <button
                type="button"
                onClick={openRelatedBreakdown}
                className={`min-h-11 rounded-xl px-2 text-[13px] font-extrabold uppercase tracking-wider transition-colors hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 ${activeBook.accent}`}
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
                className="flex w-full flex-col overflow-hidden rounded-[20px] bg-ui-surface shadow-sm"
              >
                {[1, 2].map((i) => (
                  <div key={i} className="flex w-full flex-row items-center gap-4 border-b-2 border-ui-divider bg-ui-surface px-4 py-[13.5px] last:border-0">
                    <Skeleton className="w-[32px] h-[32px] rounded-[8px] shrink-0" />
                    <div className="flex flex-col flex-1 gap-1.5 justify-center min-w-0">
                      <div className="flex flex-row items-center justify-between gap-2 w-full">
                        <Skeleton className="w-24 h-3.5 rounded-[4px]" />
                        <Skeleton className="w-20 h-3 rounded-[3px]" />
                      </div>
                      <Skeleton className="w-40 h-3.5 rounded-[4px]" />
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
                    <div key={group.bookId} className="flex w-full flex-col overflow-hidden rounded-[20px] bg-ui-surface shadow-sm">
                      {group.cards.map((card, idx) => {
                        const isLast = idx === group.cards.length - 1;
                        return (
                          <button
                            key={idx}
                            onClick={() => useAppStore.getState().setDictionaryWord(card.front)}
                            className={`group flex w-full flex-row items-center gap-4 bg-ui-surface px-4 py-3 outline-none transition-colors hover:bg-ui-surface-hover active:bg-ui-hover focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-primary/25 ${!isLast ? 'border-b-2 border-ui-divider' : ''}`}
                          >
                            <span className={`text-[28px] sm:text-[32px] leading-none font-chinese pt-1 ${activeBook.accent} transition-all shrink-0`}>
                              {card.front}
                            </span>
                            <div className="flex flex-col items-start justify-center flex-1 min-w-0 text-left overflow-hidden">
                              <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full pr-1">
                                <span className="h-[20px] flex-1 truncate text-left text-[13px] font-bold tracking-widest text-ui-muted sm:text-[14px]">
                                  {numberToToneMarks(card.pinyin)}
                                </span>
                                {(() => {
                                  const cardBook = SAMPLE_BOOKS.find(b => b.id === card.bookId);
                                  const dotColorClass = cardBook ? cardBook.accentBg : activeBook.accentBg;
                                  return (
                                    <span className="flex shrink-0 select-none items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ui-muted opacity-80">
                                      <span>B{card.bookId} · L{card.lessonId}</span>
                                      <span className={`w-2 h-2 rounded-full ${dotColorClass} shrink-0`} />
                                    </span>
                                  );
                                })()}
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
      )}

    </div>
  );
};
