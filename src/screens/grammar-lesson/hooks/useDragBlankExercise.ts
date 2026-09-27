import { useMemo, useRef, useState } from 'react';
import type { GrammarExerciseQuestion } from '../../../types/models';
import {
  collectPendingTextBlanks,
  evaluateGrammarPlacements,
  evaluateGrammarTextResponses,
  getGrammarExerciseTiles,
} from '../../../utils/grammarExercise';
import { gradeGrammarAnswer } from '../../../services/answerGradingService';

type ExerciseStatus = 'idle' | 'needs-repair' | 'complete';
type ResponseMode = 'tiles' | 'text';

export function useDragBlankExercise(
  questions: GrammarExerciseQuestion[],
  defaultResponseMode: ResponseMode = 'tiles',
) {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [textResponses, setTextResponses] = useState<Record<string, string>>({});
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [correctBlankIds, setCorrectBlankIds] = useState<string[]>([]);
  const [wrongBlankIds, setWrongBlankIds] = useState<string[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [status, setStatus] = useState<ExerciseStatus>('idle');
  const checkToken = useRef(0);

  const invalidateChecks = () => {
    checkToken.current += 1;
  };

  const tileQuestions = useMemo(
    () => questions.filter((question) => (question.responseMode ?? defaultResponseMode) === 'tiles'),
    [defaultResponseMode, questions],
  );
  const tileBlankIds = useMemo(
    () => tileQuestions.flatMap((question) => question.segments.flatMap((segment) => (
      segment.type === 'blank' ? [segment.id] : []
    ))),
    [tileQuestions],
  );
  const textQuestions = useMemo(
    () => questions.filter((question) => (question.responseMode ?? defaultResponseMode) === 'text'),
    [defaultResponseMode, questions],
  );
  const textBlankIds = useMemo(
    () => textQuestions
      .flatMap((question) => question.segments.flatMap((segment) => (
        segment.type === 'blank' ? [segment.id] : []
      ))),
    [textQuestions],
  );
  const tiles = useMemo(() => getGrammarExerciseTiles(tileQuestions), [tileQuestions]);
  const allBlanksFilled = tileBlankIds.every((blankId) => Boolean(placements[blankId]))
    && textBlankIds.every((blankId) => Boolean(textResponses[blankId]?.trim()));

  const getTile = (tileId: string) => tiles.find((tile) => tile.id === tileId);

  const placeTile = (blankId: string, tileId: string) => {
    if (correctBlankIds.includes(blankId)) return;
    invalidateChecks();
    setPlacements((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([, placedTileId]) => placedTileId !== tileId),
      );
      next[blankId] = tileId;
      return next;
    });
    setSelectedTileId(null);
    setWrongBlankIds((current) => current.filter((id) => id !== blankId));
    setHasChecked(false);
    setStatus('idle');
  };

  const removeTile = (blankId: string) => {
    if (correctBlankIds.includes(blankId)) return;
    invalidateChecks();
    setPlacements((current) => {
      return Object.fromEntries(
        Object.entries(current).filter(([id]) => id !== blankId),
      );
    });
    setHasChecked(false);
    setStatus('idle');
  };

  const setTextResponse = (blankId: string, value: string) => {
    invalidateChecks();
    setTextResponses((current) => ({ ...current, [blankId]: value }));
    setHasChecked(false);
    setStatus('idle');
  };

  const checkAnswers = async () => {
    const token = checkToken.current + 1;
    checkToken.current = token;
    const tileEvaluation = evaluateGrammarPlacements(tileQuestions, placements);
    const textEvaluation = evaluateGrammarTextResponses(textQuestions, textResponses);
    const nextCorrectBlankIds = [
      ...tileEvaluation.correctBlankIds,
      ...textEvaluation.correctBlankIds,
    ];
    const nextWrongBlankIds = [
      ...tileEvaluation.wrongBlankIds,
      ...textEvaluation.wrongBlankIds,
    ];

    setCorrectBlankIds(nextCorrectBlankIds);
    setWrongBlankIds(nextWrongBlankIds);
    setHasChecked(true);
    setStatus(nextWrongBlankIds.length === 0 ? 'complete' : 'needs-repair');

    const pending = collectPendingTextBlanks(textQuestions, textResponses, textEvaluation.wrongBlankIds);
    if (pending.length === 0) return;
    const graded = await Promise.all(pending.map(async (blank) => ({
      blankId: blank.blankId,
      result: await gradeGrammarAnswer({
        reference: blank.reference,
        answer: blank.response,
        accepted: blank.accepted,
      }),
    })));
    if (checkToken.current !== token) return;
    const recovered = graded.filter((entry) => entry.result?.pass).map((entry) => entry.blankId);
    if (recovered.length === 0) return;
    const remainingWrong = nextWrongBlankIds.filter((id) => !recovered.includes(id));
    setCorrectBlankIds([...nextCorrectBlankIds, ...recovered]);
    setWrongBlankIds(remainingWrong);
    setStatus(remainingWrong.length === 0 ? 'complete' : 'needs-repair');
  };

  const returnIncorrectTiles = () => {
    invalidateChecks();
    setPlacements((current) => Object.fromEntries(
      Object.entries(current).filter(([blankId]) => !wrongBlankIds.includes(blankId)),
    ));
    setTextResponses((current) => Object.fromEntries(
      Object.entries(current).filter(([blankId]) => !wrongBlankIds.includes(blankId)),
    ));
    setWrongBlankIds([]);
    setSelectedTileId(null);
    setHasChecked(false);
    setStatus('idle');
  };

  const resetExercise = () => {
    invalidateChecks();
    setPlacements({});
    setTextResponses({});
    setSelectedTileId(null);
    setCorrectBlankIds([]);
    setWrongBlankIds([]);
    setHasChecked(false);
    setStatus('idle');
  };

  return {
    placements,
    textResponses,
    selectedTileId,
    correctBlankIds,
    wrongBlankIds,
    hasChecked,
    status,
    allBlanksFilled,
    getTile,
    setSelectedTileId,
    setTextResponse,
    placeTile,
    removeTile,
    checkAnswers,
    returnIncorrectTiles,
    resetExercise,
  };
}
