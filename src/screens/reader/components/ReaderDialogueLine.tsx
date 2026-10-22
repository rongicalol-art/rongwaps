import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';
import type { PhraseChunk } from '../../../utils/pinyin/rubyPinyin';
import type { ReaderTextSize } from '../../../types/models';
import type { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { getDialogueTextClasses } from '../utils/readerTextStyles';
import type { ReadingCanvasLine } from '../utils/readingCanvasLines';
import { ReaderChunk, DIALOGUE_CHUNK_APPEARANCE } from './ReaderChunk';
import { ReaderSpeakerAvatar } from './ReaderSpeakerAvatar';

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

export interface ReaderDialogueLineProps {
  line: ReadingCanvasLine;
  /** Playback has not reached this line yet: it waits dimmed. */
  isUpcoming: boolean;
  /** The recording is on this line right now. */
  isActive: boolean;
  textSize: ReaderTextSize;
  showPinyin: boolean;
  showMeaning: boolean;
  currentTime: number;
  newWordChunks: ReadonlySet<PhraseChunk>;
  onPlayLine: (index: number) => void;
  onPlayRange?: (startSec: number, endSec: number) => void;
  playFragment: (start: number | undefined, end: number | undefined, lineIndex: number) => void;
  wordInteractions: WordInteractions;
  onLineRef: (index: number, node: HTMLDivElement | null) => void;
}

/**
 * One spoken line: avatar, speaker name, and the text in a flat bubble with
 * native ruby pinyin and per-word tap/hold interactions. The opener speaks
 * from the left, the responder from the right.
 */
export function ReaderDialogueLine({
  line,
  isUpcoming,
  isActive,
  textSize,
  showPinyin,
  showMeaning,
  currentTime,
  newWordChunks,
  onPlayLine,
  onPlayRange,
  playFragment,
  wordInteractions,
  onLineRef,
}: ReaderDialogueLineProps) {
  const reduceMotion = useReducedMotion();
  const { index, paragraph, speakerDotColor, speakerChar, avatarInitial, sentences, isRightAligned } = line;
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
      className={cn(
        'flex w-full items-start gap-2.5 sm:gap-3.5',
        isRightAligned ? 'flex-row-reverse' : 'justify-start',
      )}
    >
      {/* Speaker avatar — left for the opener, right for the responder */}
      <ReaderSpeakerAvatar
        speaker={paragraph.speaker}
        character={speakerChar}
        initial={avatarInitial}
        dotColor={speakerDotColor}
        className={cn('shrink-0 transition-opacity duration-300', isUpcoming && 'opacity-45')}
      />

      {/* Message Column */}
      <div
        className={cn(
          'flex min-w-0 max-w-[88%] sm:max-w-[85%] flex-col transition-opacity duration-300',
          isRightAligned ? 'items-end' : 'items-start',
          isUpcoming && 'opacity-45',
        )}
      >
        {/* Speaker Header */}
        {paragraph.speaker && (
          <div
            className={cn(
              'mb-1 flex items-center px-1 text-sm font-bold',
              isRightAligned ? 'justify-end' : 'justify-start',
            )}
          >
            <span className="font-chinese-sans font-bold text-ui-ink-strong">
              {paragraph.speaker}
            </span>
          </div>
        )}

        {/* The line itself; tap to play */}
        <div
          onClick={() => {
            onPlayLine(index);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onPlayLine(index);
            }
          }}
          className={cn(
            'group relative w-fit max-w-full cursor-pointer rounded-2xl border-2 border-b-4 px-4 py-2.5 outline-none select-text focus-ring text-left transition-colors duration-200',
            isActive
              ? 'border-brand-primary border-b-brand-primary-edge bg-brand-primary-soft'
              : 'border-ui-divider border-b-ui-border bg-ui-surface',
          )}
        >
          {/* Message Content (Chinese characters + ruby pinyin + translation) */}
          <div className="min-w-0">
            {/* Chinese text + Native Aligned Ruby Pinyin */}
            <div
              className={cn(
                'font-chinese font-bold text-ui-ink-strong [line-break:strict]',
                getDialogueTextClasses(textSize, showPinyin),
              )}
            >
              {sentences.map((sentence) => {
                return (
                  <span
                    key={sentence.id}
                    role="button"
                    tabIndex={0}
                    title="Tap to play sentence"
                    onClick={(e) => {
                      e.stopPropagation();
                      playFragment(sentence.start, sentence.end, index);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        playFragment(sentence.start, sentence.end, index);
                      }
                    }}
                    className="group/sentence relative inline rounded cursor-pointer outline-none box-decoration-clone text-ui-ink-strong"
                  >
                    {sentence.chunks.map((chunk, chunkIdx) => {
                      if (chunk.isPunctuation) {
                        return (
                          <span key={chunkIdx} className="transition-colors inline select-text">
                            {chunk.rubyItems.map((item, itemIdx) => (
                              <span key={itemIdx} className="inline">
                                {item.char}
                              </span>
                            ))}
                          </span>
                        );
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
                );
              })}
            </div>

            {/* Optional English Translation */}
            {showMeaning && paragraph.english && (
              <div className="mt-1">
                <p
                  className={cn(
                    'ui-translation',
                    textSize === 'extra-large'
                      ? 'text-xs sm:text-sm'
                      : textSize === 'large'
                        ? 'text-xs'
                        : 'text-[11px] leading-snug sm:text-xs sm:leading-relaxed',
                  )}
                >
                  {paragraph.english}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
