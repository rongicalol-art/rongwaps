import type { GrammarExerciseQuestion, GrammarExerciseTile } from '../../types/models';

export interface GrammarExerciseEvaluation {
  correctBlankIds: string[];
  wrongBlankIds: string[];
  complete: boolean;
}

export function getGrammarExerciseTiles(questions: GrammarExerciseQuestion[]) {
  return questions.flatMap((question) => question.tiles);
}

export function evaluateGrammarPlacements(
  questions: GrammarExerciseQuestion[],
  placements: Record<string, string>,
): GrammarExerciseEvaluation {
  const tiles = getGrammarExerciseTiles(questions);
  const getTile = (tileId: string) => tiles.find((tile) => tile.id === tileId);
  const correctBlankIds: string[] = [];
  const wrongBlankIds: string[] = [];

  questions.forEach((question) => {
    question.segments.forEach((segment) => {
      if (segment.type !== 'blank') return;
      const tile = getTile(placements[segment.id]);
      const acceptedTraditional = [segment.answer, ...(segment.acceptedAnswers ?? [])];
      const acceptedSimplified = [
        ...(segment.answerSimplified ? [segment.answerSimplified] : []),
        ...(segment.acceptedAnswersSimplified ?? []),
      ];
      const isCorrect = Boolean(
        tile && (
          acceptedTraditional.includes(tile.traditional)
          || Boolean(tile.simplified && acceptedSimplified.includes(tile.simplified))
        ),
      );
      if (isCorrect) correctBlankIds.push(segment.id);
      else wrongBlankIds.push(segment.id);
    });
  });

  return {
    correctBlankIds,
    wrongBlankIds,
    complete: wrongBlankIds.length === 0,
  };
}

export function findCanonicalTile(
  question: GrammarExerciseQuestion,
  answer: string,
  answerSimplified?: string,
): GrammarExerciseTile | undefined {
  return question.tiles.find((tile) => (
    tile.traditional === answer
    || Boolean(answerSimplified && tile.simplified === answerSimplified)
  ));
}
