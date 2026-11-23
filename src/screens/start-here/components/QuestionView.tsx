import { useEffect, useState } from 'react';
import { FeedbackBottomBar } from '../../../features/practice';
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
      }
      // After an answer, Space / Enter belong to the shared feedback bar's Continue.
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
          <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-1 rounded-feature border-[3px] border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface px-5 py-4">
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
                <span className="text-center text-2xl font-black leading-snug text-ui-ink-strong">
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
                  'flex min-h-[60px] w-full items-center gap-2 rounded-control border-2 border-b-[length:var(--depth-xl)] px-2 sm:gap-3 sm:px-4 py-3 text-left transition-[transform,border-color,background-color,opacity] duration-100 focus-ring',
                  question.isPinyinChoices ? 'text-2xl font-black' : 'text-lg font-extrabold',
                  !answered && 'cursor-pointer border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-hover active:mb-1 active:translate-y-1 active:border-b-2',
                  showRight && 'sh-pop border-feedback-success bg-feedback-success-surface text-feedback-success-text',
                  showWrong && 'sh-shake border-feedback-danger bg-feedback-danger-surface text-feedback-danger-text',
                  dimOther && 'border-ui-divider bg-ui-surface text-ui-muted-strong opacity-55',
                )}
              >
                <span
                  className={cn(
                    'flex size-5.5 shrink-0 items-center justify-center rounded-xs border-2 text-xs font-black tabular-nums',
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

      {/* The app's own answer bar (quiz, listening, lesson tests): full width under the window, the word on a tile. */}
      <FeedbackBottomBar
        status={answered ? (isCorrect ? 'correct' : 'wrong') : 'idle'}
        showCheck={false}
        word={question.feedback.hanzi
          ? { hanzi: question.feedback.hanzi, pinyin: question.feedback.pinyin, meaning: question.feedback.meaning }
          : undefined}
        detail={!question.feedback.hanzi && (
          <p className="text-base font-bold leading-snug text-ui-muted-strong">
            <span className="text-lg font-extrabold text-ui-ink-strong">{question.feedback.pinyin}</span>
            {question.feedback.meaning && <> · {question.feedback.meaning}</>}
          </p>
        )}
        onContinue={onContinue}
      />
    </>
  );
}
