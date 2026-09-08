import { useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import type { DialogueAlignment, ReaderTextSize, ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { getWordChunks } from '../../../utils/rubyPinyin';
import { getDialogueSpeakerColorMap, getSpeakerDotColor } from '../../../utils/speakerColors';
import { getCharacterForSpeaker } from '../../../utils/speakerCharacters';
import { RongWapsCharacterPortrait } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { useReaderDictionaryBatch } from '../hooks/useReaderDictionaryBatch';
import { ReaderWordTooltip } from './ReaderWordTooltip';
import { useAppStore } from '../../../store/useAppStore';
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

const LEFT_ANCHOR_SPEAKERS = new Set(['老師', '媽媽', '醫生', '女店員']);
const STUDENT_PRIORITY = ['中明', '家樂', '宜文', '友美', '國安', '元真'];

function pickRightSpeaker(speakers: string[]): string | null {
  if (speakers.length < 2) return null;

  // In 2-person dialogues:
  if (speakers.length === 2) {
    if (LEFT_ANCHOR_SPEAKERS.has(speakers[0]) && !LEFT_ANCHOR_SPEAKERS.has(speakers[1])) return speakers[1];
    if (LEFT_ANCHOR_SPEAKERS.has(speakers[1]) && !LEFT_ANCHOR_SPEAKERS.has(speakers[0])) return speakers[0];
    return speakers[1];
  }

  // In 3+ person dialogues: pick the primary student protagonist who acts as "You"
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
      const speakerDotColor = getSpeakerDotColor(paragraph.speaker, speakerColorMap);
      const isRightAligned = Boolean(rightSpeaker && paragraph.speaker === rightSpeaker);
      const speakerChar = getCharacterForSpeaker(paragraph.speaker);
      const avatarInitial = paragraph.speaker ? paragraph.speaker[0] : '？';
      const sentences = splitChunksIntoSentences(chunks, index, lineAlignment?.start, lineAlignment?.end);

      return {
        index,
        paragraph,
        isNarrator,
        speakerDotColor,
        isRightAligned,
        speakerChar,
        avatarInitial,
        sentences,
      };
    });
  }, [reading.paragraphs, characterPreference, alignment, speakerColorMap, rightSpeaker]);

  return (
    <article
      className={cn(
        'mx-auto w-full px-3 pb-36 pt-4 sm:px-6 sm:pt-6',
        textSize === 'extra-large' ? 'max-w-3xl' : 'max-w-2xl',
      )}
    >
      {/* Dialogue Chat Messages Flow */}
      <div className="flex flex-col space-y-3.5 sm:space-y-4">
        {linesData.map(({
          index,
          paragraph,
          isNarrator,
          speakerDotColor,
          isRightAligned,
          speakerChar,
          avatarInitial,
          sentences,
        }) => {
          const isActive = index === activeLineIndex;

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
                'flex w-full',
                isRightAligned ? 'justify-end' : 'justify-start items-start gap-2 sm:gap-3',
              )}
            >
              {/* Left-side Avatar (Only for other speakers, NO avatar for main speaker on right, and NO avatar for narrator) */}
              {!isRightAligned && !isNarrator && (
                speakerChar ? (
                  <div
                    className={cn(
                      textSize === 'extra-large' ? 'mt-4 sm:mt-5' : 'mt-3.5 sm:mt-4',
                      'h-8 w-8 sm:h-9 sm:w-9 shrink-0 select-none overflow-hidden rounded-full',
                    )}
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
                      textSize === 'extra-large' ? 'mt-4 sm:mt-5' : 'mt-3.5 sm:mt-4',
                      'flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 select-none items-center justify-center rounded-full font-chinese font-black text-xs text-white',
                      speakerDotColor,
                    )}
                    aria-hidden="true"
                    title={paragraph.speaker}
                  >
                    {avatarInitial}
                  </div>
                )
              )}

              {/* Message Column: clearly indented so right never touches left, and left never touches right */}
              <div
                className={cn(
                  'flex flex-col min-w-0',
                  isRightAligned
                    ? textSize === 'extra-large'
                      ? 'items-end ml-6 sm:ml-10 max-w-[88%] sm:max-w-[82%]'
                      : 'items-end ml-10 sm:ml-16 max-w-[78%] sm:max-w-[72%]'
                    : isNarrator
                      ? 'items-start w-full max-w-full'
                      : textSize === 'extra-large'
                        ? 'items-start mr-6 sm:mr-10 max-w-[88%] sm:max-w-[82%]'
                        : 'items-start mr-8 sm:mr-14 max-w-[78%] sm:max-w-[72%]',
                )}
              >
                {/* Speaker Header */}
                {!isNarrator && paragraph.speaker && (
                  <div
                    className={cn(
                      'mb-1 flex items-center px-1 tracking-wide',
                      textSize === 'extra-large' ? 'text-xs sm:text-sm font-black' : 'text-xs font-black',
                      isRightAligned ? 'justify-end text-right' : 'justify-start text-left',
                    )}
                  >
                    <span className="font-chinese font-black text-ui-ink-strong">
                      {paragraph.speaker}
                    </span>
                  </div>
                )}

                {/* Content-hugging Speech Bubble Card */}
                <div
                  onClick={() => {
                    onPlayLine(index);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayLine(index);
                    }
                  }}
                  className={cn(
                    'group relative w-fit max-w-full bg-ui-surface transition-all duration-150 cursor-pointer outline-none select-text focus-ring text-left',
                    textSize === 'extra-large' ? 'p-3.5 sm:p-5' : 'p-3 sm:p-4.5',
                    isNarrator
                      ? 'rounded-2xl'
                      : isRightAligned
                        ? 'rounded-2xl rounded-tr-xs'
                        : 'rounded-2xl rounded-tl-xs',
                    'border-0 border-b-[length:var(--depth-md)] border-b-ui-border active:translate-y-[length:var(--depth-sm)] active:border-b-[length:var(--depth-sm)]',
                  )}
                >
                  {/* Chinese text + Native Aligned Ruby Pinyin */}
                  <div
                    className={cn(
                      'font-chinese font-bold text-ui-ink-strong',
                      showPinyin
                        ? textSize === 'extra-large'
                          ? 'text-[24px] sm:text-[28px] leading-[2.6] sm:leading-[2.8]'
                          : textSize === 'large'
                            ? 'text-[20px] sm:text-[22px] leading-[2.3] sm:leading-[2.5]'
                            : 'text-[17px] sm:text-[19px] leading-[2.1] sm:leading-[2.3]'
                        : textSize === 'extra-large'
                          ? 'text-[24px] sm:text-[28px] leading-[1.8] sm:leading-[1.9] tracking-normal'
                          : textSize === 'large'
                            ? 'text-[20px] sm:text-[22px] leading-[1.8] sm:leading-[1.9] tracking-normal'
                            : 'text-[17px] sm:text-[19px] leading-[1.7] sm:leading-[1.8] tracking-normal',
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
                            if (e.key === 'Enter' || e.key === ' ') {
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
                                <span key={chunkIdx} className="transition-colors">
                                  {chunk.rubyItems.map((item, itemIdx) => (
                                    <span key={itemIdx} className="inline-block">
                                      {item.char}
                                    </span>
                                  ))}
                                </span>
                              );
                            }

                            const chunkKey = `${sentence.id}-${chunkIdx}`;
                            const isHoldingThisChunk = holdingChunkKey === chunkKey;
                            const isWordActive = typeof chunk.start === 'number' && typeof chunk.end === 'number'
                              ? currentTime >= chunk.start && currentTime < chunk.end
                              : false;
                            const isWordHovered = hoveredChunkKey === chunkKey;

                            return (
                              <span
                                key={chunkIdx}
                                data-reader-chunk="true"
                                data-chunk-key={chunkKey}
                                data-chunk-start={chunk.start}
                                data-chunk-text={chunk.text}
                                role="button"
                                tabIndex={0}
                                title="Tap to play · Hover for definition · Hold for breakdown"
                                onClick={(e) => e.stopPropagation()}
                                onPointerEnter={(e) =>
                                  handlePointerEnter(e, chunk, sentence.id, chunkIdx)
                                }
                                onPointerLeave={handlePointerLeave}
                                onPointerDown={(e) => handlePointerDown(e, chunk, sentence.id, chunkIdx)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={(e) =>
                                  handlePointerUp(e, chunk, index, {
                                    start: typeof chunk.start === 'number'
                                      ? chunk.start
                                      : sentence.start,
                                    end: sentence.end,
                                  })
                                }
                                onPointerCancel={handlePointerCancel}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.shiftKey) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    useAppStore.getState().setDictionaryWord(chunk.text);
                                  } else if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const wordStart = typeof chunk.start === 'number'
                                      ? chunk.start
                                      : sentence.start;
                                    if (
                                      typeof wordStart === 'number' &&
                                      typeof sentence.end === 'number' &&
                                      onPlayRange
                                    ) {
                                      onPlayRange(wordStart, sentence.end);
                                    } else {
                                      onPlayLine(index);
                                    }
                                  }
                                }}
                                className={cn(
                                  'outline-none -mx-0.5 px-0.5 rounded box-decoration-clone transition-colors duration-100',
                                  isHoldingThisChunk || isWordActive
                                    ? 'bg-brand-primary-soft text-brand-primary font-black'
                                    : isWordHovered
                                      ? 'bg-brand-primary/10 text-brand-primary'
                                      : '',
                                )}
                              >
                                {showPinyin ? (
                                  chunk.rubyItems.map((item, itemIdx) => {
                                    if (item.isPunctuation || !item.pinyin) {
                                      return <span key={itemIdx}>{item.char}</span>;
                                    }
                                    const isLongSyllable = item.pinyin.length >= 5;
                                    return (
                                      <ruby
                                        key={itemIdx}
                                        className={cn(
                                          'font-chinese [ruby-position:over]',
                                          textSize === 'extra-large'
                                            ? 'mx-[3px] sm:mx-[4px]'
                                            : 'mx-[2px] sm:mx-[3px]',
                                        )}
                                      >
                                        {item.char}
                                        <rt
                                          className={cn(
                                            'font-sans font-semibold text-brand-primary select-none leading-none pb-0.5 [ruby-position:over]',
                                            isLongSyllable
                                              ? textSize === 'extra-large'
                                                ? 'text-[11.5px] sm:text-[12.5px] tracking-tight'
                                                : textSize === 'large'
                                                  ? 'text-[10px] sm:text-[10.5px] tracking-tight'
                                                  : 'text-[9.5px] sm:text-[10px] tracking-tight'
                                              : textSize === 'extra-large'
                                                ? 'text-[12.5px] sm:text-[13.5px] tracking-normal'
                                                : textSize === 'large'
                                                  ? 'text-[10.5px] sm:text-[11.5px] tracking-normal'
                                                  : 'text-[10px] sm:text-[11px] tracking-normal',
                                          )}
                                        >
                                          {item.pinyin}
                                        </rt>
                                      </ruby>
                                    );
                                  })
                                ) : (
                                  <span>{chunk.text}</span>
                                )}
                              </span>
                            );
                          })}
                        </span>
                      );
                    })}
                  </div>

                  {/* English Meaning Line */}
                  {showMeaning && paragraph.english && (
                    <div className="mt-2 border-t border-ui-divider/40 pt-1.5">
                      <p
                        className={cn(
                          'font-medium transition-all select-text',
                          isActive ? 'text-ui-ink font-semibold' : 'text-ui-muted',
                          textSize === 'extra-large'
                            ? 'text-sm leading-relaxed sm:text-[15px]'
                            : textSize === 'large'
                              ? 'text-xs leading-relaxed sm:text-[13px]'
                              : 'text-[11px] leading-snug sm:text-xs sm:leading-relaxed',
                        )}
                      >
                        {paragraph.english}
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
            void audioService.speakNeural(hoveredWord.text, voice).catch(() => {
              const locale = characterPreference === 'simplified' ? 'zh-CN' : 'zh-TW';
              return audioService.speakText(hoveredWord.text, locale, 1).catch(() => {});
            });
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}
    </article>
  );
}
