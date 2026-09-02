import { useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface ReadingBottomDockProps {
  isVisible?: boolean;
  playing: boolean;
  currentTime: number;
  totalDuration: number;
  playbackSpeed: number;
  isLooping: boolean;
  canKaraoke: boolean;
  showPinyin: boolean;
  showMeaning: boolean;
  onTogglePlay: () => void;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onSeek: (time: number) => void;
  onScrub?: (time: number) => void;
  onCycleSpeed: () => void;
  onToggleLoop: () => void;
  onTogglePinyin: () => void;
  onToggleMeaning: () => void;
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
  isLooping,
  canKaraoke,
  showPinyin,
  showMeaning,
  onTogglePlay,
  onPrevSentence,
  onNextSentence,
  onSeek,
  onScrub,
  onCycleSpeed,
  onToggleLoop,
  onTogglePinyin,
  onToggleMeaning,
  onMouseEnter,
  onMouseLeave,
}: ReadingBottomDockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = totalDuration > 0
    ? Math.min(100, Math.max(0, (displayTime / totalDuration) * 100))
    : 0;

  const calculateTimeFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current || totalDuration <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * totalDuration;
  }, [totalDuration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const newTime = calculateTimeFromPointer(e.clientX);
    setDragTime(newTime);
    onScrub?.(newTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newTime = calculateTimeFromPointer(e.clientX);
    setDragTime(newTime);
    onScrub?.(newTime);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    const finalTime = calculateTimeFromPointer(e.clientX);
    onSeek(finalTime);
  };

  // Keyboard scrub support on track
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (totalDuration <= 0) return;
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
      animate={{ y: isVisible ? 0 : 160 }}
      transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 0.4 }}
      className="pointer-events-none absolute inset-x-0 bottom-4 sm:bottom-6 z-40 flex justify-center px-4"
    >
      {/* Moving Background Gradient attached behind and above the dock */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 inset-x-0 -bottom-6 -z-10 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/90 to-transparent"
      />

      {/* Dock Pill Container with No Shadows */}
      <nav
        aria-label="Audio Playback and Reading Controls"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          "relative flex w-full max-w-md flex-col gap-1.5 rounded-feature border-0 border-b-[length:var(--depth-lg)] border-b-ui-border bg-ui-surface px-3 py-2 sm:px-4 sm:py-2.5 transition-pointer",
          isVisible ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        {/* Row 1: Time + Scrubber Track on the Same Row */}
        {canKaraoke && totalDuration > 0 && (
          <div className="flex items-center gap-2 px-0.5">
            {/* Current Time */}
            <span className="w-7 shrink-0 text-left text-[11px] font-bold tabular-nums text-ui-muted select-none">
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
              className="group relative flex h-4 flex-1 cursor-pointer touch-none select-none items-center outline-none focus-ring-inline"
            >
              {/* Visual Track Background */}
              <div className="relative h-1.5 w-full rounded-full bg-ui-border/80 transition-[height] duration-150 ease-out group-hover:h-2 group-active:h-2">
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
                      ? "h-3.5 w-3.5 scale-110"
                      : "h-3 w-3 opacity-90 group-hover:h-3.5 group-hover:w-3.5"
                  )}
                  style={{ left: `${progressPercent}%` }}
                >
                  {/* Floating Time Tooltip while Dragging */}
                  {isDragging && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-control bg-ui-ink px-1.5 py-0.5 text-[10px] font-black text-ui-surface tabular-nums whitespace-nowrap">
                      {formatTime(dragTime)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Total Duration (Static, avoids dual ticking distraction) */}
            <span className="w-7 shrink-0 text-right text-[11px] font-bold tabular-nums text-ui-muted select-none">
              {formatTime(totalDuration)}
            </span>
          </div>
        )}

        {/* Row 2: Controls Row Directly Underneath */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          {/* Left: Speed & Loop (Rounded Compact Chips) */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={onCycleSpeed}
              title="Playback Speed"
              className="flex h-8 items-center justify-center rounded-compact border-0 border-b-[length:var(--depth-sm)] border-b-ui-border bg-ui-hover px-2 text-[11px] sm:text-xs font-black tabular-nums text-ui-ink-strong transition-all active:translate-y-[length:var(--depth-sm)] active:border-b-0 focus-ring"
            >
              {playbackSpeed}x
            </button>

            <button
              type="button"
              onClick={onToggleLoop}
              title={isLooping ? 'Looping enabled' : 'Loop dialogue'}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-compact transition-all active:translate-y-[length:var(--depth-sm)] active:border-b-0 focus-ring',
                isLooping
                  ? 'border-0 border-b-[length:var(--depth-sm)] border-b-brand-primary-edge bg-brand-primary text-white'
                  : 'border-0 border-b-[length:var(--depth-sm)] border-b-ui-border bg-ui-hover text-ui-ink hover:text-ui-ink-strong',
              )}
            >
              <AppIcon name="restart" size={14} />
            </button>
          </div>

          {/* Center: Prev + Classic Tactile Circular Play + Next */}
          <div className="flex items-center gap-1 sm:gap-2">
            <IconActionButton
              onClick={onPrevSentence}
              size="sm"
              variant="quiet"
              icon={<AppIcon name="back" size={16} />}
              label="Previous sentence"
              disabled={!canKaraoke}
            />

            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={playing ? 'Pause dialogue' : 'Play dialogue'}
              className="group relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-0 border-b-[length:var(--depth-md)] border-b-brand-primary-edge bg-brand-primary text-white transition-all active:translate-y-[length:var(--depth-md)] active:border-b-0 focus-ring hover:brightness-105"
            >
              <AppIcon name={playing ? 'pause' : 'play'} size={20} />
            </button>

            <IconActionButton
              onClick={onNextSentence}
              size="sm"
              variant="quiet"
              icon={<AppIcon name="forward" size={16} />}
              label="Next sentence"
              disabled={!canKaraoke}
            />
          </div>

          {/* Right: Quick Reading Aid Chips (Pinyin & English) */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={onTogglePinyin}
              title="Toggle Pinyin Annotations"
              className={cn(
                'flex h-8 min-w-[30px] sm:min-w-[34px] items-center justify-center rounded-compact px-2 text-[11px] sm:text-xs font-black transition-all active:translate-y-[length:var(--depth-sm)] active:border-b-0 focus-ring',
                showPinyin
                  ? 'border-0 border-b-[length:var(--depth-sm)] border-b-brand-primary-edge bg-brand-primary text-white'
                  : 'border-0 border-b-[length:var(--depth-sm)] border-b-ui-border bg-ui-hover text-ui-ink hover:text-ui-ink-strong',
              )}
            >
              拼
            </button>

            <button
              type="button"
              onClick={onToggleMeaning}
              title="Toggle English Translation"
              className={cn(
                'flex h-8 min-w-[30px] sm:min-w-[34px] items-center justify-center rounded-compact px-2 text-[11px] sm:text-xs font-black transition-all active:translate-y-[length:var(--depth-sm)] active:border-b-0 focus-ring',
                showMeaning
                  ? 'border-0 border-b-[length:var(--depth-sm)] border-b-brand-primary-edge bg-brand-primary text-white'
                  : 'border-0 border-b-[length:var(--depth-sm)] border-b-ui-border bg-ui-hover text-ui-ink hover:text-ui-ink-strong',
              )}
            >
              文
            </button>
          </div>
        </div>
      </nav>
    </motion.div>
  );
}
