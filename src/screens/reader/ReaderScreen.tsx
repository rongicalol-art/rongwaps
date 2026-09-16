import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { DialogueAlignment, ReadingRecord } from '../../types/models';
import { LoadingScreen } from '../../lib/widgets';

import { useReaderAudio } from './hooks/useReaderAudio';
import { useReaderPreferences } from './hooks/useReaderPreferences';
import { ReaderHeader } from './components/ReaderHeader';
import { ReaderStudyDrawer } from './components/ReaderStudyDrawer';
import { ReaderStudyPanel } from './components/ReaderStudyPanel';
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

interface ReaderScreenProps {
  readings: ReadingRecord[];
  index: number;
  onNavigate: (targetIndex: number) => void;
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
  onNavigate,
  onClose,
  onOpenGrammarPart,
}: ReaderScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  const [isDockVisible, setIsDockVisible] = useState(true);

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
  const reading = readings[index] ?? readings[0];
  const [isStudyDrawerOpen, setIsStudyDrawerOpen] = useState(false);

  // The dialogue alignment pack (~1.1MB) loads async so the Reader window can
  // open before it lands. Until it arrives the audio hook falls back to
  // whole-track playback (no karaoke) — never block the window on this.
  const [alignmentMap, setAlignmentMap] = useState<Record<string, DialogueAlignment> | null>(null);
  const [contentReady, setContentReady] = useState(false);
  const markContentReady = useCallback(() => setContentReady(true), []);
  useEffect(() => {
    let cancelled = false;
    import('../../../content/dialogueAlignment.json')
      .then((module) => {
        if (!cancelled) {
          setAlignmentMap((module.default ?? {}) as Record<string, DialogueAlignment>);
        }
      })
      .catch(() => {
        // Missing/malformed pack: reader still works without karaoke sync.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Dialogue alignment for karaoke sync
  const alignment = alignmentMap?.[reading?.id ?? ''] ?? null;

  // Audio Hook
  const {
    playing,
    currentTime,
    totalDuration,
    playbackSpeed,
    canKaraoke,
    activeLineIndex,
    togglePlay,
    playLine,
    playFromTime,
    seekTo,
    scrubTo,
    prevSentence,
    nextSentence,
    cycleSpeed,
  } = useReaderAudio({
    reading,
    alignment,
    characterPreference,
    audioMode,
  });

  // Tapping a bubble or sentence always reveals the dock, whichever reading
  // view is mounted (narrative or dialogue) — keep that behaviour in one place.
  const handlePlayLine = useCallback((lineIndex: number) => {
    setIsDockVisible(true);
    playLine(lineIndex);
  }, [playLine]);

  const handlePlayRange = useCallback((startSec: number) => {
    setIsDockVisible(true);
    playFromTime(startSec);
  }, [playFromTime]);

  // Always show dock when audio starts playing
  useEffect(() => {
    if (playing) {
      setIsDockVisible(true);
    }
  }, [playing]);

  const isHoveringBottomRef = useRef(false);
  const wasHoverRevealedRef = useRef(false);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBottomHoverEnter = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    isHoveringBottomRef.current = true;
    setIsDockVisible((currentVisible) => {
      if (!currentVisible) {
        wasHoverRevealedRef.current = true;
      }
      return true;
    });
  }, []);

  const handleBottomHoverLeave = useCallback(() => {
    isHoveringBottomRef.current = false;
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
    }
    hoverLeaveTimerRef.current = setTimeout(() => {
      if (wasHoverRevealedRef.current) {
        wasHoverRevealedRef.current = false;
        setIsDockVisible(false);
      }
    }, 80);
  }, []);

  // Scroll listener for dynamic native-app hide/reveal of bottom dock
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      if (isHoveringBottomRef.current) return;

      const currentScrollY = main.scrollTop;
      const delta = currentScrollY - lastScrollY.current;

      if (Math.abs(delta) > 8) {
        if (delta > 0 && currentScrollY > 40) {
          wasHoverRevealedRef.current = false;
          setIsDockVisible(false);
        } else if (delta < 0) {
          wasHoverRevealedRef.current = false;
          setIsDockVisible(true);
        }
      }

      lastScrollY.current = currentScrollY;
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top when reading changes
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setIsDockVisible(true);
  }, [reading?.id]);

  // Isolate background from accessibility tree and user focus while reader is open
  useEffect(() => {
    const dialog = dialogRef.current;
    const root = document.getElementById('root');
    const siblings = root
      ? Array.from(root.children).filter((element) => element !== dialog) as HTMLElement[]
      : [];
    const targets = siblings.map((element) => (
      (element.querySelector('[data-workspace-content]') as HTMLElement | null) ?? element
    ));
    const previousStates = targets.map((target) => ({
      target,
      inert: target.hasAttribute('inert'),
      ariaHidden: target.getAttribute('aria-hidden'),
    }));

    targets.forEach((target) => {
      target.setAttribute('inert', '');
      target.setAttribute('aria-hidden', 'true');
    });

    return () => {
      targets.forEach((target, i) => {
        const state = previousStates[i];
        if (!state) return;
        if (state.inert) {
          target.setAttribute('inert', '');
        } else {
          target.removeAttribute('inert');
        }
        if (state.ariaHidden !== null) {
          target.setAttribute('aria-hidden', state.ariaHidden);
        } else {
          target.removeAttribute('aria-hidden');
        }
      });
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      } else if (event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        setIsDockVisible(true);
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        if (event.altKey || event.metaKey) {
          setIsDockVisible(true);
          prevSentence();
        } else {
          if (index > 0) onNavigate(index - 1);
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        if (event.altKey || event.metaKey) {
          setIsDockVisible(true);
          nextSentence();
        } else {
          if (index < readings.length - 1) onNavigate(index + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, readings.length, onNavigate, onClose, togglePlay, prevSentence, nextSentence]);

  // Touch Swipe Gestures for Previous / Next Dialogue
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0) {
        if (index > 0) onNavigate(index - 1);
      } else {
        if (index < readings.length - 1) onNavigate(index + 1);
      }
    }
  };

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
    onPlayLine: handlePlayLine,
    onPlayRange: handlePlayRange,
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
        const threshold = window.innerHeight - 90;
        if (e.clientY >= threshold) {
          handleBottomHoverEnter();
        } else {
          handleBottomHoverLeave();
        }
      }}
    >
      {/* Main Single-Dialogue Reading Header */}
      <div className="absolute top-0 inset-x-0 z-30 pointer-events-auto">
        <ReaderHeader
          reading={reading}
          textSize={textSize}
          onTextSizeChange={setTextSize}
          showPinyin={showPinyin}
          onTogglePinyin={toggleShowPinyin}
          showMeaning={showMeaning}
          onToggleMeaning={toggleShowMeaning}
          showHoverDefinitions={showHoverDefinitions}
          onToggleHoverDefinitions={toggleShowHoverDefinitions}
          onOpenStudyGuide={() => setIsStudyDrawerOpen((open) => !open)}
          isStudyGuideOpen={isStudyDrawerOpen}
          onClose={onClose}
        />
      </div>

      {/* Main Split Area: Reading Canvas + In-Window Study Guide */}
      <div className="flex flex-1 min-h-0 min-w-0 h-full">
        {/* Dialogue Stream Column */}
        <div className="relative flex-1 min-w-0 flex flex-col min-h-0">
          <main
            ref={mainRef}
            onClick={() => setIsDockVisible(true)}
            className="relative z-10 flex-1 min-w-0 overflow-y-auto overscroll-none"
          >
            <Suspense fallback={<LoadingScreen message="Loading reading…" inline />}>
              <ReaderContentMount onMounted={markContentReady}>
                {isNarrativeReading(reading) ? (
                  <ReadingNarrativeView key={reading.id} {...readingViewProps} />
                ) : (
                  <ReadingCanvas key={reading.id} {...readingViewProps} />
                )}
              </ReaderContentMount>
            </Suspense>
          </main>

          {/* Invisible bottom hover hotspot: hovering near the bottom reveals playback dock */}
          <div
            aria-hidden="true"
            className="pointer-events-auto absolute bottom-0 inset-x-0 z-30 h-24"
            onMouseEnter={handleBottomHoverEnter}
            onMouseLeave={handleBottomHoverLeave}
          />

          {/* Floating Bottom Playback Dock (centered in dialogue column) */}
          {contentReady && (
            <ReadingBottomDock
              isVisible={isDockVisible}
              playing={playing}
              currentTime={currentTime}
              totalDuration={totalDuration}
              playbackSpeed={playbackSpeed}
              canKaraoke={canKaraoke}
              showPinyin={showPinyin}
              showMeaning={showMeaning}
              onTogglePlay={togglePlay}
              onSeek={seekTo}
              onScrub={scrubTo}
              onCycleSpeed={cycleSpeed}
              onTogglePinyin={toggleShowPinyin}
              onToggleMeaning={toggleShowMeaning}
              onMouseEnter={handleBottomHoverEnter}
              onMouseLeave={handleBottomHoverLeave}
            />
          )}
        </div>

        <aside
          aria-label="Study Companion Panel"
          className="hidden lg:flex w-80 xl:w-[410px] shrink-0 flex-col min-h-0 pt-14 sm:pt-16 mr-4 xl:mr-6 z-20 overflow-y-auto overscroll-contain pr-1 custom-scrollbar"
        >
          {/* Section label — not sticky, aside content is short */}
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-ui-ink-strong">Study Guide</p>

          <div className="flex flex-col gap-3 pb-4">
            <ReaderStudyPanel
              reading={reading}
              characterPreference={characterPreference}
              onOpenWord={setDictionaryWord}
              onOpenGrammarPart={onOpenGrammarPart}
              showCloseButton={false}
            />
          </div>
        </aside>
      </div>

      {/* Slide-over Study Guide Drawer for Mobile (screens < lg) */}
      <div className="lg:hidden">
        <ReaderStudyDrawer
          isOpen={isStudyDrawerOpen}
          onClose={() => setIsStudyDrawerOpen(false)}
          reading={reading}
          characterPreference={characterPreference}
          onOpenWord={setDictionaryWord}
          onOpenGrammarPart={onOpenGrammarPart}
        />
      </div>
    </div>
  );
}
