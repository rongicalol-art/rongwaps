import { useState, useRef, useCallback } from 'react';
import { cn } from '../../../utils/cn';
import { debugLogger } from '../../../utils/debug/debugLogger';

interface AudioScrubberTrackProps {
  currentTime: number;
  totalDuration: number;
  canKaraoke: boolean;
  onSeek: (time: number) => void;
  onScrub?: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioScrubberTrack({
  currentTime,
  totalDuration,
  canKaraoke,
  onSeek,
  onScrub,
}: AudioScrubberTrackProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const progressPercent = totalDuration > 0
    ? Math.min(1, Math.max(0, (isDragging ? dragTime : currentTime) / totalDuration)) * 100
    : 0;
  const displayTime = isDragging ? dragTime : currentTime;

  const calculateTimeFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current || totalDuration <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * totalDuration;
  }, [totalDuration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!trackRef.current || totalDuration <= 0) return;
    try {
      trackRef.current.setPointerCapture(e.pointerId);
    } catch (err) {
      // Graceful degradation: browser pointer capture not supported or pointer already released
      debugLogger.warn('Audio', 'Failed to set pointer capture', err);
    }
    setIsDragging(true);
    const nextTime = calculateTimeFromPointer(e.clientX);
    setDragTime(nextTime);
    onScrub?.(nextTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current || totalDuration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextTime = ratio * totalDuration;
    if (isDragging) {
      setDragTime(nextTime);
    } else {
      setHoverTime(nextTime);
      setHoverRatio(ratio);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        trackRef.current?.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Graceful degradation: pointer capture already released or invalid id
        debugLogger.warn('Audio', 'Failed to release pointer capture', err);
      }
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
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSeek(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSeek(totalDuration);
    }
  };

  if (!canKaraoke || totalDuration <= 0) {
    return <div className="h-1.5 flex-1 rounded-full bg-ui-border/35" />;
  }

  return (
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
      onPointerLeave={() => { setHoverTime(null); setHoverRatio(null); }}
      className="group relative flex h-7 flex-1 cursor-pointer touch-none select-none items-center outline-none focus-ring-inline"
    >
      <div className="relative h-1.5 w-full rounded-full bg-ui-border/70 transition-[height] duration-150 ease-out group-hover:h-2 group-active:h-2">
        <div className="h-full rounded-full bg-brand-primary" style={{ width: `${progressPercent}%` }} />

        <div
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary shadow-ambient-sm transition-transform duration-100',
            isDragging || hoverRatio !== null ? 'h-4 w-4 scale-110 ring-2 ring-brand-primary/25' : 'h-3.5 w-3.5 group-hover:scale-110'
          )}
          style={{ left: `${progressPercent}%` }}
        >
          {isDragging && (
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-control bg-ui-ink px-2 py-0.5 text-xs font-black tabular-nums text-ui-surface shadow-ambient-md">
              {formatTime(dragTime)}
            </div>
          )}
        </div>

        {!isDragging && hoverTime !== null && hoverRatio !== null && (
          <div
            className="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded-control bg-ui-ink/90 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ui-surface shadow-ambient-sm backdrop-blur-sm"
            style={{ left: `${hoverRatio * 100}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>
    </div>
  );
}
