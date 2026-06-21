import { SmartSentence } from '../../../lib/widgets';
import { RankedExample } from '../../../utils/courseExamples';
import { SAMPLE_BOOKS } from '../../../data/books';

interface SentencesSectionProps {
  smartSentences: RankedExample[];
  isSentencesLoading: boolean;
  activeBook: any;
  setShowAllOverlay: (show: boolean) => void;
}

export function SentencesSection({
  smartSentences,
  isSentencesLoading,
  activeBook,
  setShowAllOverlay,
}: SentencesSectionProps) {
  if (!isSentencesLoading && smartSentences.length === 0) return null;

  const sentencesToShow = smartSentences.slice(0, 2);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-center justify-between pl-1">
        <h4 className="text-[15px] font-bold text-[#AFB6BB] uppercase tracking-[0.05em]">Example Sentences</h4>
        {!isSentencesLoading && smartSentences.length > 2 && (
          <button 
            onClick={() => setShowAllOverlay(true)} 
            className={`text-[13px] font-extrabold uppercase tracking-wider ${activeBook.accent} hover:opacity-80 active:translate-y-[2px] transition-all`}
          >
            Show All ({smartSentences.length})
          </button>
        )}
      </div>
      
      <div className="bg-white border-[3px] border-b-[6px] border-[#E5E5E5] rounded-[24px] flex flex-col overflow-hidden">
        {isSentencesLoading ? (
          <>
            <div className="p-5 sm:p-6 border-b-[2px] border-[#F0F0F0]">
               <div className="h-8 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[12px] w-3/4 mb-4" />
               <div className="h-4 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[8px] w-1/3 mb-2" />
               <div className="h-4 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[8px] w-1/2" />
            </div>
            <div className="p-5 sm:p-6">
               <div className="h-8 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[12px] w-5/6 mb-4" />
               <div className="h-4 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[8px] w-1/4 mb-2" />
               <div className="h-4 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[8px] w-2/3" />
            </div>
          </>
        ) : (
          sentencesToShow.map((ex, idx) => (
            <div 
              key={idx}
              className={`p-5 sm:p-6 flex flex-row gap-4 active:bg-[#F2F2F2] hover:bg-[#F9F9F9] transition-all cursor-default ${idx < sentencesToShow.length - 1 ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}
            >
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex flex-row items-start justify-between gap-4">
                  <SmartSentence text={ex.chinese} className="text-[22px] sm:text-[24px] font-chinese leading-snug" bookAccent={activeBook.accent} />
                  {(() => {
                    const bookInfo = SAMPLE_BOOKS.find(b => b.id === ex.sourceBookId);
                    const dotColorClass = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
                    return (
                      <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-[#AFB6BB] tracking-widest uppercase opacity-80 select-none mt-1.5">
                        <span>B{ex.sourceBookId} · L{ex.sourceLessonId}</span>
                        <span className={`w-2 h-2 rounded-full ${dotColorClass} shrink-0`} />
                      </span>
                    );
                  })()}
                </div>
                <span className={`text-[17px] sm:text-[18px] font-bold ${activeBook.accent} leading-none mb-1`}>{ex.pinyin}</span>
                <span className="text-[15px] sm:text-[16px] text-[#AFB6BB] font-medium leading-relaxed">{ex.english}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
