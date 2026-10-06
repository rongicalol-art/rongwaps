import { useCallback, useMemo, useRef, useEffect } from 'react';
import type { DialogueAlignment, ReaderTextSize, ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { audioService } from '../../../services/audioService';
import { findMatchingCourseVocab } from '../../../services/courseVocabLookup';
import { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { useReaderLocate } from '../hooks/useReaderLocate';
import { useReaderDictionaryBatch } from '../hooks/useReaderDictionaryBatch';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import type { ReaderLocatedRange } from '../utils/readerLocate';
import { buildReadingLines, pickRightSpeaker } from '../utils/readingCanvasLines';
import { ReaderWordTooltip } from './ReaderWordTooltip';
import { ReaderNarratorLine } from './ReaderNarratorLine';
import { ReaderDialogueLine } from './ReaderDialogueLine';

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

  const uniqueSpeakers = useMemo(() => {
    return Array.from(
      new Set(reading.paragraphs.map((p) => p.speaker).filter(Boolean)),
    ) as string[];
  }, [reading.paragraphs]);

  const rightSpeaker = useMemo(() => {
    return pickRightSpeaker(uniqueSpeakers);
  }, [uniqueSpeakers]);

  const wordInteractions = useReaderWordInteractions({
    onPlayLine,
    onPlayRange,
    showHoverDefinitions,
  });
  const { hoveredWord, handleTooltipMouseEnter, handleTooltipMouseLeave } = wordInteractions;

  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const registerLineRef = useCallback((index: number, node: HTMLDivElement | null) => {
    if (node) {
      lineRefs.current.set(index, node);
    } else {
      lineRefs.current.delete(index);
    }
  }, []);

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

  const linesData = useMemo(() => buildReadingLines({
    reading,
    alignment,
    characterPreference,
    rightSpeaker,
  }), [reading, alignment, characterPreference, rightSpeaker]);

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
        textSize === 'extra-large' ? 'max-w-4xl' : 'max-w-3xl xl:max-w-4xl',
      )}
    >
      {/* Dialogue Chat Messages Flow */}
      <div className="flex flex-col space-y-4 sm:space-y-5">
        {linesData.map((line) => {
          const isActive = line.index === activeLineIndex;

          if (line.isNarrator) {
            return (
              <ReaderNarratorLine
                key={line.index}
                line={line}
                isActive={isActive}
                textSize={textSize}
                showPinyin={showPinyin}
                showMeaning={showMeaning}
                locatedGrammarRanges={locatedGrammarRanges}
                onPlayLine={onPlayLine}
                onLineRef={registerLineRef}
              />
            );
          }

          return (
            <ReaderDialogueLine
              key={line.index}
              line={line}
              isActive={isActive}
              textSize={textSize}
              showPinyin={showPinyin}
              showMeaning={showMeaning}
              currentTime={currentTime}
              locatedChunks={locatedChunks}
              locatedGrammarRanges={locatedGrammarRanges}
              onPlayLine={onPlayLine}
              onPlayRange={onPlayRange}
              playFragment={playFragment}
              wordInteractions={wordInteractions}
              onLineRef={registerLineRef}
            />
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
