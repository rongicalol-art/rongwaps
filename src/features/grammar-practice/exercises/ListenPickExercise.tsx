import { createPortal } from 'react-dom';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ListenPickItem } from '../../../types/models';
import { checkListenPick } from '../../../utils/grammar/grammarPracticePicks';
import { PracticeChoiceButton } from '../../practice';
import { ClipButton } from '../components/ClipButton';
import { PracticePrompt } from '../components/PracticePrompt';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

/**
 * Hear and pick: the recording on top, the written sentences in the dock. One tap is the
 * answer; a wrong pick says what that sentence would have sounded like, and Try again
 * leaves the recording to replay.
 */
export function ListenPickExercise({
  item, script, status, showPinyin, shortcutsDisabled, trayHost, onResult,
}: PracticeExerciseProps<ListenPickItem>) {
  const locked = status !== 'idle';
  const choose = (choice: number) => {
    if (locked) return;
    const verdict = checkListenPick(item, choice);
    onResult(verdict.correct ? { correct: true, sentence: item.options[item.answer] } : { correct: false, note: verdict.note });
  };
  useNumberKeySelection({ items: [...item.options.keys()], onSelect: choose, disabled: locked || shortcutsDisabled });

  return (
    <>
      <div className="flex flex-col items-center gap-8">
        <PracticePrompt sub={item.sub} />
        <ClipButton clip={item.clip} status={status} />
      </div>
      {trayHost && createPortal(
        item.options.map((option, index) => (
          <div key={option.traditional} className="w-full shrink-0 select-none md:w-auto">
            <PracticeChoiceButton compact disabled={locked} onClick={() => choose(index)} className="w-full md:w-auto">
              <span className="flex flex-col items-start">
                <span className="font-chinese text-xl leading-snug">{textIn(option, script)}</span>
                {showPinyin && <span className="text-xs font-extrabold text-ui-muted-strong">{option.pinyin}</span>}
              </span>
            </PracticeChoiceButton>
          </div>
        )),
        trayHost,
      )}
    </>
  );
}
