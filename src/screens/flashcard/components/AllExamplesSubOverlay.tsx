import { AnimatePresence, motion } from 'motion/react';
import { ScreenHeader, SmartSentence } from '../../../lib/widgets';
import { RankedExample } from '../../../utils/courseExamples';
import { SAMPLE_BOOKS } from '../../../data/books';
import { useCompactHeaderOnScroll } from '../../../hooks/useCompactHeaderOnScroll';

interface AllExamplesSubOverlayProps {
  showAllOverlay: boolean;
  setShowAllOverlay: (show: boolean) => void;
  smartSentences: RankedExample[];
  activeBook: any;
}

export function AllExamplesSubOverlay({
  showAllOverlay,
  setShowAllOverlay,
  smartSentences,
  activeBook,
}: AllExamplesSubOverlayProps) {
  const { isHeaderCompact, handleHeaderScroll } = useCompactHeaderOnScroll();

  return (
    <AnimatePresence>
      {showAllOverlay && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0 z-[400] w-full h-full bg-[#F7F7F7] flex flex-col pointer-events-auto font-sans shadow-3xl"
        >
          <ScreenHeader 
            onClose={() => setShowAllOverlay(false)}
            title="Example Sentences"
            compact={isHeaderCompact}
            className="bg-white border-b-[3px] border-[#E5E5E5] w-full max-w-full px-4 sm:px-6 shadow-sm"
          />

          <div
            className="flex-1 overflow-y-auto custom-scrollbar"
            onScroll={handleHeaderScroll}
            style={{ backgroundColor: activeBook.neutralBg || "#F7F7F7" }}
          >
            <div className="max-w-[768px] mx-auto w-full px-4 py-8 sm:py-10 flex flex-col pb-32">
              <div className="bg-white border-[3px] border-b-[6px] border-[#E5E5E5] rounded-[24px] flex flex-col overflow-hidden">
                {smartSentences.map((ex, idx) => (
                  <div 
                    key={idx}
                    className={`p-5 sm:p-6 flex flex-row gap-4 active:bg-[#F2F2F2] hover:bg-[#F9F9F9] transition-all cursor-default ${idx < smartSentences.length - 1 ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}
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
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
