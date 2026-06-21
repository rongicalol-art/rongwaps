import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomDrawer } from './BottomDrawer';
import { useAppStore } from '../../store/useAppStore';
import { getDictionaryEntries, getDictionaryEntriesBatch } from '../../services/dictionaryService';
import { DBDictionaryEntry } from '../../types/database';
import { numberToToneMarks } from '../../utils/pinyin';
import { PiSpinnerBold, PiListMagnifyingGlassBold, PiBookmarkSimpleBold, PiBookmarkSimpleFill, PiBookOpenTextBold } from 'react-icons/pi';
import { LuSearchX } from 'react-icons/lu';
import { SAMPLE_BOOKS } from '../../data/books';
import { searchVocabulary } from '../../services/vocabularyService';
import { Flashcard } from '../../data/flashcards';
import { CharacterBreakdownOverlay } from './CharacterBreakdownOverlay';

export function GlobalDictionaryModal() {
  const { dictionaryWord, setDictionaryWord, favorites, toggleFavorite, activeBookId } = useAppStore();
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [activeBreakdownIndex, setActiveBreakdownIndex] = useState<number>(0);

  const [entries, setEntries] = useState<DBDictionaryEntry[]>([]);
  const [fallbackEntries, setFallbackEntries] = useState<DBDictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [inCourseWords, setInCourseWords] = useState<Flashcard[]>([]);

  const activeBook = React.useMemo(() => {
    return SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  }, [activeBookId]);

  useEffect(() => {
    if (!dictionaryWord) {
      setEntries([]);
      setFallbackEntries([]);
      setInCourseWords([]);
      return;
    }

    let isMounted = true;
    const fetchWord = async () => {
      setLoading(true);
      try {
        const data = await getDictionaryEntries(dictionaryWord);
        
        const vocabularyWords = await searchVocabulary(dictionaryWord);
        
        let fallbackData: DBDictionaryEntry[] = [];
        if (data.length === 0 && dictionaryWord.length > 1) {
          // Fallback: fetch individual characters
          const chars = Array.from(dictionaryWord).filter(c => /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2FDF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u.test(c));
          const charMap = await getDictionaryEntriesBatch(chars);
          fallbackData = chars.map(c => charMap.get(c)).filter(Boolean) as DBDictionaryEntry[];
        }

        if (isMounted) {
          setEntries(data);
          setFallbackEntries(fallbackData);
          // Find exact matches in course vocab
          const exactMatches = vocabularyWords.filter(v => v.front === dictionaryWord);
          setInCourseWords(exactMatches);
          setLoading(false);
        }
      } catch (err) {
        console.error("GlobalDictionaryModal: failed to load word:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWord();
    return () => {
      isMounted = false;
    };
  }, [dictionaryWord]);

  const primaryChar = entries.length > 0 ? entries[0].traditional : dictionaryWord || '';
  const isFav = primaryChar && entries.length > 0 ? favorites.includes(primaryChar) : false;

  return (
    <>
      <BottomDrawer isOpen={!!dictionaryWord} onClose={() => setDictionaryWord(null)}>
        <div className="flex flex-col">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-[#AFB6BB]">
            <PiSpinnerBold className="w-10 h-10 animate-spin mb-4 text-[#1CB0F6]" />
            <p className="font-bold text-lg text-[#4B4B4B]">Searching dictionary...</p>
          </div>
        ) : entries.length === 0 ? (
          fallbackEntries.length > 0 ? (
            <div className="flex flex-col gap-6 pt-2 pb-6">
              <div className="flex flex-col gap-2 items-center justify-center border-b-[3px] border-[#F7F7F7] pb-6 pt-4">
                <div className="w-16 h-16 bg-[#F7F7F7] rounded-full flex items-center justify-center mb-2">
                  <PiListMagnifyingGlassBold className="w-8 h-8 text-[#AFB6BB]" />
                </div>
                <p className="font-extrabold text-[#4B4B4B] text-xl text-center leading-tight">
                  No exact match for "{dictionaryWord}"
                </p>
                <p className="font-bold text-[#AFB6BB] text-[15px] text-center px-4">
                  But we found definitions for its characters:
                </p>
              </div>
              <div className="flex flex-col gap-3 px-2">
                {fallbackEntries.map((entry, idx) => (
                  <div key={idx} className="flex flex-row gap-4 bg-[#F7F7F7] rounded-[24px] p-4 items-center">
                    <button 
                      onClick={() => {
                        if (dictionaryWord) {
                          setActiveBreakdown(dictionaryWord);
                          setActiveBreakdownIndex(dictionaryWord.indexOf(entry.traditional) !== -1 ? dictionaryWord.indexOf(entry.traditional) : 0);
                        }
                      }}
                      className="w-[72px] h-[72px] shrink-0 bg-white border-b-4 border-[#E5E5E5] active:border-b-0 active:translate-y-[4px] rounded-[20px] flex flex-col items-center justify-center shadow-sm transition-all hover:bg-[#F0F9FF]"
                    >
                      <span className="font-chinese font-normal text-4xl text-[#4B4B4B]">{entry.traditional}</span>
                    </button>

                    <div className="flex flex-col gap-1.5 justify-center flex-1">
                       <div className="flex flex-wrap gap-1.5 items-center">
                        {(entry.pinyin || []).slice(0, 2).map((py, i) => (
                          <span key={i} className={`text-[15px] ${activeBook.accent} font-extrabold tracking-widest`}>
                            {numberToToneMarks(py)}
                          </span>
                        ))}
                      </div>
                      <p className="text-[#4B4B4B] font-bold text-[16px] leading-snug line-clamp-2">
                        {entry.definitions && Object.values(entry.definitions)[0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-[#AFB6BB]">
              <div className="w-20 h-20 bg-[#F7F7F7] rounded-full flex items-center justify-center mb-6">
                <LuSearchX className="w-10 h-10 text-[#AFB6BB] opacity-80" />
              </div>
              <p className="font-extrabold text-2xl text-[#4B4B4B] mb-2">Not Found</p>
              <p className="font-bold text-[#AFB6BB] text-[15px] text-center px-8">
                We couldn't find <span className="text-[#4B4B4B]">"{dictionaryWord}"</span> in the dictionary.
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-6 pt-2 pb-6">
            
            {/* Header Section */}
            <div className="flex items-start justify-between w-full gap-4 px-2">
              <div className="flex flex-col gap-2">
                <div className={`flex flex-wrap font-normal text-[#4B4B4B] leading-tight break-words ${primaryChar.length > 6 ? 'text-4xl' : primaryChar.length > 4 ? 'text-5xl' : 'text-6xl'} font-chinese`}>
                  {primaryChar.split('').map((char, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveBreakdown(primaryChar);
                        setActiveBreakdownIndex(index);
                      }}
                      className="cursor-pointer hover:text-[#1CB0F6] active:opacity-50 transition-colors"
                    >
                      {char}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2.5 items-center mt-1">
                  {(entries[0].pinyin || []).map((py, i) => (
                    <span key={i} className="text-[#1CB0F6] font-extrabold tracking-widest text-xl">
                      {numberToToneMarks(py)}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-3 items-end shrink-0 pt-2">
                <button
                  onClick={() => toggleFavorite(primaryChar)}
                  className={`w-14 h-14 flex items-center justify-center rounded-full border-b-[4px] active:border-b-0 active:translate-y-[4px] transition-all
                  ${isFav 
                    ? 'bg-[#FFDF00] border-[#D4B900] text-white hover:bg-[#FFE533]' 
                    : 'bg-[#F7F7F7] border-[#E5E5E5] text-[#AFB6BB] hover:bg-white hover:text-[#4B4B4B]'
                  }`}
                >
                  {isFav ? <PiBookmarkSimpleFill size={28} className="text-[#FF9600]" /> : <PiBookmarkSimpleBold size={28} />}
                </button>
              </div>
            </div>

            <div className="w-full h-[3px] bg-[#F7F7F7] my-1" />

            {/* Content Section */}
            <div className="flex flex-col gap-6 px-2">
              
              {/* In Course Card */}
              {inCourseWords.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="font-extrabold uppercase tracking-widest text-[#AFB6BB] text-[13px] mb-1 pl-1">
                    In Your Course
                  </div>
                  
                  <div className="bg-[#E5F5FF] rounded-[24px] p-5 border-b-[3px] border-[#BBE3FF] flex flex-col gap-3">
                    {inCourseWords.map((card, idx) => {
                      const cardBook = SAMPLE_BOOKS.find(b => b.id === card.bookId) || activeBook;
                      return (
                        <div key={idx} className={`flex flex-col gap-1.5 ${idx > 0 ? 'pt-3 border-t-2 border-[#BBE3FF]' : ''}`}>
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-0.5 rounded-md ${cardBook.accentBg} text-white font-extrabold text-[11px] tracking-widest uppercase`}>
                              Book {card.bookId}
                            </div>
                            <div className="text-[13px] font-extrabold text-[#1CB0F6] tracking-wider uppercase">
                              Lesson {card.lessonId}
                            </div>
                          </div>
                          
                          <p className="text-[17px] text-[#4B4B4B] font-extrabold leading-snug break-words">
                            {card.back}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Definitions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 font-extrabold uppercase tracking-widest text-[#AFB6BB] text-[13px] mb-1 pl-1">
                  <PiBookOpenTextBold size={18} />
                  <span>Definitions</span>
                </div>
                
                <div className="bg-[#F7F7F7] rounded-[24px] p-5.5 flex flex-col gap-5 border-b-[3px] border-[#E5E5E5]">
                  {entries.map((entry, index) => (
                    <div key={index} className={`flex flex-col gap-2 ${index > 0 ? 'pt-4 border-t-2 border-[#E5E5E5]' : ''}`}>
                      {entry.definitions && Object.keys(entry.definitions).length > 0 ? (
                        <ul className="flex flex-col gap-3.5">
                          {Object.entries(entry.definitions).map(([pos, definition], defIndex) => (
                            <li key={defIndex} className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 text-[17px] leading-relaxed">
                              {pos !== 'null' && pos !== '' && pos !== 'undefined' && (
                                <span className="text-[#AFB6BB] font-extrabold italic shrink-0 min-w-[3rem] mt-0.5">
                                  {pos}.
                                </span>
                              )}
                              <span className="text-[#4B4B4B] font-bold">
                                {definition}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[#AFB6BB] font-bold italic">No detailed definitions available.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
            </div>
            
          </div>
        )}
      </div>
    </BottomDrawer>

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={activeBreakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />
    </>
  );
}