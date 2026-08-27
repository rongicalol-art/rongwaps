import type { DragEvent, KeyboardEvent } from 'react';
import { useEffect } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { GrammarUnscrambleTile, InteractiveGrammarPage } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { useSentenceUnscramble } from '../hooks/useSentenceUnscramble';

interface SentenceUnscrambleExerciseProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  onComplete: () => void;
  onContinue: () => void;
  continueLabel: string;
  completionMessage: string;
}

export function SentenceUnscrambleExercise({
  page,
  characterPreference,
  onComplete,
  onContinue,
  continueLabel,
  completionMessage,
}: SentenceUnscrambleExerciseProps) {
  const data = page.unscrambleExercise;
  if (!data) throw new Error(`Missing unscramble exercise for ${page.id}`);
  const exercise = useSentenceUnscramble(data);
  const tileById = (tileId: string) => data.tiles.find((tile) => tile.id === tileId);
  const textFor = (tile: GrammarUnscrambleTile) => (
    characterPreference === 'simplified' && tile.simplified ? tile.simplified : tile.traditional
  );

  useEffect(() => {
    if (exercise.status === 'complete') onComplete();
  }, [exercise.status, onComplete]);

  const handleDropIntoAnswer = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const tileId = event.dataTransfer.getData('text/plain');
    if (tileId) exercise.addTile(tileId);
  };

  const handleAnswerKey = (event: KeyboardEvent<HTMLButtonElement>, tileId: string, index: number) => {
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      exercise.moveTile(tileId, index - 1);
    }
    if (event.key === 'ArrowRight' && index < exercise.orderedTileIds.length - 1) {
      event.preventDefault();
      exercise.moveTile(tileId, index + 1);
    }
  };

  return (
    <section aria-labelledby="unscramble-heading">
      <div className="mb-7 flex items-start justify-between gap-4 border-b border-ui-divider pb-6">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.06em] text-feedback-warning">
            Build it
          </p>
          <h2 id="unscramble-heading" className="text-2xl font-black leading-tight text-ui-ink-strong sm:text-3xl">
            {page.exerciseTitle}
          </h2>
          <p className="mt-2 text-sm font-bold text-ui-muted-strong sm:text-base">{page.exerciseInstruction}</p>
        </div>
        <span className="shrink-0 rounded-[13px] border border-ui-border bg-ui-surface px-3 py-2 text-xs font-black text-ui-muted-strong">
          Page {page.printedPages[0]}
        </span>
      </div>

      <div className="mx-auto max-w-4xl overflow-hidden rounded-[20px] border-2 border-ui-border bg-ui-surface p-3 sm:p-6">
        <article className="bg-ui-surface px-1 py-2 sm:px-2 sm:py-1">
          <p className="text-sm font-black text-ui-ink-strong">{data.prompt}</p>
          <p className="mt-1 text-xs font-bold text-ui-muted-strong">Tap tiles to place them. Drag or use arrow keys to reorder.</p>

          <div
            aria-label="Your sentence"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropIntoAnswer}
            className={cn(
              'mt-5 flex min-h-20 flex-wrap items-center gap-2 rounded-[16px] border-2 border-dashed bg-ui-canvas p-3',
              exercise.status === 'needs-repair' && 'border-feedback-danger',
              exercise.status === 'complete' && 'border-feedback-success',
              exercise.status === 'idle' && 'border-ui-border',
            )}
          >
            {exercise.orderedTileIds.length === 0 && (
              <p className="w-full text-center text-sm font-bold text-ui-muted">Build sentence here</p>
            )}
            {exercise.orderedTileIds.map((tileId, index) => {
              const tile = tileById(tileId);
              if (!tile) return null;
              return (
                <ActionButton
                  key={tile.id}
                  variant="secondary"
                  size="sm"
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', tile.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    exercise.moveTile(event.dataTransfer.getData('text/plain'), index);
                  }}
                  onKeyDown={(event) => handleAnswerKey(event, tile.id, index)}
                  onClick={() => exercise.removeTile(tile.id)}
                  aria-label={`${textFor(tile)}. Position ${index + 1}. Click to remove; arrow keys reorder.`}
                  className="min-w-11 px-3 font-chinese font-black text-lg"
                >
                  {textFor(tile)}
                </ActionButton>
              );
            })}
          </div>

          {exercise.status === 'complete' && (
            <div className="mt-3 grid gap-2 sm:grid-cols-5" aria-label="Sentence roles">
              {data.correctOrder.map((tileId) => {
                const tile = tileById(tileId);
                return tile ? (
                  <div key={tile.id} className="rounded-[10px] bg-brand-primary/10 px-2 py-2 text-center">
                    <p className="text-[10px] font-black uppercase text-brand-primary">{tile.role}</p>
                    <p className="mt-0.5 font-chinese text-sm font-black text-ui-ink-strong">{textFor(tile)}</p>
                  </div>
                ) : null;
              })}
            </div>
          )}

          <div className="mt-5 flex min-h-12 flex-wrap gap-2 border-t border-ui-divider pt-4" aria-label="Scrambled tiles">
            {exercise.availableTiles.map((tile) => (
              <ActionButton
                key={tile.id}
                variant="secondary"
                size="sm"
                draggable
                onDragStart={(event) => event.dataTransfer.setData('text/plain', tile.id)}
                onClick={() => exercise.addTile(tile.id)}
                title={tile.meaning}
                className="min-w-11 px-3 font-chinese font-black text-lg"
              >
                {textFor(tile)}
              </ActionButton>
            ))}
            {exercise.availableTiles.length === 0 && (
              <span className="py-2 text-xs font-bold text-ui-muted">All tiles placed</span>
            )}
          </div>

          {exercise.status === 'needs-repair' && (
            <p className="mt-4 rounded-[14px] border-l-4 border-feedback-danger bg-[#FFF1F1] px-4 py-3 text-sm font-bold leading-6 text-feedback-danger" role="status">
              {data.repairFeedback}
            </p>
          )}
          {exercise.status === 'complete' && (
            <p className="mt-4 rounded-[14px] bg-[#F0FAE8] px-4 py-3 text-sm font-bold leading-6 text-feedback-success" role="status">
              {data.correctFeedback}
            </p>
          )}
        </article>

        <div className="mt-6">
          {exercise.status === 'complete' ? (
            <div className="flex flex-col gap-4 rounded-[20px] border-2 border-feedback-success bg-ui-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="flex items-center gap-2 font-black text-feedback-success">
                  <AppIcon name="check" size={21} /> Exercise complete
                </p>
                <p className="mt-1 text-xs font-bold text-feedback-success">{completionMessage}</p>
              </div>
              <ActionButton onClick={onContinue}>{continueLabel} <AppIcon name="next" size={18} /></ActionButton>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <ActionButton variant="quiet" onClick={exercise.reset}>
                <AppIcon name="restart" size={18} /> Reset
              </ActionButton>
              <ActionButton
                disabled={!exercise.allTilesPlaced}
                onClick={exercise.checkAnswer}
                fullWidth
                className="sm:max-w-xs"
              >
                Check order
              </ActionButton>
            </div>
          )}
        </div>
        {page.exerciseNote && <p className="mt-4 text-center text-[11px] font-bold text-ui-muted">{page.exerciseNote}</p>}
      </div>
    </section>
  );
}
