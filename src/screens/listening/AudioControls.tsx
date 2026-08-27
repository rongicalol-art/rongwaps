import { motion, useReducedMotion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../data/books';
import { AppIcon } from '../../lib/widgets';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface AudioControlsProps {
  isPlaying: boolean;
  playAudio: (rate: number) => void;
  activeBook: CourseBook;
}

export function AudioControls({ isPlaying, playAudio, activeBook }: AudioControlsProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative mb-12 mt-6 flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={() => playAudio(1.0)}
        aria-label={isPlaying ? 'Replay pronunciation' : 'Play pronunciation'}
        className={`relative flex h-[130px] w-[130px] items-center justify-center rounded-[36px] border-b-[8px] ${activeBook.buttonEdge} ${activeBook.accentBg} text-white outline-none transition-[transform,border-width,filter] focus-visible:ring-4 focus-visible:ring-brand-primary/25 ${isPlaying ? 'translate-y-2 border-b-0' : 'hover:brightness-105 active:translate-y-2 active:border-b-0'}`}
      >
        <AppIcon name="pronounce" size={72} />
        
        {isPlaying && !prefersReducedMotion && (
          <motion.div
            aria-hidden="true"
            className={`absolute inset-0 -z-10 rounded-[36px] ${activeBook.accentBg}`}
            animate={{ scale: [1, 1.25, 1.4], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </button>

      <button
        type="button"
        onClick={() => playAudio(0.4)}
        disabled={isPlaying}
        aria-label="Play pronunciation slowly"
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-[24px] border-b-[6px] ${activeBook.buttonEdge} ${activeBook.accentBg} text-white outline-none transition-[transform,border-width,filter] hover:brightness-105 focus-visible:ring-4 focus-visible:ring-brand-primary/25 active:translate-y-1.5 active:border-b-0 disabled:translate-y-1.5 disabled:border-b-0 disabled:bg-ui-divider disabled:text-ui-muted`}
      >
        <AppIcon name="slowAudio" size={36} />
      </button>
    </div>
  );
}
