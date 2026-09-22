import { motion, useReducedMotion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../data/books';
import { AppIcon } from '../../lib/widgets';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface AudioControlsProps {
  isPlaying: boolean;
  playAudio: (rate?: number) => void;
  activeBook: CourseBook;
}

export function AudioControls({ isPlaying, playAudio, activeBook }: AudioControlsProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative mb-12 mt-6 flex items-center justify-center">
      <button
        type="button"
        onClick={() => playAudio()}
        style={{
          boxShadow: isPlaying ? 'none' : `0 var(--depth-xl) 0 ${activeBook.edgeHex}`,
        }}
        className={`relative flex h-[130px] w-[130px] items-center justify-center rounded-modal ${activeBook.accentBg} text-white outline-none transition-[transform,filter,box-shadow] duration-150 focus-ring ${isPlaying ? 'translate-y-[length:var(--depth-xl)]' : 'hover:brightness-105 active:translate-y-[length:var(--depth-xl)] active:!shadow-none'}`}
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
