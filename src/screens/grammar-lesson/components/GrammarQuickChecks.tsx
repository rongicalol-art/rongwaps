import { useState } from 'react';
import { ActionButton, AppIcon, ContextualChineseText, GrammarFocusText } from '../../../lib/widgets';
import type { GrammarMicroCheck, GrammarWordToken } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface GrammarQuickChecksProps {
  checks: GrammarMicroCheck[];
  characterPreference: 'traditional' | 'simplified';
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarQuickChecks({
  checks,
  characterPreference,
  contextTokens,
  onOpenWord,
}: GrammarQuickChecksProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const textFor = (traditional: string, simplified?: string) =>
    characterPreference === 'simplified' && simplified ? simplified : traditional;
  const allAnswered = checks.every((_, index) => answers[index]);
  const correctCount = checks.filter((check, index) => answers[index] === check.answerId).length;

  return (
    <div
      className="mt-5 overflow-hidden rounded-[18px] border-2 border-ui-border bg-ui-surface"
      aria-labelledby="quick-check-heading"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <p id="quick-check-heading" className="text-sm font-black text-ui-ink-strong">
            Check your understanding
          </p>
          <p className="mt-0.5 text-xs font-bold text-ui-muted-strong">
            Pick the form that matches the situation.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-ui-hover px-3 py-1 text-[11px] font-black text-ui-muted-strong">
          {hasChecked
            ? `${correctCount}/${checks.length} correct`
            : `${checks.length} ${checks.length === 1 ? 'check' : 'checks'}`}
        </span>
      </div>
      <div className="border-t border-ui-divider">
        {checks.map((check, checkIndex) => {
          const answerId = answers[checkIndex];
          const isCorrect = answerId === check.answerId;
          const correctOption = check.options.find((option) => option.id === check.answerId);
          const correctText = correctOption
            ? textFor(correctOption.traditional, correctOption.simplified)
            : '';
          return (
            <article
              key={`${check.traditional}-${checkIndex}`}
              className="border-t border-ui-divider px-4 py-4 first:border-t-0 sm:px-5"
            >
              <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.05em] text-brand-primary">
                    Check {checkIndex + 1}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5 text-ui-muted-strong">{check.prompt}</p>
                  <p className="mt-2 font-chinese text-lg font-black text-ui-ink-strong">
                    <ContextualChineseText
                      text={textFor(check.traditional, check.simplified)}
                      tokens={contextTokens}
                      characterPreference={characterPreference}
                      onOpenWord={onOpenWord}
                    />
                  </p>
                </div>
                <div className="flex gap-2">
                  {check.options.map((option) => {
                    const isSelected = answerId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setAnswers((current) => ({
                            ...current,
                            [checkIndex]: option.id,
                          }));
                          setHasChecked(false);
                        }}
                        className={cn(
                          'min-h-10 min-w-12 rounded-[12px] border-2 px-3 font-chinese text-base font-black outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-primary/20',
                          isSelected
                            ? 'border-brand-primary bg-brand-primary text-white'
                            : 'border-ui-border bg-ui-canvas text-ui-ink-strong hover:border-brand-primary',
                        )}
                      >
                        {textFor(option.traditional, option.simplified)}
                      </button>
                    );
                  })}
                </div>
              </div>
              {hasChecked && (
                <p
                  className={cn(
                    'mt-3 flex items-start gap-1.5 border-t-2 border-ui-divider pt-3 text-sm font-bold leading-6',
                    isCorrect ? 'text-feedback-success' : 'text-feedback-danger',
                  )}
                  role="status"
                >
                  <AppIcon name={isCorrect ? 'check' : 'restart'} size={16} className="mt-0.5 shrink-0" />
                  <GrammarFocusText
                    text={
                      isCorrect
                        ? check.explanation
                        : `The intended answer is ${correctText}. ${check.explanation}`
                    }
                    contextTokens={contextTokens}
                    characterPreference={characterPreference}
                    onOpenWord={onOpenWord}
                  />
                </p>
              )}
            </article>
          );
        })}
      </div>
      <div className="flex justify-end border-t border-ui-divider bg-ui-canvas px-4 py-3 sm:px-5">
        <ActionButton
          disabled={!allAnswered}
          onClick={() => setHasChecked(true)}
          size="sm"
          className="sm:min-w-36"
        >
          Check answer
        </ActionButton>
      </div>
    </div>
  );
}
