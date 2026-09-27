import { motion } from 'motion/react';
import { cn } from '../../../utils/cn';
import { AppIcon } from '../../../lib/widgets';
import type { PhraseChunk } from '../../../utils/rubyPinyin';
import type { ReaderTextSize } from '../../../types/models';
import type { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import type { ReaderLocatedRange } from '../utils/readerLocate';
import { getDialogueTextClasses } from '../utils/readerTextStyles';
import { isSentenceLocated, type ReadingCanvasLine } from '../utils/readingCanvasLines';
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
  isActive: boolean;
  textSize: ReaderTextSize;
  showPinyin: boolean;
  showMeaning: boolean;
  currentTime: number;
  locatedChunks: ReadonlySet<PhraseChunk>;
  locatedGrammarRanges: readonly ReaderLocatedRange[];
  onPlayLine: (index: number) => void;
  onPlayRange?: (startSec: number, endSec: number) => void;
  playFragment: (start: number | undefined, end: number | undefined, lineIndex: number) => void;
  wordInteractions: WordInteractions;
  onLineRef: (index: number, node: HTMLDivElement | null) => void;
}

/**
 * One speaker story tile: avatar, speaker name, pressable tactile audio card,
 * native ruby pinyin text, and per-word tap/hold interactions.
 */
export function ReaderDialogueLine({
  line,
  isActive,
  textSize,
  showPinyin,
  showMeaning,
  currentTime,
  locatedChunks,
  locatedGrammarRanges,
  onPlayLine,
  onPlayRange,
  playFragment,
  wordInteractions,
  onLineRef,
}: ReaderDialogueLineProps) {
  const { index, paragraph, speakerDotColor, speakerChar, avatarInitial, sentences, sentenceRanges } = line;
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex w-full items-start justify-start gap-2.5 sm:gap-3.5"
    >
      {/* Speaker Avatar (Left-anchored for all dialogue speakers for easy scanning) */}
      <ReaderSpeakerAvatar
        speaker={paragraph.speaker}
        character={speakerChar}
        initial={avatarInitial}
        dotColor={speakerDotColor}
        className="shrink-0"
      />

      {/* Message Column */}
      <div className="flex min-w-0 max-w-[88%] sm:max-w-[85%] flex-col items-start">
        {/* Speaker Header */}
        {paragraph.speaker && (
          <div className="mb-1 flex items-center px-1 text-xs font-black tracking-wide justify-start text-left">
            <span className="font-chinese font-black text-ui-ink-strong">
              {paragraph.speaker}
            </span>
          </div>
        )}

        {/* Duolingo Story Tile: stationary two-layer tactile card, zero shadows/glows */}
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
          className="group relative w-fit max-w-full rounded-2xl cursor-pointer outline-none select-text focus-ring text-left"
        >
          {/* Stationary 3D bottom base */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-x-0 bottom-0 top-[length:var(--depth-sm)] rounded-[inherit]',
              isActive ? 'bg-brand-primary-edge' : 'bg-ui-border-strong',
            )}
          />

          {/* Moving front surface */}
          <div
            className={cn(
              'relative mb-[length:var(--depth-sm)] rounded-[inherit] border-2 bg-ui-surface transition-[border-color,transform] duration-75 group-active:translate-y-[length:var(--depth-sm)]',
              textSize === 'extra-large' ? 'px-4 py-3 sm:px-5 sm:py-3.5' : 'px-3.5 py-2.5 sm:px-4 sm:py-3',
              isActive
                ? 'border-brand-primary'
                : 'border-ui-border hover:border-ui-border-strong',
            )}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              {/* Interactive Audio Affordance Icon */}
              <div
                aria-hidden="true"
                className={cn(
                  'mt-1 flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'bg-ui-hover/70 text-ui-muted-strong group-hover:bg-brand-primary/10 group-hover:text-brand-primary',
                )}
              >
                <AppIcon name="audio" size={15} />
              </div>

              {/* Tile Content (Chinese characters + ruby pinyin + translation) */}
              <div className="min-w-0 flex-1">
                {/* Chinese text + Native Aligned Ruby Pinyin */}
                <div
                  className={cn(
                    'font-chinese font-bold text-ui-ink-strong [line-break:strict]',
                    getDialogueTextClasses(textSize, showPinyin),
                  )}
                >
                {sentences.map((sentence, sentenceIdx) => {
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
                      className={cn(
                        'group/sentence relative inline rounded cursor-pointer outline-none box-decoration-clone text-ui-ink-strong',
                        isSentenceLocated(index, sentenceRanges[sentenceIdx], locatedGrammarRanges) &&
                          'bg-feedback-warning/40',
                      )}
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
                            isLocated={locatedChunks.has(chunk)}
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
                <div className="mt-2 border-t border-ui-divider/50 pt-1.5">
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
      </div>
    </div>
  </motion.div>
);
}
