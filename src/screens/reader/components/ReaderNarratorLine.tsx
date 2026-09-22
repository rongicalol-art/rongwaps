import { motion } from 'motion/react';
import { cn } from '../../../utils/cn';
import type { ReaderTextSize } from '../../../types/models';
import type { ReaderLocatedRange } from '../utils/readerLocate';
import { getDialogueTextClasses } from '../utils/readerTextStyles';
import { isSentenceLocated, type ReadingCanvasLine } from '../utils/readingCanvasLines';

export interface ReaderNarratorLineProps {
  line: ReadingCanvasLine;
  isActive: boolean;
  textSize: ReaderTextSize;
  showPinyin: boolean;
  showMeaning: boolean;
  locatedGrammarRanges: readonly ReaderLocatedRange[];
  onPlayLine: (index: number) => void;
  onLineRef: (index: number, node: HTMLDivElement | null) => void;
}

/** Centered narration bubble: no speaker chrome, whole line plays on tap. */
export function ReaderNarratorLine({
  line,
  isActive,
  textSize,
  showPinyin,
  showMeaning,
  locatedGrammarRanges,
  onPlayLine,
  onLineRef,
}: ReaderNarratorLineProps) {
  const { index, paragraph, sentences, sentenceRanges } = line;

  return (
    <motion.div
      ref={(node) => onLineRef(index, node)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex w-full justify-center my-1"
    >
      <div
        onClick={() => onPlayLine(index)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onPlayLine(index);
          }
        }}
        className={cn(
          'w-fit max-w-xl rounded-2xl bg-ui-surface-soft/60 px-4 py-3 text-center transition-all duration-150 cursor-pointer outline-none select-text focus-ring border',
          isActive
            ? 'border-brand-primary/60 bg-brand-primary-soft/15 ring-2 ring-brand-primary/20 shadow-xs'
            : 'border-ui-border/60 hover:border-ui-border shadow-xs',
        )}
      >
        <div
          className={cn(
            'font-chinese font-bold text-ui-ink-strong [line-break:strict]',
            getDialogueTextClasses(textSize, showPinyin),
          )}
        >
          {sentences.map((sentence, sentenceIdx) => (
            <span
              key={sentence.id}
              className={cn(
                'inline rounded',
                isSentenceLocated(index, sentenceRanges[sentenceIdx], locatedGrammarRanges) &&
                  'bg-feedback-warning/40',
              )}
            >
              {sentence.chunks.map((chunk, chunkIdx) => {
                if (chunk.isPunctuation) {
                  return (
                    <span key={chunkIdx} className="inline">
                      {chunk.rubyItems.map((item, itemIdx) => (
                        <span key={itemIdx} className="inline">
                          {item.char}
                        </span>
                      ))}
                    </span>
                  );
                }
                return (
                  <span key={chunkIdx} className="inline">
                    {showPinyin ? (
                      chunk.rubyItems.map((item, itemIdx) => (
                        <ruby key={itemIdx} className="font-chinese mx-[2px] [ruby-position:over]">
                          {item.char}
                          <rt className="font-sans font-semibold text-brand-primary leading-none text-[10px] sm:text-[11px]">
                            {item.pinyin}
                          </rt>
                        </ruby>
                      ))
                    ) : (
                      <span>{chunk.text}</span>
                    )}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
        {showMeaning && paragraph.english && (
          <div className="mt-2 border-t border-ui-divider/50 pt-1.5">
            <p className="ui-translation text-xs">
              {paragraph.english}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
