import type { ListenBuildItem } from '../../../types/models';
import { ClipButton } from '../components/ClipButton';
import type { PracticeExerciseProps } from '../practiceTypes';
import { OrderBuildExercise } from './OrderBuildExercise';

/**
 * Listen, then build: the recording above the free line of `order-build`. The title is the task,
 * and no Chinese shows until the answer is checked, so the words are the only thing to go on.
 */
export function ListenBuildExercise(props: PracticeExerciseProps<ListenBuildItem>) {
  return (
    <OrderBuildExercise {...props}>
      <ClipButton clip={props.item.clip} />
    </OrderBuildExercise>
  );
}
