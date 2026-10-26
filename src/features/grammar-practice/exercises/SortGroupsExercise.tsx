import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { SortGroupsItem } from '../../../types/models';
import { checkSortCard } from '../../../utils/grammar/grammarPracticePicks';
import { PracticeChoiceButton } from '../../practice';
import { PracticePrompt } from '../components/PracticePrompt';
import { ITEM_FADE } from '../practiceMotion';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

const GROUPS = [0, 1] as const;

/**
 * Sort by use: one sentence at a time, two big buttons under it. A right tap brings the next
 * sentence; a wrong tap says why it belongs to the other group. Nothing to check: each tap is the answer.
 */
export function SortGroupsExercise({
  item, script, status, showPinyin, shortcutsDisabled, onResult,
}: PracticeExerciseProps<SortGroupsItem>) {
  const reduceMotion = useReducedMotion();
  /** How many cards are sorted; the next one waits at the top. */
  const [done, setDone] = useState(0);
  const locked = status !== 'idle';
  const current = item.cards[done];

  const choose = (group: 0 | 1) => {
    if (locked || !current) return;
    const verdict = checkSortCard(item, done, group);
    if (!verdict.correct) {
      onResult({ correct: false, note: verdict.note });
      return;
    }
    setDone(done + 1);
    if (done + 1 === item.cards.length) onResult({ correct: true, note: item.successNote });
  };
  useNumberKeySelection({ items: GROUPS, onSelect: choose, disabled: locked || shortcutsDisabled });

  return (
    <div className="flex flex-col gap-8">
      <PracticePrompt sub={item.sub} />
      <div className="flex min-h-36 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait" initial={false}>
          {current && (
            <motion.div
              key={done}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: ITEM_FADE }}
              exit={reduceMotion ? undefined : { opacity: 0, transition: ITEM_FADE }}
              className="flex flex-col gap-1"
            >
              <p className="font-chinese font-semibold text-3xl leading-snug text-balance text-ui-ink-strong sm:text-4xl">{textIn(current.sentence, script)}</p>
              {showPinyin && <p className="text-sm font-extrabold text-ui-muted-strong">{current.sentence.pinyin}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {GROUPS.map((group) => (
          <PracticeChoiceButton key={group} index={group} disabled={locked || !current} onClick={() => choose(group)}>
            <span className="flex min-h-14 w-full items-center justify-center px-3 py-2 text-center text-lg font-extrabold leading-tight sm:text-xl">{item.groups[group].label}</span>
          </PracticeChoiceButton>
        ))}
      </div>
    </div>
  );
}
