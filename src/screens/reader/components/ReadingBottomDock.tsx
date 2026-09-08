import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
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
  const [isAidsPopoverOpen, setIsAidsPopoverOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const aidsPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAidsPopoverOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!aidsPopoverRef.current?.contains(event.target as Node)) {
        setIsAidsPopoverOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAidsPopoverOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAidsPopoverOpen]);


  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const displayTime = isDragging ? dragTime : currentTime;

  // Handle Scrubbing
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
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - 3));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(totalDuration, currentTime + 3));
    }
  };

  return (
    <motion.div
      animate={{ y: isVisible ? 0 : 180 }}
      transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 0.4 }}
      className="pointer-events-none absolute bottom-4 right-0 z-40 flex justify-center px-4 sm:bottom-6"
      style={{ left: 'var(--workspace-nav-width, 0px)' }}
    >
      {/* Moving Background Gradient attached behind and above the dock */}
      <div
        aria-hidden="true"
        className={cn(
        "pointer-events-none absolute -top-20 inset-x-0 -bottom-6 -z-10 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/90 to-transparent"
        )}
      />

      {/* Dock Pill Container with No Shadows */}
      <nav
        aria-label="Audio Playback and Reading Controls"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          "relative flex w-full max-w-md flex-col gap-2 rounded-feature bg-ui-surface px-4 py-2.5 sm:px-5 sm:py-3.5 border-0 border-b-[length:var(--depth-lg)] border-b-ui-border",
          isVisible ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        {/* Row 1: Time + Scrubber Track on the Same Row */}
        {canKaraoke && totalDuration > 0 && (
          <div className="flex items-center gap-2 px-0.5">
            {/* Current Time */}
            <span className="w-8 shrink-0 text-left text-xs font-bold tabular-nums text-ui-muted select-none">
              {formatTime(displayTime)}
            </span>

            {/* Scrubber Slider */}
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
              {/* Visual Track Background */}
              <div className="relative h-2 w-full rounded-full bg-ui-border/80 transition-[height] duration-150 ease-out group-hover:h-2.5 group-active:h-2.5">
                {/* Active Progress Fill */}
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Tactile Handle / Thumb */}
                <div
                  className={cn(
                    "pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-brand-primary transition-transform duration-100",
                    isDragging || isHovered
                      ? "h-4.5 w-4.5 scale-110"
                      : "h-3.5 w-3.5 opacity-95 group-hover:h-4 group-hover:w-4"
                  )}
                  style={{ left: `${progressPercent}%` }}
                >
                  {/* Floating Time Tooltip while Dragging */}
                  {isDragging && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-control bg-ui-ink px-2 py-0.5 text-xs font-black text-ui-surface tabular-nums whitespace-nowrap">
                      {formatTime(dragTime)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Total Duration (Static, avoids dual ticking distraction) */}
            <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-ui-muted select-none">
              {formatTime(totalDuration)}
            </span>
          </div>
        )}

        {/* Row 2: Controls Row Directly Underneath - Symmetrical Audio Layout */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          {/* Left: Playback Speed */}
          <div className="flex shrink-0 items-center justify-start">
            <button
              type="button"
              onClick={onCycleSpeed}
              title="Playback Speed"
              className="flex h-9 sm:h-10 min-w-[40px] sm:min-w-[46px] items-center justify-center rounded-compact border-0 border-b-[length:var(--depth-sm)] border-b-ui-border bg-ui-hover px-2 text-xs font-black tabular-nums text-ui-ink-strong transition-all active:translate-y-[length:var(--depth-sm)] active:border-b-0 focus-ring"
            >
              {playbackSpeed}x
            </button>
          </div>

          {/* Center: Prev Sentence + Hero Circular Play/Pause + Next Sentence */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <IconActionButton
              onClick={onPrevSentence}
              size="sm"
              variant="quiet"
              icon={<AppIcon name="back" size={18} />}
              label="Previous sentence"
              disabled={!canKaraoke}
            />

            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={playing ? 'Pause dialogue' : 'Play dialogue'}
              className="group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-0 border-b-[length:var(--depth-md)] border-b-brand-primary-edge bg-brand-primary text-white transition-all active:translate-y-[length:var(--depth-md)] active:border-b-0 focus-ring hover:brightness-105"
            >
              <AppIcon name={playing ? 'pause' : 'play'} size={24} />
            </button>

            <IconActionButton
              onClick={onNextSentence}
              size="sm"
              variant="quiet"
              icon={<AppIcon name="forward" size={18} />}
              label="Next sentence"
              disabled={!canKaraoke}
            />
          </div>

          {/* Right: Reading Aids Popover Trigger */}
          <div ref={aidsPopoverRef} className="relative flex shrink-0 items-center justify-end">
            <button
              type="button"
              onClick={() => setIsAidsPopoverOpen((open) => !open)}
              aria-label="Reading aids (Pinyin and Translation)"
              aria-haspopup="dialog"
              aria-expanded={isAidsPopoverOpen}
              title="Reading aids (Pinyin & Translation)"
              className={cn(
                'relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-compact transition-all active:translate-y-[length:var(--depth-sm)] active:border-b-0 focus-ring',
                showPinyin || showMeaning || isAidsPopoverOpen
                  ? 'border-0 border-b-[length:var(--depth-sm)] border-b-brand-primary-edge bg-brand-primary text-white'
                  : 'border-0 border-b-[length:var(--depth-sm)] border-b-ui-border bg-ui-hover text-ui-ink hover:text-ui-ink-strong'
              )}
            >
              <span aria-hidden="true" className="font-chinese text-[16px] sm:text-[18px] font-bold leading-none select-none">
                文
              </span>
              {(showPinyin || showMeaning) && !isAidsPopoverOpen && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-feedback-success border border-ui-surface" />
              )}
            </button>

            {/* Reading Aids Popover Floating Above */}
            <AnimatePresence>
              {isAidsPopoverOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute right-0 bottom-full z-50 mb-3 w-60 sm:w-64 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2 shadow-ambient-lg text-left"
                >
                  <div role="menu" aria-label="Reading aids" className="flex flex-col gap-1.5">
                    {/* Translation Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showMeaning}
                      onClick={onToggleMeaning}
                      className={cn(
                        'flex min-h-12 w-full items-center justify-between rounded-compact px-4 py-2.5 text-sm sm:text-base font-extrabold transition-colors outline-none focus-ring',
                        showMeaning
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-ui-ink-strong hover:bg-ui-hover'
                      )}
                    >
                      <span>Translation</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                          showMeaning ? 'bg-brand-primary' : 'bg-ui-divider'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-0 border-b-px border-b-ui-border ring-0 transition duration-200 ease-in-out translate-y-0.5',
                            showMeaning ? 'translate-x-[18px]' : 'translate-x-0.5'
                          )}
                        />
                      </span>
                    </button>

                    {/* Pinyin Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showPinyin}
                      onClick={onTogglePinyin}
                      className={cn(
                        'flex min-h-12 w-full items-center justify-between rounded-compact px-4 py-2.5 text-sm sm:text-base font-extrabold transition-colors outline-none focus-ring',
                        showPinyin
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-ui-ink-strong hover:bg-ui-hover'
                      )}
                    >
                      <span>Pinyin</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                          showPinyin ? 'bg-brand-primary' : 'bg-ui-divider'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-0 border-b-px border-b-ui-border ring-0 transition duration-200 ease-in-out translate-y-0.5',
                            showPinyin ? 'translate-x-[18px]' : 'translate-x-0.5'
                          )}
                        />
                      </span>
                    </button>

                    {/* Hover Definitions Toggle */}
                    {onToggleHoverDefinitions && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showHoverDefinitions}
                        onClick={onToggleHoverDefinitions}
                        className={cn(
                          'flex min-h-12 w-full items-center justify-between rounded-compact px-4 py-2.5 text-sm sm:text-base font-extrabold transition-colors outline-none focus-ring',
                          showHoverDefinitions
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'text-ui-ink-strong hover:bg-ui-hover'
                        )}
                      >
                        <span>Hover Definitions</span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                            showHoverDefinitions ? 'bg-brand-primary' : 'bg-ui-divider'
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-0 border-b-px border-b-ui-border ring-0 transition duration-200 ease-in-out translate-y-0.5',
                              showHoverDefinitions ? 'translate-x-[18px]' : 'translate-x-0.5'
                            )}
                          />
                        </span>
                      </button>
                    )}
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
