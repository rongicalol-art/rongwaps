import { useEffect, useState } from 'react';
import { ActionButton, AppIcon, ContextualChineseText } from '../../../lib/widgets';
import type { InteractiveReadingPart } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface ReadingTimelinePracticePageProps {
  part: InteractiveReadingPart;
  characterPreference: 'traditional' | 'simplified';
  onOpenWord: (word: string) => void;
  onReadyChange: (ready: boolean) => void;
}

const ORDER_IDS = ['class', 'wake', 'dinner', 'library', 'sleep', 'school', 'cook', 'lunch'];

export function ReadingTimelinePracticePage({
  part,
  characterPreference,
  onOpenWord,
  onReadyChange,
}: ReadingTimelinePracticePageProps) {
  const timeline = part.timeline ?? [];
  const checks = part.timelineChecks ?? [];
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const orderedItems = ORDER_IDS.map((id) => timeline.find((item) => item.id === id)).filter(Boolean);
  const correctOrder = orderedIds.length === timeline.length
    && orderedIds.every((id, index) => id === timeline[index]?.id);
  const checksComplete = checks.every((check) => answers[check.id] === check.answerId);
  const ready = correctOrder && checksComplete;

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  const addToOrder = (id: string) => {
    if (!orderedIds.includes(id)) setOrderedIds((current) => [...current, id]);
  };

  return (
    <section className="mx-auto w-full max-w-4xl" aria-labelledby="timeline-practice-title">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-primary">Practice the reading</p>
      <h2 id="timeline-practice-title" className="mt-1 text-[28px] font-black leading-tight text-ui-ink-strong sm:text-[36px]">
        Rebuild Youmei’s day
      </h2>
      <p className="mt-3 text-sm font-bold leading-relaxed text-ui-muted sm:text-base">
        Add all eight activities from earliest to latest, then answer three reading checks.
      </p>

      <div className="mt-7 rounded-[20px] border border-ui-divider bg-ui-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-black text-ui-ink-strong">1. Put the day in order</p>
          {orderedIds.length > 0 && (
            <ActionButton variant="quiet" size="sm" onClick={() => setOrderedIds([])}>
              <AppIcon name="restart" size={16} />
              Reset
            </ActionButton>
          )}
        </div>

        <div className="mt-4 flex min-h-14 flex-wrap gap-2 rounded-[16px] bg-ui-canvas p-3" aria-live="polite">
          {orderedIds.length === 0 && <p className="m-auto text-sm font-bold text-ui-muted">Your timeline appears here.</p>}
          {orderedIds.map((id, index) => {
            const item = timeline.find((entry) => entry.id === id);
            if (!item) return null;
            return (
              <span key={id} className="rounded-[11px] border border-ui-border bg-ui-surface px-2.5 py-1.5 text-xs font-black text-ui-ink">
                {index + 1}. {item.time}
              </span>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {orderedItems.map((item) => {
            if (!item) return null;
            const chinese = characterPreference === 'simplified' ? item.simplified : item.traditional;
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-[15px] border border-ui-divider bg-ui-canvas px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-chinese text-base font-bold text-ui-ink-strong">
                    <ContextualChineseText text={chinese} tokens={part.teachingGlossary} characterPreference={characterPreference} onOpenWord={onOpenWord} />
                  </p>
                  <p className="text-xs font-bold text-ui-muted">{item.english}</p>
                </div>
                <ActionButton variant="secondary" size="sm" disabled={orderedIds.includes(item.id)} onClick={() => addToOrder(item.id)}>
                  Add
                </ActionButton>
              </div>
            );
          })}
        </div>

        {orderedIds.length === timeline.length && (
          <p className={cn('mt-3 text-sm font-black', correctOrder ? 'text-feedback-success' : 'text-feedback-danger')} role="status">
            {correctOrder ? 'Timeline correct.' : 'Not chronological yet. Reset and follow the printed times.'}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {checks.map((check, index) => (
          <fieldset key={check.id} className="rounded-[20px] border border-ui-divider bg-ui-surface p-4 sm:p-5">
            <legend className="px-1 font-black text-ui-ink-strong">
              {index + 2}. <ContextualChineseText text={check.prompt} tokens={part.teachingGlossary} characterPreference={characterPreference} onOpenWord={onOpenWord} />
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {check.options.map((option) => {
                const selected = answers[check.id] === option.id;
                const chinese = characterPreference === 'simplified' ? option.simplified : option.traditional;
                return (
                  <div key={option.id} className={cn('rounded-[15px] border p-3', selected ? 'border-brand-primary bg-brand-primary/10' : 'border-ui-divider bg-ui-canvas')}>
                    <p className="font-chinese text-lg font-bold text-ui-ink-strong">
                      <ContextualChineseText text={chinese} tokens={part.teachingGlossary} characterPreference={characterPreference} onOpenWord={onOpenWord} />
                    </p>
                    <p className="mb-2 text-xs font-bold text-ui-muted">{option.english}</p>
                    <ActionButton variant={selected ? 'secondary' : 'quiet'} size="sm" fullWidth aria-pressed={selected} onClick={() => setAnswers((current) => ({ ...current, [check.id]: option.id }))}>
                      {selected ? 'Selected' : 'Choose'}
                    </ActionButton>
                  </div>
                );
              })}
            </div>
            {answers[check.id] && (
              <p className={cn('mt-3 text-sm font-bold', answers[check.id] === check.answerId ? 'text-feedback-success' : 'text-feedback-danger')} role="status">
                {answers[check.id] === check.answerId ? check.explanation : 'Look back at the timeline and try another answer.'}
              </p>
            )}
          </fieldset>
        ))}
      </div>

      {ready && (
        <div className="mt-5 rounded-[18px] border border-feedback-success/40 bg-[#E8F9DC] px-5 py-4 text-sm font-black text-[#3E8500]" role="status">
          Reading complete. You rebuilt all eight events and understood the key details.
        </div>
      )}
    </section>
  );
}
