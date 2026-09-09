import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface ReadingBottomDockProps {
  isVisible?: boolean;
  playing: boolean;
  currentTime: number;
  totalDuration: number;
  playbackSpeed: number;
  canKaraoke: boolean;
  showPinyin: boolean;
  showMeaning: boolean;
  showHoverDefinitions?: boolean;
  onTogglePlay: () => void;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onSeek: (time: number) => void;
  onScrub?: (time: number) => void;
  onCycleSpeed: () => void;
  onTogglePinyin: () => void;
  onToggleMeaning: () => void;
  onToggleHoverDefinitions?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Animated waveform bars — bounce while playing */
function WaveformBars({ playing, active, onClick }: { playing: boolean; active?: boolean; onClick?: () => void }) {
  const bars = useMemo(() => [
    { height: 7, delay: 0 },
    { height: 13, delay: 0.1 },
    { height: 10, delay: 0.2 },
    { height: 16, delay: 0.05 },
    { height: 8, delay: 0.15 },
  ], []);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle controls"
      aria-pressed={active}
      className={cn(
        'shrink-0 flex items-center gap-[2.5px] h-5 px-1 rounded-compact transition-opacity focus-ring-inline',
        active ? 'opacity-100' : 'opacity-60 hover:opacity-90',
      )}
    >
      {bars.map((bar, i) => (
        <motion.span
          key={i}
          className={cn('block w-[2.5px] rounded-full', active ? 'bg-brand-primary' : 'bg-brand-primary/70')}
          animate={playing
            ? { scaleY: [1, 1.8, 0.55, 1.5, 1], opacity: [0.6, 1, 0.6, 1, 0.6] }
            : { scaleY: 0.3, opacity: 0.3 }
          }
          transition={playing
            ? { duration: 0.85, repeat: Infinity, delay: bar.delay, ease: 'easeInOut' }
            : { duration: 0.3 }
          }
          style={{ height: bar.height, originY: 0.5 }}
        />
      ))}
    </button>
  );
}

export function ReadingBottomDock({
  isVisible = true,
  playing,
  currentTime,
  totalDuration,
  playbackSpeed,
  canKaraoke,
  showPinyin,
  showMeaning,
  showHoverDefinitions = true,
  onTogglePlay,
  onPrevSentence,
  onNextSentence,
  onSeek,
  onScrub,
  onCycleSpeed,
  onTogglePinyin,
  onToggleMeaning,
  onToggleHoverDefinitions,
  onMouseEnter,
  onMouseLeave,
}: ReadingBottomDockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  const toggleControls = () => setIsControlsOpen((o) => !o);

  useEffect(() => {
    if (!isControlsOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!controlsRef.current?.contains(e.target as Node)) setIsControlsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsControlsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isControlsOpen]);

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const displayTime = isDragging ? dragTime : currentTime;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!trackRef.current || totalDuration <= 0) return;
    setIsDragging(true);
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextTime = ratio * totalDuration;
    setDragTime(nextTime);
    onScrub?.(nextTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current || totalDuration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextTime = ratio * totalDuration;
    setDragTime(nextTime);
    onScrub?.(nextTime);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onSeek(dragTime);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); onSeek(Math.max(0, currentTime - 3)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(Math.min(totalDuration, currentTime + 3)); }
  };


  return (
    <motion.div
      animate={{ y: isVisible ? 0 : 180 }}
      transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 0.4 }}
      className="pointer-events-none absolute bottom-4 right-0 z-40 flex justify-center px-3 sm:bottom-6 sm:px-4"
      style={{ left: 'var(--workspace-nav-width, 0px)' }}
    >
      {/* Canvas fade behind dock */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 inset-x-0 -bottom-6 -z-10 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/85 to-transparent"
      />

      <nav
        aria-label="Audio Playback and Reading Controls"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          'relative flex w-full max-w-lg flex-col gap-2',
          isVisible ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >

        {/* ── Hero scrubber pill ── */}
        <div className="flex items-center gap-3 rounded-full bg-ui-surface px-3 py-2.5 border-b-[length:var(--depth-md)] border-b-ui-border">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause dialogue' : 'Play dialogue'}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white transition-all hover:brightness-105 active:scale-95 focus-ring"
          >
            <AppIcon name={playing ? 'pause' : 'play'} size={18} />
          </button>

          {/* Current time */}
          <span className="w-8 shrink-0 text-left text-xs font-bold tabular-nums text-ui-muted select-none">
            {formatTime(displayTime)}
          </span>

          {/* Scrubber track */}
          {canKaraoke && totalDuration > 0 ? (
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label="Playback progress"
              aria-valuemin={0}
              aria-valuemax={totalDuration}
              aria-valuenow={displayTime}
              aria-valuetext={`${formatTime(displayTime)} of ${formatTime(totalDuration)}`}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group relative flex h-5 flex-1 cursor-pointer touch-none select-none items-center outline-none focus-ring-inline"
            >
              <div className="relative h-1.5 w-full rounded-full bg-ui-border/70 transition-[height] duration-150 ease-out group-hover:h-2 group-active:h-2">
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className={cn(
                    'pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-brand-primary shadow-sm transition-all duration-100',
                    isDragging || isHovered
                      ? 'h-4 w-4 scale-110'
                      : 'h-3 w-3 group-hover:h-3.5 group-hover:w-3.5',
                  )}
                  style={{ left: `${progressPercent}%` }}
                >
                  {isDragging && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-control bg-ui-ink px-2 py-0.5 text-xs font-black text-ui-surface tabular-nums whitespace-nowrap">
                      {formatTime(dragTime)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 h-1.5 rounded-full bg-ui-border/35" />
          )}

          {/* Total duration */}
          <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-ui-muted select-none">
            {canKaraoke && totalDuration > 0 ? formatTime(totalDuration) : '--:--'}
          </span>

          {/* Waveform — tap to open controls popover */}
          <div ref={controlsRef} className="relative shrink-0">
            <WaveformBars playing={playing && canKaraoke} active={isControlsOpen} onClick={toggleControls} />

            <AnimatePresence>
              {isControlsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute right-0 bottom-full z-50 mb-3 w-56 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2 shadow-ambient-lg"
                >
                  <div className="flex flex-col gap-1">
                    {/* Speed row */}
                    <button
                      type="button"
                      onClick={onCycleSpeed}
                      className="flex min-h-11 w-full items-center justify-between rounded-compact px-4 py-2.5 text-sm font-extrabold text-ui-ink-strong hover:bg-ui-hover transition-colors outline-none focus-ring"
                    >
                      <span>Speed</span>
                      <span className="text-brand-primary tabular-nums">{playbackSpeed}×</span>
                    </button>

                    {/* Pinyin toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showPinyin}
                      onClick={onTogglePinyin}
                      className={cn(
                        'flex min-h-11 w-full items-center justify-between rounded-compact px-4 py-2.5 text-sm font-extrabold transition-colors outline-none focus-ring',
                        showPinyin ? 'bg-brand-primary/10 text-brand-primary' : 'text-ui-ink-strong hover:bg-ui-hover',
                      )}
                    >
                      <span>Pinyin</span>
                      <span
                        aria-hidden="true"
                        className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200', showPinyin ? 'bg-brand-primary' : 'bg-ui-divider')}
                      >
                        <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-b border-b-ui-border ring-0 transition duration-200 translate-y-0.5', showPinyin ? 'translate-x-[18px]' : 'translate-x-0.5')} />
                      </span>
                    </button>

                    {/* Translation toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showMeaning}
                      onClick={onToggleMeaning}
                      className={cn(
                        'flex min-h-11 w-full items-center justify-between rounded-compact px-4 py-2.5 text-sm font-extrabold transition-colors outline-none focus-ring',
                        showMeaning ? 'bg-brand-primary/10 text-brand-primary' : 'text-ui-ink-strong hover:bg-ui-hover',
                      )}
                    >
                      <span>Translation</span>
                      <span
                        aria-hidden="true"
                        className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200', showMeaning ? 'bg-brand-primary' : 'bg-ui-divider')}
                      >
                        <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-b border-b-ui-border ring-0 transition duration-200 translate-y-0.5', showMeaning ? 'translate-x-[18px]' : 'translate-x-0.5')} />
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </motion.div>
  );
}
