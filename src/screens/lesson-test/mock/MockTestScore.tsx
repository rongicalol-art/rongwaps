import { AppIcon, ActionButton, IconActionButton } from '../../../lib/widgets';
import type { LessonTestPart } from '../../../types/lessonTest';
import { LESSON_TEST_PARTS } from '../../../utils/lesson/lessonTestPlan';
import type { MockConfig, MockResult } from '../../../utils/mockTest/mockRun';
import { cn } from '../../../utils/cn';
import { kindLabel, levelText } from './mockTestText';

interface MockTestScoreProps {
  config: MockConfig;
  result: MockResult;
  misses: number;
  onFix: () => void;
  onAnswers: () => void;
  onClose: () => void;
  /** The answers are open over it: nothing here takes focus or keys. */
  covered?: boolean;
}

/** The TOCFL ladder: Novice, then Levels 1 to 6. */
const STEPS = ['N', '1', '2', '3', '4', '5', '6'];
const stepOf = (level: number | null) => (level === null ? -1 : level < 1 ? 0 : level);

/**
 * The score: the level in one word, where it sits from Novice to Level 6, each skill's number, then what to do
 * next. An estimate, and it says so.
 */
export function MockTestScore({ config, result, misses, onFix, onAnswers, onClose, covered = false }: MockTestScoreProps) {
  const at = stepOf(result.level);
  const skills = LESSON_TEST_PARTS.filter(({ part }) => result.skills[part as LessonTestPart]);
  return (
    <div inert={covered} className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain px-5 pb-10">
      <div className="mx-auto grid w-full max-w-md shrink-0 grid-cols-[2.5rem_1fr_2.5rem] items-center pt-3">
        <IconActionButton variant="quiet" icon={<AppIcon name="close" size={22} />} label="Close the test" onClick={onClose} />
        <h2 className="text-center text-lg font-black text-ui-ink-strong">{kindLabel(config.kind)}</h2>
      </div>
      <div className="mx-auto my-auto flex w-full max-w-md shrink-0 flex-col gap-6 py-6">
        {/* "Level 3" stands large; the longer "Below Level 1" and "Level 3 or above" step down to stay on two lines. */}
        <h1 className={cn('text-balance text-center font-black leading-none text-brand-primary-text', result.level !== null && !result.atCeiling ? 'text-6xl' : 'text-5xl')}>{levelText(result)}</h1>
        <ol aria-label={`${levelText(result)}, on the ladder from Novice to Level 6`} className="grid grid-cols-7 gap-1.5">
          {STEPS.map((step, index) => (
            <li
              key={step}
              aria-current={index === at ? 'true' : undefined}
              className={cn('rounded-sm py-2 text-center text-sm font-black', index === at ? 'bg-brand-primary text-brand-on-primary' : 'bg-brand-primary-track text-ui-muted-strong')}
            >
              {step}
            </li>
          ))}
        </ol>
        <dl className={cn('grid gap-3 text-center', skills.length === 2 && 'grid-cols-2')}>
          {skills.map(({ part, label }) => (
            <div key={part}>
              <dt className="text-sm font-extrabold text-ui-muted-strong">{label}</dt>
              <dd className="text-3xl font-black tabular-nums text-ui-ink-strong">
                {result.skills[part]!.score}
                <span className="text-base font-extrabold text-ui-muted"> / {result.scale}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className={cn('grid gap-3', misses > 0 && 'grid-cols-2')}>
          {misses > 0 && (
            <div data-tone="review">
              <ActionButton size="lg" fullWidth onClick={onFix}>Fix mistakes</ActionButton>
            </div>
          )}
          <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" onClick={onAnswers}>Answers</ActionButton>
        </div>
        <p className="text-center text-sm font-bold text-ui-muted-strong">Estimate</p>
      </div>
    </div>
  );
}
