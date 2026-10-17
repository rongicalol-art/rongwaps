import type {
  ChatAnswer,
  ChatBuildItem,
  PracticeRepair,
  PracticeSentence,
  SlotBuildItem,
  SlotReelsItem,
} from '../../types/models';

/**
 * Answer checks for grammar Practice (book exercises). Pure: the UI passes what
 * the learner placed and renders the verdict. Tiles are compared by `traditional`.
 */

export interface PracticeVerdict {
  correct: boolean;
  /** Repair note (wrong) or optional success note (right). */
  note?: string;
  title?: string;
  /** Placed tiles to mark wrong. */
  mark: string[];
}

export function practiceSlots(item: SlotBuildItem) {
  return item.lines.flatMap((line) => line.segments.flatMap((segment) => (segment.type === 'slot' ? [segment] : [])));
}

interface RepairContext {
  order: string[];
  slots?: Record<string, string | undefined>;
}

/** The first authored repair whose condition matches what was placed. */
export function matchRepair(repairs: PracticeRepair[] | undefined, { order, slots = {} }: RepairContext) {
  return repairs?.find((repair) => {
    if (repair.placed) return repair.placed.some((tile) => order.includes(tile));
    if (repair.slot) return slots[repair.slot.id] === repair.slot.tile;
    if (repair.before) {
      const [first, second] = repair.before.map((tile) => order.indexOf(tile));
      return first >= 0 && second >= 0 && first < second;
    }
    if (repair.notLast) return order.at(-1) !== repair.notLast;
    if (repair.notFirst) return order[0] !== repair.notFirst;
    return false;
  });
}

export function checkSlotBuild(item: SlotBuildItem, placed: Record<string, string | undefined>): PracticeVerdict {
  const slots = practiceSlots(item);
  const wrong = item.gaps
    ? slots.filter((slot) => placed[slot.id] && !slot.answers.includes(placed[slot.id] ?? ''))
    : slots.filter((slot) => !slot.answers.includes(placed[slot.id] ?? ''));
  if (wrong.length === 0) return { correct: true, note: item.successNote, mark: [] };
  const order = slots.map((slot) => placed[slot.id] ?? '');
  const repair = matchRepair(item.repairs, { order, slots: placed });
  return {
    correct: false,
    note: repair?.note ?? item.fallbackRepair,
    title: repair?.title,
    mark: repair?.mark ?? wrong.map((slot) => placed[slot.id] ?? ''),
  };
}

const bare = (text: string) => text.replace(/[\s，。！？、：；,.!?]/gu, '');

/** The Chinese the learner built: every line that has a blank, with the placed tiles. */
export function slotBuildText(item: SlotBuildItem, placed: Record<string, string | undefined>) {
  return item.lines
    .filter((line) => line.segments.some((segment) => segment.type === 'slot'))
    .map((line) => line.segments.map((segment) => (segment.type === 'slot' ? placed[segment.id] ?? '' : segment.traditional)).join(''))
    .join('');
}

/** The feedback sentence for a right answer: the authored one that matches what was built. */
export function slotBuildResult(item: SlotBuildItem, placed: Record<string, string | undefined>): PracticeSentence {
  const built = bare(slotBuildText(item, placed));
  return [item.result, ...(item.alternatives ?? [])].find((sentence) => bare(sentence.traditional) === built) ?? item.result;
}

/** Every right way to fill the slots (each tile used once). */
export function slotBuildSolutions(item: SlotBuildItem): Array<Record<string, string>> {
  if (item.gaps) {
    // One word: each right gap is a solution. Several words: every word in one of its right gaps (identical words swap freely).
    const slots = practiceSlots(item);
    const words = item.tiles.map((tile) => tile.traditional).filter((word) => slots.some((slot) => slot.answers.includes(word)));
    const all = words.reduce<Array<Record<string, string>>>((partial, word) => partial.flatMap((filled) => slots
      .filter((slot) => slot.answers.includes(word) && !(slot.id in filled))
      .map((slot) => ({ ...filled, [slot.id]: word }))), [{}]);
    return [...new Map(all.map((solution) => [JSON.stringify(Object.entries(solution).sort()), solution])).values()];
  }
  const owned = (answer: string) => item.tiles.filter((tile) => tile.traditional === answer).length;
  return practiceSlots(item).reduce<Array<Record<string, string>>>(
    (partial, slot) => partial.flatMap((filled) => slot.answers
      .filter((answer) => Object.values(filled).filter((used) => used === answer).length < owned(answer))
      .map((answer) => ({ ...filled, [slot.id]: answer }))),
    [{}],
  );
}

export function checkChatBuild(item: ChatBuildItem, order: string[]): PracticeVerdict & { answer?: ChatAnswer } {
  const answer = item.accepted.find((accepted) => accepted.order.join('|') === order.join('|'));
  if (answer) return { correct: true, answer, mark: [] };
  const repair = matchRepair(item.repairs, { order });
  return { correct: false, note: repair?.note ?? item.fallbackRepair, title: repair?.title, mark: repair?.mark ?? order };
}

/** How many words the reply takes (one underline each); every accepted order has this length. */
export function chatAnswerLength(item: ChatBuildItem) {
  return item.accepted[0]?.order.length ?? 0;
}

export type ReelChoice = Record<string, string | undefined>;

export function checkReels(item: SlotReelsItem, choice: ReelChoice): PracticeVerdict {
  for (const rule of item.rules) {
    if (rule.type === 'different') {
      const [a, b] = rule.reels;
      if (choice[a] && choice[a] === choice[b]) return { correct: false, note: rule.note, mark: [] };
    } else if (choice[rule.reel] === rule.option && !rule.allowed.includes(choice[rule.other] ?? '')) {
      return { correct: false, title: 'The grammar works, the trip doesn’t', note: rule.note, mark: [] };
    }
  }
  return { correct: true, mark: [] };
}

/** The learner's own sentence: Chinese, pinyin and English built from the chosen options. */
export function reelSentence(item: SlotReelsItem, choice: ReelChoice): PracticeSentence {
  let traditional = '';
  let simplified = '';
  const pinyin: string[] = [];
  let english = item.english;
  for (const segment of item.segments) {
    if (segment.type === 'text') {
      traditional += segment.traditional;
      simplified += segment.simplified ?? segment.traditional;
      if (segment.pinyin) pinyin.push(segment.pinyin);
      continue;
    }
    const option = segment.options.find((candidate) => candidate.traditional === choice[segment.id]);
    if (!option) continue;
    traditional += option.traditional;
    simplified += option.simplified ?? option.traditional;
    pinyin.push(option.pinyin);
    english = english.replace(`{${segment.id}}`, option.english);
  }
  const lastText = item.segments.at(-1);
  const end = lastText?.type === 'text' && /[。？！]$/.test(lastText.traditional) ? '.' : '';
  return { traditional, simplified, pinyin: `${pinyin.join(' ')}${end}`, english };
}
