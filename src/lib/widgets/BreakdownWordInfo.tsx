import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Card3D } from './Card3D';
import { AiMnemonicCard } from './CharacterBreakdown';
import { numberToToneMarks } from '../../utils/pinyin';
import { HiMiniSpeakerWave } from 'react-icons/hi2';
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

interface BreakdownWordInfoProps {
  activeChar: string;
  charData: DBCharacterBreakdown | null;
  charCardsInfo: any[];
  activeBook: any;
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
    <div className="w-full h-full flex flex-col gap-4">
      {/* Top Character Area */}
      <Card3D className="flex flex-col bg-white relative overflow-hidden">
        
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10 text-center sm:text-left">
           {/* Big Character focus */}
           <div className="flex flex-col items-center">
             <div className="text-[14px] sm:text-[16px] font-extrabold text-[#AFB6BB] tracking-[0.2em] mb-3">
               {charData?.pinyin?.[0] ? numberToToneMarks(charData.pinyin[0]) : ' '}
             </div>
             <div className="mb-5">
               <StrokeOrderBox char={activeChar} size={140} accentHex={activeBook.accentHex || '#1CB0F6'} />
             </div>
             
             {charData?.audio && (
               <button
                 className="flex flex-row items-center gap-2 bg-[#F7F7F7] px-4 py-2 rounded-[16px] text-[#4B4B4B] font-bold text-[14px] hover:bg-[#E5E5E5] active:translate-y-[2px] transition-all"
                 onClick={() => {
                   audioService.play(charData.audio).catch(e => console.error("Audio error", e));
                 }}
               >
                 <HiMiniSpeakerWave size={18} />
                 Play Audio
               </button>
             )}
           </div>
           
           {/* Meaning & Course Usages */}
           <div className="flex-1 w-full flex flex-col gap-5 pt-2 text-left">
             {/* Dictionary Base Meaning */}
             <div className="flex flex-col gap-1 items-start text-left w-full">
                 <div className="font-extrabold uppercase tracking-widest text-[#AFB6BB] text-[11px] mb-1 text-left">
                   Dictionary
                 </div>
                 <p className="text-[17px] sm:text-[19px] text-[#4B4B4B] font-bold leading-snug text-left w-full">
                   {charData?.definition || 'Loading definition...'}
                 </p>
             </div>

             {/* Course Words */}
             {(() => {
                if (!charCardsInfo || charCardsInfo.length === 0) return null;
                
                return (
                  <div className="flex flex-col gap-2 pt-3 border-t-[3px] border-[#E5E5E5] w-full text-left items-start">
                     <div className="font-extrabold uppercase tracking-widest text-[#AFB6BB] text-[11px] mb-1">
                       In Your Course
                     </div>
                     <div className="flex flex-col gap-2 w-full text-left items-start">
                       {charCardsInfo.map((card, idx) => {
                         const cardBook = SAMPLE_BOOKS.find(b => b.id === card.bookId) || activeBook;
                         return (
                           <div key={idx} className="flex flex-row gap-3 items-baseline text-left w-full justify-start">
                              <span className="shrink-0 text-[11px] font-bold text-[#AFB6BB] tracking-widest text-left">
                                <span className="flex items-center gap-1.5 py-0.5">
                                  <span>B{card.bookId} · L{card.lessonId}</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cardBook.accentBg} shrink-0`} />
                                </span>
                              </span>
                              <p className="text-[15px] sm:text-[16px] text-[#4B4B4B] font-bold leading-snug break-words text-left">
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
      </Card3D>

      {/* Component Breakdown Section */}
      {components.length > 0 && (
         <div className="flex flex-col gap-3">
           <div className="flex flex-row items-center justify-between ml-2">
             <h3 className="text-[#AFB6BB] uppercase tracking-[0.05em] font-extrabold text-[15px]">
               Components
             </h3>
             <button onClick={openDeepBreakdown} className={`text-[13px] font-extrabold uppercase tracking-wider ${activeBook.accent} hover:opacity-80 active:translate-y-[2px] transition-all`}>
               Show Tree
             </button>
           </div>
           <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 gap-3">
             {components.map((c, index) => (
               <BreakdownComponentCard
                 key={index}
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
              <h3 className="text-[#AFB6BB] uppercase tracking-[0.05em] font-extrabold text-[15px]">
                Used As Component
              </h3>
              {!isUsedAsLoading && usedAsComponents.length > 6 && (
                <button onClick={openUsedAsBreakdown} className={`text-[13px] font-extrabold uppercase tracking-wider ${activeBook.accent} hover:opacity-80 active:translate-y-[2px] transition-all`}>
                  Show All ({usedAsComponents.length})
                </button>
              )}
           </div>

           <AnimatePresence mode="out-in">
             {isUsedAsLoading ? (
               <motion.div
                 key="skeleton-used"
                 initial={{ opacity: 0, y: 6 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -6 }}
                 transition={{ duration: 0.15 }}
                 className="flex flex-col gap-3"
               >
                 <div className="flex flex-col w-full bg-white rounded-[20px] border-[3px] border-[#E5E5E5] border-b-[6px] overflow-hidden">
                   {[1, 2, 3].map((i) => (
                     <div key={i} className="w-full bg-white px-4 py-[13.5px] flex flex-row items-center gap-4 border-b-[2px] border-[#F0F0F0] last:border-0">
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
                           <div key={bookId} className="flex flex-col w-full bg-white rounded-[20px] border-[3px] border-[#E5E5E5] border-b-[6px] overflow-hidden">
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
                      <div className="text-[12px] font-black uppercase tracking-wider text-[#AFB6BB] ml-3 select-none">
                        Other Characters
                      </div>
                      <div className="flex flex-col w-full bg-white rounded-[20px] border-[3px] border-[#E5E5E5] border-b-[6px] overflow-hidden">
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
            <h3 className="text-[#AFB6BB] uppercase tracking-[0.05em] font-extrabold text-[15px]">
              Related Words
            </h3>
            {!isRelatedLoading && hasMore && (
              <button
                onClick={openRelatedBreakdown}
                className={`text-[13px] font-extrabold uppercase tracking-wider ${activeBook.accent} hover:opacity-80 active:translate-y-[2px] transition-all cursor-pointer`}
              >
                Show All ({relatedWords.length})
              </button>
            )}
          </div>

          <AnimatePresence mode="out-in">
            {isRelatedLoading ? (
              <motion.div
                key="skeleton-related"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col w-full bg-white rounded-[20px] border-[3px] border-[#E5E5E5] border-b-[6px] overflow-hidden"
              >
                {[1, 2].map((i) => (
                  <div key={i} className="w-full bg-white px-4 py-[13.5px] flex flex-row items-center gap-4 border-b-[2px] border-[#F0F0F0] last:border-0">
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
                  const bookInfo = SAMPLE_BOOKS.find(b => b.id === group.bookId);

                  return (
                    <div key={group.bookId} className="flex flex-col w-full bg-white rounded-[20px] border-[3px] border-[#E5E5E5] border-b-[6px] overflow-hidden">
                      {group.cards.map((card, idx) => {
                        const isLast = idx === group.cards.length - 1;
                        return (
                          <button
                            key={idx}
                            onClick={() => useAppStore.getState().setDictionaryWord(card.front)}
                            className={`w-full bg-white px-4 py-3 flex flex-row items-center gap-4 active:bg-[#F2F2F2] hover:bg-[#F9F9F9] transition-all group outline-none ${!isLast ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}
                          >
                            <span className={`text-[28px] sm:text-[32px] leading-none font-chinese pt-1 ${activeBook.accent} transition-all shrink-0`}>
                              {card.front}
                            </span>
                            <div className="flex flex-col items-start justify-center flex-1 min-w-0 text-left overflow-hidden">
                              <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full pr-1">
                                <span className="text-[13px] sm:text-[14px] font-bold text-[#AFB6BB] tracking-widest line-clamp-1 truncate h-[20px] flex-1 text-left">
                                  {numberToToneMarks(card.pinyin)}
                                </span>
                                {(() => {
                                  const cardBook = SAMPLE_BOOKS.find(b => b.id === card.bookId);
                                  const dotColorClass = cardBook ? cardBook.accentBg : activeBook.accentBg;
                                  return (
                                    <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-[#AFB6BB] tracking-widest uppercase opacity-80 select-none">
                                      <span>B{card.bookId} · L{card.lessonId}</span>
                                      <span className={`w-2 h-2 rounded-full ${dotColorClass} shrink-0`} />
                                    </span>
                                  );
                                })()}
                              </div>
                              <span className="text-[13px] sm:text-[14px] font-bold text-[#4B4B4B] line-clamp-1 truncate w-full mt-0.5 h-[20px]">
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
