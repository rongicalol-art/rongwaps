import { useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import type { DialogueAlignment, ReaderTextSize, ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { getWordChunks } from '../../../utils/rubyPinyin';
import { getDialogueSpeakerColorMap, getSpeakerDotColor } from '../../../utils/speakerColors';
import { getCharacterForSpeaker } from '../../../utils/speakerCharacters';
import { RongWapsCharacterPortrait } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { findMatchingCourseVocab } from '../../../services/vocabularyService';
import { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { useReaderDictionaryBatch } from '../hooks/useReaderDictionaryBatch';
import { ReaderWordTooltip } from './ReaderWordTooltip';
import { ReaderChunk, DIALOGUE_CHUNK_APPEARANCE } from './ReaderChunk';
import { splitChunksIntoSentences } from '../../../utils/dialogueSync';

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
  onPlayLine: (index: number) => void;
  onPlayRange?: (startSec: number, endSec: number) => void;
  onPlayFromTime: (startSec: number, endSec?: number) => void;
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

      return {
        index,
        paragraph,
        isNarrator,
        isRightAligned,
        speakerDotColor,
        speakerChar,
        avatarInitial,
        sentences,
      };
    });
  }, [reading.paragraphs, characterPreference, alignment, speakerColorMap, rightSpeaker]);

  return (
    <article
      className={cn(
        'mx-auto w-full px-3 pb-52 pt-16 sm:px-6 sm:pt-20 transition-all',
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
                      showPinyin
                        ? textSize === 'extra-large'
                          ? 'text-[28px] sm:text-[32px] leading-[2.6] sm:leading-[2.8]'
                          : textSize === 'large'
                            ? 'text-[24px] sm:text-[27px] leading-[2.4] sm:leading-[2.6]'
                            : 'text-[21px] sm:text-[24px] leading-[2.3] sm:leading-[2.5]'
                        : textSize === 'extra-large'
                          ? 'text-[28px] sm:text-[32px] leading-[1.9] sm:leading-[2.0] tracking-normal'
                          : textSize === 'large'
                            ? 'text-[24px] sm:text-[27px] leading-[1.8] sm:leading-[1.9] tracking-normal'
                            : 'text-[21px] sm:text-[24px] leading-[1.7] sm:leading-[1.8] tracking-normal',
                    )}
                  >
                    {sentences.map((sentence) => (
                      <span key={sentence.id} className="inline">
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
                      <p className="font-sans text-xs italic text-ui-muted">
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
                'flex w-full items-end gap-2.5 sm:gap-3.5',
                isRightAligned ? 'justify-end' : 'justify-start',
              )}
            >
              {/* Speaker Avatar (Left side, only if not right-aligned) */}
              {!isRightAligned && (
                <div className="shrink-0 select-none">
                  {speakerChar ? (
                    <div
                      className="h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-full ring-2 ring-ui-border/50 shadow-xs"
                      title={paragraph.speaker}
                    >
                      <RongWapsCharacterPortrait
                        character={speakerChar}
                        label={paragraph.speaker || ''}
                        className="h-full w-full"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full font-chinese font-black text-xs text-white shadow-xs',
                        speakerDotColor,
                      )}
                      aria-hidden="true"
                      title={paragraph.speaker}
                    >
                      {avatarInitial}
                    </div>
                  )}
                </div>
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
                    'group relative w-fit max-w-full transition-all duration-150 cursor-pointer outline-none select-text focus-ring text-left',
                    isRightAligned
                      ? 'rounded-r-2xl rounded-l-[32px] sm:rounded-l-[36px]'
                      : 'rounded-l-2xl rounded-r-[32px] sm:rounded-r-[36px]',
                    textSize === 'extra-large' ? 'px-5 py-3.5 sm:px-6 sm:py-4' : 'px-4 py-3 sm:px-5 sm:py-3.5',
                    isActive
                      ? isRightAligned
                        ? 'bg-ui-surface border-0 border-b-[length:var(--depth-md)] border-b-brand-primary-edge ring-2 ring-brand-primary shadow-xs'
                        : 'border-0 border-b-[length:var(--depth-md)] border-b-brand-primary-edge ring-2 ring-brand-primary bg-brand-primary-soft shadow-xs'
                      : isRightAligned
                        ? 'bg-ui-surface border-0 border-b-[length:var(--depth-md)] border-b-brand-primary-deep/80 hover:border-b-brand-primary-deep shadow-xs active:translate-y-[length:var(--depth-sm)] active:border-b-[length:var(--depth-sm)]'
                        : 'bg-ui-surface border-0 border-b-[length:var(--depth-md)] border-b-ui-border hover:border-b-ui-border-strong shadow-xs active:translate-y-[length:var(--depth-sm)] active:border-b-[length:var(--depth-sm)]',
                  )}
                >
                  {/* Chinese text + Native Aligned Ruby Pinyin */}
                  <div
                    className={cn(
                      'font-chinese font-bold text-ui-ink-strong [line-break:strict]',
                      showPinyin
                        ? textSize === 'extra-large'
                          ? 'text-[28px] sm:text-[32px] leading-[2.6] sm:leading-[2.8]'
                          : textSize === 'large'
                            ? 'text-[24px] sm:text-[27px] leading-[2.4] sm:leading-[2.6]'
                            : 'text-[21px] sm:text-[24px] leading-[2.3] sm:leading-[2.5]'
                        : textSize === 'extra-large'
                          ? 'text-[28px] sm:text-[32px] leading-[1.9] sm:leading-[2.0] tracking-normal'
                          : textSize === 'large'
                            ? 'text-[24px] sm:text-[27px] leading-[1.8] sm:leading-[1.9] tracking-normal'
                            : 'text-[21px] sm:text-[24px] leading-[1.7] sm:leading-[1.8] tracking-normal',
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
                            if (
                              typeof sentence.start === 'number' &&
                              typeof sentence.end === 'number' &&
                              onPlayRange
                            ) {
                              onPlayRange(sentence.start, sentence.end);
                            } else {
                              onPlayLine(index);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                typeof sentence.start === 'number' &&
                                typeof sentence.end === 'number' &&
                                onPlayRange
                              ) {
                                onPlayRange(sentence.start, sentence.end);
                              } else {
                                onPlayLine(index);
                              }
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
                          'font-sans font-medium text-ui-muted',
                          textSize === 'extra-large'
                            ? 'text-xs leading-relaxed sm:text-sm'
                            : textSize === 'large'
                              ? 'text-xs leading-relaxed'
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
                <div className="shrink-0 select-none">
                  {speakerChar ? (
                    <div
                      className="h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-full ring-2 ring-ui-border/50 shadow-xs"
                      title={paragraph.speaker}
                    >
                      <RongWapsCharacterPortrait
                        character={speakerChar}
                        label={paragraph.speaker || ''}
                        className="h-full w-full"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full font-chinese font-black text-xs text-white shadow-xs',
                        speakerDotColor,
                      )}
                      aria-hidden="true"
                      title={paragraph.speaker}
                    >
                      {avatarInitial}
                    </div>
                  )}
                </div>
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
