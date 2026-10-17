import type { GrammarPractice, PracticeItem, PracticeSentence } from '../../types/models';
import { practiceSlots, slotBuildSolutions } from './grammarPracticeCheck';
import type { LessonValidationIssue } from './validateInteractiveLessons';

const HAN = /\p{Script=Han}/u;
const MAX_TILES = 6;
const MAX_TILE_HAN = 4;
const PUNCTUATION = /[\s，。！？、：；「」『』（）\u3000]/gu;

/** Han characters in a string, punctuation and spaces removed. */
const hanCount = (text: string) => [...text.replace(PUNCTUATION, '')].filter((char) => HAN.test(char)).length;
const sentenceIssues = (sentence: PracticeSentence | undefined, where: string): string[] => {
  if (!sentence) return [`${where}: sentence missing.`];
  const problems: string[] = [];
  if (!sentence.traditional.trim() || !sentence.pinyin.trim() || !sentence.english.trim()) problems.push(`${where}: Chinese, pinyin and English are all required.`);
  if (sentence.simplified !== undefined && hanCount(sentence.simplified) !== hanCount(sentence.traditional)) problems.push(`${where}: simplified and traditional differ in length.`);
  return problems;
};

function itemIssues(item: PracticeItem): string[] {
  const problems: string[] = [];
  if (!item.source?.trim()) problems.push('source missing: the book item ("p.81 #3") or "own".');
  const tileNames = 'tiles' in item ? item.tiles.map((tile) => tile.traditional) : [];
  if ('tiles' in item) {
    // A pattern like 熱不熱 needs the same word twice: a tile may repeat only as often as slots use it.
    const needed = (name: string) => (item.kind === 'slot-build' ? practiceSlots(item).filter((slot) => slot.answers[0] === name).length : 1);
    // A wrong word may be doubled too, so the doubled tile alone never gives the answer away.
    const pair = Math.max(1, ...tileNames.map(needed));
    new Set(tileNames).forEach((name) => { if (tileNames.filter((other) => other === name).length > Math.max(needed(name), pair)) problems.push(`tile ${name} repeats.`); });
    // Simplicity: short tiles, a small dock, and at least one tile that is wrong.
    if (item.tiles.length > MAX_TILES) problems.push(`${item.tiles.length} tiles; keep the dock to ${MAX_TILES}.`);
    tileNames.forEach((tile) => { if (hanCount(tile) > MAX_TILE_HAN) problems.push(`tile ${tile} is longer than ${MAX_TILE_HAN} characters.`); });
    const right = new Set(item.kind === 'slot-build'
      ? practiceSlots(item).flatMap((slot) => slot.answers)
      : item.accepted.flatMap((answer) => answer.order));
    if (!('gaps' in item && item.gaps) && tileNames.every((tile) => right.has(tile))) problems.push('every tile is right; add one tempting wrong tile.');
    item.tiles.forEach((tile) => { if (!tile.pinyin.trim()) problems.push(`tile ${tile.traditional} has no pinyin.`); });
  }
  switch (item.kind) {
    case 'slot-build': {
      const slots = practiceSlots(item);
      if (slots.length === 0) problems.push('no slots.');
      slots.forEach((slot) => slot.answers.forEach((answer) => {
        if (!tileNames.includes(answer)) problems.push(`slot ${slot.id} answer ${answer} is not a tile.`);
      }));
      if (item.gaps) {
        if (item.tiles.length !== 1) problems.push('a gaps item places exactly one tile.');
        slots.filter((slot) => slot.answers.length === 0).forEach((slot) => {
          if (!item.repairs?.some((repair) => repair.slot?.id === slot.id)) problems.push(`gap ${slot.id} needs a repair saying why the word can't go there.`);
        });
      }
      const firstAnswers = slots.map((slot) => slot.answers[0]).filter(Boolean);
      firstAnswers.forEach((answer) => {
        if (firstAnswers.filter((other) => other === answer).length > item.tiles.filter((tile) => tile.traditional === answer).length) problems.push(`more slots need ${answer} than there are ${answer} tiles.`);
      });
      problems.push(...sentenceIssues(item.result, 'result'));
      const solutions = slotBuildSolutions(item).length;
      const expected = 1 + (item.alternatives?.length ?? 0);
      if (solutions !== expected) problems.push(`has ${solutions} right answers; it lists ${expected} (result plus alternatives).`);
      break;
    }
    case 'chat-build':
      if (item.accepted.length !== 1) problems.push(`has ${item.accepted.length} right answers; exactly one must be right.`);
      item.accepted.forEach((answer, index) => {
        answer.order.forEach((tile) => { if (!tileNames.includes(tile)) problems.push(`answer ${index + 1} uses ${tile}, which is not a tile.`); });
        problems.push(...sentenceIssues(answer.sentence, `answer ${index + 1}`));
      });
      [...(item.before ?? []), ...(item.after ?? [])].forEach((line, index) => problems.push(...sentenceIssues(line, `chat line ${index + 1}`)));
      break;
    case 'slot-reels':
      problems.push('slot-reels allows several answers; use slot-build.');
      break;
  }
  return problems;
}

export function validateGrammarPractice(practice: GrammarPractice, location: string): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = [];
  if (!practice.title.trim() || practice.bookPage <= 0) {
    issues.push({ location, message: 'Practice needs a title and its book page.' });
  }
  if (practice.items.length === 0) issues.push({ location, message: 'Practice has no items.' });
  const ids = new Set<string>();
  practice.items.forEach((item) => {
    if (ids.has(item.id)) issues.push({ location, message: `Duplicate practice item ${item.id}.` });
    ids.add(item.id);
    itemIssues(item).forEach((message) => issues.push({ location: `${location} ${item.id}`, message }));
  });
  return issues;
}
