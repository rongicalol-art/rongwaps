import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { SameMeaningItem } from '../../../types/models';
import { checkSameMeaning } from '../../../utils/grammar/grammarPracticePicks';
import { PracticeChoiceButton } from '../../practice';
import { PracticePrompt } from '../components/PracticePrompt';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

const CHOICES = [true, false] as const;

/** Both sentences stay visible: compare meaning, without a memory or construction step. */
export function SameMeaningExercise({
  item, script, status, showPinyin, shortcutsDisabled, onResult,
}: PracticeExerciseProps<SameMeaningItem>) {
  const locked = status !== 'idle';
  const choose = (same: boolean) => {
    if (locked) return;
    const verdict = checkSameMeaning(item, same);
    onResult({
      correct: verdict.correct,
      title: verdict.correct ? undefined : item.same ? 'Same meaning' : 'Different meanings',
      note: verdict.note,
    });
  };
  useNumberKeySelection({ items: CHOICES, onSelect: choose, disabled: locked || shortcutsDisabled });

  return (
    <div className="pt-6">
      <PracticePrompt sub={item.sub} />
      <div className="divide-y divide-ui-divider">
        {item.sentences.map((sentence, index) => (
          <div key={index} className="py-6 first:pt-0 last:pb-0 sm:py-8">
            <p className="font-chinese font-semibold text-3xl leading-relaxed text-ui-ink-strong sm:text-center" lang={script === 'simplified' ? 'zh-Hans' : 'zh-Hant'}>
              {textIn(sentence, script)}
            </p>
            {showPinyin && <p className="mt-1 text-sm font-extrabold text-ui-muted-strong sm:text-center">{sentence.pinyin}</p>}
          </div>
        ))}
      </div>
      {!locked && (
        <div className="mx-auto mt-12 grid w-full max-w-sm grid-cols-2 gap-3 sm:gap-4" role="group" aria-label="Compare meanings">
          {CHOICES.map((same) => (
            <PracticeChoiceButton key={String(same)} compact onClick={() => choose(same)}>
              {same ? 'Same' : 'Different'}
            </PracticeChoiceButton>
          ))}
        </div>
      )}
    </div>
  );
}
