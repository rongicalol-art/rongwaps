import { useState, useMemo } from 'react';
import { AppIcon } from '../../../../lib/widgets';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../../../data/books';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { useComponentVocabRelation } from '../../../../hooks/useComponentVocabRelation';
import { useCharBreakdown } from '../../../../hooks/useCharBreakdown';
import { projectLegacyDecomposition } from '../../../character-decomposition/legacyProjection';

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
  accentBgClass = 'bg-brand-secondary',
  accentTextClass = 'text-brand-secondary',
  onWordClick,
}: CharNodeItemProps) {
  const { setDictionaryWord, activeBookId } = useAppStore();
  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const data = useCharBreakdown(char);
  const isUnknown = char === '？' || char === '?';
  const py = data?.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : null;
  const def = data?.definition ? data.definition.split(';')[0].split(',')[0].toUpperCase() : null;

  const { exactVocab, usedInVocabs, hasRelation } = useComponentVocabRelation(char);

  const { components: subChars, operator: ids } = projectLegacyDecomposition(data?.decomposition);
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
        role="button"
        tabIndex={isUnknown ? -1 : 0}
        onKeyDown={(e) => {
          if (isUnknown) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onWordClick) {
              onWordClick(char);
            } else {
              setDictionaryWord(char);
            }
          }
        }}
        onClick={() => { 
          if (!isUnknown) {
            if (onWordClick) {
              onWordClick(char);
            } else {
              setDictionaryWord(char);
            }
          } 
        }}
        className={`flex items-center justify-between z-10 relative bg-ui-surface
          ${isUnknown ? 'opacity-50' : 'cursor-pointer hover:bg-ui-hover active:bg-ui-canvas transition-colors'}
          ${isRoot ? 'p-4 sm:p-5' : 'p-3 sm:p-4'}`}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-4">
          <div className={`flex items-center justify-center font-chinese shrink-0 transition-transform font-black bg-ui-canvas text-ui-ink border-b-[length:var(--depth-sm)] border-ui-divider
            ${isRoot ? 'text-[28px] sm:text-[32px] w-[56px] h-[56px] rounded-control' : 'text-[22px] sm:text-[24px] w-[46px] h-[46px] rounded-compact'}`}>
            {char}
          </div>

          <div className="flex flex-col min-w-0 py-1">
             {py ? (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] sm:text-[14px] font-black text-ui-ink tracking-widest leading-none">{py}</span>
                  {badgeInfo && (() => {
                    const bookInfo = SAMPLE_BOOKS.find(b => b.id === badgeInfo.bookId);
                    const dotBg = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
                    return (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-ui-muted tracking-widest uppercase opacity-80 select-none">
                        <span>B{badgeInfo.bookId} · L{badgeInfo.lessonId}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotBg} shrink-0`} />
                      </span>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] sm:text-[14px] font-black text-ui-muted tracking-widest leading-none">???</span>
                  {badgeInfo && (() => {
                    const bookInfo = SAMPLE_BOOKS.find(b => b.id === badgeInfo.bookId);
                    const dotBg = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
                    return (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-ui-muted tracking-widest uppercase opacity-80 select-none">
                        <span>B{badgeInfo.bookId} · L{badgeInfo.lessonId}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotBg} shrink-0`} />
                      </span>
                    );
                  })()}
                </div>
              )}
              {def && <div className="text-[11px] sm:text-[12px] font-bold text-ui-muted uppercase truncate w-[130px] xs:w-[150px] sm:w-[180px] leading-tight">{def}</div>}
          </div>
        </div>

        {hasChildren && (
          <button 
            aria-label={isExpanded ? 'Collapse components' : 'Expand components'}
            aria-expanded={isExpanded}
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-full font-black transition-all focus-ring ${
               isExpanded 
                 ? 'bg-ui-divider text-ui-ink' 
                 : `bg-ui-canvas ${accentTextClass} hover:brightness-95 active:scale-95`
            }`}
          >
             <AppIcon name={isExpanded ? 'minus' : 'plus'} size={20} />
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
             <div className="w-full h-[2px] bg-ui-divider" />
             
             <div className="w-full bg-ui-canvas p-3 sm:p-4 flex flex-col gap-3">
                {ids && (
                  <div className="flex items-center gap-1.5 px-1">
                    <AppIcon name="grid" size={14} className="text-ui-muted" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ui-muted">{ids} {structureName}</span>
                  </div>
                )}
                
                <div className="flex flex-col w-full bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-control overflow-hidden">
                  {subChars.map((c, i) => (
                    <div key={`${c}-${i}`} className="relative flex flex-col">
                      {i > 0 && <div className="w-full h-[2px] bg-ui-divider" />}
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
