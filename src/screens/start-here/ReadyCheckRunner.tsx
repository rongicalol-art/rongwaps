import { useCallback, useEffect, useState } from 'react';
import { ActionButton, AppIcon, IconActionButton } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { playStartHereClip, stopStartHereAudio } from './audio/startHereAudio';
import { QuestionView } from './components/QuestionView';
import type { ReadyCheckQuestion } from './data/types';

interface ReadyCheckRunnerProps {
  questions: ReadyCheckQuestion[];
  passThreshold?: number;
  onPass: () => void;
  onExitOverview: () => void;
  onGoToLesson1: () => void;
  onReviewPart?: (partId: ReadyCheckQuestion['partId']) => void;
}

export function ReadyCheckRunner({
  questions,
  passThreshold = 11,
  onPass,
  onExitOverview,
  onGoToLesson1,
  onReviewPart,
}: ReadyCheckRunnerProps) {
  const [queue, setQueue] = useState<ReadyCheckQuestion[]>(() => questions);
  const [index, setIndex] = useState(0);
  const [retriedIds, setRetriedIds] = useState<Set<string>>(() => new Set());
  const [firstTryResults, setFirstTryResults] = useState<Record<string, boolean>>({});
  const [missedPartIds, setMissedPartIds] = useState<Set<ReadyCheckQuestion['partId']>>(() => new Set());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setQueue(questions);
    setIndex(0);
    setRetriedIds(new Set());
    setFirstTryResults({});
    setMissedPartIds(new Set());
    setFinished(false);
    return () => stopStartHereAudio();
  }, [questions]);

  const handlePlayAudio = useCallback((audioKey: string | string[]) => {
    void playStartHereClip(audioKey);
  }, []);

  const currentQuestion = queue[index];

  const handleAnswered = (correct: boolean) => {
    if (!currentQuestion) return;
    if (!(currentQuestion.id in firstTryResults)) {
      setFirstTryResults((prev) => ({ ...prev, [currentQuestion.id]: correct }));
    }
    if (!correct) {
      setMissedPartIds((prev) => new Set(prev).add(currentQuestion.partId));
      if (!retriedIds.has(currentQuestion.id)) {
        setRetriedIds((prev) => new Set(prev).add(currentQuestion.id));
        setQueue((prev) => [...prev, currentQuestion]);
      }
    }
  };

  const firstTryCorrectCount = Object.values(firstTryResults).filter(Boolean).length;
  const passed = firstTryCorrectCount >= passThreshold;

  const handleContinue = () => {
    stopStartHereAudio();
    if (index + 1 >= queue.length) {
      setFinished(true);
      if (firstTryCorrectCount >= passThreshold) {
        onPass();
      }
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (finished || !currentQuestion) {
    const firstMissedPart = Array.from(missedPartIds)[0];
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <div
          className={cn(
            'mb-4 flex size-16 items-center justify-center rounded-feature border-2',
            passed
              ? 'border-feedback-success bg-feedback-success-surface text-feedback-success-text'
              : 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep',
          )}
        >
          <AppIcon name={passed ? 'check' : 'target'} className="size-8" />
        </div>

        <h2 className="m-0 text-[28px] font-black text-ui-ink-strong">
          {passed ? 'You’re ready for Lesson 1!' : 'Good practice run'}
        </h2>
        <p className="mt-2 max-w-[42ch] text-base font-extrabold text-ui-muted-strong">
          {firstTryCorrectCount} of {questions.length} right on the first try
          {passed ? '. Start here is checked off.' : ` (pass is ${passThreshold} of ${questions.length}).`}
        </p>

        <div className="mt-7 flex w-full max-w-[360px] flex-col gap-2.5">
          {passed ? (
            <>
              <ActionButton variant="primary" size="lg" fullWidth onClick={onGoToLesson1}>
                Start Book 1 Lesson 1
              </ActionButton>
              <ActionButton variant="quiet" size="md" fullWidth onClick={onExitOverview}>
                Back to Start here
              </ActionButton>
            </>
          ) : (
            <>
              {firstMissedPart && onReviewPart && (
                <ActionButton variant="primary" size="lg" fullWidth onClick={() => onReviewPart(firstMissedPart)}>
                  Brush up Part {firstMissedPart}
                </ActionButton>
              )}
              <ActionButton variant="secondary" size="md" fullWidth onClick={onExitOverview}>
                Back to Start here
              </ActionButton>
              <ActionButton variant="quiet" size="md" fullWidth onClick={onGoToLesson1}>
                Go to Lesson 1 anyway
              </ActionButton>
            </>
          )}
        </div>
      </div>
    );
  }

  const pct = Math.max(8, Math.round(((index + 1) / queue.length) * 100));
  const isRetry = index >= questions.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-16 flex-none items-center gap-3 px-4 md:h-[76px] md:px-8">
        <IconActionButton
          variant="quiet"
          label="Exit Ready check"
          icon={<AppIcon name="close" className="size-5" />}
          onClick={() => {
            stopStartHereAudio();
            onExitOverview();
          }}
        />
        <div className="h-[18px] flex-1 overflow-hidden rounded-full bg-brand-primary-track">
          <div
            className="sh-progress-shine h-full rounded-full bg-brand-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-black tabular-nums text-ui-muted-strong">
          {isRetry ? 'Retry' : `${index + 1}/${questions.length}`}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-36 pt-4">
        <div key={`${currentQuestion.id}-${index}`} className="sh-step-enter my-auto flex w-full max-w-[520px] flex-col gap-4">
          <h2 className="m-0 text-center text-[24px] font-black leading-tight text-ui-ink-strong md:text-[28px]">
            {currentQuestion.title}
          </h2>
          <QuestionView
            question={currentQuestion}
            questionKey={`ready-${currentQuestion.id}-${index}`}
            onPlayAudio={handlePlayAudio}
            onAnswered={handleAnswered}
            onContinue={handleContinue}
          />
        </div>
      </div>
    </div>
  );
}
