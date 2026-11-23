import { useEffect, useState } from 'react';
import { ActionButton, AppIcon, KeyChip } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { QuestionChoice, QuestionScreen } from '../data/types';
import { CenterSpeaker, CornerSpeaker } from './SpeakerControls';
import { ToneContour } from './ToneContour';

interface QuestionViewProps {
  question: QuestionScreen;
  questionKey: string;
  onPlayAudio: (audioKey: string | string[]) => void;
  onAnswered?: (correct: boolean) => void;
  onContinue: () => void;
}

export function QuestionView({
  question,
  questionKey,
  onPlayAudio,
  onAnswered,
  onContinue,
}: QuestionViewProps) {
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const answered = pickedIndex !== null;
  const pickedChoice = answered ? question.choices[pickedIndex] : null;
  const isCorrect = Boolean(pickedChoice?.correct);

  useEffect(() => {
    setPickedIndex(null);
    if (!question.noAuto && question.audio.length > 0) {
      onPlayAudio(question.audio);
    }
  }, [questionKey, question, onPlayAudio]);

  const selectChoice = (choice: QuestionChoice, idx: number) => {
    if (answered) return;
    setPickedIndex(idx);
    onAnswered?.(choice.correct);
    if (!choice.correct && question.contrast && question.contrast.length === 2) {
      onPlayAudio(question.contrast);
    } else if (question.audio.length > 0) {
      onPlayAudio(question.audio);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (!answered) {
        const num = Number(e.key);
        if (num >= 1 && num <= question.choices.length) {
          e.preventDefault();
          selectChoice(question.choices[num - 1], num - 1);
          return;
        }
        if ((e.key === 'r' || e.key === 'R') && question.audio.length > 0) {
          e.preventDefault();
          onPlayAudio(question.audio);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const gridClass =
    question.layout === 'two'
      ? 'grid-cols-2'
      : question.layout === 'three'
        ? 'grid-cols-3'
        : 'grid-cols-1';

  return (
    <>
      <div className="flex flex-col gap-4">
        {question.prompt ? (
          <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-1 rounded-feature border-[3px] border-b-[6px] border-ui-divider bg-ui-surface px-5 py-4">
            {question.audio.length > 0 && (
              <CornerSpeaker onClick={() => onPlayAudio(question.audio)} label="Play question audio" />
            )}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {question.prompt.hanzi && (
                <span className="font-chinese text-[60px] font-bold leading-none text-ui-ink-strong md:text-[68px]">
                  {question.prompt.hanzi}
                </span>
              )}
              {question.prompt.pinyin && (
                <span className="text-[46px] font-extrabold leading-none text-ui-ink-strong md:text-[56px]">
                  {question.prompt.pinyin}
                </span>
              )}
              {question.prompt.text && (
                <span className="text-center text-[24px] font-black leading-snug text-ui-ink-strong">
                  {question.prompt.text}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <CenterSpeaker
              onClick={() => question.audio.length > 0 && onPlayAudio(question.audio)}
              label="Hear question audio"
            />
          </div>
        )}

        <div className={cn('grid gap-3', gridClass)}>
          {question.choices.map((choice, idx) => {
            const picked = pickedIndex === idx;
            const showRight = answered && choice.correct;
            const showWrong = answered && picked && !choice.correct;
            const dimOther = answered && !showRight && !showWrong;

            return (
              <button
                key={`${choice.label}-${idx}`}
                type="button"
                disabled={answered}
                onClick={() => selectChoice(choice, idx)}
                className={cn(
                  'flex min-h-[60px] w-full items-center gap-2 rounded-control border-2 border-b-[6px] px-2 sm:gap-3 sm:px-4 py-3 text-left transition-[transform,border-color,background-color,opacity] duration-100 focus-ring',
                  question.isPinyinChoices ? 'text-[24px] font-black' : 'text-[18px] font-extrabold',
                  !answered && 'cursor-pointer border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-hover active:mb-[4px] active:translate-y-[4px] active:border-b-2',
                  showRight && 'sh-pop border-feedback-success bg-feedback-success-surface text-feedback-success-text',
                  showWrong && 'sh-shake border-feedback-danger bg-feedback-danger-surface text-feedback-danger-text',
                  dimOther && 'border-ui-divider bg-ui-surface text-ui-muted-strong opacity-55',
                )}
              >
                <span
                  className={cn(
                    'flex size-[22px] shrink-0 items-center justify-center rounded-xs border-2 text-xs font-black tabular-nums',
                    showRight
                      ? 'border-feedback-success text-feedback-success-text'
                      : showWrong
                        ? 'border-feedback-danger text-feedback-danger-text'
                        : 'border-ui-border text-ui-muted-strong',
                  )}
                >
                  {idx + 1}
                </span>
                {choice.tone && (
                  <ToneContour tone={choice.tone} className="h-6 w-8 shrink-0 sm:h-8 sm:w-12" />
                )}
                <span className="min-w-0 flex-1 leading-snug">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {answered && (
        <div
          className={cn(
            'sh-step-enter fixed inset-x-0 bottom-0 z-20 border-t-2 border-ui-divider px-4 py-4 md:left-[var(--workspace-nav-width)]',
            isCorrect ? 'bg-feedback-success-surface' : 'bg-feedback-danger-surface',
          )}
          role="region"
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-[520px] flex-col gap-3 md:max-w-[860px] md:flex-row md:items-center md:gap-7">
            <div className="flex flex-1 flex-col gap-1">
              <div
                className={cn(
                  'flex items-center gap-2 text-[19px] font-black',
                  isCorrect ? 'text-feedback-success-text' : 'text-feedback-danger-text',
                )}
              >
                <AppIcon name={isCorrect ? 'check' : 'close'} className="size-[22px] shrink-0" />
                <span>{isCorrect ? 'Nice!' : 'Listen closely'}</span>
              </div>

              {(question.feedback.hanzi || question.feedback.pinyin || question.feedback.meaning) && (
                <div className="flex items-center gap-3.5 pt-0.5">
                  {question.feedback.hanzi && (
                    <span className="font-chinese text-[32px] font-bold leading-none text-ui-ink-strong">
                      {question.feedback.hanzi}
                    </span>
                  )}
                  <div className="min-w-0">
                    <span className="block text-[18px] font-extrabold leading-tight text-ui-ink-strong">
                      {question.feedback.pinyin}
                    </span>
                    <span className="block text-[15px] font-bold text-ui-muted-strong">
                      {question.feedback.meaning}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full md:ml-auto md:w-[260px]">
              <ActionButton
                variant={isCorrect ? 'success' : 'danger'}
                size="lg"
                fullWidth
                onClick={onContinue}
              >
                <span className="relative">
                  Continue
                  <KeyChip>Enter</KeyChip>
                </span>
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
