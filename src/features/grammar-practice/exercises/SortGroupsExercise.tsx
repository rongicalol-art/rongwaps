import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup, motion } from 'motion/react';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { PracticeSentence, SortGroupsItem } from '../../../types/models';
import { checkSortCard } from '../../../utils/grammar/grammarPracticePicks';
import { PracticeChoiceButton } from '../../practice';
import { PracticePrompt } from '../components/PracticePrompt';
import { WORD_FLIGHT } from '../practiceMotion';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

const GROUPS = [0, 1] as const;

/**
 * Sort by use: one sentence at a time, and the dock holds the two groups. A right choice
 * sends the sentence into its group's list and the next one arrives; a wrong choice says
 * why the sentence belongs to the other group. Nothing to check: each tap is the answer.
 */
export function SortGroupsExercise({
  item, script, status, showPinyin, showTranslation, shortcutsDisabled, trayHost, onResult,
}: PracticeExerciseProps<SortGroupsItem>) {
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

  const sentence = (card: PracticeSentence, id: string, large: boolean) => (
    <motion.div key={id} layout="position" layoutId={id} transition={WORD_FLIGHT}>
      <p className={large ? 'font-chinese text-3xl leading-snug text-balance text-ui-ink-strong sm:text-4xl' : 'font-chinese text-base leading-snug text-balance text-ui-ink sm:text-xl'}>{textIn(card, script)}</p>
      {showPinyin && <p className="text-xs font-bold text-ui-muted-strong">{card.pinyin}</p>}
      {showTranslation && !large && <p className="text-xs font-bold text-ui-muted-strong">{card.english}</p>}
    </motion.div>
  );

  return (
    <LayoutGroup id={`sort-${item.id}`}>
      <div className="flex flex-col gap-8">
        <PracticePrompt sub={item.sub} />
        <div className="flex min-h-28 flex-col items-center justify-center gap-1 text-center">
          {current && sentence(current.sentence, `${item.id}-card-${done}`, true)}
          {current && showTranslation && <p className="text-sm font-bold text-ui-muted-strong">{current.sentence.english}</p>}
        </div>
        <div className="grid grid-cols-2 items-start gap-x-4 gap-y-3 sm:gap-x-8">
          {GROUPS.map((group) => (
            <div key={group} className="flex min-h-24 flex-col gap-2 border-t-[3px] border-ui-divider pt-3">
              <p className="text-base font-extrabold leading-tight text-ui-ink-strong">{item.groups[group].label}</p>
              {item.groups[group].pattern && <p className="font-chinese text-sm font-bold text-ui-muted-strong">{textIn(item.groups[group].pattern, script)}</p>}
              {item.cards.slice(0, done).flatMap((card, index) => (card.group === group ? [sentence(card.sentence, `${item.id}-card-${index}`, false)] : []))}
            </div>
          ))}
        </div>
      </div>
      {trayHost && createPortal(
        GROUPS.map((group) => (
          <div key={group} className="shrink-0 select-none">
            <PracticeChoiceButton compact disabled={locked || !current} onClick={() => choose(group)} className="w-auto">
              <span className="text-base font-extrabold leading-tight">{item.groups[group].label}</span>
            </PracticeChoiceButton>
          </div>
        )),
        trayHost,
      )}
    </LayoutGroup>
  );
}
