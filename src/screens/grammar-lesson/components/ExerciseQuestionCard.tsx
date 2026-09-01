import type { DragEvent } from 'react';
import { ActionButton, ContextualChineseText } from '../../../lib/widgets';
import type {
  GrammarExerciseQuestion,
  GrammarExerciseTile,
  GrammarWordToken,
} from '../../../types/models';
import { cn } from '../../../utils/cn';

interface ExerciseQuestionCardProps {
  question: GrammarExerciseQuestion;
  characterPreference: 'traditional' | 'simplified';
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
  placements: Record<string, string>;
  selectedTileId: string | null;
  correctBlankIds: string[];
  wrongBlankIds: string[];
  getTile: (tileId: string) => GrammarExerciseTile | undefined;
  onSelectTile: (tileId: string | null) => void;
  onPlaceTile: (blankId: string, tileId: string) => void;
  onRemoveTile: (blankId: string) => void;
}

export function ExerciseQuestionCard({
  question,
  characterPreference,
  contextTokens,
  onOpenWord,
  placements,
  selectedTileId,
  correctBlankIds,
  wrongBlankIds,
  getTile,
  onSelectTile,
  onPlaceTile,
  onRemoveTile,
}: ExerciseQuestionCardProps) {
  const textFor = (traditional: string, simplified?: string) => (
    characterPreference === 'simplified' && simplified ? simplified : traditional
  );
  const availableTiles = question.tiles.filter((tile) => !Object.values(placements).includes(tile.id));
  const hasWrongAnswer = question.segments.some(
    (segment) => segment.type === 'blank' && wrongBlankIds.includes(segment.id),
  );
  const wrongHint = question.segments.find(
    (segment) => segment.type === 'blank' && wrongBlankIds.includes(segment.id),
  );
  const wrongTile = wrongHint?.type === 'blank'
    ? getTile(placements[wrongHint.id])
    : undefined;
  const blankIds = question.segments.flatMap((segment) => segment.type === 'blank' ? [segment.id] : []);
  const isQuestionCorrect = blankIds.length > 0 && blankIds.every((id) => correctBlankIds.includes(id));
  const handleDrop = (event: DragEvent<HTMLButtonElement>, blankId: string) => {
    event.preventDefault();
    const tileId = event.dataTransfer.getData('text/plain');
    if (tileId) onPlaceTile(blankId, tileId);
  };

  return (
    <article className={cn(
      'border-b border-ui-divider bg-ui-surface px-2 py-5 last:border-b-0 sm:px-3 sm:py-7',
      hasWrongAnswer && 'bg-feedback-danger-surface/35',
    )}>
      <p className="mb-3 text-[11px] font-black text-brand-primary">Try {question.number}</p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2.5 font-chinese text-base font-black leading-[1.9] text-ui-ink-strong sm:text-lg">
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

          const placedTile = getTile(placements[segment.id]);
          const isCorrect = correctBlankIds.includes(segment.id);
          const isWrong = wrongBlankIds.includes(segment.id);
          const canReceiveSelected = question.tiles.some((tile) => tile.id === selectedTileId) && !isCorrect;
          const answerLength = textFor(segment.answer, segment.answerSimplified).length;
          const blankWidthClass = answerLength === 1
            ? 'min-w-12 sm:min-w-14'
            : answerLength === 2
              ? 'min-w-16 sm:min-w-[72px]'
              : 'min-w-24 sm:min-w-28';
          const placedText = placedTile
            ? textFor(placedTile.traditional, placedTile.simplified)
            : '';
          return (
            <span key={segment.id} className="inline-flex items-center align-middle">
              <button
                type="button"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, segment.id)}
                onClick={() => {
                  if (selectedTileId && canReceiveSelected) onPlaceTile(segment.id, selectedTileId);
                  else if (placedTile) onRemoveTile(segment.id);
                }}
                disabled={isCorrect}
                data-grammar-blank-id={segment.id}
                aria-label={placedTile
                  ? `${placedText}. Remove answer`
                  : `Blank ${segment.id}. ${segment.hint}`}
                className={cn(
                  'inline-flex min-h-9 items-center justify-center rounded-[10px] border-2 border-dashed px-2 align-middle font-chinese text-base font-black transition-all sm:text-lg',
                  blankWidthClass,
                  !placedTile && !canReceiveSelected && 'border-ui-muted bg-ui-canvas text-ui-muted',
                  !placedTile && canReceiveSelected && 'border-feedback-warning-edge bg-feedback-warning/15 text-feedback-warning-edge focus-ring',
                  placedTile && !isCorrect && !isWrong && 'border-brand-primary bg-brand-primary-soft text-brand-primary',
                  isCorrect && 'border-feedback-success-edge bg-feedback-success-surface text-feedback-success-edge',
                  isWrong && 'border-feedback-danger-edge bg-feedback-danger-surface text-feedback-danger-edge',
                )}
              >
                {placedTile ? placedText : '＿'}
              </button>
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-10 flex-wrap gap-2 border-t border-ui-divider pt-3" aria-label={`Answer tiles for question ${question.number}`}>
        {availableTiles.length > 0 ? availableTiles.map((tile) => {
          const isSelected = selectedTileId === tile.id;
          const tileText = textFor(tile.traditional, tile.simplified);
          return (
            <ActionButton
              key={tile.id}
              type="button"
              variant="secondary"
              size="sm"
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', tile.id)}
              data-grammar-tile-id={tile.id}
              onClick={() => onSelectTile(isSelected ? null : tile.id)}
              aria-pressed={isSelected}
              title={tile.meaning}
              className={cn(
                'min-w-11 w-auto rounded-sm border-b-[length:var(--depth-sm)] px-3 py-1.5 font-chinese font-black text-base normal-case tracking-normal active:translate-y-[length:var(--depth-sm)] active:border-b-0',
                isSelected
                  ? 'border-feedback-warning-edge bg-feedback-warning text-ui-ink-strong'
                  : 'border-brand-primary-edge bg-brand-primary-soft text-ui-ink-strong',
              )}
            >
              {tileText}
            </ActionButton>
          );
        }) : <span className="py-2 text-xs font-bold text-ui-muted">All tiles placed</span>}
      </div>

      {wrongHint?.type === 'blank' && (
        <div className="mt-4 rounded-control border-l-4 border-feedback-danger bg-feedback-danger-surface px-4 py-3" role="status">
          <p className="text-sm font-black text-feedback-danger">Why this answer does not work</p>
          {wrongTile && (
            <p className="mt-1 text-sm font-bold leading-6 text-ui-ink">
              You chose <span className="font-chinese font-black">{textFor(wrongTile.traditional, wrongTile.simplified)}</span>.
              {wrongTile.meaning ? ` That choice means: ${wrongTile.meaning}.` : ''}
            </p>
          )}
          <p className="mt-1 text-sm font-bold leading-6 text-ui-ink">
            {question.repairFeedback ?? wrongHint.hint}
          </p>
          <p className="mt-1 text-sm font-bold leading-6 text-ui-muted-strong">
            Better model: <span className="font-chinese font-black text-ui-ink-strong">{textFor(wrongHint.answer, wrongHint.answerSimplified)}</span>
          </p>
        </div>
      )}
      {isQuestionCorrect && question.correctFeedback && (
        <p className="mt-4 rounded-control bg-feedback-success-surface px-4 py-3 text-sm font-bold leading-6 text-feedback-success" role="status">
          {question.correctFeedback}
        </p>
      )}
    </article>
  );
}
