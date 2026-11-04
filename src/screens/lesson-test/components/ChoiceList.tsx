import { PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import { SpeakerIcon } from '../../../lib/widgets';
import type { LessonTestQuestion, TestChoice } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { ChineseText } from './ChineseText';

export type Script = 'traditional' | 'simplified';

/** Bars standing in for an answer that is only heard; they light up while it is read. */
export function WaveBars({ seed, active }: { seed: number; active: boolean }) {
  return (
    <span aria-hidden className="flex h-7 flex-1 items-center gap-0.5">
      {Array.from({ length: 22 }, (_, index) => (
        <span
          key={index}
          style={{ height: `${30 + Math.round(60 * Math.abs(Math.sin((index + seed * 7) * 1.7)))}%` }}
          className={cn('w-1 rounded-full transition-colors duration-200', active ? 'bg-brand-primary' : 'bg-ui-border')}
        />
      ))}
    </span>
  );
}

export const choiceText = (choice: TestChoice, script: Script) => choice[script] ?? choice.traditional ?? '';

interface ChoiceListProps {
  question: LessonTestQuestion;
  order: number[];
  selected: number | undefined;
  checked: boolean;
  /** Spoken answers show as sound bars until the question is checked. */
  spoken: boolean;
  /** Display position being read aloud. */
  mark: number | null;
  script: Script;
  onSelect: (original: number) => void;
  /** Fix round, after Check: a spoken answer plays again on tap. */
  onSay?: (original: number, shown: number) => void;
  /** Number keys answer another question on this screen. */
  keysOff?: boolean;
}

/** A/B/C answers in their shuffled order (TOCFL letters; keys 1–4 still pick them). */
export function ChoiceList({ question, order, selected, checked, spoken, mark, script, onSelect, onSay, keysOff = false }: ChoiceListProps) {
  const choices = question.choices ?? [];
  useNumberKeySelection({ items: order, onSelect, disabled: checked || keysOff });
  return (
    <div className="grid w-full grid-cols-1 gap-3">
      {order.map((original, shown) => {
        const choice = choices[original];
        const state = getPracticeChoiceState(selected === original, checked, original === question.key);
        const reveal = !spoken || checked;
        const say = spoken && checked && onSay && choice.audio;
        return (
          <PracticeChoiceButton
            key={original}
            index={shown}
            badge="letter"
            state={state}
            pressed={spoken && mark === shown}
            disabled={checked && !say}
            aria-label={say ? `Play ${choiceText(choice, script)}` : reveal ? undefined : `Answer ${'ABCD'[shown]}`}
            onClick={() => (say ? onSay(original, shown) : onSelect(original))}
          >
            {reveal ? (
              <span className="flex items-center gap-3">
                <span className="flex-1 text-pretty font-chinese text-xl font-normal leading-snug text-ui-ink-strong"><ChineseText text={choiceText(choice, script)} /></span>
                {say && <SpeakerIcon status={mark === shown ? 'playing' : null} size={20} className="shrink-0 text-ui-muted" />}
              </span>
            ) : (
              <WaveBars seed={shown} active={mark === shown} />
            )}
          </PracticeChoiceButton>
        );
      })}
    </div>
  );
}
