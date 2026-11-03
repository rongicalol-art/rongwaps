import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';
import { LessonPicture } from './LessonPicture';

interface TestPictureFanProps {
  /** The lesson's closing scene (its last part), shown whole in front. */
  front: string | null;
  isIcon?: boolean;
  /** Earlier parts' scenes, oldest first; at most two fan out from behind. */
  behind: string[];
  onSwipe: (step: 1 | -1) => void;
  /** Phone sizing: a taller box and wider cards. */
  compact?: boolean;
  className?: string;
}

// Where each card sits, in % of the box. The back cards peek out about 10% each side of the front one.
const GEOMETRY = {
  wide: { frontLeft: 12, frontWidth: 76, backWidth: 66, backLefts: [2.5, 31.5] },
  compact: { frontLeft: 11, frontWidth: 78, backWidth: 70, backLefts: [1, 29] },
};
const TILT = [-5, 5];
// How far a back card starts toward the front one, in % of its own width, before it fans out.
const TUCK = 14.4;

/**
 * The Test tab's picture: the lesson's parts combined. The closing scene sits in front like on every other tab;
 * the earlier scenes fan out behind it. A gap in the page colour keeps the layers apart, so there is no frame.
 */
export function TestPictureFan({ front, isIcon, behind, onSwipe, compact = false, className }: TestPictureFanProps) {
  const reduceMotion = useReducedMotion();
  const geometry = compact ? GEOMETRY.compact : GEOMETRY.wide;
  return (
    <div className={cn('relative w-full', compact ? 'mx-auto aspect-[16/10] max-w-[calc(38vh*1.6)]' : 'aspect-video', className)}>
      {behind.map((src, index) => (
        <motion.div
          key={src}
          aria-hidden
          className="absolute top-1/2 aspect-video overflow-hidden rounded-3xl bg-ui-hover"
          style={{ left: `${geometry.backLefts[index]}%`, width: `${geometry.backWidth}%` }}
          initial={reduceMotion ? false : { x: `${index === 0 ? TUCK : -TUCK}%`, y: '-46%', rotate: 0 }}
          animate={{ x: '0%', y: '-54%', rotate: TILT[index] }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 + index * 0.07 }}
        >
          <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
        </motion.div>
      ))}
      <div
        className={cn(
          'absolute top-1/2 z-10 -translate-y-[46%] rounded-modal outline outline-ui-canvas',
          compact ? 'outline-[6px]' : 'outline-8',
        )}
        style={{ left: `${geometry.frontLeft}%`, width: `${geometry.frontWidth}%` }}
      >
        <LessonPicture src={front} isIcon={isIcon} onSwipe={onSwipe} className="rounded-modal" />
      </div>
    </div>
  );
}
