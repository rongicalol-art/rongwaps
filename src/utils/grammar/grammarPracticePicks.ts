import type { PracticeSentence, PracticeTile, ReplyPickItem, ListenPickItem, MatchPairsItem, SameMeaningItem, SortGroupsItem, SpotFixItem } from '../../types/models';
import { matchRepair, type PracticeVerdict } from './grammarPracticeCheck';

/**
 * Answer checks for the kinds that are answered by choosing: spot the mistake, match the
 * pair, sort by use, compare meanings. Pure, like `grammarPracticeCheck.ts`.
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

export function checkSameMeaning(item: SameMeaningItem, same: boolean): PracticeVerdict {
  return { correct: same === item.same, note: item.note, mark: [] };
}

/** The pattern parts that ～ stands for, in order. */
export function replyFills(item: ReplyPickItem): PracticeTile[] {
  return item.fill ? (Array.isArray(item.fill) ? item.fill : [item.fill]) : [];
}

/** An option with each ～ replaced by its pattern part (the nth ～ takes the nth part, the last part repeating). */
export function fillReplyOption(text: string, parts: string[]): string {
  if (!parts.length) return text;
  let at = 0;
  return text.replace(/～/g, () => parts[Math.min(at++, parts.length - 1)]);
}

/**
 * The finished words for the blank, cut from a right option's `result` by removing the printed
 * text around the slot (B：是啊，___。). Undefined when the result does not wrap that text.
 */
export function replySlotCompletion(item: ReplyPickItem, result: PracticeSentence, script: 'traditional' | 'simplified'): string | undefined {
  const line = item.lines?.find((entry) => entry.segments.some((segment) => segment.type === 'slot'));
  if (!line) return undefined;
  const at = line.segments.findIndex((segment) => segment.type === 'slot');
  const text = (segments: typeof line.segments) => segments.map((segment) => segment.type === 'text' ? (script === 'simplified' ? segment.simplified ?? segment.traditional : segment.traditional) : '').join('');
  const before = text(line.segments.slice(0, at));
  const after = text(line.segments.slice(at + 1));
  const full = script === 'simplified' ? result.simplified ?? result.traditional : result.traditional;
  if (!full.startsWith(before) || !full.endsWith(after) || full.length <= before.length + after.length) return undefined;
  return full.slice(before.length, full.length - after.length);
}

/** One owner for reply correctness and the other accepted finished sentences. */
export function checkReplyPick(item: ReplyPickItem, index: number): { correct: boolean; note?: string; also: string[] } {
  const option = item.options[index];
  if (!option?.ok) return { correct: false, note: option?.note, also: [] };
  const also = item.options.flatMap((other, otherIndex) => otherIndex !== index && other.ok && other.result ? [other.result.traditional] : []);
  return { correct: true, note: also.length ? `This also works: ${also.join(' ')}` : undefined, also };
}
