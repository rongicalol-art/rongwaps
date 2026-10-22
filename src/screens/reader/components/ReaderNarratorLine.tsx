import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';
import type { ReaderTextSize } from '../../../types/models';
import { getDialogueTextClasses } from '../utils/readerTextStyles';
import type { ReadingCanvasLine } from '../utils/readingCanvasLines';

export interface ReaderNarratorLineProps {
  line: ReadingCanvasLine;
  /** Playback has not reached this line yet: it waits dimmed. */
  isUpcoming: boolean;
  textSize: ReaderTextSize;
  showPinyin: boolean;
  showMeaning: boolean;
  onPlayLine: (index: number) => void;
  onLineRef: (index: number, node: HTMLDivElement | null) => void;
}

/** Centered narration line: no speaker chrome, whole line plays on tap. */
export function ReaderNarratorLine({
  line,
  isUpcoming,
  textSize,
  showPinyin,
  showMeaning,
  onPlayLine,
  onLineRef,
}: ReaderNarratorLineProps) {
  const reduceMotion = useReducedMotion();
  const { index, paragraph, sentences } = line;

  return (
    <motion.div
      ref={(node) => onLineRef(index, node)}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { delay: index * 0.02 }}
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
          'w-fit max-w-xl rounded-sm px-1 text-center transition-opacity duration-300 cursor-pointer outline-none select-text focus-ring',
          isUpcoming && 'opacity-45',
        )}
      >
        <div
          className={cn(
            'font-chinese font-bold text-ui-ink-strong [line-break:strict]',
            getDialogueTextClasses(textSize, showPinyin),
          )}
        >
          {sentences.map((sentence) => (
            <span
              key={sentence.id}
              className="inline rounded"
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
                          <rt className="font-sans font-bold text-ui-muted-strong leading-none text-[10px] sm:text-[11px]">
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
          <div className="mt-1">
            <p className="ui-translation text-xs">
              {paragraph.english}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
