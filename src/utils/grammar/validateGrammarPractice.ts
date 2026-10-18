import type { GrammarPractice, ListenBuildItem, MatchPairsItem, PracticeItem, PracticeSentence, SortGroupsItem, SpotFixItem, StoryOrderItem } from '../../types/models';
import { practiceSlots, slotBuildSolutions } from './grammarPracticeCheck';
import type { LessonValidationIssue } from './validateInteractiveLessons';

const HAN = /\p{Script=Han}/u;
const MAX_TILES = 6;
const MAX_TILE_HAN = 4;
/** A clip is one clause or sentence, not a speech: long ones are hard to hold in the head while building. */
const MAX_CLIP_SECONDS = 6;
const PUNCTUATION = /[\s，。！？、：；「」『』（）\u3000]/gu;

/** The text without punctuation or spaces. */
const plain = (text: string) => text.replace(PUNCTUATION, '');
/** Han characters in a string, punctuation and spaces removed. */
const hanCount = (text: string) => [...plain(text)].filter((char) => HAN.test(char)).length;
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
    const needed = (name: string) => {
      if (item.kind === 'slot-build') return practiceSlots(item).filter((slot) => slot.answers[0] === name).length;
      if (item.kind === 'order-build' || item.kind === 'listen-build') return Math.max(1, ...item.accepted.map((answer) => answer.order.filter((tile) => tile === name).length));
      return 1;
    };
    // A wrong word may be doubled too, so the doubled tile alone never gives the answer away.
    const pair = Math.max(1, ...tileNames.map(needed));
    new Set(tileNames).forEach((name) => { if (tileNames.filter((other) => other === name).length > Math.max(needed(name), pair)) problems.push(`tile ${name} repeats.`); });
    // Simplicity: short tiles, a small dock, and at least one tile that is wrong.
    if (item.tiles.length > MAX_TILES) problems.push(`${item.tiles.length} tiles; keep the dock to ${MAX_TILES}.`);
    tileNames.forEach((tile) => { if (hanCount(tile) > MAX_TILE_HAN) problems.push(`tile ${tile} is longer than ${MAX_TILE_HAN} characters.`); });
    const right = new Set(item.kind === 'slot-build'
      ? practiceSlots(item).flatMap((slot) => slot.answers)
      : item.kind === 'spot-fix'
        ? (item.fix === undefined ? [] : [item.fix])
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
        slots.forEach((slot) => item.tiles.map((tile) => tile.traditional).filter((word) => !slot.answers.includes(word)).forEach((word) => {
          if (!item.repairs?.some((repair) => repair.placed?.includes(word) || (repair.slot?.id === slot.id && repair.slot.tile === word))) problems.push(`gap ${slot.id} needs a repair saying why ${word} can't go there.`);
        }));
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
    case 'order-build':
    case 'listen-build':
      if (item.accepted.length === 0) problems.push('no accepted answer.');
      item.accepted.forEach((answer, index) => {
        answer.order.forEach((tile) => { if (!tileNames.includes(tile)) problems.push(`answer ${index + 1} uses ${tile}, which is not a tile.`); });
        problems.push(...sentenceIssues(answer.sentence, `answer ${index + 1}`));
      });
      if (item.kind === 'listen-build') problems.push(...listenIssues(item));
      break;
    case 'spot-fix':
      problems.push(...spotIssues(item));
      break;
    default:
      problems.push(...choiceIssues(item));
  }
  return problems;
}

/**
 * Listen-build: the recording is the prompt, so nothing may show the answer first (no Chinese in the
 * title or sub), exactly one order is right (what was said), and the tiles must spell that sentence.
 * That the clip really says it is checked against the alignment by `tests/content/grammarPracticeKinds.test.ts`.
 */
function listenIssues(item: ListenBuildItem): string[] {
  const problems: string[] = [];
  const { clip } = item;
  if (!/^B1L\d{2}-R\d{2}$/.test(clip.reading) || !Number.isInteger(clip.line) || clip.line < 0) problems.push(`clip must name its dialogue (B1L02-R01) and a line index, not ${clip.reading} line ${clip.line}.`);
  if (!/^B1-\d{2}-\d-\d\.mp3$/.test(clip.file)) problems.push(`clip file ${clip.file} is not a book track (B1-02-1-1.mp3).`);
  if (!(clip.start >= 0 && clip.end > clip.start && clip.end - clip.start <= MAX_CLIP_SECONDS)) problems.push(`clip ${clip.start}–${clip.end}s must be a stretch of at most ${MAX_CLIP_SECONDS}s.`);
  if (item.accepted.length !== 1) problems.push(`has ${item.accepted.length} right answers; exactly one must be right: what was said.`);
  if (!item.prompt?.trim()) problems.push('prompt is required: the task, e.g. "Build what you hear."');
  if (HAN.test(item.prompt ?? '') || HAN.test(item.sub ?? '')) problems.push('the title and sub must not show Chinese: it would give the answer away.');
  item.accepted.forEach((answer, index) => {
    if (plain(answer.sentence.traditional) !== answer.order.join('')) problems.push(`answer ${index + 1}: ${answer.sentence.traditional} is not its tiles in order (${answer.order.join('')}).`);
  });
  return problems;
}

/** The written sentence with its wrong word swapped for `fix` (or removed), as plain Han text. */
const repairedText = (item: SpotFixItem) => item.chunks.map((chunk, index) => (index === item.wrong ? item.fix ?? '' : chunk.traditional) + (chunk.tail ?? '')).join('');

function spotIssues(item: SpotFixItem): string[] {
  const problems: string[] = [];
  const wrong = item.chunks[item.wrong];
  if (item.chunks.length < 3) problems.push('a sentence to fix needs at least 3 words.');
  if (!wrong) return [...problems, `wrong is ${item.wrong}, but there are ${item.chunks.length} words.`];
  const tileNames = item.tiles.map((tile) => tile.traditional);
  if (tileNames.length < 2) problems.push('offer at least 2 replacements (Take it out is the third option).');
  if (item.fix !== undefined && !tileNames.includes(item.fix)) problems.push(`fix ${item.fix} is not a tile.`);
  if (item.fix !== undefined && !item.takeOutNote?.trim()) problems.push('takeOutNote is required: say why the word is swapped, not taken out.');
  if (item.fix === wrong.traditional) problems.push('the fix is the word that was written.');
  if (!item.hint.trim()) problems.push('hint is required.');
  if (item.hint.includes(wrong.traditional)) problems.push(`hint names the wrong word ${wrong.traditional}; give the rule without it.`);
  tileNames.filter((name) => name !== item.fix).forEach((name) => {
    if (!item.repairs?.some((repair) => repair.placed?.includes(name))) problems.push(`replacement ${name} needs a repair saying why it is wrong.`);
  });
  if (plain(repairedText(item)) !== plain(item.result.traditional)) problems.push(`result ${item.result.traditional} is not the sentence with the fix applied (${repairedText(item)}).`);
  return [...problems, ...sentenceIssues(item.result, 'result')];
}

/** Match, sort and story: sentences need Chinese, pinyin and English, and every explanation must exist. */
function choiceIssues(item: MatchPairsItem | SortGroupsItem | StoryOrderItem): string[] {
  const problems: string[] = [];
  if (item.kind === 'match-pairs') {
    item.lines.forEach((line, index) => {
      problems.push(...sentenceIssues(line.sentence, `line ${index + 1}`));
      if (!line.note.trim()) problems.push(`line ${index + 1} needs a note on what its reply needs.`);
      if (item.replies.filter((reply) => reply.answers === index).length !== 1) problems.push(`line ${index + 1} must be answered by exactly one reply.`);
    });
    item.replies.forEach((reply, index) => {
      problems.push(...sentenceIssues(reply.sentence, `reply ${index + 1}`));
      if (reply.answers !== undefined && !item.lines[reply.answers]) problems.push(`reply ${index + 1} answers a line that does not exist.`);
      if (reply.answers === undefined && !reply.note?.trim()) problems.push(`trap reply ${index + 1} needs a note on why it fits no line.`);
    });
    if (item.lines.length < 3 || item.lines.length > 4) problems.push('match 3 or 4 lines.');
    if (!item.replies.some((reply) => reply.answers === undefined)) problems.push('add a trap reply, so the last pair is not forced by elimination.');
  } else if (item.kind === 'sort-groups') {
    if (item.groups.some((group) => !group.label.trim())) problems.push('both groups need a label.');
    item.cards.forEach((card, index) => {
      problems.push(...sentenceIssues(card.sentence, `card ${index + 1}`));
      if (!card.note.trim()) problems.push(`card ${index + 1} needs a note on why it belongs to its group.`);
    });
    if (item.cards.length < 4 || item.cards.length > 6) problems.push('sort 4 to 6 sentences.');
    [0, 1].forEach((group) => { if (item.cards.filter((card) => card.group === group).length < 2) problems.push(`group ${group + 1} needs at least 2 sentences.`); });
  } else {
    item.steps.forEach((step, index) => {
      problems.push(...sentenceIssues(step, `step ${index + 1}`));
      if (!step.note.trim()) problems.push(`step ${index + 1} needs a note on why it sits where it does.`);
    });
    if (item.steps.length < 3 || item.steps.length > 5) problems.push('order 3 to 5 sentences.');
    if ([...item.answer].sort((a, b) => a - b).join() !== [...item.steps.keys()].join()) problems.push('answer must list every step once.');
    if (item.answer.every((step, index) => step === index)) problems.push('the steps are shown in the right order; shuffle them.');
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
