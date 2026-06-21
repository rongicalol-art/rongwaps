import { useState, useMemo } from 'react';
import { PiMinusBold, PiPlusBold, PiSquaresFourFill } from 'react-icons/pi';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../../data/books';
import { numberToToneMarks } from '../../../utils/pinyin';
import { useComponentVocabRelation } from '../../../hooks/useComponentVocabRelation';
import { useCharBreakdown } from '../../../hooks/useCharBreakdown';
import { getComponentsInfo } from './breakdownUtils';

interface CharNodeItemProps {
  char: string;
  isRoot?: boolean;
  initiallyExpanded?: boolean;
  accentBgClass?: string;
  accentTextClass?: string;
  onWordClick?: (char: string) => void;
}

export function CharNodeItem({
  char,
  isRoot = false,
  initiallyExpanded = false,
  accentBgClass = 'bg-[#FF9600]',
  accentTextClass = 'text-[#FF9600]',
  onWordClick,
}: CharNodeItemProps) {
  const { setDictionaryWord, activeBookId } = useAppStore();
  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const data = useCharBreakdown(char);
  const isUnknown = char === '？' || char === '?';
  const py = data?.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : null;
  const def = data?.definition ? data.definition.split(';')[0].split(',')[0].toUpperCase() : null;

  const { exactVocab, usedInVocabs, hasRelation } = useComponentVocabRelation(char);

  const { components: subChars, ids } = getComponentsInfo(data?.decomposition);
  const hasChildren = subChars.length > 1;

  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  
  const IdsMap: Record<string, string> = {
    '⿰': 'Left-Right',
    '⿱': 'Top-Bottom',
    '⿲': 'Left-Middle-Right',
    '⿳': 'Top-Middle-Bottom',
    '⿴': 'Full Surround',
    '⿵': 'Top Surround',
    '⿶': 'Bottom Surround',
    '⿷': 'Left Surround',
    '⿸': 'Top-Left Surround',
    '⿹': 'Top-Right Surround',
    '⿺': 'Bottom-Left Surround',
    '⿻': 'Overlaid',
  };

  const structureName = ids ? IdsMap[ids] || 'Structure' : 'Structure';

  const badgeInfo = useMemo(() => {
    if (!hasRelation) return null;
    if (exactVocab) {
      return { bookId: exactVocab.bookId, lessonId: exactVocab.lessonId };
    }
    if (usedInVocabs && usedInVocabs.length > 0) {
      return { bookId: usedInVocabs[0].bookId, lessonId: usedInVocabs[0].lessonId };
    }
    return null;
  }, [hasRelation, exactVocab, usedInVocabs]);

  return (
    <div className="flex flex-col w-full">
      <div 
        onClick={() => { 
          if (!isUnknown) {
            if (onWordClick) {
              onWordClick(char);
            } else {
              setDictionaryWord(char);
            }
          } 
        }}
        className={`flex items-center justify-between z-10 relative bg-white
          ${isUnknown ? 'opacity-50' : 'cursor-pointer hover:bg-[#F7F7F7] active:bg-[#F2F2F2] transition-colors'}
          ${isRoot ? 'p-4 sm:p-5' : 'p-3 sm:p-4'}`}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-4">
          <div className={`flex items-center justify-center font-chinese border shrink-0 transition-transform font-black bg-[#F7F7F7] border-[#E5E5E5] text-[#4B4B4B]
            ${isRoot ? 'text-[28px] sm:text-[32px] w-[56px] h-[56px] rounded-[16px] border-[2px]' : 'text-[22px] sm:text-[24px] w-[46px] h-[46px] rounded-[14px] border-[2px]'}`}>
            {char}
          </div>

          <div className="flex flex-col min-w-0 py-1">
             {py ? (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] sm:text-[14px] font-black text-[#4B4B4B] tracking-widest leading-none">{py}</span>
                  {badgeInfo && (() => {
                    const bookInfo = SAMPLE_BOOKS.find(b => b.id === badgeInfo.bookId);
                    const dotBg = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
                    return (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#AFB6BB] tracking-widest uppercase opacity-80 select-none">
                        <span>B{badgeInfo.bookId} · L{badgeInfo.lessonId}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotBg} shrink-0`} />
                      </span>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] sm:text-[14px] font-black text-[#AFB6BB] tracking-widest leading-none">???</span>
                  {badgeInfo && (() => {
                    const bookInfo = SAMPLE_BOOKS.find(b => b.id === badgeInfo.bookId);
                    const dotBg = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
                    return (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#AFB6BB] tracking-widest uppercase opacity-80 select-none">
                        <span>B{badgeInfo.bookId} · L{badgeInfo.lessonId}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotBg} shrink-0`} />
                      </span>
                    );
                  })()}
                </div>
             )}
             {def && <div className="text-[11px] sm:text-[12px] font-bold text-[#AFB6BB] uppercase truncate w-[130px] xs:w-[150px] sm:w-[180px] leading-tight">{def}</div>}
          </div>
        </div>

        {hasChildren && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-full font-black transition-all ${
               isExpanded 
                 ? 'bg-[#E5E5E5] text-[#4B4B4B]' 
                 : `bg-[#F7F7F7] ${accentTextClass} hover:brightness-95 active:scale-95`
            }`}
          >
             {isExpanded ? <PiMinusBold size={20} /> : <PiPlusBold size={20} />}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-col w-full origin-top relative overflow-hidden"
          >
             <div className="w-full h-[2px] bg-[#E5E5E5]" />
             
             <div className="w-full bg-[#FAFAFA] p-3 sm:p-4 flex flex-col gap-3">
                {ids && (
                  <div className="flex items-center gap-1.5 px-1">
                    <PiSquaresFourFill size={14} className="text-[#AFB6BB]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A959E]">{ids} {structureName}</span>
                  </div>
                )}
                
                <div className="flex flex-col w-full bg-white border-[3px] border-[#E5E5E5] rounded-[16px] sm:rounded-[20px] overflow-hidden">
                  {subChars.map((c, i) => (
                    <div key={`${c}-${i}`} className="relative flex flex-col">
                      {i > 0 && <div className="w-full h-[2px] bg-[#E5E5E5]" />}
                      <CharNodeItem 
                        char={c}
                        isRoot={false}
                        initiallyExpanded={false}
                        accentBgClass={accentBgClass}
                        accentTextClass={accentTextClass}
                        onWordClick={onWordClick}
                      />
                    </div>
                  ))}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
