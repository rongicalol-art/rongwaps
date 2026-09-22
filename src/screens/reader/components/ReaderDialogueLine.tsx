import { motion } from 'motion/react';
import { cn } from '../../../utils/cn';
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
 * One speaker bubble: avatar, name, playable sentences, ruby text, and the
 * per-word tap/hold interactions from the reader word tooltip hook.
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
  const { index, paragraph, isRightAligned, speakerDotColor, speakerChar, avatarInitial, sentences, sentenceRanges } = line;
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
      className={cn(
        'flex w-full items-start gap-2.5 sm:gap-3.5',
        isRightAligned ? 'justify-end' : 'justify-start',
      )}
    >
      {/* Speaker Avatar (Left side, only if not right-aligned).
          mt-5 matches the speaker name row above the bubble so the
          disc sits flush with the bubble's top edge, not the name. */}
      {!isRightAligned && (
        <ReaderSpeakerAvatar
          speaker={paragraph.speaker}
          character={speakerChar}
          initial={avatarInitial}
          dotColor={speakerDotColor}
          className="mt-5"
        />
      )}

      {/* Message Column */}
      <div
        className={cn(
          'flex flex-col min-w-0 max-w-[85%] sm:max-w-[80%]',
          isRightAligned ? 'items-end' : 'items-start',
        )}
      >
        {/* Speaker Header — shown on both sides */}
        {paragraph.speaker && (
          <div
            className={cn(
              'mb-1 flex items-center px-1 text-xs font-black tracking-wide',
              isRightAligned ? 'justify-end text-right' : 'justify-start text-left',
            )}
          >
            <span className="font-chinese font-black text-ui-ink-strong">
              {paragraph.speaker}
            </span>
          </div>
        )}

        {/* Content-hugging Speech Bubble Card with tactile depth */}
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
            'group relative w-fit max-w-full rounded-2xl border-2 border-ui-border bg-ui-surface shadow-xs transition-colors duration-150 cursor-pointer outline-none select-text focus-ring text-left',
            textSize === 'extra-large' ? 'px-5 py-3.5 sm:px-6 sm:py-4' : 'px-4 py-3 sm:px-5 sm:py-3.5',
            isActive
              ? 'border-brand-primary ring-1 ring-brand-primary/20'
              : 'hover:border-ui-border-strong',
          )}
        >
          {/* Bubble tail pointing at the speaker avatar */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-3.5 h-3 w-3 rotate-45 border-b-2 border-l-2 bg-ui-surface',
              isRightAligned && '-right-1.5 border-r-2 border-t-2 border-b-0 border-l-0',
              !isRightAligned && '-left-1.5',
              isActive ? 'border-brand-primary' : 'border-ui-border',
            )}
          />
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

      {/* Speaker Avatar (Right side, only if right-aligned) */}
      {isRightAligned && (
        <ReaderSpeakerAvatar
          speaker={paragraph.speaker}
          character={speakerChar}
          initial={avatarInitial}
          dotColor={speakerDotColor}
          className="mt-5"
        />
      )}
    </motion.div>
  );
}
