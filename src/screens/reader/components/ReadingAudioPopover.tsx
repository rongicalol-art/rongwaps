import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SwitchRow } from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import { cn } from '../../../utils/cn';

interface ReadingAudioPopoverProps {
  playing: boolean;
  canKaraoke: boolean;
  playbackSpeed: number;
  isLooping?: boolean;
  showPinyin: boolean;
  showMeaning: boolean;
  onCycleSpeed: () => void;
  onToggleLoop?: () => void;
  onTogglePinyin: () => void;
  onToggleMeaning: () => void;
}

function WaveformBars({ playing, active, onClick }: { playing: boolean; active?: boolean; onClick?: () => void }) {
  const bars = [
    { height: 7, delay: '0s' },
    { height: 13, delay: '0.1s' },
    { height: 10, delay: '0.2s' },
    { height: 16, delay: '0.05s' },
    { height: 8, delay: '0.15s' },
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle options"
      aria-pressed={active}
      title="Options & display settings"
      className={cn(
        'shrink-0 flex items-center gap-[2.5px] h-7 px-1.5 rounded-full transition-opacity focus-ring-inline',
        active ? 'opacity-100 bg-brand-primary/10' : 'opacity-70 hover:opacity-100'
      )}
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className={cn(
            'block w-[2.5px] rounded-full transition-transform duration-200',
            active ? 'bg-brand-primary' : 'bg-brand-primary/70',
            playing ? 'animate-pulse' : 'scale-y-[0.3] opacity-30'
          )}
          style={{ height: bar.height, animationDelay: bar.delay, animationDuration: '0.8s' }}
        />
      ))}
    </button>
  );
}

export function ReadingAudioPopover({
  playing,
  canKaraoke,
  playbackSpeed,
  isLooping = false,
  showPinyin,
  showMeaning,
  onCycleSpeed,
  onToggleLoop,
  onTogglePinyin,
  onToggleMeaning,
}: ReadingAudioPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDismiss({
    ref: containerRef,
    onDismiss: () => setIsOpen(false),
    isActive: isOpen,
  });

  return (
    <div ref={containerRef} className="relative shrink-0 flex items-center">
      <WaveformBars
        playing={playing && canKaraoke}
        active={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 bottom-full z-50 mb-3 w-56 popover-surface p-2"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={onCycleSpeed}
                className="flex min-h-11 w-full items-center justify-between rounded-compact px-4 py-2.5 text-sm font-extrabold text-ui-ink-strong hover:bg-ui-hover transition-colors outline-none focus-ring"
              >
                <span>Speed</span>
                <span className="text-brand-primary tabular-nums">{playbackSpeed}×</span>
              </button>

              {onToggleLoop && (
                <SwitchRow label="Loop" checked={isLooping} onToggle={onToggleLoop} tinted className="px-4 py-2.5" />
              )}

              <SwitchRow label="Pinyin" checked={showPinyin} onToggle={onTogglePinyin} tinted className="px-4 py-2.5" />

              <SwitchRow label="Translation" checked={showMeaning} onToggle={onToggleMeaning} tinted className="px-4 py-2.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
