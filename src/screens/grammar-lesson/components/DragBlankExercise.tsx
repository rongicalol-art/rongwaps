import { useEffect, useMemo, useState } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { InteractiveGrammarPage } from '../../../types/models';
import { getGrammarTeachingTokens } from '../../../utils/grammarTeachingTokens';
import { useDragBlankExercise } from '../hooks/useDragBlankExercise';
import { ExerciseProfileStrip } from './ExerciseProfileStrip';
import { ExerciseContextStrip } from './ExerciseContextStrip';
import { ExerciseQuestionCard } from './ExerciseQuestionCard';
import { GrammarCompletionRecap } from './GrammarCompletionRecap';
import { OpenResponseQuestionCard } from './OpenResponseQuestionCard';

interface DragBlankExerciseProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  onOpenWord: (word: string) => void;
  onComplete: () => void;
  onContinue: () => void;
  continueLabel: string;
  completionMessage: string;
  standalone?: boolean;
}

export function DragBlankExercise({
  page,
  characterPreference,
  onOpenWord,
  onComplete,
  onContinue,
  continueLabel,
  completionMessage,
  standalone = false,
}: DragBlankExerciseProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = page.questions[currentQuestionIndex] ?? page.questions[0];
  const exerciseQuestions = useMemo(() => [currentQuestion], [currentQuestion]);
  const exercise = useDragBlankExercise(exerciseQuestions, page.exerciseResponseMode);
  const contextTokens = getGrammarTeachingTokens(page);
  const firstWrongBlank = currentQuestion.segments
    .find((segment) => segment.type === 'blank' && exercise.wrongBlankIds.includes(segment.id));
  const isLastQuestion = currentQuestionIndex === page.questions.length - 1;

  useEffect(() => {
    if (exercise.status === 'complete' && isLastQuestion) onComplete();
  }, [exercise.status, isLastQuestion, onComplete]);

  const resetExercise = () => {
    setCurrentQuestionIndex(0);
    exercise.resetExercise();
  };

  const advanceQuestion = () => {
    exercise.resetExercise();
    setCurrentQuestionIndex((index) => Math.min(index + 1, page.questions.length - 1));
  };

  return (
    <section aria-labelledby="exercise-heading" className={standalone ? '' : 'mt-10 border-t-2 border-ui-divider pt-8'}>
      <div className="mb-7 flex items-start justify-between gap-4 border-b border-ui-divider pb-6">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.06em] text-feedback-warning">
            Build it
          </p>
          <h2 id="exercise-heading" className="text-2xl font-black leading-tight text-ui-ink-strong sm:text-3xl">
            {page.exerciseTitle}
          </h2>
          <p className="mt-2 text-sm font-bold text-ui-muted-strong sm:text-base">{page.exerciseInstruction}</p>
        </div>
        <span className="shrink-0 rounded-[13px] border border-ui-border bg-ui-surface px-3 py-2 text-xs font-black text-ui-muted-strong">
          Page {page.printedPages[0]}
        </span>
      </div>

      {page.profiles && page.profiles.length > 0 && <ExerciseProfileStrip profiles={page.profiles} />}
      {page.exerciseCues && page.exerciseCues.length > 0 && <ExerciseContextStrip cues={page.exerciseCues} />}

      <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-[20px] border-2 border-ui-border bg-ui-surface px-3 py-2 sm:px-5 sm:py-3">
        {currentQuestion.sectionLabel && (
          <h3 className="mb-2 mt-2 inline-flex rounded-[9px] bg-feedback-warning px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.06em] text-ui-ink-strong">
            {currentQuestion.sectionLabel}
          </h3>
        )}
        <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3 sm:px-3">
          <p className="text-[11px] font-black uppercase tracking-[0.07em] text-brand-primary">
            Question {currentQuestionIndex + 1} of {page.questions.length}
          </p>
          <span className="text-[11px] font-bold text-ui-muted">Follow the sentence carefully</span>
        </div>
        {(currentQuestion.responseMode ?? page.exerciseResponseMode) === 'text' ? (
          <OpenResponseQuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            characterPreference={characterPreference}
            contextTokens={contextTokens}
            onOpenWord={onOpenWord}
            responses={exercise.textResponses}
            hasChecked={exercise.hasChecked}
            correctBlankIds={exercise.correctBlankIds}
            wrongBlankIds={exercise.wrongBlankIds}
            onChange={exercise.setTextResponse}
          />
        ) : (
          <ExerciseQuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            characterPreference={characterPreference}
            contextTokens={contextTokens}
            onOpenWord={onOpenWord}
            placements={exercise.placements}
            selectedTileId={exercise.selectedTileId}
            correctBlankIds={exercise.correctBlankIds}
            wrongBlankIds={exercise.wrongBlankIds}
            getTile={exercise.getTile}
            onSelectTile={exercise.setSelectedTileId}
            onPlaceTile={exercise.placeTile}
            onRemoveTile={exercise.removeTile}
          />
        )}

        <div className="mt-5 border-t border-ui-divider pt-5">
          {exercise.status === 'complete' && isLastQuestion && page.completionRecap && (
            <GrammarCompletionRecap
              recap={page.completionRecap}
              characterPreference={characterPreference}
            />
          )}
          {exercise.status === 'needs-repair' && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-feature border-b-[length:var(--depth-md)] border-feedback-danger-edge bg-feedback-danger-surface p-4" role="status">
              <div>
                <p className="flex items-center gap-2 font-black text-feedback-danger">
                  <AppIcon name="restart" size={18} /> A few answers need another look.
                </p>
                {firstWrongBlank?.type === 'blank' && (
                  <p className="mt-1 text-xs font-bold text-feedback-danger">The first hint is shown beside its question.</p>
                )}
              </div>
              <ActionButton variant="secondary" size="sm" onClick={exercise.returnIncorrectTiles}>
                Try incorrect answers again
              </ActionButton>
            </div>
          )}

          {exercise.status === 'complete' ? (
            isLastQuestion ? (
              <div className="flex flex-col gap-4 rounded-[16px] border-2 border-feedback-success bg-ui-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" role="status">
                <div>
                  <p className="flex items-center gap-2 font-black text-feedback-success">
                    <AppIcon name="check" size={21} /> Exercise complete
                  </p>
                  <p className="mt-1 text-xs font-bold text-feedback-success">{completionMessage}</p>
                </div>
                <ActionButton onClick={onContinue} className="sm:px-5">
                  {continueLabel} <AppIcon name="next" size={18} />
                </ActionButton>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-[16px] bg-feedback-success-surface/60 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
                <p className="flex items-center gap-2 text-sm font-black text-feedback-success">
                  <AppIcon name="check" size={19} /> Question complete
                </p>
                <ActionButton onClick={advanceQuestion} className="sm:px-5">
                  Next question <AppIcon name="next" size={18} />
                </ActionButton>
              </div>
            )
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <ActionButton
                variant="quiet"
                onClick={resetExercise}
                className="sm:px-5"
              >
                <AppIcon name="restart" size={18} /> Reset
              </ActionButton>
              <ActionButton
                disabled={!exercise.allBlanksFilled}
                onClick={exercise.checkAnswers}
                fullWidth
                className="sm:max-w-xs"
              >
                Check answers
              </ActionButton>
            </div>
          )}
        </div>
        {page.exerciseNote && <p className="text-center text-[11px] font-bold text-ui-muted">{page.exerciseNote}</p>}
      </div>
    </section>
  );
}
