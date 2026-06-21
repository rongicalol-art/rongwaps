import React from 'react';
import { motion } from 'motion/react';
import { ScreenHeader } from './ScreenHeader';
import { useAppStore } from '../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../data/books';
import { numberToToneMarks } from '../../utils/pinyin';
import type { Flashcard } from '../../data/flashcards';
import { useCompactHeaderOnScroll } from '../../hooks/useCompactHeaderOnScroll';

interface RelatedWordsListModalProps {
  initialChar: string;
  relatedWords: Flashcard[];
  activeBook: any;
  onClose: () => void;
  onWordClick?: (w: string) => void;
}

export function RelatedWordsListModal({ initialChar, relatedWords, activeBook, onClose, onWordClick }: RelatedWordsListModalProps) {
  const { setDictionaryWord } = useAppStore();
  const { isHeaderCompact, handleHeaderScroll } = useCompactHeaderOnScroll();

  const groups = React.useMemo(() => {
    const groupsMap: { [key: number]: Flashcard[] } = {};
    relatedWords.forEach(card => {
      if (!groupsMap[card.bookId]) {
        groupsMap[card.bookId] = [];
      }
      groupsMap[card.bookId].push(card);
    });

    const sortedIds = Object.keys(groupsMap).map(Number).sort((a, b) => b - a);
    return sortedIds.map(bookId => ({
      bookId,
      cards: groupsMap[bookId]
    }));
  }, [relatedWords]);

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
         title={`Related to "${initialChar}"`}
         compact={isHeaderCompact}
         className="bg-white border-b-[3px] border-[#E5E5E5] w-full max-w-full px-4 sm:px-6 shadow-sm"
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar" onScroll={handleHeaderScroll}>
        <div className="max-w-[768px] mx-auto w-full px-4 py-6 sm:py-8 flex flex-col pb-24 relative min-h-full gap-5">
          {groups.length === 0 ? (
            <div className="text-center text-[#AFB6BB] font-bold py-12">
              No related words found.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map(group => {
                const bookInfo = SAMPLE_BOOKS.find(b => b.id === group.bookId);
                const bookAccent = bookInfo ? bookInfo.accent : activeBook.accent;
                const bookTitle = bookInfo ? bookInfo.title : `Book ${group.bookId}`;

                return (
                  <div key={group.bookId} className="flex flex-col gap-2">
                    <div className="text-[12px] font-black uppercase tracking-wider text-[#AFB6BB] ml-3 select-none flex items-center justify-between">
                      <span>{bookTitle}</span>
                      <span className="text-[11px] font-bold lowercase opacity-80">{group.cards.length} word(s)</span>
                    </div>
                    <div className="flex flex-col w-full bg-white rounded-[20px] border-[2px] border-[#E5E5E5] border-b-[4px] overflow-hidden">
                      {group.cards.map((card, idx) => {
                        const isLast = idx === group.cards.length - 1;
                        return (
                          <button
                            key={card.id || idx}
                            onClick={() => {
                              if (onWordClick) {
                                onWordClick(card.front);
                              } else {
                                setDictionaryWord(card.front);
                              }
                            }}
                            className={`w-full bg-white px-4 py-3 flex flex-row items-center gap-4 active:bg-[#F2F2F2] hover:bg-[#F9F9F9] transition-all group outline-none text-left ${!isLast ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}
                          >
                            <span className={`text-[28px] sm:text-[32px] leading-none font-chinese pt-1 ${activeBook.accent} transition-all shrink-0`}>
                              {card.front}
                            </span>
                            <div className="flex flex-col items-start justify-center flex-1 min-w-0 overflow-hidden">
                              <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full pr-1">
                                <span className="text-[13px] sm:text-[14px] font-bold text-[#AFB6BB] tracking-widest line-clamp-1 truncate h-[20px] flex-1">
                                  {numberToToneMarks(card.pinyin)}
                                </span>
                                <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-[#AFB6BB] tracking-widest uppercase opacity-80 select-none">
                                  <span>B{card.bookId} · L{card.lessonId}</span>
                                  <span className={`w-2 h-2 rounded-full ${bookInfo?.accentBg || activeBook.accentBg} shrink-0`} />
                                </span>
                              </div>
                              <span className="text-[13px] sm:text-[14px] font-bold text-[#4B4B4B] line-clamp-1 truncate w-full mt-0.5 h-[20px]">
                                {card.back}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
