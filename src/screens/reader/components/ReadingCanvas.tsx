import { useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import type { ReadingRecord } from '../../../types/models';
import type { DialogueAlignment } from '../../../data/dialogueAlignment';
import { cn } from '../../../utils/cn';
import { getPhraseChunks } from '../../../utils/rubyPinyin';
import { getDialogueSpeakerColorMap, getSpeakerDotColor } from '../../../utils/speakerColors';
import { getCharacterForSpeaker } from '../../../utils/speakerCharacters';
import { RongWapsCharacterPortrait } from '../../../lib/widgets';

interface ReadingCanvasProps {
  reading: ReadingRecord;
  alignment: DialogueAlignment | null;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showMeaning: boolean;
  textSize: 'normal' | 'large';
  activeLineIndex: number | null;
  currentTime: number;
  onPlayLine: (index: number) => void;
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
  textSize,
  activeLineIndex,
  currentTime,
  onPlayLine,
  onPlayFromTime,
}: ReadingCanvasProps) {
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

  return (
    <article className="mx-auto w-full max-w-2xl px-3 pb-36 pt-4 sm:px-6 sm:pt-6">
      {/* Dialogue Chat Messages Flow */}
      <div className="flex flex-col space-y-3.5 sm:space-y-4">
        {reading.paragraphs.map((paragraph, index) => {
          const text = characterPreference === 'simplified'
            ? paragraph.simplified
            : paragraph.traditional;
          const isActive = index === activeLineIndex;
          const lineAlignment = alignment?.lines[index];
          const chunks = getPhraseChunks(text, paragraph.pinyin, lineAlignment);
          const speakerDotColor = getSpeakerDotColor(paragraph.speaker, speakerColorMap);
          const isRightAligned = Boolean(rightSpeaker && paragraph.speaker === rightSpeaker);
          const speakerChar = getCharacterForSpeaker(paragraph.speaker);
          const avatarInitial = paragraph.speaker ? paragraph.speaker[0] : '？';

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
              {/* Left-side Avatar (Only for other speakers, NO avatar for main speaker on right) */}
              {!isRightAligned && (
                speakerChar ? (
                  <div
                    className="mt-3.5 sm:mt-4 h-8 w-8 sm:h-9 sm:w-9 shrink-0 select-none overflow-hidden rounded-full"
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
                      'mt-3.5 sm:mt-4 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 select-none items-center justify-center rounded-full font-chinese font-black text-xs text-white',
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
                    ? 'items-end ml-10 sm:ml-16 max-w-[78%] sm:max-w-[72%]'
                    : 'items-start mr-8 sm:mr-14 max-w-[78%] sm:max-w-[72%]',
                )}
              >
                {/* Speaker Header */}
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

                {/* Content-hugging Speech Bubble Card */}
                <div
                  onClick={() => {
                    if (typeof lineAlignment?.start === 'number') {
                      onPlayFromTime(lineAlignment.start);
                    } else {
                      onPlayLine(index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (typeof lineAlignment?.start === 'number') {
                        onPlayFromTime(lineAlignment.start);
                      } else {
                        onPlayLine(index);
                      }
                    }
                  }}
                  className={cn(
                    'group relative w-fit max-w-full bg-ui-surface p-3 sm:p-4.5 transition-all duration-150 cursor-pointer outline-none select-text focus-ring text-left',
                    isRightAligned
                      ? 'rounded-2xl rounded-tr-xs'
                      : 'rounded-2xl rounded-tl-xs',
                    isActive
                      ? 'border-0 border-b-[length:var(--depth-md)] border-b-brand-primary-edge ring-2 ring-brand-primary'
                      : 'border-0 border-b-[length:var(--depth-md)] border-b-ui-border active:translate-y-[length:var(--depth-sm)] active:border-b-[length:var(--depth-sm)]',
                  )}
                >
                  {/* Chinese text + Native Aligned Ruby Pinyin grouped as
                      whole interactive phrases (tap a phrase to play from
                      it; the whole phrase lights up while spoken) */}
                  <div
                    className={cn(
                      'font-chinese font-bold text-ui-ink-strong transition-all',
                      showPinyin
                        ? textSize === 'large'
                          ? 'text-[19px] sm:text-[21px] leading-[2.3] sm:leading-[2.5]'
                          : 'text-[17px] sm:text-[19px] leading-[2.1] sm:leading-[2.3]'
                        : textSize === 'large'
                          ? 'text-[19px] sm:text-[21px] leading-[1.8] sm:leading-[1.9] tracking-normal'
                          : 'text-[17px] sm:text-[19px] leading-[1.7] sm:leading-[1.8] tracking-normal',
                    )}
                  >
                    {chunks.map((chunk, chunkIdx) => {
                      if (chunk.isPunctuation) {
                        return (
                          <span key={chunkIdx} className="text-ui-ink-strong">
                            {chunk.rubyItems.map((item, itemIdx) => (
                              <span key={itemIdx} className="inline-block">
                                {item.char}
                              </span>
                            ))}
                          </span>
                        );
                      }

                      const isChunkActive =
                        isActive &&
                        typeof chunk.start === 'number' &&
                        typeof chunk.end === 'number' &&
                        currentTime >= chunk.start &&
                        currentTime < chunk.end;

                      return (
                        <span
                          key={chunkIdx}
                          role="button"
                          tabIndex={0}
                          title={typeof chunk.start === 'number' ? `Play from ${chunk.start.toFixed(1)}s` : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof chunk.start === 'number') {
                              onPlayFromTime(chunk.start);
                            } else {
                              onPlayLine(index);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (typeof chunk.start === 'number') {
                                onPlayFromTime(chunk.start);
                              } else {
                                onPlayLine(index);
                              }
                            }
                          }}
                          className={cn(
                            'cursor-pointer transition-colors duration-150 outline-none',
                            isChunkActive
                              ? 'text-brand-primary font-black'
                              : 'hover:text-brand-primary',
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
                                  className="font-chinese [ruby-position:over] mx-[2px] sm:mx-[3px]"
                                >
                                  {item.char}
                                  <rt
                                    className={cn(
                                      'font-sans font-semibold text-brand-primary select-none leading-none pb-0.5 [ruby-position:over]',
                                      isLongSyllable
                                        ? 'text-[9.5px] sm:text-[10px] tracking-tight'
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
                  </div>

                  {/* English Meaning Line */}
                  {showMeaning && paragraph.english && (
                    <div className="mt-2 border-t border-ui-divider/40 pt-1.5">
                      <p
                        className={cn(
                          'font-medium text-ui-muted transition-all select-text',
                          textSize === 'large'
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
    </article>
  );
}
