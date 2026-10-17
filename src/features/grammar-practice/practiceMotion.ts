import type { Transition } from 'motion/react';

/** Every timing in grammar Practice. Motion is kept to what explains the action: a word moving between the dock and its blank. */

/** A word flies between the dock and its blank; the other tiles slide to close the gap. Position only, so text never stretches. */
export const WORD_FLIGHT: Transition = { type: 'spring', stiffness: 520, damping: 40 };
/** The next item fades in place. */
export const ITEM_FADE: Transition = { duration: 0.18, ease: 'easeOut' };
/** The dock rises in with its exercise. */
export const DOCK_IN: Transition = { duration: 0.32, ease: [0.16, 1, 0.3, 1] };
/** Bank and result swap inside the dock: a short fade, the result also rising a few px. */
export const DOCK_SWAP: Transition = { duration: 0.22, ease: 'easeOut' };
