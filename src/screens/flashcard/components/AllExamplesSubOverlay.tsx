import { AnimatePresence } from 'motion/react';
import { SmartSentence, WorkspaceDetailShell } from '../../../lib/widgets';
import { RankedExample } from '../../../utils/courseExamples';
import { SAMPLE_BOOKS } from '../../../data/books';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface AllExamplesSubOverlayProps {
  showAllOverlay: boolean;
  setShowAllOverlay: (show: boolean) => void;
  smartSentences: RankedExample[];
  activeBook: CourseBook;
}

export function AllExamplesSubOverlay({
  showAllOverlay,
  setShowAllOverlay,
  smartSentences,
  activeBook,
}: AllExamplesSubOverlayProps) {
  return (
    <AnimatePresence>
      {showAllOverlay && (
        <WorkspaceDetailShell
          ariaLabel="All example sentences"
          title="Example Sentences"
          onClose={() => setShowAllOverlay(false)}
          maxWidthClassName="max-w-[900px]"
          contentInnerClassName="pb-32"
        >
              <div className="flex flex-col overflow-hidden rounded-[24px] bg-ui-surface shadow-sm">
                {smartSentences.map((ex, idx) => (
                  <div 
                    key={idx}
                    className={`flex cursor-default flex-row gap-4 p-5 transition-colors hover:bg-ui-surface-hover sm:p-6 ${idx < smartSentences.length - 1 ? 'border-b-2 border-ui-divider' : ''}`}
                  >
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex flex-row items-start justify-between gap-4">
                        <SmartSentence text={ex.chinese} className="text-[22px] sm:text-[24px] font-chinese leading-snug" bookAccent={activeBook.accent} />
                        {(() => {
                          const bookInfo = SAMPLE_BOOKS.find(b => b.id === ex.sourceBookId);
                          const dotColorClass = bookInfo ? bookInfo.accentBg : activeBook.accentBg;
                          return (
                            <span className="mt-1.5 flex shrink-0 select-none items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ui-muted opacity-80">
                              <span>B{ex.sourceBookId} · L{ex.sourceLessonId}</span>
                              <span className={`w-2 h-2 rounded-full ${dotColorClass} shrink-0`} />
                            </span>
                          );
                        })()}
                      </div>
                      <span className={`text-[17px] sm:text-[18px] font-bold ${activeBook.accent} leading-none mb-1`}>{ex.pinyin}</span>
                      <span className="text-[15px] font-medium leading-relaxed text-ui-muted sm:text-[16px]">{ex.english}</span>
                    </div>
                  </div>
                ))}
              </div>
        </WorkspaceDetailShell>
      )}
    </AnimatePresence>
  );
}
