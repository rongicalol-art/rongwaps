import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { debugLogger } from '../../utils/debug/debugLogger';
import type { ReadingRecord } from '../../types/models';

import type { ReaderStudyTargetWord } from './utils/readerStudyTargets';
import { useDialogueAlignment } from './hooks/useDialogueAlignment';
import { useReaderStudyData } from './hooks/useReaderStudyData';
import { useReaderAudio } from './hooks/useReaderAudio';
import { useReaderPreferences } from './hooks/useReaderPreferences';
import { ReaderHeader } from './components/ReaderHeader';
import { ReaderSummary } from './components/ReaderSummary';
import { useReaderKeyboardNavigation } from './hooks/useReaderKeyboardNavigation';
import { useReaderSwipeNavigation } from './hooks/useReaderSwipeNavigation';
import { useWorkspaceIsolation } from '../../hooks/useWorkspaceIsolation';
import { isNarrativeReading } from './utils/narrativeParagraphs';
import { WorkspaceWindow } from '../../lib/widgets';

// Window shell (this module) stays eager so the Reader opens instantly with
// its canvas tone + header; the heavy reading canvases stream in under a
// spinner. Never static-import them here or they join the main bundle.
const ReadingCanvas = lazy(() =>
  import('./components/ReadingCanvas').then((m) => ({ default: m.ReadingCanvas })),
);
const ReadingNarrativeView = lazy(() =>
  import('./components/ReadingNarrativeView').then((m) => ({ default: m.ReadingNarrativeView })),
);


const EMPTY_WORDS: ReaderStudyTargetWord[] = [];

interface ReaderScreenProps {
  readings: ReadingRecord[];
  index: number;
  /** Lesson-path next step: the reading continues into the next part's grammar. */
  onNext: () => void;
  /** Lesson-path previous step: back into this reading's part grammar. */
  onPrevious: () => void;
  onClose: () => void;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
  /** False when this screen replaces its own loader on the same canvas. */
  animateIn?: boolean;
}

export function ReaderScreen({
  readings,
  index,
  onNext,
  onPrevious,
  onClose,
  onOpenGrammarPart,
  animateIn = true,
}: ReaderScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Preserve and restore user's focus upon exiting reading mode
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    return () => {
      try {
        if (previousActiveElementRef.current && document.contains(previousActiveElementRef.current)) {
          previousActiveElementRef.current.focus();
        }
      } catch (error) {
        // Graceful degradation: detached or unfocusable element during teardown
        debugLogger.warn('App', 'Reader focus restoration failed', error);
      }
    };
  }, []);

  const {
    showPinyin,
    showMeaning,
    showHoverDefinitions,
    textSize,
    toggleShowPinyin,
    toggleShowMeaning,
    toggleShowHoverDefinitions,
    setTextSize,
  } = useReaderPreferences();

  const audioMode = 'book';
  const characterPreference = useAppStore((state) => state.characterPreference);
  const characterFont = useAppStore((state) => state.characterFont);
  const updatePracticePreferences = useAppStore((state) => state.updatePreferences);
  const reading = readings[index] ?? readings[0];
  // This part's in-text words are underlined and its grammar clauses washed, always.
  const { targetWords, grammarPoints, usingLessonFallback } = useReaderStudyData({ reading });
  const newWords = useMemo(
    () => (usingLessonFallback ? EMPTY_WORDS : targetWords.filter((word) => word.inText)),
    [targetWords, usingLessonFallback],
  );
  const partGrammarPoints = useMemo(
    () => grammarPoints.filter((point) => point.group === 'part'),
    [grammarPoints],
  );

  const alignment = useDialogueAlignment(reading?.bookId, reading?.id);

  // Audio Hook
  const {
    playing,
    currentTime,
    totalDuration,
    playbackSpeed,
    activeLineIndex,
    hasFinished,
    togglePlay: toggleAudio,
    playLine: playAudioLine,
    playFromTime,
    prevSentence,
    nextSentence,
    setSpeed,
    seekTo,
    scrubTo,
  } = useReaderAudio({
    reading,
    alignment,
    characterPreference,
    audioMode,
  });

  // The text follows the spoken line until the learner scrolls by hand (to go
  // back to a word); pressing play or tapping a line hands control back.
  const followAudioRef = useRef(true);
  const togglePlay = useCallback(() => {
    followAudioRef.current = true;
    toggleAudio();
  }, [toggleAudio]);
  const toggleSlowAudio = useCallback(() => setSpeed(playbackSpeed < 1 ? 1 : 0.75), [setSpeed, playbackSpeed]);
  const playLine = useCallback((lineIndex: number) => {
    followAudioRef.current = true;
    playAudioLine(lineIndex);
  }, [playAudioLine]);
  const stopFollowing = useCallback(() => {
    followAudioRef.current = false;
  }, []);

  // Tapping a new word scrolls to where it is spoken and pulses it; a word the text doesn't contain opens its entry.
  const locateWord = useCallback((word: ReaderStudyTargetWord) => {
    const chunk = [...(mainRef.current?.querySelectorAll<HTMLElement>('[data-reader-chunk]') ?? [])].find((el) =>
      word.variants.includes(el.dataset.chunkText ?? ''),
    );
    if (!chunk) {
      useAppStore.getState().setDictionaryWord(word.traditional);
      return;
    }
    stopFollowing();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chunk.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    if (!reduceMotion) {
      chunk.animate(
        [{ backgroundColor: 'var(--color-brand-primary-soft-edge)' }, { backgroundColor: 'transparent' }],
        { duration: 1600, delay: 350, easing: 'ease-out' },
      );
    }
  }, [stopFollowing]);

  useReaderKeyboardNavigation({
    onClose,
    onNext,
    onPrevious,
    togglePlay,
    prevSentence,
    nextSentence,
  });

  const { handleTouchStart, handleTouchEnd } = useReaderSwipeNavigation({ onNext, onPrevious });

  // Stable play callbacks: the reading canvases memoize each word, so passing
  // fresh arrow identities here would re-render every word on every karaoke
  // tick. The audio hook's play actions do not depend on `currentTime`, so
  // these stay referentially stable while playback is running.
  const handlePlayLine = useCallback((lineIndex: number) => {
    playLine(lineIndex);
  }, [playLine]);

  // Tapping a word or sentence plays on through the rest of the reading, like tapping a line.
  const handlePlayFromTime = useCallback((startSec: number) => {
    playFromTime(startSec);
  }, [playFromTime]);

  // The grammar examples speak just their own line.
  const handlePlayLineOnly = useCallback((lineIndex: number) => {
    followAudioRef.current = false;
    playAudioLine(lineIndex, true);
  }, [playAudioLine]);

  // Scroll to top when the reading changes.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [reading?.id]);

  // Isolate background from accessibility tree and user focus while reader is open
  useWorkspaceIsolation(dialogRef);

  if (!reading) return null;

  // Both reading views are mutually exclusive renderings of the same reading,
  // so they take the same inputs; keep the list in one place so a new input
  // cannot land on only one of them.
  const readingViewProps = {
    reading,
    alignment,
    characterPreference,
    showPinyin,
    showMeaning,
    showHoverDefinitions,
    textSize,
    activeLineIndex,
    currentTime,
    newWords,
    followAudioRef,
    footer: (
      <ReaderSummary
        reading={reading}
        characterPreference={characterPreference}
        hasFinished={hasFinished}
        words={newWords}
        grammarPoints={partGrammarPoints}
        onPlayLine={handlePlayLineOnly}
        onOpenGrammar={onOpenGrammarPart}
        onLocateWord={locateWord}
      />
    ),
    onPlayLine: handlePlayLine,
    onPlayRange: handlePlayFromTime,
    onPlayFromTime: handlePlayFromTime,
  };

  return (
    <WorkspaceWindow
      ref={dialogRef}
      tone="practice"
      animateIn={animateIn}
      role="dialog"
      aria-modal="true"
      aria-label="Reading Mode"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="select-none"
    >
      <div className="flex flex-1 min-h-0 min-w-0 h-full">
        {/* Dialogue Stream Column */}
        <div className="relative flex-1 min-w-0 flex flex-col min-h-0">
          {/* The header is overlaid on the scroller: the frosted blur hides content
              passing beneath it, so the reading canvases pad their top clear of the bar. */}
          <div className="absolute top-0 left-0 right-0 z-30 pointer-events-auto">
            <ReaderHeader
              textSize={textSize}
              onTextSizeChange={setTextSize}
              characterFont={characterFont}
              onCharacterFontChange={(font) => updatePracticePreferences({ characterFont: font })}
              showPinyin={showPinyin}
              onTogglePinyin={toggleShowPinyin}
              showMeaning={showMeaning}
              onToggleMeaning={toggleShowMeaning}
              showHoverDefinitions={showHoverDefinitions}
              onToggleHoverDefinitions={toggleShowHoverDefinitions}
              playing={playing}
              onTogglePlay={togglePlay}
              isSlowAudio={playbackSpeed < 1}
              onToggleSlowAudio={toggleSlowAudio}
              progress={totalDuration > 0 ? currentTime / totalDuration : 0}
              onScrub={(fraction) => scrubTo(fraction * totalDuration)}
              onSeek={(fraction) => {
                followAudioRef.current = true;
                seekTo(fraction * totalDuration);
              }}
              onClose={onClose}
            />
          </div>

          <main
            ref={mainRef}
            onWheel={stopFollowing}
            onTouchMove={stopFollowing}
            className="relative z-10 flex-1 min-w-0 overflow-y-auto overscroll-none"
          >
            <Suspense fallback={null}>
              {isNarrativeReading(reading) ? (
                <ReadingNarrativeView key={reading.id} {...readingViewProps} />
              ) : (
                <ReadingCanvas key={reading.id} {...readingViewProps} />
              )}
            </Suspense>
          </main>

        </div>
      </div>
    </WorkspaceWindow>
  );
}
