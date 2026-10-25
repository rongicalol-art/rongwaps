import { motion } from 'motion/react';
import { PracticeChoiceButton } from '../../practice';
import type { PracticeTile } from '../../../types/models';
import { WORD_FLIGHT } from '../practiceMotion';
import type { DragHandlers } from './InlineBlank';
import { textIn, type PracticeScript } from '../practiceTypes';

interface PracticeTileButtonProps {
  tile: PracticeTile;
  script: PracticeScript;
  /** Shared with the placed word, so the tile flies into its blank and back. */
  layoutId?: string;
  /** Pointer handlers that let the learner drag the tile into the sentence. */
  drag?: DragHandlers;
  /** This tile is being carried; its copy follows the pointer. */
  carried?: boolean;
  disabled?: boolean;
  /** Picked up, waiting to be dropped into a gap (place-the-words items). */
  selected?: boolean;
  onClick: () => void;
}

/** A word in the dock's word bank, on the app's tactile choice button. Pinyin shows in the result, not on the tile. */
export function PracticeTileButton({ tile, script, layoutId, drag, carried, disabled, selected, onClick }: PracticeTileButtonProps) {
  const text = textIn(tile, script);
  return (
    <motion.div layout="position" layoutId={layoutId} transition={WORD_FLIGHT} {...drag} className={carried ? 'shrink-0 select-none opacity-30' : 'shrink-0 select-none'}>
      <PracticeChoiceButton compact disabled={disabled} state={selected ? 'selected' : 'idle'} onClick={onClick} aria-label={`Use ${text}`} className="w-auto">
        <span className="min-w-6 font-chinese-sans font-semibold text-xl leading-none text-ui-ink-strong">{text}</span>
      </PracticeChoiceButton>
    </motion.div>
  );
}
