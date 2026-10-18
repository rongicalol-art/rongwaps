import type { ChatAnswer, OrderBuildItem, StoryOrderItem } from '../../types/models';
import { matchRepair, type PracticeVerdict } from './grammarPracticeCheck';

/**
 * Answer checks for the kinds where order is the answer: build the sentence (words on a free
 * line) and story order (sentences in sequence). Pure, like `grammarPracticeCheck.ts`.
 */

/** Positions whose tile differs from the closest accepted answer (the one with most tiles already in place). */
export function misplacedPositions(order: string[], accepted: ChatAnswer[]): number[] {
  const hits = (answer: ChatAnswer) => order.filter((tile, index) => answer.order[index] === tile).length;
  const closest = accepted.reduce((best, answer) => (hits(answer) > hits(best) ? answer : best), accepted[0]);
  return order.flatMap((tile, index) => (closest.order[index] === tile ? [] : [index]));
}

/** Also the check of `listen-build`: the words on the line are the same job, only the prompt is a recording. */
export function checkOrderBuild(item: Pick<OrderBuildItem, 'accepted' | 'repairs' | 'fallbackRepair'>, order: string[]): PracticeVerdict & { answer?: ChatAnswer } {
  const answer = item.accepted.find((accepted) => accepted.order.join('|') === order.join('|'));
  if (answer) return { correct: true, answer, mark: [] };
  const repair = matchRepair(item.repairs, { order });
  return {
    correct: false,
    note: repair?.note ?? item.fallbackRepair,
    title: repair?.title,
    mark: repair?.mark ?? misplacedPositions(order, item.accepted).map((index) => order[index]),
  };
}

/** `chosen` are step indexes in the order the learner tapped them. A wrong answer says why the step due first-wrong belongs there. */
export function checkStoryOrder(item: StoryOrderItem, chosen: number[]): PracticeVerdict {
  const position = item.answer.findIndex((step, index) => chosen[index] !== step);
  if (position === -1) return { correct: true, mark: [] };
  return { correct: false, note: item.steps[item.answer[position]].note, mark: [] };
}
