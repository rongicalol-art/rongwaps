import { useCallback, useMemo, useRef, useEffect, type ReactNode, type RefObject } from 'react';
import type { DialogueAlignment, ReaderTextSize, ReadingRecord } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { useReaderWordInteractions } from '../hooks/useReaderWordInteractions';
import { useReaderNewWordChunks } from '../hooks/useReaderNewWordChunks';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { buildReadingLines, pickRightSpeaker } from '../utils/readingCanvasLines';
import { ReaderWordTooltip } from './ReaderWordTooltip';
import { ReaderNarratorLine } from './ReaderNarratorLine';
import { ReaderDialogueLine } from './ReaderDialogueLine';
import { ReaderSceneIntro } from './ReaderSceneIntro';

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
  /** This part's words that appear in the text; underlined as new. */
  newWords: readonly ReaderStudyTargetWord[];
  /** False once the learner scrolls by hand; the spoken line is then left where it is. */
  followAudioRef: RefObject<boolean>;
  /** Rendered after the reading: what this part teaches. */
  footer?: ReactNode;
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
  newWords,
  followAudioRef,
  footer,
  onPlayLine,
  onPlayRange,
}: ReadingCanvasProps) {
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

  // Keep the spoken line centred while the learner is following the audio.
  useEffect(() => {
    if (activeLineIndex === null || !followAudioRef.current) return;
    lineRefs.current.get(activeLineIndex)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLineIndex, followAudioRef]);

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

  const newWordChunks = useReaderNewWordChunks({
    reading,
    script: characterPreference,
    newWords,
    paragraphChunks,
  });

  return (
    <article
      className={cn(
        'mx-auto w-full px-4 pb-16 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:px-6 sm:pt-[6.5rem] transition-all',
        textSize === 'extra-large' ? 'max-w-4xl' : 'max-w-3xl',
      )}
    >
      <ReaderSceneIntro reading={reading} showTitle />

      {/* Dialogue lines: lines not reached yet stay dim while the audio plays */}
      <div className="flex flex-col gap-6 sm:gap-7">
        {linesData.map((line) => {
          const isUpcoming = activeLineIndex !== null && line.index > activeLineIndex;

          if (line.isNarrator) {
            return (
              <ReaderNarratorLine
                key={line.index}
                line={line}
                textSize={textSize}
                showPinyin={showPinyin}
                showMeaning={showMeaning}
                isUpcoming={isUpcoming}
                onPlayLine={onPlayLine}
                onLineRef={registerLineRef}
              />
            );
          }

          return (
            <ReaderDialogueLine
              key={line.index}
              line={line}
              textSize={textSize}
              showPinyin={showPinyin}
              showMeaning={showMeaning}
              currentTime={currentTime}
              isUpcoming={isUpcoming}
              isActive={activeLineIndex === line.index}
              newWordChunks={newWordChunks}
              onPlayLine={onPlayLine}
              onPlayRange={onPlayRange}
              playFragment={playFragment}
              wordInteractions={wordInteractions}
              onLineRef={registerLineRef}
            />
          );
        })}
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
