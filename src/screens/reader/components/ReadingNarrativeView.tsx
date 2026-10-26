import { useMemo, useRef, useEffect, type ReactNode, type RefObject } from 'react';
import type { DialogueAlignment, ReaderTextSize, ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { getWordChunks } from '../../../utils/pinyin/rubyPinyin';
import { splitChunksIntoSentences } from '../../../utils/lesson/dialogueSync';
import { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { useReaderNewWordChunks } from '../hooks/useReaderNewWordChunks';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { ReaderWordTooltip } from './ReaderWordTooltip';
import { ReaderChunk, NARRATIVE_CHUNK_APPEARANCE } from './ReaderChunk';
import { groupSentencesIntoParagraphs } from '../utils/narrativeParagraphs';
import { SAMPLE_LESSONS } from '../../../data/books';
import { ReaderSceneIntro } from './ReaderSceneIntro';
import { getReaderHeaderTitles } from './ReaderHeader';

interface ReadingNarrativeViewProps {
  reading: ReadingRecord;
  compactTop?: boolean;
  alignment: DialogueAlignment | null;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showMeaning: boolean;
  showHoverDefinitions?: boolean;
  textSize: ReaderTextSize;
  activeLineIndex: number | null;
  currentTime: number;
  /** This part's words that appear in the text; underlined as new. */
  newWords: readonly ReaderStudyTargetWord[];
  /** False once the learner scrolls by hand; the spoken sentence is then left where it is. */
  followAudioRef: RefObject<boolean>;
  /** Rendered after the reading: what this part teaches. */
  footer?: ReactNode;
  onPlayLine: (index: number) => void;
  onPlayRange?: (startSec: number, endSec: number) => void;
}

export function ReadingNarrativeView({
  reading,
  compactTop = false,
  alignment,
  characterPreference,
  showPinyin,
  showMeaning,
  showHoverDefinitions = true,
  textSize,
  activeLineIndex,
  currentTime,
  newWords,
  followAudioRef,
  footer,
  onPlayLine,
  onPlayRange,
}: ReadingNarrativeViewProps) {
  const sentenceRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

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

  // Keep the spoken sentence centred while the learner is following the audio.
  useEffect(() => {
    if (activeLineIndex === null || !followAudioRef.current) return;
    sentenceRefs.current.get(activeLineIndex)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLineIndex, followAudioRef]);

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

  const paragraphChunks = useMemo(
    () => sentencesData.map((sentence) => sentence.chunks),
    [sentencesData],
  );

  const newWordChunks = useReaderNewWordChunks({
    reading,
    script: characterPreference,
    newWords,
    paragraphChunks,
  });

  const lesson = useMemo(
    () => SAMPLE_LESSONS.find((l) => l.id === reading.lessonId),
    [reading.lessonId],
  );
  const { chineseTitle, englishTitle } = useMemo(
    () => getReaderHeaderTitles(reading, lesson?.title),
    [reading, lesson?.title],
  );

  return (
    <article
      className={cn(
        'mx-auto w-full px-4 pb-16 sm:px-8 transition-all',
        compactTop ? 'pt-6 sm:pt-8' : 'pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:pt-[6.5rem]',
        textSize === 'extra-large' ? 'max-w-4xl' : 'max-w-3xl xl:max-w-4xl',
      )}
    >
      <ReaderSceneIntro reading={reading} />

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
                    ? 'text-[28px] sm:text-[32px] leading-[2.6] sm:leading-[2.8]'
                    : textSize === 'large'
                      ? 'text-[24px] sm:text-[27px] leading-[2.4] sm:leading-[2.6]'
                      : 'text-[21px] sm:text-[24px] leading-[2.2] sm:leading-[2.4]'
                  : textSize === 'extra-large'
                    ? 'text-[28px] sm:text-[32px] leading-[2.1] sm:leading-[2.2]'
                    : textSize === 'large'
                      ? 'text-[24px] sm:text-[27px] leading-[2.0] sm:leading-[2.1]'
                      : 'text-[21px] sm:text-[24px] leading-[1.9] sm:leading-[2.0]',
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
                          if (e.key === 'Enter') {
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
                        className={cn(
                          'group/clause relative inline rounded cursor-pointer outline-none box-decoration-clone text-ui-ink-strong',
                        )}
                      >{clause.chunks.map((chunk, chunkIdx) => {
                          if (chunk.isPunctuation) {
                            return (
                              <span key={chunkIdx} className="transition-colors">
                                {chunk.text}
                              </span>
                            );
                          }

                          const chunkKey = `${clause.id}-${chunkIdx}`;
                          const isWordActive = typeof chunk.start === 'number' && typeof chunk.end === 'number'
                            ? currentTime >= chunk.start && currentTime < chunk.end
                            : false;

                          return (
                            <ReaderChunk
                              key={chunkIdx}
                              chunk={chunk}
                              keyPrefix={clause.id}
                              chunkIdx={chunkIdx}
                              lineIndex={sentence.index}
                              fallbackStart={clause.start}
                              fallbackEnd={clause.end}
                              isActive={holdingChunkKey === chunkKey || isWordActive}
                              isHovered={hoveredChunkKey === chunkKey}
                              isNewWord={newWordChunks.has(chunk)}
                              showPinyin={showPinyin}
                              textSize={textSize}
                              appearance={NARRATIVE_CHUNK_APPEARANCE}
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
                          })}</span>
                    );
                  })}</span>
              ))}
            </p>

            {/* Subtle Bilingual English Translation directly under the paragraph when showMeaning is on */}
            {showMeaning && group.english && (
              <p
                className={cn(
                  'ui-translation mt-3.5 select-text',
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
                        isSentenceActive && 'font-black',
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

      {footer}

      {/* Word definition card (hover / desktop) */}
      {hoveredWord && (
        <ReaderWordTooltip
          word={hoveredWord.text}
          pinyin={hoveredWord.pinyin}
          characterPreference={characterPreference}
          anchor={hoveredWord.anchor}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}
    </article>
  );
}
