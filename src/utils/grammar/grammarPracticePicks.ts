import type { ListenPickItem, MatchPairsItem, SortGroupsItem, SpotFixItem } from '../../types/models';
import { matchRepair, type PracticeVerdict } from './grammarPracticeCheck';

/**
 * Answer checks for the kinds that are answered by choosing: spot the mistake, match the
 * pair, sort by use. Pure, like `grammarPracticeCheck.ts`.
 */

/** `choice` is the replacement tile's `traditional`, or null for "Take it out". */
export function checkSpotFix(item: SpotFixItem, pick: number, choice: string | null): PracticeVerdict {
  if (pick !== item.wrong) return { correct: false, title: 'That word is fine', note: item.hint, mark: [] };
  if (item.fix === undefined ? choice === null : choice === item.fix) return { correct: true, note: item.successNote, mark: [] };
  if (choice === null) return { correct: false, note: item.takeOutNote ?? item.hint, mark: [] };
  const repair = matchRepair(item.repairs, { order: [choice] });
  return { correct: false, note: repair?.note ?? item.hint, title: repair?.title, mark: [choice] };
}

/** A reply picked for a line: right, or what the line needs (a trap reply says why it fits nothing). */
export function checkMatchPair(item: MatchPairsItem, line: number, reply: number): PracticeVerdict {
  const chosen = item.replies[reply];
  if (chosen.answers === line) return { correct: true, mark: [] };
  return { correct: false, note: chosen.answers === undefined ? chosen.note ?? item.lines[line].note : item.lines[line].note, mark: [] };
}

export function checkSortCard(item: SortGroupsItem, card: number, group: 0 | 1): PracticeVerdict {
  const target = item.cards[card];
  return target.group === group ? { correct: true, mark: [] } : { correct: false, note: target.note, mark: [] };
}

/** The written sentence picked for a clip: right, or what that sentence would have sounded like. */
export function checkListenPick(item: ListenPickItem, choice: number): PracticeVerdict {
  return choice === item.answer ? { correct: true, mark: [] } : { correct: false, note: item.options[choice].note, mark: [] };
}
