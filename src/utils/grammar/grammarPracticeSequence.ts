import type { ChatAnswer, OrderBuildItem, StoryOrderItem } from '../../types/models';
import { matchRepair, type PracticeVerdict } from './grammarPracticeCheck';

/** Compare occurrences, not absolute positions: an omission must not shift every later word red. */
function sequenceDifference(order: string[], expected: string[]) {
  const lengths = Array.from({ length: order.length + 1 }, () => Array<number>(expected.length + 1).fill(0));
  for (let i = order.length - 1; i >= 0; i--) {
    for (let j = expected.length - 1; j >= 0; j--) {
      lengths[i][j] = order[i] === expected[j] ? 1 + lengths[i + 1][j + 1] : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const matched = new Map<number, number>();
  const extra: number[] = [];
  const missing: number[] = [];
  let i = 0;
  let j = 0;
  while (i < order.length || j < expected.length) {
    if (i < order.length && j < expected.length && order[i] === expected[j]) { matched.set(j, i); i++; j++; }
    else if (i < order.length && (j === expected.length || lengths[i + 1][j] >= lengths[i][j + 1])) extra.push(i++);
    else missing.push(j++);
  }
  return { extra, missing, expected, matched };
}

function closestDifference(order: string[], accepted: ChatAnswer[]) {
  return accepted.map((answer) => sequenceDifference(order, answer.order))
    .reduce((best, next) => {
      const score = (difference: typeof best) => difference.extra.length + difference.missing.length;
      return score(next) < score(best) || (score(next) === score(best) && next.extra.length < best.extra.length) ? next : best;
    });
}

/** Only submitted occurrences that need changing; correctly ordered words survive omissions and extras. */
export function misplacedPositions(order: string[], accepted: ChatAnswer[]): number[] {
  return closestDifference(order, accepted).extra;
}

/** The same diagnosis supplies the feedback and the exact submitted occurrences to mark. */
export function checkOrderBuild(
  item: Pick<OrderBuildItem, 'accepted' | 'repairs' | 'fallbackRepair'> & { successNote?: string; kind?: 'order-build' | 'listen-build' },
  order: string[],
): PracticeVerdict & { answer?: ChatAnswer; positions: number[] } {
  const answer = item.accepted.find((accepted) => accepted.order.join('|') === order.join('|'));
  if (answer) return { correct: true, answer, note: item.successNote, mark: [], positions: [] };
  const difference = closestDifference(order, item.accepted);
  const repair = matchRepair(item.repairs, { order });
  const repaired = repair?.mark ?? repair?.placed;
  const positions = (repaired ? difference.extra.filter((index) => repaired.includes(order[index]))
    : repair?.before ? repair.before.map((word) => order.indexOf(word))
      : repair?.notFirst ? [order.indexOf(repair.notFirst)]
        : repair?.notLast ? [order.indexOf(repair.notLast)] : difference.extra).filter((index) => index >= 0);
  const wrong = (note: string, marked = positions, title?: string) => ({
    correct: false, note, title, positions: marked, mark: marked.map((index) => order[index]),
  });
  // Listening keeps its authored heard-versus-meaning repairs and exact recording key.
  if (item.kind === 'listen-build') return wrong(repair?.note ?? item.fallbackRepair, positions, repair?.title);
  // A distractor has a specific meaning repair; never replace it with a generic missing-word note.
  if (repair?.placed && positions.length > 0) return wrong(repair.note, positions, repair.title);

  // Pair unmatched occurrences to distinguish moved words from genuinely missing or extra words.
  const extras = [...difference.extra];
  const missing = difference.missing.filter((index) => {
    const moved = extras.findIndex((position) => order[position] === difference.expected[index]);
    if (moved < 0) return true;
    extras.splice(moved, 1);
    return false;
  });
  if (extras.length > 0) return wrong(`Remove the extra ${order[extras[0]]}.`, [extras[0]]);
  const target = missing[0] ?? difference.missing[0];
  const nextIndex = difference.expected.findIndex((_, index) => index > target && difference.matched.has(index));
  const previousIndex = [...difference.matched.keys()].filter((index) => index < target).at(-1);
  const next = difference.expected[nextIndex];
  const previous = previousIndex === undefined ? undefined : difference.expected[previousIndex];
  const word = difference.expected[target];
  const moved = difference.extra.find((index) => order[index] === word);
  // A move must change a relationship; the word may already be before its next neighbour.
  const beforeNext = next && (missing.length > 0 || moved! > difference.matched.get(nextIndex)!);
  const location = beforeNext ? ` before ${next}` : previous ? ` after ${previous}` : ' at the start';
  if (missing.length > 0) return wrong(`Add ${word}${location}.`, [], 'Keep going');
  if (repair) return wrong(repair.note, positions, repair.title);
  return wrong(`Move ${word}${location}.`, [moved!]);
}

/** A wrong story order explains the first sentence that belongs elsewhere. */
export function checkStoryOrder(item: StoryOrderItem, chosen: number[]): PracticeVerdict {
  const position = item.answer.findIndex((step, index) => chosen[index] !== step);
  if (position === -1) return { correct: true, mark: [] };
  return { correct: false, note: item.steps[item.answer[position]].note, mark: [] };
}
