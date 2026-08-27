import { ContextualChineseText } from '../../../lib/widgets';
import type { GrammarExerciseQuestion, GrammarWordToken } from '../../../types/models';

interface OpenResponseQuestionCardProps {
  question: GrammarExerciseQuestion;
  characterPreference: 'traditional' | 'simplified';
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
  responses: Record<string, string>;
  hasChecked: boolean;
  correctBlankIds: string[];
  wrongBlankIds: string[];
  onChange: (blankId: string, value: string) => void;
}

export function OpenResponseQuestionCard({
  question,
  characterPreference,
  contextTokens,
  onOpenWord,
  responses,
  hasChecked,
  correctBlankIds,
  wrongBlankIds,
  onChange,
}: OpenResponseQuestionCardProps) {
  const textFor = (traditional: string, simplified?: string) => (
    characterPreference === 'simplified' && simplified ? simplified : traditional
  );

  return (
    <article className="border-b border-ui-divider bg-ui-surface px-2 py-5 last:border-b-0 sm:px-3 sm:py-7">
      <p className="mb-3 text-[11px] font-black text-brand-primary">Try {question.number}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 font-chinese text-base font-bold leading-[1.9] text-ui-ink-strong sm:text-lg">
        {question.segments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <ContextualChineseText
                key={`${question.id}-text-${index}`}
                text={textFor(segment.traditional, segment.simplified)}
                tokens={contextTokens}
                characterPreference={characterPreference}
                onOpenWord={onOpenWord}
              />
            );
          }

          const isCorrect = correctBlankIds.includes(segment.id);
          const isWrong = wrongBlankIds.includes(segment.id);

          return (
            <label key={segment.id} className="min-w-[12rem] flex-1">
              <span className="sr-only">{segment.hint}</span>
              <input
                lang="zh"
                value={responses[segment.id] ?? ''}
                onChange={(event) => onChange(segment.id, event.target.value)}
                placeholder="Type your answer"
                aria-invalid={isWrong || undefined}
                className={`h-11 w-full rounded-[11px] border-2 bg-ui-canvas px-3 font-chinese text-base font-bold text-ui-ink-strong outline-none transition focus:ring-4 sm:text-lg ${
                  isWrong
                    ? 'border-feedback-danger focus:border-feedback-danger focus:ring-feedback-danger/15'
                    : isCorrect
                      ? 'border-feedback-success focus:border-feedback-success focus:ring-feedback-success/15'
                      : 'border-ui-border focus:border-brand-primary focus:ring-brand-primary/15'
                }`}
              />
            </label>
          );
        })}
      </div>

      {hasChecked && (
        <div className="mt-5 rounded-[15px] border-l-4 border-brand-primary bg-brand-primary-soft px-4 py-3" role="status">
          <p className="text-sm font-black text-brand-primary">
            {wrongBlankIds.length > 0 ? 'Compare your answer with the model' : 'Your answer matches the model'}
          </p>
          {question.segments.map((segment) => segment.type === 'blank' && (
            <div key={segment.id} className="mt-2 text-sm font-bold leading-6 text-ui-ink">
              <p>
                Your answer: <span className="font-chinese font-black">{responses[segment.id]}</span>
              </p>
              <p>
                Model: <span className="font-chinese font-black">{textFor(segment.answer, segment.answerSimplified)}</span>
              </p>
            </div>
          ))}
          {question.correctFeedback && (
            <p className="mt-2 text-sm font-bold leading-6 text-ui-ink">{question.correctFeedback}</p>
          )}
          {question.repairFeedback && (
            <p className="mt-1 text-sm font-bold leading-6 text-ui-muted-strong">
              Structure check: {question.repairFeedback}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
