import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import type { ReadingRecord } from '../../types/models';
import { DIALOGUE_ALIGNMENTS } from '../../data/dialogueAlignment';
import { officialAudioFileName } from '../../utils/officialAudio';
import { useReaderAudio } from './hooks/useReaderAudio';
import { ReaderHeader } from './components/ReaderHeader';
import { ReadingCanvas } from './components/ReadingCanvas';
import { ReadingBottomDock } from './components/ReadingBottomDock';

interface ReaderScreenProps {
  readings: ReadingRecord[];
  index: number;
  onNavigate: (targetIndex: number) => void;
  onClose: () => void;
}

export function ReaderScreen({ readings, index, onNavigate, onClose }: ReaderScreenProps) {
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  const [isDockVisible, setIsDockVisible] = useState(true);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal');
  const [audioMode, setAudioMode] = useState<'book' | 'tts'>('book');
  const [navToast, setNavToast] = useState<{
    lessonId: number;
    partId: number;
    title: string;
  } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNavToast = useCallback((targetReading: ReadingRecord) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setNavToast({
      lessonId: targetReading.lessonId,
      partId: targetReading.dialogueNumber,
      title: targetReading.title,
    });
    toastTimeoutRef.current = setTimeout(() => {
      setNavToast(null);
    }, 1800);
  }, []);

  const prevIndexRef = useRef(index);
  useEffect(() => {
    if (prevIndexRef.current !== index) {
      prevIndexRef.current = index;
      const targetReading = readings[index];
      if (targetReading) {
        showNavToast(targetReading);
      }
    }
  }, [index, readings, showNavToast]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);

  const reading = readings[index] ?? readings[0];

  // Dialogue alignment for karaoke sync
  const alignment = DIALOGUE_ALIGNMENTS[reading?.id ?? ''] ?? null;
  const bookAudioFileName = useMemo(
    () => (reading ? officialAudioFileName(reading.bookId, reading.audioReference) : null),
    [reading],
  );

  // Audio Hook
  const {
    playing,
    currentTime,
    totalDuration,
    playbackSpeed,
    isLooping,
    canKaraoke,
    activeLineIndex,
    togglePlay,
    playLine,
    playFromTime,
    stop,
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
      // Don't auto-hide dock if user is currently hovering at the bottom
      if (isHoveringBottomRef.current) return;

      const currentScrollY = main.scrollTop;
      const delta = currentScrollY - lastScrollY.current;

      // Scroll threshold to avoid jitter
      if (Math.abs(delta) > 8) {
        if (delta > 0 && currentScrollY > 40) {
          // Scrolling down -> hide dock
          wasHoverRevealedRef.current = false;
          setIsDockVisible(false);
        } else if (delta < 0) {
          // Scrolling up -> reveal dock smoothly
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === ' ') {
        event.preventDefault();
        setIsDockVisible(true);
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.altKey || event.metaKey) {
          setIsDockVisible(true);
          prevSentence();
        } else {
          // Debug keymap: jump to previous dialogue across lessons
          const nextIndex = index > 0 ? index - 1 : readings.length - 1;
          const targetReading = readings[nextIndex];
          if (targetReading) {
            showNavToast(targetReading);
            onNavigate(nextIndex);
          }
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.altKey || event.metaKey) {
          setIsDockVisible(true);
          nextSentence();
        } else {
          // Debug keymap: jump to next dialogue across lessons
          const nextIndex = index < readings.length - 1 ? index + 1 : 0;
          const targetReading = readings[nextIndex];
          if (targetReading) {
            showNavToast(targetReading);
            onNavigate(nextIndex);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, togglePlay, prevSentence, nextSentence, onNavigate, index, readings, showNavToast]);

  // Stop audio when unmounting
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  if (!reading) return null;

  return (
    <motion.div
      tabIndex={-1}
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 bottom-0 right-0 z-[500] flex flex-col overflow-hidden bg-ui-practice-canvas outline-none transition-[left] duration-300 ease-out"
      style={{ left: 'var(--workspace-nav-width, 0px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Reading: Lesson ${reading.lessonId} ${reading.title}`}
      onPointerMove={(e) => {
        // Approaching the bottom of the screen (within 75px) reveals the dock
        if (e.clientY >= window.innerHeight - 75) {
          handleBottomHoverEnter();
        } else if (wasHoverRevealedRef.current && e.clientY < window.innerHeight - 90) {
          handleBottomHoverLeave();
        }
      }}
    >
      {/* Main Single-Dialogue Reading Canvas */}
      <main
        ref={mainRef}
        onClick={() => setIsDockVisible(true)}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <ReaderHeader
          reading={reading}
          characterPreference={characterPreference}
          onCharacterPreferenceChange={setCharacterPreference}
          audioMode={audioMode}
          onAudioModeChange={setAudioMode}
          hasOfficialAudio={Boolean(bookAudioFileName)}
          textSize={textSize}
          onTextSizeChange={setTextSize}
          showPinyin={showPinyin}
          onTogglePinyin={() => setShowPinyin((v) => !v)}
          showMeaning={showMeaning}
          onToggleMeaning={() => setShowMeaning((v) => !v)}
          onClose={onClose}
        />
        <ReadingCanvas
          reading={reading}
          alignment={alignment}
          characterPreference={characterPreference}
          showPinyin={showPinyin}
          showMeaning={showMeaning}
          textSize={textSize}
          activeLineIndex={activeLineIndex}
          currentTime={currentTime}
          onPlayLine={(idx) => {
            setIsDockVisible(true);
            playLine(idx);
          }}
          onPlayFromTime={(startSec, endSec) => {
            setIsDockVisible(true);
            playFromTime(startSec, endSec);
          }}
        />
      </main>

      {/* Invisible bottom hover hotspot: hovering near the bottom reveals playback dock */}
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 h-20"
        onMouseEnter={handleBottomHoverEnter}
        onMouseLeave={handleBottomHoverLeave}
      />

      {/* Du Chinese-style Floating Bottom Playback Dock (moves together with its top gradient mask) */}
      <ReadingBottomDock
        isVisible={isDockVisible}
        playing={playing}
        currentTime={currentTime}
        totalDuration={totalDuration}
        playbackSpeed={playbackSpeed}
        isLooping={isLooping}
        canKaraoke={canKaraoke}
        showPinyin={showPinyin}
        showMeaning={showMeaning}
        onTogglePlay={togglePlay}
        onPrevSentence={prevSentence}
        onNextSentence={nextSentence}
        onSeek={seekTo}
        onScrub={scrubTo}
        onCycleSpeed={cycleSpeed}
        onToggleLoop={toggleLoop}
        onTogglePinyin={() => setShowPinyin((v) => !v)}
        onToggleMeaning={() => setShowMeaning((v) => !v)}
        onMouseEnter={handleBottomHoverEnter}
        onMouseLeave={handleBottomHoverLeave}
      />

      {/* Dialogue Navigation HUD / Popup */}
      <AnimatePresence>
        {navToast && (
          <motion.aside
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-4 inset-x-0 z-[600] flex justify-center px-4"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 rounded-full border border-ui-border bg-ui-surface/95 px-5 py-2.5 backdrop-blur-md">
              <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-brand-primary animate-pulse" />
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-ui-ink-strong">
                <span className="font-chinese text-brand-primary">第 {navToast.lessonId} 課</span>
                <span className="text-ui-muted-strong">·</span>
                <span>Part {navToast.partId}</span>
                <span className="text-ui-muted-strong">·</span>
                <span className="font-chinese text-ui-ink">{navToast.title}</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
