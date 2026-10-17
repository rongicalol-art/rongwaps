import type { ComponentType } from 'react';
import type { PracticeItem, PracticeKind } from '../../../types/models';
import type { PracticeExerciseProps } from '../practiceTypes';
import { ChatBuildExercise } from './ChatBuildExercise';
import { SlotBuildExercise } from './SlotBuildExercise';
import { SlotReelsExercise } from './SlotReelsExercise';

/**
 * One component per exercise kind. A new kind = its item type in `src/types/grammarPractice.ts`,
 * its check in `utils/grammar/grammarPracticeCheck.ts`, a component here, and a UI Preview entry.
 */
export const PRACTICE_EXERCISES: { [K in PracticeKind]: ComponentType<PracticeExerciseProps<Extract<PracticeItem, { kind: K }>>> } = {
  'slot-build': SlotBuildExercise,
  'slot-reels': SlotReelsExercise,
  'chat-build': ChatBuildExercise,
};
