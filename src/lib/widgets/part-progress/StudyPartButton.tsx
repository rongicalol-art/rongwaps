import { AnimatePresence, motion } from 'motion/react';
import { useLongPress } from '../../../hooks/useLongPress';
import { cn } from '../../../utils/cn';
import { visibleProgressWidth } from '../../../utils/progress';
import type { RailMotionTransition } from './partProgressSprings';

export interface StudyPartButtonProps {
  partId: number;
  cardCount: number;
  progressPercent: number;
  flexWeight: number;
  isSelected: boolean;
  disabled: boolean;
  reduceMotion: boolean;
  interactionTransition: RailMotionTransition;
  progressTransition: RailMotionTransition;
  onSelectPart: (partId: number) => void;
  onTogglePart: (partId: number) => void;
}

export function StudyPartButton({
  partId,
  cardCount,
  progressPercent,
  flexWeight,
  isSelected,
  disabled,
  reduceMotion,
  interactionTransition,
  progressTransition,
  onSelectPart,
  onTogglePart,
}: StudyPartButtonProps) {
  const pressHandlers = useLongPress<HTMLButtonElement>({
    onTap: () => onSelectPart(partId),
    onLongPress: () => onTogglePart(partId),
    disabled,
  });

  return (
    <motion.button
      layout
      type="button"
      disabled={disabled}
      {...pressHandlers}
      aria-pressed={isSelected}
      aria-label={`Part ${partId}, ${cardCount} cards${isSelected ? ', active' : ''}. Tap to switch; hold to include or remove.`}
      title={`Part ${partId} · tap to switch · hold to include/remove`}
      style={{ flex: flexWeight }}
      whileHover={disabled || reduceMotion ? undefined : { y: -2, scale: 1.015 }}
      whileTap={disabled || reduceMotion ? undefined : { y: 0, scale: 0.96 }}
      transition={interactionTransition}
      className={cn(
        'group relative h-5 w-full min-w-12 cursor-pointer select-none overflow-hidden rounded-full transition-colors duration-300 focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        isSelected
          ? 'bg-brand-primary-track'
          : 'bg-brand-primary-track hover:brightness-90',
      )}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 origin-left rounded-full bg-brand-primary/15"
        initial={false}
        animate={{ opacity: isSelected ? 1 : 0, scaleX: isSelected ? 1 : 0.88 }}
        transition={interactionTransition}
      />
      <AnimatePresence initial={false}>
        <motion.span
          key={isSelected ? 'included' : 'excluded'}
          aria-hidden="true"
          className="absolute inset-0 origin-center rounded-full bg-brand-primary/20"
          initial={{ opacity: 0.42, scaleX: 0.78, scaleY: 0.72 }}
          animate={{ opacity: 0, scaleX: 1, scaleY: 1 }}
          exit={{ opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
        />
      </AnimatePresence>
      <motion.span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-brand-primary"
        initial={false}
        animate={{
          opacity: isSelected ? 1 : 0,
          width: isSelected ? visibleProgressWidth(progressPercent) : '0%',
        }}
        transition={progressTransition}
      >
        {progressPercent > 0 && (
          <span className="pointer-events-none absolute left-2 right-2 top-1 h-1 rounded-full bg-white/30" />
        )}
      </motion.span>
    </motion.button>
  );
}
