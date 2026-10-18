import type { ComponentType } from 'react';
import type { PracticeItem, PracticeKind } from '../../../types/models';
import type { PracticeExerciseProps } from '../practiceTypes';
import { ChatBuildExercise } from './ChatBuildExercise';
import { ListenBuildExercise } from './ListenBuildExercise';
import { MatchPairsExercise } from './MatchPairsExercise';
import { OrderBuildExercise } from './OrderBuildExercise';
import { SlotBuildExercise } from './SlotBuildExercise';
import { SlotReelsExercise } from './SlotReelsExercise';
import { SortGroupsExercise } from './SortGroupsExercise';
import { SpotFixExercise } from './SpotFixExercise';
import { StoryOrderExercise } from './StoryOrderExercise';

/**
 * One component per exercise kind. A new kind = its item type in `src/types/grammarPractice.ts`,
 * its check in `utils/grammar/` (`grammarPracticeCheck`, `…Sequence` or `…Picks`), a component here,
 * its structural rules in `validateGrammarPractice.ts`, and a UI Preview entry.
 */
export const PRACTICE_EXERCISES: { [K in PracticeKind]: ComponentType<PracticeExerciseProps<Extract<PracticeItem, { kind: K }>>> } = {
  'slot-build': SlotBuildExercise,
  'slot-reels': SlotReelsExercise,
  'chat-build': ChatBuildExercise,
  'order-build': OrderBuildExercise,
  'listen-build': ListenBuildExercise,
  'spot-fix': SpotFixExercise,
  'match-pairs': MatchPairsExercise,
  'sort-groups': SortGroupsExercise,
  'story-order': StoryOrderExercise,
};
