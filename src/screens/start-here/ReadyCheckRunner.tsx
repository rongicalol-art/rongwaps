import { useCallback, useEffect, useRef, useState } from 'react';
import { SessionComplete } from '../../features/practice';
import { AppIcon, IconActionButton, ScreenHeader } from '../../lib/widgets';
import { playStartHereClip, stopStartHereAudio } from './audio/startHereAudio';
import { QuestionView } from './components/QuestionView';
import { TeacherHeader } from './components/TeacherHeader';
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
  const startedAt = useRef(Date.now());

  useEffect(() => {
    setQueue(questions);
    setIndex(0);
    setRetriedIds(new Set());
    setFirstTryResults({});
    setMissedPartIds(new Set());
    setFinished(false);
    startedAt.current = Date.now();
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
    // The app's own end screen: the bird, the headline, then Words / First try / Time.
    return (
      <div className="relative min-h-0 flex-1">
        <IconActionButton variant="quiet" icon={<AppIcon name="close" size={22} />} label="Back to Start here" onClick={() => onExitOverview()} className="absolute left-3 top-3 z-50 sm:left-5" />
        <SessionComplete
          headline={passed ? 'You’re ready for Lesson 1!' : 'Good practice run'}
          words={[...new Set(questions.map((q) => q.feedback.hanzi ?? q.feedback.pinyin))]}
          pct={Math.round(100 * firstTryCorrectCount / questions.length)}
          pctLabel="First try"
          seconds={Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))}
          onContinue={passed ? onGoToLesson1 : onExitOverview}
          reviewLabel={firstMissedPart ? `Brush up Part ${firstMissedPart}` : undefined}
          onReviewMissed={!passed && firstMissedPart && onReviewPart ? () => onReviewPart(firstMissedPart) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The same header and teacher as the lessons: the question is her line. */}
      <ScreenHeader
        variant="window"
        onClose={() => {
          stopStartHereAudio();
          onExitOverview();
        }}
        progress={100 * (index + 1) / queue.length}
        currentIndex={index}
        totalCount={queue.length}
      />
      <TeacherHeader prompt={currentQuestion.title} />

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-36 pt-4">
        <div key={`${currentQuestion.id}-${index}`} className="sh-step-enter my-auto flex w-full max-w-[520px] flex-col gap-4">
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
