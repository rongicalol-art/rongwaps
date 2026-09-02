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
    <div className="relative mb-12 mt-6 flex items-center justify-center">
      <button
        type="button"
        onClick={() => playAudio(1.0)}
        aria-label={isPlaying ? 'Replay pronunciation' : 'Play pronunciation'}
        className={`relative flex h-[130px] w-[130px] items-center justify-center rounded-modal border-b-[length:var(--depth-xl)] ${activeBook.buttonEdge} ${activeBook.accentBg} text-white outline-none transition-[transform,border-width,filter] focus-ring ${isPlaying ? 'translate-y-[length:var(--depth-xl)] border-b-0' : 'hover:brightness-105 active:translate-y-[length:var(--depth-xl)] active:border-b-0'}`}
      >
        <AppIcon name="pronounce" size={72} />
        
        {isPlaying && !prefersReducedMotion && (
          <motion.div
            aria-hidden="true"
            className={`absolute inset-0 -z-10 rounded-modal ${activeBook.accentBg}`}
            animate={{ scale: [1, 1.25, 1.4], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </button>
    </div>
  );
}
