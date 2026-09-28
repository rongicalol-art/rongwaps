import React from 'react';
import { numberToToneMarks } from '../../../utils/pinyin';
import { DESIGN_TOKENS } from '../../../data/designTokens';
import { StrokeOrderBox } from './StrokeOrderBox';
import { SAMPLE_BOOKS } from '../../../data/books';
import type { Flashcard } from '../../../data/flashcards';
import { DBCharacterBreakdown } from '../../../types/database';
import { BreakdownComponentCard } from './breakdown/BreakdownComponentCard';
import { ExtendedDefinitions } from './ExtendedDefinitions';
import { SummaryQuickActions } from './SummaryQuickActions';
import { UsedAsComponentSection } from './breakdown/UsedAsComponentSection';
import { RelatedWordsSection } from './breakdown/RelatedWordsSection';

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
  return (
    <div className="flex h-full w-full flex-col gap-7">
      {/* Top Character Area */}
      <section className="relative flex flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">

        <SummaryQuickActions char={activeChar} audioSrc={charData?.audio ?? undefined} />
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10 text-center sm:text-left">
           {/* Big Character focus */}
           <div className="flex flex-col items-center">
             <div className="mb-3 text-[14px] font-extrabold tracking-[0.2em] text-ui-muted sm:text-[16px]">
               {charData?.pinyin?.[0] ? numberToToneMarks(charData.pinyin[0]) : ' '}
             </div>
             <div className="mb-5">
               <StrokeOrderBox char={activeChar} size={140} accentHex={activeBook.accentHex || DESIGN_TOKENS.color.brand.primary} />
             </div>
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
                  <div className="flex w-full flex-col items-start gap-2 border-t border-ui-divider/70 pt-3 text-left">
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

        {/* Extended Dictionary Details — extends the summary card in place */}
        <ExtendedDefinitions key={activeChar} char={activeChar} />
      </section>

      {/* Component Breakdown Section */}
      {components.length > 0 && (
         <div className="flex flex-col gap-3">
           <div className="flex flex-row items-center justify-between ml-2">
             <h3 className="text-sm font-extrabold uppercase tracking-wider text-ui-muted">
               Components
             </h3>
             <button type="button" onClick={openDeepBreakdown} className={`min-h-11 rounded-compact px-2 text-xs font-extrabold uppercase tracking-wider transition-colors hover:bg-ui-hover focus-ring ${activeBook.accent}`}>
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
         </div>
      )}

      <UsedAsComponentSection
        usedAsComponents={usedAsComponents}
        activeBook={activeBook}
        setDictionaryWord={setDictionaryWord}
        openUsedAsBreakdown={openUsedAsBreakdown}
        isUsedAsLoading={isUsedAsLoading}
      />

      <RelatedWordsSection
        relatedWords={relatedWords}
        activeBook={activeBook}
        openRelatedBreakdown={openRelatedBreakdown}
        isRelatedLoading={isRelatedLoading}
      />
    </div>
  );
};
