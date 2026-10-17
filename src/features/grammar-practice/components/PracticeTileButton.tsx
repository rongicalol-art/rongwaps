import { motion } from 'motion/react';
import { PracticeChoiceButton } from '../../practice';
import type { PracticeTile } from '../../../types/models';
import { WORD_FLIGHT } from '../practiceMotion';
import { textIn, type PracticeScript } from '../practiceTypes';

interface PracticeTileButtonProps {
  tile: PracticeTile;
  script: PracticeScript;
  /** Shared with the placed word, so the tile flies into its blank and back. */
  layoutId: string;
  disabled?: boolean;
  onClick: () => void;
}

/** A word in the dock's word bank, on the app's tactile choice button. Pinyin shows in the result, not on the tile. */
export function PracticeTileButton({ tile, script, layoutId, disabled, onClick }: PracticeTileButtonProps) {
  const text = textIn(tile, script);
  return (
    <motion.div layout="position" layoutId={layoutId} transition={WORD_FLIGHT} className="shrink-0">
      <PracticeChoiceButton compact disabled={disabled} onClick={onClick} aria-label={`Use ${text}`} className="w-auto">
        <span className="min-w-6 font-chinese text-[22px] font-bold leading-none text-ui-ink-strong">{text}</span>
      </PracticeChoiceButton>
    </motion.div>
  );
}
