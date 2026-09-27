import type { GrammarExerciseQuestion, GrammarExerciseTile } from '../types/models';

export interface GrammarExerciseEvaluation {
  correctBlankIds: string[];
  wrongBlankIds: string[];
  complete: boolean;
}

const ANSWER_FORMATTING = /[\s\u3000.,!?;:'"“”‘’，。！？、；：（）()[\]{}·…—-]+/gu;

export function normalizeGrammarTextAnswer(answer: string): string {
  return answer
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(ANSWER_FORMATTING, '');
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

export function evaluateGrammarTextResponses(
  questions: GrammarExerciseQuestion[],
  responses: Record<string, string>,
): GrammarExerciseEvaluation {
  const correctBlankIds: string[] = [];
  const wrongBlankIds: string[] = [];

  questions.forEach((question) => {
    question.segments.forEach((segment) => {
      if (segment.type !== 'blank') return;

      const response = normalizeGrammarTextAnswer(responses[segment.id] ?? '');
      const acceptedAnswers = [
        segment.answer,
        ...(segment.acceptedAnswers ?? []),
        ...(segment.answerSimplified ? [segment.answerSimplified] : []),
        ...(segment.acceptedAnswersSimplified ?? []),
      ].map(normalizeGrammarTextAnswer);

      if (response.length > 0 && acceptedAnswers.includes(response)) {
        correctBlankIds.push(segment.id);
      } else {
        wrongBlankIds.push(segment.id);
      }
    });
  });

  return {
    correctBlankIds,
    wrongBlankIds,
    complete: wrongBlankIds.length === 0,
  };
}

export interface PendingTextBlank {
  blankId: string;
  reference: string;
  accepted: string[];
  response: string;
}

/** Wrong text blanks with a real response, shaped for semantic re-grading. */
export function collectPendingTextBlanks(
  questions: GrammarExerciseQuestion[],
  responses: Record<string, string>,
  wrongBlankIds: string[],
): PendingTextBlank[] {
  const wrong = new Set(wrongBlankIds);
  const pending: PendingTextBlank[] = [];
  questions.forEach((question) => {
    question.segments.forEach((segment) => {
      if (segment.type !== 'blank' || !wrong.has(segment.id)) return;
      const response = (responses[segment.id] ?? '').trim();
      if (!response) return;
      pending.push({
        blankId: segment.id,
        reference: segment.answer,
        accepted: [
          ...(segment.acceptedAnswers ?? []),
          ...(segment.answerSimplified ? [segment.answerSimplified] : []),
          ...(segment.acceptedAnswersSimplified ?? []),
        ],
        response,
      });
    });
  });
  return pending;
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
