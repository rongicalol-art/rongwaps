import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PiBookmarkSimpleBold, PiBookmarkSimpleFill, PiBooksBold, PiBookOpenFill } from 'react-icons/pi';
import { useAppStore } from '../../store/useAppStore';
import { searchVocabulary } from '../../services/vocabularyService';
import { useDictionarySearch } from '../../hooks/useDictionarySearch';
import { numberToToneMarks } from '../../utils/pinyin';
import { ExpandableSearch, Card3D } from '../../lib/widgets';
import { SAMPLE_BOOKS } from '../../data/books';

export function SearchScreen() {
  const favorites = useAppStore(state => state.favorites);
  const toggleFavorite = useAppStore(state => state.toggleFavorite);
  const setDictionaryWord = useAppStore(state => state.setDictionaryWord);
  const searchQuery = useAppStore(state => state.searchQuery);
  const isMainHeaderCompact = useAppStore(state => state.isMainHeaderCompact);
  const setIsMainHeaderCompact = useAppStore(state => state.setIsMainHeaderCompact);
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const effectiveSearchQuery = deferredSearchQuery || 'hao';
  const [activeTab, setActiveTab] = useState<'search' | 'courses'>('search');
  
  // Custom hook wrapping the Trie + Supabase RPC
  const { results: globalResults, isSearching, isReady, searchError } = useDictionarySearch(effectiveSearchQuery);

  const [localVocabResults, setLocalVocabResults] = useState<any[]>([]);

  // Handle local curriculum search to augment the dictionary
  useEffect(() => {
    const q = effectiveSearchQuery.trim().toLowerCase();
    const timer = setTimeout(() => {
      searchVocabulary(q)
        .then(res => {
          setLocalVocabResults(res.map(card => ({
            id: card.id,
            simplified: card.front,
            traditional: card.front,
            pinyin_accented: card.pinyin || '',
            definitions: [card.back],
            isFromBook: true,
            bookId: card.bookId,
          })));
        })
        .catch(err => {
          console.error("SearchScreen: local vocabulary search failed:", err);
          setLocalVocabResults([]);
        });
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [effectiveSearchQuery]);


  // Use the Blue theme (Book 1) for Dictionary/Library as requested
  const theme = SAMPLE_BOOKS[0];

  const handleResultsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const nextIsCompact = event.currentTarget.scrollTop > 24;
    if (nextIsCompact !== isMainHeaderCompact) {
      setIsMainHeaderCompact(nextIsCompact);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full text-[#4B4B4B] pt-0 relative overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-faded-y" onScroll={handleResultsScroll}>
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-0 pb-6 pt-1"
            >
              <div className="flex flex-col w-full">
                {isSearching && globalResults.length === 0 && (
                  <div className="flex flex-col w-full">
                    <div className="flex flex-col w-full bg-white border-y-[2px] border-[#F0F0F0]">
                      {[1, 2, 3, 4, 5, 6].map((i, idx) => (
                        <div key={`skeleton-${i}`} className={`w-full bg-white px-4 py-4 flex flex-row items-center gap-4 ${idx < 5 ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}>
                           <div className="flex-1 flex flex-col items-start gap-2">
                             <div className="flex items-center gap-3 w-full">
                               <div className="w-12 h-10 bg-[#E5E5E5]/50 animate-pulse rounded-md" />
                               <div className="w-24 h-4 bg-[#E5E5E5]/50 animate-pulse rounded-full" />
                             </div>
                             <div className="w-3/4 h-4 bg-[#E5E5E5]/50 animate-pulse rounded-full mt-2" />
                           </div>
                           <div className="w-8 h-8 bg-[#E5E5E5]/50 animate-pulse rounded-xl" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {!isSearching && searchQuery && globalResults.length === 0 && (
                  <div className="text-center py-10 text-[#AFB6BB] font-bold">
                    No results found for "{searchQuery}"
                  </div>
                )}

                {searchError && (
                  <div className="mx-4 mb-3 mt-1 py-3 px-4 bg-[#FFF0F0] border-[2px] border-[#FF4B4B]/20 rounded-[16px] text-[#FF4B4B] text-sm font-bold text-center">
                    {searchError}
                  </div>
                )}

                {(globalResults.length > 0) && (
                  <div className="flex flex-col w-full bg-white border-y-[2px] border-[#F0F0F0]">
                    {globalResults.slice(0, 50).map((entry, idx, arr) => (
                      <DictionaryCard 
                        key={`glb-${entry.traditional}-${idx}`} 
                        entry={entry} 
                        isFavorite={favorites.includes(entry.traditional)}
                        onToggleFavorite={() => toggleFavorite(entry.traditional)}
                        onClick={() => setDictionaryWord(entry.traditional)}
                        isLast={idx === arr.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'courses' && (
            <motion.div 
              key="courses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-0 pb-6 pt-1"
            >
              <div className="flex flex-col w-full">
                {!isReady && (
                  <div className="text-center py-6 text-[#AFB6BB] font-bold text-sm">
                    <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#1CB0F6] rounded-full animate-spin mx-auto mb-2" />
                    Loading dictionary...
                  </div>
                )}

                {searchError && (
                  <div className="mx-4 mb-3 mt-1 py-3 px-4 bg-[#FFF0F0] border-[2px] border-[#FF4B4B]/20 rounded-[16px] text-[#FF4B4B] text-sm font-bold text-center">
                    {searchError}
                  </div>
                )}

                {searchQuery && localVocabResults.length === 0 && !isSearching && (
                  <div className="text-center py-10 text-[#AFB6BB] font-bold">
                    No results found for "{searchQuery}"
                  </div>
                )}

                {(localVocabResults.length > 0) && (
                  <div className="flex flex-col w-full bg-white border-y-[2px] border-[#F0F0F0]">
                    {localVocabResults.slice(0, 50).map((entry, idx, arr) => (
                      <DictionaryCard 
                        key={`curr-${entry.traditional}-${idx}`} 
                        entry={entry} 
                        isFavorite={favorites.includes(entry.traditional)}
                        onToggleFavorite={() => toggleFavorite(entry.traditional)}
                        onClick={() => setDictionaryWord(entry.traditional)}
                        isLast={idx === arr.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="h-28 shrink-0 pointer-events-none" />
      </div>

      {/* Bottom Fade Gradient Overlay */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{
          background: `linear-gradient(to top, ${theme.neutralBg || '#F7F7F7'} 0%, ${theme.neutralBg || '#F7F7F7'}d0 40%, transparent 100%)`
        }}
      />

      {/* Slide-Indicator Styled Tactile Bottom Dock Menu */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 px-4 flex justify-center pointer-events-none mb-1">
        <div className="w-full max-w-[280px] bg-white border-[3px] border-[#E5E5E5] border-b-[6px] rounded-[24px] p-1.5 flex items-center justify-center pointer-events-auto shadow-md">
          <button
            onClick={() => setActiveTab('search')}
            className={`relative flex-1 h-[44px] flex items-center justify-center gap-1.5 rounded-[18px] text-[12px] font-black uppercase tracking-wider transition-colors z-10 outline-none cursor-pointer
            ${activeTab === 'search' ? 'text-white' : 'text-[#AFB6BB] hover:text-[#4B4B4B]'}`}
          >
            {activeTab === 'search' && (
              <motion.div
                layoutId="search-tab-indicator"
                className={`absolute inset-0 z-[-1] rounded-[16px] ${theme.accentBg} shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)]`}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <PiBookOpenFill size={16} />
            <span>Dictionary</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`relative flex-1 h-[44px] flex items-center justify-center gap-1.5 rounded-[18px] text-[12px] font-black uppercase tracking-wider transition-colors z-10 outline-none cursor-pointer
            ${activeTab === 'courses' ? 'text-white' : 'text-[#AFB6BB] hover:text-[#4B4B4B]'}`}
          >
            {activeTab === 'courses' && (
              <motion.div
                layoutId="search-tab-indicator"
                className={`absolute inset-0 z-[-1] rounded-[16px] ${theme.accentBg} shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)]`}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <PiBooksBold size={16} />
            <span>Courses</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const DictionaryCard = React.memo<{ 
  entry: any, 
  isFavorite: boolean, 
  onToggleFavorite: () => void, 
  onClick: () => void,
  isLast?: boolean
}>(({ entry, isFavorite, onToggleFavorite, onClick, isLast }) => {
  const getAllDefs = (defs: any) => {
    if (!defs) return '';
    if (typeof defs === 'string') return defs;
    if (Array.isArray(defs)) return defs.join(' • ');
    if (typeof defs === 'object') return Object.values(defs).join(' • ');
    return '';
  };

  const allDefinitions = getAllDefs(entry.definitions);
  const pinyinStr = entry.pinyin_accented || '';

  const bookData = entry.bookId ? SAMPLE_BOOKS.find(b => b.id === entry.bookId) : null;

  const primaryChar = entry.traditional;

  return (
    <div 
      className={`w-full bg-white px-4 py-3 flex flex-row items-center gap-4 active:bg-[#F2F2F2] hover:bg-[#F9F9F9] transition-all cursor-pointer group outline-none text-left ${!isLast ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}
      onClick={onClick}
    >
      <div className="flex-1 flex flex-col items-start min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 w-full relative mb-1">
          <span className="text-[28px] sm:text-[32px] leading-none font-chinese font-normal text-[#4B4B4B] shrink-0 pt-1">
            {primaryChar}
          </span>
          <div className="flex flex-col justify-center min-w-0 flex-1">
             <div className="flex items-center gap-2">
                <span className="text-[13px] sm:text-[14px] font-bold text-[#AFB6BB] tracking-widest line-clamp-1 truncate flex-1">
                  {pinyinStr || ''}
                </span>
                {bookData && (
                  <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-[#AFB6BB] tracking-widest uppercase opacity-80 select-none">
                    <span>{bookData.label}</span>
                    <span className={`w-2 h-2 rounded-full ${bookData.accentBg} shrink-0`} />
                  </span>
                )}
             </div>
          </div>
        </div>
        <div className="text-[14px] font-bold text-[#4B4B4B] line-clamp-2 w-full mt-0.5 break-words">
          {allDefinitions as React.ReactNode}
        </div>
      </div>
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`p-2.5 rounded-xl transition-all shrink-0 ${isFavorite ? 'bg-[#FFD900]/25 text-[#FF9600]' : 'text-[#AFB6BB] hover:bg-[#E5E5E5] hover:text-[#777777]'} active:scale-95`}
      >
        {isFavorite ? <PiBookmarkSimpleFill size={22} /> : <PiBookmarkSimpleBold size={22} />}
      </button>
    </div>
  );
});

