import { motion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { AudioScrubberTrack } from './AudioScrubberTrack';
import { ReadingAudioPopover } from './ReadingAudioPopover';

interface ReadingBottomDockProps {
  isVisible?: boolean;
  playing: boolean;
  currentTime: number;
  totalDuration: number;
  playbackSpeed: number;
  canKaraoke: boolean;
  isLooping?: boolean;
  showPinyin: boolean;
  showMeaning: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onScrub?: (time: number) => void;
  onCycleSpeed: () => void;
  onToggleLoop?: () => void;
  onTogglePinyin: () => void;
  onToggleMeaning: () => void;
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
  isLooping = false,
  showPinyin,
  showMeaning,
  onTogglePlay,
  onSeek,
  onScrub,
  onCycleSpeed,
  onToggleLoop,
  onTogglePinyin,
  onToggleMeaning,
}: ReadingBottomDockProps) {
  return (
    <motion.div
      animate={{ y: isVisible ? 0 : 180 }}
      transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 0.4 }}
      className="pointer-events-none absolute bottom-dock-safe inset-x-0 z-40 flex justify-center px-3 sm:px-4"
    >
      {/* Canvas fade behind dock */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 inset-x-0 -bottom-8 -z-10 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/85 to-transparent"
      />

      <nav
        aria-label="Audio Playback and Reading Controls"
        className={cn(
          'relative flex w-full max-w-xl flex-col gap-2',
          isVisible ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        {/* Main Playback Pill */}
        <div className="dock-pill flex items-center gap-2.5 rounded-full border-b-[length:var(--depth-md)] border-b-ui-border bg-ui-surface px-3 py-1.5 shadow-ambient-md sm:gap-3">
          {/* Primary Play / Pause button with stationary 3D base */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause dialogue' : 'Play dialogue'}
            className="group relative flex h-10 w-10 shrink-0 items-stretch justify-center rounded-full border-none bg-transparent p-0 outline-none select-none focus-ring sm:h-11 sm:w-11"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 top-[length:var(--depth-sm)] rounded-full bg-brand-primary-edge"
            />
            <span className="relative mb-[length:var(--depth-sm)] flex flex-1 items-center justify-center rounded-full bg-brand-primary text-white shadow-ambient-sm transition-all duration-75 group-hover:brightness-105 group-active:translate-y-[length:var(--depth-sm)]">
              <AppIcon
                name={playing ? 'pause' : 'play'}
                size={20}
                className={cn(!playing && 'translate-x-0.5')}
              />
            </span>
          </button>

          {/* Current time */}
          <span className="min-w-[34px] shrink-0 text-left text-xs font-bold tabular-nums text-ui-ink select-none">
            {formatTime(currentTime)}
          </span>

          {/* Scrubber track */}
          <AudioScrubberTrack
            currentTime={currentTime}
            totalDuration={totalDuration}
            canKaraoke={canKaraoke}
            onSeek={onSeek}
            onScrub={onScrub}
          />

          {/* Total duration */}
          <span className="min-w-[34px] shrink-0 text-right text-xs font-bold tabular-nums text-ui-muted select-none">
            {canKaraoke && totalDuration > 0 ? formatTime(totalDuration) : '--:--'}
          </span>

          {/* Waveform & Settings Popover */}
          <ReadingAudioPopover
            playing={playing}
            canKaraoke={canKaraoke}
            playbackSpeed={playbackSpeed}
            isLooping={isLooping}
            showPinyin={showPinyin}
            showMeaning={showMeaning}
            onCycleSpeed={onCycleSpeed}
            onToggleLoop={onToggleLoop}
            onTogglePinyin={onTogglePinyin}
            onToggleMeaning={onToggleMeaning}
          />
        </div>
      </nav>
    </motion.div>
  );
}
