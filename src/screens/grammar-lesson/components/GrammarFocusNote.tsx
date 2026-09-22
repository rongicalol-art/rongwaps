import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { GrammarWordToken } from '../../../types/models';
import { GrammarFocusText } from './GrammarFocusText';

export interface GrammarFocusNoteProps {
  id: string;
  open: boolean;
  note: string;
  terms?: string[];
  contextTokens?: GrammarWordToken[];
  characterPreference?: 'traditional' | 'simplified';
  onOpenWord?: (word: string) => void;
}

/**
 * Teaching-note panel for one example. The trigger lives in the example's
 * icon rail (zero collapsed height); the note body is only mounted while open.
 */
export function GrammarFocusNote({
  id,
  open,
  note,
  terms,
  contextTokens,
  characterPreference,
  onOpenWord,
}: GrammarFocusNoteProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className="overflow-hidden"
        >
          <p className="mt-2 text-xs font-bold leading-snug text-ui-muted-strong">
            <GrammarFocusText
              text={note}
              terms={terms}
              contextTokens={contextTokens}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
