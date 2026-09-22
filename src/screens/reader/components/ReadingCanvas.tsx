import { useCallback, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import type { DialogueAlignment, ReaderTextSize, ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { getWordChunks } from '../../../utils/rubyPinyin';
import { getDialogueSpeakerColorMap, getSpeakerDotColor } from '../../../utils/speakerColors';
import { getCharacterForSpeaker } from '../../../utils/speakerCharacters';
import { audioService } from '../../../services/audioService';
import { findMatchingCourseVocab } from '../../../services/vocabularyService';
import { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { useReaderLocate } from '../hooks/useReaderLocate';
import { useReaderDictionaryBatch } from '../hooks/useReaderDictionaryBatch';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { overlapsAnyLocatedRange, type ReaderLocatedRange } from '../utils/readerLocate';
import { ReaderWordTooltip } from './ReaderWordTooltip';
import { ReaderChunk, DIALOGUE_CHUNK_APPEARANCE } from './ReaderChunk';
import { ReaderSpeakerAvatar } from './ReaderSpeakerAvatar';
import { splitChunksIntoSentences } from '../../../utils/dialogueSync';
import { getDialogueTextClasses } from '../utils/readerTextStyles';

interface ReadingCanvasProps {
  reading: ReadingRecord;
  alignment: DialogueAlignment | null;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showMeaning: boolean;
  showHoverDefinitions?: boolean;
  textSize: ReaderTextSize;
  activeLineIndex: number | null;
  currentTime: number;
  /** Vocabulary word the Study Guide is locating in this text, if any. */
  locatedWord: ReaderStudyTargetWord | null;
  /** Sentences of the located grammar point, painted with a soft background. */
  locatedGrammarRanges: readonly ReaderLocatedRange[];
  onPlayLine: (index: number) => void;
  onPlayRange?: (startSec: number, endSec: number) => void;
}


const LEFT_ANCHOR_SPEAKERS = new Set(['老師', '媽媽', '醫生', '女店員', '店員']);
const STUDENT_PRIORITY = ['中明', '家樂', '宜文', '友美', '國安', '元真'];

function pickRightSpeaker(speakers: string[]): string | null {
  if (speakers.length < 2) return null;

  // In 2-person dialogues: anchor authority/elder/clerks to the left
  if (speakers.length === 2) {
    if (LEFT_ANCHOR_SPEAKERS.has(speakers[0]) && !LEFT_ANCHOR_SPEAKERS.has(speakers[1])) return speakers[1];
    if (LEFT_ANCHOR_SPEAKERS.has(speakers[1]) && !LEFT_ANCHOR_SPEAKERS.has(speakers[0])) return speakers[0];
    return speakers[1];
  }

  // In 3+ person dialogues: pick the primary student protagonist who acts as "You" / responder
  for (const candidate of STUDENT_PRIORITY) {
    if (speakers.includes(candidate)) return candidate;
  }

  return speakers[1] || null;
}

export function ReadingCanvas({
  reading,
  alignment,
  characterPreference,
  showPinyin,
  showMeaning,
  showHoverDefinitions = true,
  textSize,
  activeLineIndex,
  currentTime,
  locatedWord,
  locatedGrammarRanges,
  onPlayLine,
  onPlayRange,
}: ReadingCanvasProps) {
  const { getPreview } = useReaderDictionaryBatch({
    reading,
    characterPreference,
  });

  const speakerColorMap = useMemo(
    () => getDialogueSpeakerColorMap(reading.paragraphs),
    [reading.paragraphs],
  );

  const uniqueSpeakers = useMemo(() => {
    return Array.from(
      new Set(reading.paragraphs.map((p) => p.speaker).filter(Boolean)),
    ) as string[];
  }, [reading.paragraphs]);

  const rightSpeaker = useMemo(() => {
    return pickRightSpeaker(uniqueSpeakers);
  }, [uniqueSpeakers]);

  const {
    holdingChunkKey,
    hoveredWord,
    hoveredChunkKey,
    handlePointerEnter,
    handlePointerLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useReaderWordInteractions({
    onPlayLine,
    onPlayRange,
    showHoverDefinitions,
  });

  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  /** Play an aligned fragment when the pack provides timings, else the whole line. */
  const playFragment = useCallback(
    (start: number | undefined, end: number | undefined, lineIndex: number) => {
      if (typeof start === 'number' && typeof end === 'number' && onPlayRange) {
        onPlayRange(start, end);
      } else {
        onPlayLine(lineIndex);
      }
    },
    [onPlayRange, onPlayLine],
  );

  // Auto-scroll active line into view when activeLineIndex changes
  useEffect(() => {
    if (activeLineIndex === null) return;
    const el = lineRefs.current.get(activeLineIndex);
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeLineIndex]);

  // Pre-compute chunks and clauses for all dialogue lines
  const linesData = useMemo(() => {
    return reading.paragraphs.map((paragraph, index) => {
      const text = characterPreference === 'simplified'
        ? paragraph.simplified
        : paragraph.traditional;
      const lineAlignment = alignment?.lines[index];
      const chunks = getWordChunks(text, paragraph.pinyin, lineAlignment);
      const isNarrator = !paragraph.speaker || paragraph.speaker.toLowerCase() === 'narrator';
      const isRightAligned = !isNarrator && Boolean(rightSpeaker && paragraph.speaker === rightSpeaker);
      const speakerDotColor = getSpeakerDotColor(paragraph.speaker, speakerColorMap);
      const speakerChar = getCharacterForSpeaker(paragraph.speaker);
      const avatarInitial = paragraph.speaker ? paragraph.speaker[0] : '？';
      const sentences = splitChunksIntoSentences(chunks, index, lineAlignment?.start, lineAlignment?.end);
      // Chunks partition the line, so accumulating sentence text lengths gives
      // each sentence's character range for the grammar locate highlight.
      let sentenceOffset = 0;
      const sentenceRanges = sentences.map((sentence) => {
        const range = { charStart: sentenceOffset, charEnd: sentenceOffset + sentence.text.length };
        sentenceOffset = range.charEnd;
        return range;
      });

      return {
        index,
        paragraph,
        isNarrator,
        isRightAligned,
        speakerDotColor,
        speakerChar,
        avatarInitial,
        chunks,
        sentences,
        sentenceRanges,
      };
    });
  }, [reading.paragraphs, characterPreference, alignment, speakerColorMap, rightSpeaker]);

  const paragraphChunks = useMemo(
    () => linesData.map((line) => line.chunks),
    [linesData],
  );

  const { locatedChunks, firstParagraphIndex } = useReaderLocate({
    reading,
    script: characterPreference,
    locatedWord,
    paragraphChunks,
  });

  // Bring the first occurrence into view; `nearest` leaves the scroll position
  // alone when the occurrence is already visible.
  useEffect(() => {
    if (!locatedWord || firstParagraphIndex === null) return;
    lineRefs.current.get(firstParagraphIndex)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [locatedWord, firstParagraphIndex]);

  // Same for a located grammar point's first matched sentence.
  useEffect(() => {
    const first = locatedGrammarRanges[0];
    if (!first) return;
    lineRefs.current.get(first.paragraphIndex)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [locatedGrammarRanges]);

  return (
    <article
      className={cn(
        'mx-auto w-full px-3 pb-52 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:px-6 sm:pt-[6.5rem] transition-all',
        textSize === 'extra-large' ? 'max-w-3xl' : 'max-w-2xl',
      )}
    >
      {/* Dialogue Chat Messages Flow */}
      <div className="flex flex-col space-y-4 sm:space-y-5">
        {linesData.map(({
          index,
          paragraph,
          isNarrator,
          isRightAligned,
          speakerDotColor,
          speakerChar,
          avatarInitial,
          sentences,
          sentenceRanges,
        }) => {
          const isActive = index === activeLineIndex;

          if (isNarrator) {
            return (
              <motion.div
                key={index}
                ref={(node) => {
                  if (node) {
                    lineRefs.current.set(index, node);
                  } else {
                    lineRefs.current.delete(index);
                  }
                }}
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
                          sentenceRanges[sentenceIdx] &&
                            overlapsAnyLocatedRange(
                              { paragraphIndex: index, ...sentenceRanges[sentenceIdx] },
                              locatedGrammarRanges,
                            ) &&
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

          return (
            <motion.div
              key={index}
              ref={(node) => {
                if (node) {
                  lineRefs.current.set(index, node);
                } else {
                  lineRefs.current.delete(index);
                }
              }}
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
                            sentenceRanges[sentenceIdx] &&
                              overlapsAnyLocatedRange(
                                { paragraphIndex: index, ...sentenceRanges[sentenceIdx] },
                                locatedGrammarRanges,
                              ) &&
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
        })}
      </div>

      {/* Word definition card (hover / desktop) */}
      {hoveredWord && (
        <ReaderWordTooltip
          preview={getPreview(hoveredWord.text, hoveredWord.pinyin)}
          anchor={hoveredWord.anchor}
          onSpeak={() => {
            const voice = characterPreference === 'traditional'
              ? 'zh-TW-HsiaoChenNeural'
              : 'zh-CN-XiaoxiaoNeural';
            void findMatchingCourseVocab(hoveredWord.text).then((match) => {
              void audioService.play(match?.audio, 1.0, hoveredWord.text, voice);
            });
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}
    </article>
  );
}
