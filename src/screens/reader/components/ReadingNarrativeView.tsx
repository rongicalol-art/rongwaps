import { useMemo, useRef, useEffect } from 'react';
import type { DialogueAlignment, ReaderTextSize, ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { getWordChunks } from '../../../utils/rubyPinyin';
import { splitChunksIntoSentences } from '../../../utils/dialogueSync';
import { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { useReaderDictionaryBatch } from '../hooks/useReaderDictionaryBatch';
import { ReaderWordTooltip } from './ReaderWordTooltip';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { groupSentencesIntoParagraphs } from '../utils/narrativeParagraphs';
import { SAMPLE_LESSONS } from '../../../data/books';
import { getReadingIllustration } from '../../../data/readingIllustrations';
import { getReaderHeaderTitles } from './ReaderHeader';

interface ReadingNarrativeViewProps {
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
  onPlayFromTime?: (startSec: number, endSec?: number) => void;
}

export function ReadingNarrativeView({
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
}: ReadingNarrativeViewProps) {
  const sentenceRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

  const { getPreview } = useReaderDictionaryBatch({
    reading,
    characterPreference,
  });

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

  // Auto-scroll active sentence into view as narration plays
  useEffect(() => {
    if (activeLineIndex === null) return;
    const el = sentenceRefs.current.get(activeLineIndex);
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeLineIndex]);

  // Pre-compute word chunks and bite-sized clauses for every sentence
  const sentencesData = useMemo(() => {
    return reading.paragraphs.map((paragraph, index) => {
      const text =
        characterPreference === 'simplified'
          ? paragraph.simplified
          : paragraph.traditional;
      const lineAlignment = alignment?.lines[index];
      const chunks = getWordChunks(text, paragraph.pinyin, lineAlignment);
      const clauses = splitChunksIntoSentences(
        chunks,
        index,
        lineAlignment?.start,
        lineAlignment?.end,
      );
      return {
        index,
        text,
        chunks,
        clauses,
        lineAlignment,
        english: paragraph.english,
        speaker: paragraph.speaker,
      };
    });
  }, [reading.paragraphs, characterPreference, alignment]);

  // Group sentences into natural flowing paragraphs
  const paragraphGroups = useMemo(() => {
    return groupSentencesIntoParagraphs(sentencesData);
  }, [sentencesData]);

  const lesson = useMemo(
    () => SAMPLE_LESSONS.find((l) => l.id === reading.lessonId),
    [reading.lessonId],
  );
  const { chineseTitle, englishTitle } = useMemo(
    () => getReaderHeaderTitles(reading, lesson?.title),
    [reading, lesson?.title],
  );

  const illustration = useMemo(
    () => getReadingIllustration(reading.id),
    [reading.id],
  );

  return (
    <article
      className={cn(
        'mx-auto w-full px-4 pb-44 pt-4 sm:px-8 sm:pt-8 transition-all',
        textSize === 'extra-large' ? 'max-w-3xl' : 'max-w-2xl',
      )}
    >
      {/* Reading Scene Illustration (above title) */}
      {illustration && (
        <figure className="mx-auto mb-8 w-full sm:mb-10">
          <div className="overflow-hidden rounded-2xl bg-ui-surface aspect-[2048/1143]">
            <img
              src={illustration.url}
              alt={illustration.alt}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block h-full w-full select-none object-cover"
            />
          </div>
        </figure>
      )}

      {/* Narrative Document Title */}
      <header className="mb-8 text-center sm:mb-12">
        <h1 className="font-chinese text-2xl sm:text-3xl lg:text-4xl font-black tracking-wide text-ui-ink-strong">
          {chineseTitle}
        </h1>
        {englishTitle && (
          <p className="mt-2 font-sans text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ui-muted-strong">
            {englishTitle}
          </p>
        )}
      </header>

      {/* Story Paragraphs Flow */}
      <div className="space-y-6 sm:space-y-8">
        {paragraphGroups.map((group) => (
          <div key={group.id} className="relative">
            {/* Chinese Paragraph with Ruby Pinyin */}
            <p
              className={cn(
                'font-chinese font-bold text-ui-ink-strong select-text text-left indent-[2em]',
                showPinyin
                  ? textSize === 'extra-large'
                    ? 'text-[22px] sm:text-[26px] leading-[2.5] sm:leading-[2.7]'
                    : textSize === 'large'
                      ? 'text-[19px] sm:text-[21px] leading-[2.3] sm:leading-[2.5]'
                      : 'text-[17px] sm:text-[19px] leading-[2.1] sm:leading-[2.3]'
                  : textSize === 'extra-large'
                    ? 'text-[22px] sm:text-[26px] leading-[2.0] sm:leading-[2.1]'
                    : textSize === 'large'
                      ? 'text-[19px] sm:text-[21px] leading-[1.9] sm:leading-[2.0]'
                      : 'text-[17px] sm:text-[19px] leading-[1.8] sm:leading-[1.9]',
              )}
            >
              {group.sentences.map((sentence) => (
                <span
                  key={sentence.index}
                  ref={(node) => {
                    if (node) {
                      sentenceRefs.current.set(sentence.index, node);
                    } else {
                      sentenceRefs.current.delete(sentence.index);
                    }
                  }}
                >
                  {sentence.clauses.map((clause) => {
                    return (
                      <span
                        key={clause.id}
                        role="button"
                        tabIndex={0}
                        title="Tap to play"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            typeof clause.start === 'number' &&
                            typeof clause.end === 'number' &&
                            onPlayRange
                          ) {
                            onPlayRange(clause.start, clause.end);
                          } else {
                            onPlayLine(sentence.index);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (
                              typeof clause.start === 'number' &&
                              typeof clause.end === 'number' &&
                              onPlayRange
                            ) {
                              onPlayRange(clause.start, clause.end);
                            } else {
                              onPlayLine(sentence.index);
                            }
                          }
                        }}
                        className="group/clause relative inline rounded cursor-pointer outline-none box-decoration-clone text-ui-ink-strong"
                      >{clause.chunks.map((chunk, chunkIdx) => {
                          if (chunk.isPunctuation) {
                            return (
                              <span key={chunkIdx} className="transition-colors">
                                {chunk.text}
                              </span>
                            );
                          }

                          const chunkKey = `${clause.id}-${chunkIdx}`;
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
                                  handlePointerEnter(e, chunk, clause.id, chunkIdx)
                                }
                                onPointerLeave={handlePointerLeave}
                                onPointerDown={(e) =>
                                  handlePointerDown(e, chunk, clause.id, chunkIdx)
                                }
                                onPointerMove={handlePointerMove}
                                onPointerUp={(e) =>
                                  handlePointerUp(e, chunk, sentence.index, {
                                    start: typeof chunk.start === 'number'
                                      ? chunk.start
                                      : clause.start,
                                    end: clause.end,
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
                                      : clause.start;
                                    if (
                                      typeof wordStart === 'number' &&
                                      typeof clause.end === 'number' &&
                                      onPlayRange
                                    ) {
                                      onPlayRange(wordStart, clause.end);
                                    } else {
                                      onPlayLine(sentence.index);
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
                          })}</span>
                    );
                  })}</span>
              ))}
            </p>

            {/* Subtle Bilingual English Translation directly under the paragraph when showMeaning is on */}
            {showMeaning && group.english && (
              <p
                className={cn(
                  'mt-3.5 font-sans font-medium text-ui-muted leading-relaxed select-text indent-6',
                  textSize === 'extra-large'
                    ? 'text-base sm:text-lg'
                    : textSize === 'large'
                      ? 'text-sm sm:text-base'
                      : 'text-xs sm:text-sm',
                )}
              >
                {group.sentences.map((s) => {
                  if (!s.english) return null;
                  const isSentenceActive = s.index === activeLineIndex;
                  return (
                    <span
                      key={s.index}
                      className={cn(
                        'transition-colors duration-200 rounded box-decoration-clone px-0.5',
                        isSentenceActive ? 'text-ui-ink font-semibold' : 'text-ui-muted',
                      )}
                    >
                      {s.english}{' '}
                    </span>
                  );
                })}
              </p>
            )}
          </div>
        ))}
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
