import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';
import type { ReaderTextSize } from '../../../types/models';
import { getDialogueTextClasses } from '../utils/readerTextStyles';
import type { ReadingCanvasLine } from '../utils/readingCanvasLines';
import type { PhraseChunk } from '../../../utils/pinyin/rubyPinyin';
import { DIALOGUE_CHUNK_APPEARANCE, ReaderSegmentChunks, type ReaderWordInteractions } from './ReaderChunk';

export interface ReaderNarratorLineProps {
  line: ReadingCanvasLine;
  /** Playback has not reached this line yet: it waits dimmed. */
  isUpcoming: boolean;
  textSize: ReaderTextSize;
  showPinyin: boolean;
  showMeaning: boolean;
  currentTime: number;
  newWordChunks: ReadonlySet<PhraseChunk>;
  onPlayLine: (index: number) => void;
  onPlayRange?: (startSec: number, endSec: number) => void;
  wordInteractions: ReaderWordInteractions;
  onLineRef: (index: number, node: HTMLDivElement | null) => void;
}

/** Centered narration line: no speaker chrome, whole line plays on tap. */
export function ReaderNarratorLine({
  line,
  isUpcoming,
  textSize,
  showPinyin,
  showMeaning,
  currentTime,
  newWordChunks,
  onPlayLine,
  onPlayRange,
  wordInteractions,
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
          {sentences.map((sentence, sentenceIndex) => (
            <span
              key={sentence.id}
              className="inline rounded"
            >
              <ReaderSegmentChunks
                segment={sentence}
                lineIndex={index}
                currentTime={currentTime}
                newWordChunks={newWordChunks}
                showPinyin={showPinyin}
                textSize={textSize}
                appearance={DIALOGUE_CHUNK_APPEARANCE}
                onPlayLine={onPlayLine}
                onPlayRange={onPlayRange}
                wordInteractions={wordInteractions}
                punctuationClassName="inline"
                keepEndTogether={sentenceIndex === sentences.length - 1}
              />
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
