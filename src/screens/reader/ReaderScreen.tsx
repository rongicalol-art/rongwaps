import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { debugLogger } from '../../utils/debugLogger';
import type { ReadingRecord } from '../../types/models';

import type { ReaderGrammarPoint, ReaderStudyTargetWord } from './utils/readerStudyTargets';
import { useDialogueAlignment } from './hooks/useDialogueAlignment';
import { useReaderAudio } from './hooks/useReaderAudio';
import { useReaderPreferences } from './hooks/useReaderPreferences';
import { ReaderHeader } from './components/ReaderHeader';
import { ReaderStudySurfaces } from './components/ReaderStudySurfaces';
import { useReaderKeyboardNavigation } from './hooks/useReaderKeyboardNavigation';
import { useReaderSwipeNavigation } from './hooks/useReaderSwipeNavigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWorkspaceIsolation } from '../../hooks/useWorkspaceIsolation';
import { isNarrativeReading } from './utils/narrativeParagraphs';
import { ReadingBottomDock } from './components/ReadingBottomDock';

// Window shell (this module) stays eager so the Reader opens instantly with
// its canvas tone + header; the heavy reading canvases stream in under a
// spinner. Never static-import them here or they join the main bundle.
const ReadingCanvas = lazy(() =>
  import('./components/ReadingCanvas').then((m) => ({ default: m.ReadingCanvas })),
);
const ReadingNarrativeView = lazy(() =>
  import('./components/ReadingNarrativeView').then((m) => ({ default: m.ReadingNarrativeView })),
);


/** Stable empty list so the reading views' locate memos do not churn. */
const EMPTY_GRAMMAR_MATCHES: ReaderGrammarPoint['matches'] = [];

interface ReaderScreenProps {
  readings: ReadingRecord[];
  index: number;
  /** Lesson-path next step: the reading continues into the next part's grammar. */
  onNext: () => void;
  /** Lesson-path previous step: back into this reading's part grammar. */
  onPrevious: () => void;
  onClose: () => void;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
}

/** Mounts only once the lazy reading-content chunk has resolved; the shell
 *  uses it to keep the bottom dock hidden while the reading streams in. */
function ReaderContentMount({
  onMounted,
  children,
}: {
  onMounted: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    onMounted();
  }, [onMounted]);
  return <>{children}</>;
}

export function ReaderScreen({
  readings,
  index,
  onNext,
  onPrevious,
  onClose,
  onOpenGrammarPart,
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

  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Hover-only dock: hidden until the pointer reaches the bottom edge.
  const [isDockVisible, setIsDockVisible] = useState(false);

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
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const characterFont = useAppStore((state) => state.characterFont);
  const updatePracticePreferences = useAppStore((state) => state.updatePreferences);
  const reading = readings[index] ?? readings[0];
  const [isStudyDrawerOpen, setIsStudyDrawerOpen] = useState(false);
  const [isStudySidePanelOpen, setIsStudySidePanelOpen] = useState(true);

  const handleToggleStudyGuide = useCallback(() => {
    if (isDesktop) {
      setIsStudySidePanelOpen((prev) => !prev);
    } else {
      setIsStudyDrawerOpen((prev) => !prev);
    }
  }, [isDesktop]);

  // Vocabulary word the Study Guide is locating in the text; owned here because
  // the panel and the reading canvases are siblings.
  const [locatedWord, setLocatedWord] = useState<ReaderStudyTargetWord | null>(null);
  // Grammar point whose sentence is being located; locating one clears the other.
  const [locatedGrammarPoint, setLocatedGrammarPoint] = useState<ReaderGrammarPoint | null>(null);

  const handleLocateWord = useCallback((word: ReaderStudyTargetWord | null) => {
    setLocatedWord(word);
    if (word) setLocatedGrammarPoint(null);
  }, []);

  const handleLocateGrammarPoint = useCallback((point: ReaderGrammarPoint | null) => {
    setLocatedGrammarPoint(point);
    if (point) setLocatedWord(null);
  }, []);

  const [contentReady, setContentReady] = useState(false);
  const markContentReady = useCallback(() => setContentReady(true), []);
  const alignment = useDialogueAlignment(reading?.bookId, reading?.id);

  // Audio Hook
  const {
    playing,
    currentTime,
    totalDuration,
    playbackSpeed,
    canKaraoke,
    isLooping,
    activeLineIndex,
    togglePlay,
    playLine,
    playFromTime,
    seekTo,
    scrubTo,
    prevSentence,
    nextSentence,
    cycleSpeed,
    toggleLoop,
  } = useReaderAudio({
    reading,
    alignment,
    characterPreference,
    audioMode,
  });

  useReaderKeyboardNavigation({
    isStudyDrawerOpen,
    setStudyDrawerOpen: setIsStudyDrawerOpen,
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

  const handlePlayRange = useCallback((startSec: number) => {
    playFromTime(startSec);
  }, [playFromTime]);

  const handlePlayFromTime = useCallback((startSec: number, endSec?: number) => {
    playFromTime(startSec, endSec);
  }, [playFromTime]);

  // Scroll to top when reading changes; located highlights belong to one reading.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setLocatedWord(null);
    setLocatedGrammarPoint(null);
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
    locatedWord,
    locatedGrammarRanges: locatedGrammarPoint?.matches ?? EMPTY_GRAMMAR_MATCHES,
    onPlayLine: handlePlayLine,
    onPlayRange: handlePlayRange,
    onPlayFromTime: handlePlayFromTime,
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Reading Mode"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex flex-col bg-ui-practice-canvas transition-[padding-left] duration-300 ease-out outline-none select-none"
      style={{ paddingLeft: 'var(--workspace-nav-width, 0px)' }}
      onMouseMove={(e) => {
        setIsDockVisible(e.clientY >= window.innerHeight - 90);
      }}
      onMouseLeave={() => setIsDockVisible(false)}
    >
      {/* Main Split Area: Reading Canvas + In-Window Study Guide */}
      <div className="flex flex-1 min-h-0 min-w-0 h-full">
        {/* Dialogue Stream Column */}
        <div className="relative flex-1 min-w-0 flex flex-col min-h-0">
          {/* Reading header stays inside the reading column — it never spans
              the study panel, and while that panel is open its border line
              stops short of it (matching the panel's outer margin) so the
              cut-off gets breathing room; without the panel, and on
              phone/tablet, the line runs full width. It is overlaid on the
              scroller: the frosted blur hides content passing beneath it, so
              the reading canvases pad their top clear of the bar. */}
          <div
            className={cn(
              'absolute top-0 left-0 z-30 pointer-events-auto',
              isDesktop && isStudySidePanelOpen ? 'right-4 xl:right-6' : 'right-0',
            )}
          >
            <ReaderHeader
              reading={reading}
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
              onOpenStudyGuide={handleToggleStudyGuide}
              isStudyGuideOpen={isDesktop ? isStudySidePanelOpen : isStudyDrawerOpen}
              onClose={onClose}
            />
          </div>

          <main
            ref={mainRef}
            onClick={() => {
              // A tap on the reading dismisses located highlights.
              setLocatedWord(null);
              setLocatedGrammarPoint(null);
            }}
            className="relative z-10 flex-1 min-w-0 overflow-y-auto overscroll-none"
          >
            <Suspense fallback={null}>
              <ReaderContentMount onMounted={markContentReady}>
                {isNarrativeReading(reading) ? (
                  <ReadingNarrativeView key={reading.id} {...readingViewProps} />
                ) : (
                  <ReadingCanvas key={reading.id} {...readingViewProps} />
                )}
              </ReaderContentMount>
            </Suspense>
          </main>

          {/* Floating Bottom Playback Dock (centered in dialogue column) */}
          {contentReady && (
            <ReadingBottomDock
              isVisible={isDockVisible}
              playing={playing}
              currentTime={currentTime}
              totalDuration={totalDuration}
              playbackSpeed={playbackSpeed}
              canKaraoke={canKaraoke}
              isLooping={isLooping}
              showPinyin={showPinyin}
              showMeaning={showMeaning}
              onTogglePlay={togglePlay}
              onSeek={seekTo}
              onScrub={scrubTo}
              onCycleSpeed={cycleSpeed}
              onToggleLoop={toggleLoop}
              onTogglePinyin={toggleShowPinyin}
              onToggleMeaning={toggleShowMeaning}
            />
          )}
        </div>

      </div>

      <ReaderStudySurfaces
        reading={reading}
        characterPreference={characterPreference}
        onOpenWord={setDictionaryWord}
        onOpenGrammarPart={onOpenGrammarPart}
        onLocateWord={handleLocateWord}
        onLocateGrammarPoint={handleLocateGrammarPoint}
        isStudySidePanelOpen={isStudySidePanelOpen}
        setIsStudySidePanelOpen={setIsStudySidePanelOpen}
        isStudyDrawerOpen={isStudyDrawerOpen}
        setIsStudyDrawerOpen={setIsStudyDrawerOpen}
        locatedWordId={locatedWord?.id ?? null}
        locatedGrammarPointId={locatedGrammarPoint?.id ?? null}
      />
    </div>
  );
}
