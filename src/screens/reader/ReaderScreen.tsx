import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { DialogueAlignment, ReaderTextSize, ReadingRecord } from '../../types/models';
import { LoadingScreen } from '../../lib/widgets';

import { useReaderAudio } from './hooks/useReaderAudio';
import { ReaderHeader } from './components/ReaderHeader';
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

export function ReaderScreen({ readings, index, onNavigate, onClose }: ReaderScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  const [isDockVisible, setIsDockVisible] = useState(true);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showHoverDefinitions, setShowHoverDefinitions] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('rongwaps:reader_hover_definitions');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return true;
  });

  const handleToggleHoverDefinitions = useCallback(() => {
    setShowHoverDefinitions((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('rongwaps:reader_hover_definitions', String(next));
      } catch {
        // Ignore storage errors in restricted contexts
      }
      return next;
    });
  }, []);

  const [textSize, setTextSize] = useState<ReaderTextSize>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('rongwaps:reader_text_size');
      if (saved === 'normal' || saved === 'large' || saved === 'extra-large') {
        return saved;
      }
    }
    return 'normal';
  });

  const handleTextSizeChange = useCallback((newSize: ReaderTextSize) => {
    setTextSize(newSize);
    try {
      window.localStorage.setItem('rongwaps:reader_text_size', newSize);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  const audioMode = 'book';
  const characterPreference = useAppStore((state) => state.characterPreference);
  const reading = readings[index] ?? readings[0];

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
      {/* Main Single-Dialogue Reading Canvas */}
      <main
        ref={mainRef}
        onClick={() => setIsDockVisible(true)}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-none"
      >
        <ReaderHeader
          reading={reading}
          textSize={textSize}
          onTextSizeChange={handleTextSizeChange}
          showPinyin={showPinyin}
          onTogglePinyin={() => setShowPinyin((v) => !v)}
          showMeaning={showMeaning}
          onToggleMeaning={() => setShowMeaning((v) => !v)}
          showHoverDefinitions={showHoverDefinitions}
          onToggleHoverDefinitions={handleToggleHoverDefinitions}
          onClose={onClose}
        />
        <Suspense fallback={<LoadingScreen message="Loading reading…" inline />}>
          <ReaderContentMount onMounted={markContentReady}>
            {isNarrativeReading(reading) ? (
              <ReadingNarrativeView
                key={reading.id}
                reading={reading}
                alignment={alignment}
                characterPreference={characterPreference}
                showPinyin={showPinyin}
                showMeaning={showMeaning}
                showHoverDefinitions={showHoverDefinitions}
                textSize={textSize}
                activeLineIndex={activeLineIndex}
                currentTime={currentTime}
                onPlayLine={(idx) => {
                  setIsDockVisible(true);
                  playLine(idx);
                }}
                onPlayRange={(startSec) => {
                  setIsDockVisible(true);
                  playFromTime(startSec);
                }}
                onPlayFromTime={(startSec, endSec) => {
                  setIsDockVisible(true);
                  playFromTime(startSec, endSec);
                }}
              />
            ) : (
              <ReadingCanvas
                key={reading.id}
                reading={reading}
                alignment={alignment}
                characterPreference={characterPreference}
                showPinyin={showPinyin}
                showMeaning={showMeaning}
                showHoverDefinitions={showHoverDefinitions}
                textSize={textSize}
                activeLineIndex={activeLineIndex}
                currentTime={currentTime}
                onPlayLine={(idx) => {
                  setIsDockVisible(true);
                  playLine(idx);
                }}
                onPlayRange={(startSec) => {
                  setIsDockVisible(true);
                  playFromTime(startSec);
                }}
                onPlayFromTime={(startSec, endSec) => {
                  setIsDockVisible(true);
                  playFromTime(startSec, endSec);
                }}
              />
            )}
          </ReaderContentMount>
        </Suspense>
      </main>

      {/* Invisible bottom hover hotspot: hovering near the bottom reveals playback dock */}
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute bottom-0 right-0 z-30 h-24"
        style={{ left: 'var(--workspace-nav-width, 0px)' }}
        onMouseEnter={handleBottomHoverEnter}
        onMouseLeave={handleBottomHoverLeave}
      />

      {/* Du Chinese-style Floating Bottom Playback Dock (hidden until the
          reading content chunk has mounted, so it never floats over the
          loading state) */}
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
        showHoverDefinitions={showHoverDefinitions}
        onTogglePlay={togglePlay}
        onPrevSentence={prevSentence}
        onNextSentence={nextSentence}
        onSeek={seekTo}
        onScrub={scrubTo}
        onCycleSpeed={cycleSpeed}
        onTogglePinyin={() => setShowPinyin((v) => !v)}
        onToggleMeaning={() => setShowMeaning((v) => !v)}
        onToggleHoverDefinitions={handleToggleHoverDefinitions}
        onMouseEnter={handleBottomHoverEnter}
        onMouseLeave={handleBottomHoverLeave}
        />
      )}
    </div>
  );
}
