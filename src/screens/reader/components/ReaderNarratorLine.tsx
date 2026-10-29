import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';
import type { ReaderTextSize } from '../../../types/models';
import { getDialogueTextClasses } from '../utils/readerTextStyles';
import type { ReadingCanvasLine } from '../utils/readingCanvasLines';
import type { PhraseChunk } from '../../../utils/pinyin/rubyPinyin';
import type { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { ReaderChunk, DIALOGUE_CHUNK_APPEARANCE } from './ReaderChunk';

type WordInteractions = Pick<
  ReturnType<typeof useReaderWordInteractions>,
  | 'holdingChunkKey'
  | 'hoveredChunkKey'
  | 'handlePointerEnter'
  | 'handlePointerLeave'
  | 'handlePointerDown'
  | 'handlePointerMove'
  | 'handlePointerUp'
  | 'handlePointerCancel'
>;

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
  wordInteractions: WordInteractions;
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
  const {
    holdingChunkKey,
    hoveredChunkKey,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = wordInteractions;

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
                  return <span key={chunkIdx} className="inline">{chunk.text}</span>;
                }
                const chunkKey = `${sentence.id}-${chunkIdx}`;
                const isWordActive = typeof chunk.start === 'number' && typeof chunk.end === 'number'
                  ? currentTime >= chunk.start && currentTime < chunk.end
                  : false;
                return (
                  <ReaderChunk
                    key={chunkIdx}
                    chunk={chunk}
                    keyPrefix={sentence.id}
                    chunkIdx={chunkIdx}
                    lineIndex={index}
                    fallbackStart={sentence.start}
                    fallbackEnd={sentence.end}
                    isActive={holdingChunkKey === chunkKey || isWordActive}
                    isHovered={hoveredChunkKey === chunkKey}
                    isNewWord={newWordChunks.has(chunk)}
                    showPinyin={showPinyin}
                    textSize={textSize}
                    appearance={DIALOGUE_CHUNK_APPEARANCE}
                    onPlayLine={onPlayLine}
                    onPlayRange={onPlayRange}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                  />
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
