import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { debugLogger } from '../../utils/debug/debugLogger';
import type { ReadingRecord } from '../../types/models';

import { useDialogueAlignment } from './hooks/useDialogueAlignment';
import { useReaderAudio } from './hooks/useReaderAudio';
import { useReaderPreferences } from './hooks/useReaderPreferences';
import { ReaderHeader } from './components/ReaderHeader';
import { useReaderKeyboardNavigation } from './hooks/useReaderKeyboardNavigation';
import { useReaderSwipeNavigation } from './hooks/useReaderSwipeNavigation';
import { useWorkspaceIsolation } from '../../hooks/useWorkspaceIsolation';
import { ReaderSection, type ReaderPlayTarget } from './components/ReaderSection';
import { WorkspaceWindow } from '../../lib/widgets';

interface ReaderScreenProps {
  readings: ReadingRecord[];
  index: number;
  sessionIndices?: number[];
  onSelectReading?: (index: number) => void;
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
  sessionIndices = [],
  onSelectReading,
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
  const stopFollowing = useCallback(() => {
    followAudioRef.current = false;
  }, []);

  useReaderKeyboardNavigation({
    onClose,
    onNext,
    onPrevious,
    togglePlay,
    prevSentence,
    nextSentence,
  });

  const { handleTouchStart, handleTouchEnd } = useReaderSwipeNavigation({ onNext, onPrevious });

  const pendingPlay = useRef<{ index: number; target: ReaderPlayTarget } | null>(null);
  const performPlay = useCallback((target: ReaderPlayTarget) => {
    followAudioRef.current = !('lineIndex' in target && target.onlyThisLine);
    if ('startSec' in target) playFromTime(target.startSec);
    else playAudioLine(target.lineIndex, target.onlyThisLine);
  }, [playAudioLine, playFromTime]);
  const playSection = useCallback((targetIndex: number, target: ReaderPlayTarget) => {
    if (targetIndex === index) performPlay(target);
    else if (onSelectReading) {
      pendingPlay.current = { index: targetIndex, target };
      onSelectReading(targetIndex);
    }
  }, [index, onSelectReading, performPlay]);
  // The audio hook resets the old recording before this effect cues the selected part.
  useEffect(() => {
    if (pendingPlay.current?.index !== index) return;
    const { target } = pendingPlay.current;
    pendingPlay.current = null;
    performPlay(target);
  }, [index, performPlay]);

  // Scroll to top when the reading changes.
  useEffect(() => {
    if (!sessionIndices.length) mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [reading?.id, sessionIndices.length]);

  // Isolate background from accessibility tree and user focus while reader is open
  useWorkspaceIsolation(dialogRef);

  if (!reading) return null;

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
              partNumber={sessionIndices.length > 1 ? reading.dialogueNumber : undefined}
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
            onScroll={(event) => {
              if (sessionIndices.length < 2 || !onSelectReading) return;
              const root = event.currentTarget;
              const readingLine = root.getBoundingClientRect().top + root.clientHeight / 3;
              const section = [...root.querySelectorAll<HTMLElement>('[data-reading-id]')]
                .findLast((element) => element.getBoundingClientRect().top <= readingLine);
              const nextIndex = readings.findIndex((item) => item.id === section?.dataset.readingId);
              if (nextIndex >= 0 && nextIndex !== index) onSelectReading(nextIndex);
            }}
            onWheel={stopFollowing}
            onTouchMove={stopFollowing}
            className="relative z-10 flex-1 min-w-0 overflow-y-auto overscroll-none"
          >
            <div className={sessionIndices.length > 1 ? 'pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:pt-[6.5rem]' : undefined}>
              {(sessionIndices.length ? sessionIndices : [index]).map((sectionIndex, position) => (
                <ReaderSection
                  key={readings[sectionIndex].id}
                  reading={readings[sectionIndex]}
                  index={sectionIndex}
                  grouped={sessionIndices.length > 1}
                  first={position === 0}
                  characterPreference={characterPreference}
                  showPinyin={showPinyin}
                  showMeaning={showMeaning}
                  showHoverDefinitions={showHoverDefinitions}
                  textSize={textSize}
                  activeLineIndex={sectionIndex === index ? activeLineIndex : null}
                  currentTime={sectionIndex === index ? currentTime : 0}
                  hasFinished={sectionIndex === index && hasFinished}
                  followAudioRef={followAudioRef}
                  onPlay={playSection}
                  onOpenGrammar={onOpenGrammarPart}
                />
              ))}
            </div>
          </main>

        </div>
      </div>
    </WorkspaceWindow>
  );
}
