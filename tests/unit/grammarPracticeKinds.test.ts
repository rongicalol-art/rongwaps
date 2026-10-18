import assert from 'node:assert/strict';
import test from 'node:test';
import type { ListenBuildItem, MatchPairsItem, OrderBuildItem, PracticeSentence, SortGroupsItem, SpotFixItem, StoryOrderItem } from '../../src/types/models';
import { checkMatchPair, checkSortCard, checkSpotFix } from '../../src/utils/grammar/grammarPracticePicks';
import { checkOrderBuild, checkStoryOrder, misplacedPositions } from '../../src/utils/grammar/grammarPracticeSequence';
import { validateGrammarPractice } from '../../src/utils/grammar/validateGrammarPractice';

const sentence = (traditional: string): PracticeSentence => ({ traditional, pinyin: 'pinyin', english: 'English' });
const tile = (traditional: string) => ({ traditional, pinyin: 'pinyin' });
const validate = (item: Parameters<typeof validateGrammarPractice>[0]['items'][number]) => validateGrammarPractice({ bookPage: 1, title: 'T', items: [item] }, 'p').map((issue) => issue.message);

const order: OrderBuildItem = {
  id: 'o', source: 'own', kind: 'order-build', prompt: 'Say it.',
  tiles: [tile('是'), tile('家樂'), tile('叫'), tile('不'), tile('美國人')],
  accepted: [{ order: ['家樂', '不', '是', '美國人'], sentence: sentence('家樂不是美國人。') }],
  repairs: [
    { placed: ['叫'], note: '叫 gives a name.' },
    { before: ['是', '不'], note: '不 goes first.' },
    { notFirst: '家樂', note: 'Start with who.' },
  ],
  fallbackRepair: 'Fallback.',
};

test('order-build: the accepted order is right, and a wrong one is repaired by the first matching note', () => {
  assert.equal(checkOrderBuild(order, ['家樂', '不', '是', '美國人']).correct, true);
  assert.equal(checkOrderBuild(order, ['家樂', '是', '不', '美國人']).note, '不 goes first.');
  assert.equal(checkOrderBuild(order, ['家樂', '叫', '美國人']).note, '叫 gives a name.');
  assert.equal(checkOrderBuild(order, ['美國人', '家樂']).note, 'Start with who.');
  assert.equal(checkOrderBuild(order, ['家樂', '美國人', '不', '是']).note, 'Fallback.');
  assert.deepEqual(validate(order), []);
});

test('order-build: more than one accepted order is allowed, and misplaced words are measured against the closest', () => {
  const two: OrderBuildItem = {
    ...order,
    accepted: [
      { order: ['家樂', '不', '是', '美國人'], sentence: sentence('a') },
      { order: ['美國人', '家樂', '不', '是'], sentence: sentence('b') },
    ],
  };
  assert.equal(checkOrderBuild(two, ['美國人', '家樂', '不', '是']).correct, true);
  assert.deepEqual(misplacedPositions(['家樂', '是', '不', '美國人'], two.accepted), [1, 2]);
  assert.deepEqual(misplacedPositions(['美國人', '家樂', '是', '不'], two.accepted), [2, 3]);
});

test('order-build: needs at least one wrong tile, and a repeated tile is fine when the answer repeats it', () => {
  assert.ok(validate({ ...order, tiles: order.tiles.filter((entry) => entry.traditional !== '叫') }).some((message) => /every tile is right/.test(message)));
  const doubled: OrderBuildItem = {
    ...order,
    tiles: [tile('飯店'), tile('又'), tile('又'), tile('大'), tile('舒服'), tile('很')],
    accepted: [{ order: ['飯店', '又', '大', '又', '舒服'], sentence: sentence('飯店又大又舒服。') }],
  };
  assert.equal(validate(doubled).some((message) => /repeats/.test(message)), false);
  assert.ok(validate({ ...order, tiles: [...order.tiles, tile('不')] }).some((message) => /repeats/.test(message)), 'a word the answer uses once may not be doubled');
});

const listen: ListenBuildItem = {
  id: 'ln', source: 'own', kind: 'listen-build', prompt: 'Build what you hear.',
  clip: { reading: 'B1L01-R01', line: 4, file: 'B1-01-1-1.mp3', start: 22.69, end: 24.52 },
  tiles: [tile('漂亮'), tile('是'), tile('她'), tile('不'), tile('很')],
  accepted: [{ order: ['她', '很', '漂亮'], sentence: sentence('她很漂亮。') }],
  repairs: [
    { placed: ['是'], note: 'No 是.' },
    { placed: ['不'], title: 'That is not what you heard', note: 'Heard 很.' },
    { before: ['漂亮', '很'], note: '很 first.' },
    { notFirst: '她', note: 'Start with who.' },
  ],
  fallbackRepair: 'Listen again.',
};

test('listen-build: only the order that was said is right, and a wrong word says what was heard', () => {
  assert.equal(checkOrderBuild(listen, ['她', '很', '漂亮']).correct, true);
  assert.equal(checkOrderBuild(listen, ['她', '不', '漂亮']).title, 'That is not what you heard');
  assert.equal(checkOrderBuild(listen, ['她', '是', '漂亮']).note, 'No 是.');
  assert.equal(checkOrderBuild(listen, ['她', '漂亮', '很']).note, '很 first.');
  assert.equal(checkOrderBuild(listen, ['很', '她', '漂亮']).note, 'Start with who.');
  assert.equal(checkOrderBuild(listen, ['她', '漂亮']).note, 'Listen again.');
  assert.deepEqual(validate(listen), []);
});

test('listen-build validation: one right answer, no Chinese before the answer, a short real clip, tiles that spell the sentence', () => {
  const twoAnswers = { ...listen, accepted: [...listen.accepted, { order: ['很', '她', '漂亮'], sentence: sentence('很她漂亮。') }] };
  assert.ok(validate(twoAnswers).some((message) => /exactly one must be right/.test(message)));
  assert.ok(validate({ ...listen, prompt: 'Build 她很漂亮.' }).some((message) => /must not show Chinese/.test(message)));
  assert.ok(validate({ ...listen, sub: '她很漂亮' }).some((message) => /must not show Chinese/.test(message)));
  assert.ok(validate({ ...listen, prompt: undefined }).some((message) => /prompt is required/.test(message)));
  assert.ok(validate({ ...listen, clip: { ...listen.clip, end: listen.clip.start + 9 } }).some((message) => /at most 6s/.test(message)));
  assert.ok(validate({ ...listen, clip: { ...listen.clip, end: listen.clip.start } }).some((message) => /at most 6s/.test(message)));
  assert.ok(validate({ ...listen, clip: { ...listen.clip, reading: 'L1' } }).some((message) => /must name its dialogue/.test(message)));
  assert.ok(validate({ ...listen, clip: { ...listen.clip, file: 'tts.wav' } }).some((message) => /not a book track/.test(message)));
  assert.ok(validate({ ...listen, accepted: [{ order: ['她', '很', '漂亮'], sentence: sentence('她不漂亮。') }] }).some((message) => /not its tiles in order/.test(message)));
  assert.ok(validate({ ...listen, tiles: listen.tiles.filter((entry) => entry.traditional !== '是' && entry.traditional !== '不') }).some((message) => /every tile is right/.test(message)));
});

const spot: SpotFixItem = {
  id: 's', source: 'own', kind: 'spot-fix', prompt: 'Tap it.', sub: 'They mean: His surname is Li.',
  chunks: [{ traditional: '他' }, { traditional: '是' }, { traditional: '姓' }, { traditional: '李', tail: '。' }],
  wrong: 1,
  tiles: [tile('叫'), tile('不')],
  repairs: [{ placed: ['叫'], note: 'Two verbs.' }, { placed: ['不'], note: 'Negative.' }],
  hint: 'Something repeats the verb.',
  result: sentence('他姓李。'),
  successNote: 'No 是.',
};
const swap: SpotFixItem = {
  ...spot,
  chunks: [{ traditional: '你' }, { traditional: '喜歡' }, { traditional: '誰' }, { traditional: '嗎', tail: '？' }],
  wrong: 2, fix: '李小姐',
  tiles: [tile('李小姐'), tile('王小姐')],
  repairs: [{ placed: ['王小姐'], note: 'Wrong person.' }],
  takeOutNote: 'It still needs a name.',
  hint: 'Yes/no question about one person.',
  result: sentence('你喜歡李小姐嗎？'),
};

test('spot-fix: a wrong word that is fine says so, then a right word needs the right fix', () => {
  assert.deepEqual(checkSpotFix(spot, 1, null).correct, true);
  assert.equal(checkSpotFix(spot, 1, null).note, 'No 是.');
  assert.equal(checkSpotFix(spot, 3, null).title, 'That word is fine');
  assert.equal(checkSpotFix(spot, 3, null).note, 'Something repeats the verb.');
  assert.equal(checkSpotFix(spot, 1, '叫').note, 'Two verbs.');
  assert.equal(checkSpotFix(spot, 1, '不').correct, false);
});

test('spot-fix: when the fix is a swap, taking the word out has its own note', () => {
  assert.equal(checkSpotFix(swap, 2, '李小姐').correct, true);
  assert.equal(checkSpotFix(swap, 2, null).note, 'It still needs a name.');
  assert.equal(checkSpotFix(swap, 2, '王小姐').note, 'Wrong person.');
  assert.equal(checkSpotFix(swap, 3, null).correct, false);
});

test('spot-fix validation: hint never names the wrong word, result matches the fix, every wrong tile is explained', () => {
  assert.deepEqual(validate(spot), []);
  assert.deepEqual(validate(swap), []);
  assert.ok(validate({ ...spot, hint: 'The 是 is extra.' }).some((message) => /hint names the wrong word/.test(message)));
  assert.ok(validate({ ...spot, result: sentence('他是姓李。') }).some((message) => /not the sentence with the fix applied/.test(message)));
  assert.ok(validate({ ...spot, repairs: [{ placed: ['叫'], note: 'x' }] }).some((message) => /replacement 不 needs a repair/.test(message)));
  assert.ok(validate({ ...swap, takeOutNote: undefined }).some((message) => /takeOutNote is required/.test(message)));
  assert.ok(validate({ ...swap, fix: '她' }).some((message) => /fix 她 is not a tile/.test(message)));
  assert.ok(validate({ ...spot, tiles: [tile('叫')], repairs: [{ placed: ['叫'], note: 'x' }] }).some((message) => /at least 2 replacements/.test(message)));
});

const match: MatchPairsItem = {
  id: 'm', source: 'own', kind: 'match-pairs', prompt: 'Match.',
  lines: [
    { sentence: sentence('因為他很累，'), note: 'Tired → rest.' },
    { sentence: sentence('因為學校很遠，'), note: 'Far → not walking.' },
    { sentence: sentence('因為明天是生日，'), note: 'Birthday → gift.' },
  ],
  replies: [
    { sentence: sentence('所以我不想走路去。'), answers: 1 },
    { sentence: sentence('所以我想吃牛肉麵。'), note: 'Nothing about food.' },
    { sentence: sentence('所以他在家休息。'), answers: 0 },
    { sentence: sentence('所以我要買禮物。'), answers: 2 },
  ],
};

test('match-pairs: the right reply matches; a wrong one says what the line needs, a trap says why it fits nothing', () => {
  assert.equal(checkMatchPair(match, 0, 2).correct, true);
  assert.equal(checkMatchPair(match, 1, 0).correct, true);
  assert.equal(checkMatchPair(match, 1, 3).note, 'Far → not walking.');
  assert.equal(checkMatchPair(match, 1, 1).note, 'Nothing about food.');
  assert.deepEqual(validate(match), []);
});

test('match-pairs validation: one reply per line, a trap reply, and a note for every line and trap', () => {
  assert.ok(validate({ ...match, replies: match.replies.filter((reply) => reply.answers !== undefined) }).some((message) => /add a trap reply/.test(message)));
  assert.ok(validate({ ...match, replies: [...match.replies, { sentence: sentence('所以我買書。'), answers: 0 }] }).some((message) => /line 1 must be answered by exactly one reply/.test(message)));
  assert.ok(validate({ ...match, replies: match.replies.map((reply) => (reply.answers === undefined ? { ...reply, note: '' } : reply)) }).some((message) => /trap reply 2 needs a note/.test(message)));
  assert.ok(validate({ ...match, lines: match.lines.map((line) => ({ ...line, note: '' })) }).some((message) => /needs a note on what its reply needs/.test(message)));
});

const sort: SortGroupsItem = {
  id: 'g', source: 'own', kind: 'sort-groups', prompt: 'Sort.',
  groups: [{ label: 'Permission' }, { label: 'Suggestion' }],
  cards: [
    { sentence: sentence('a'), group: 1, note: 'Idea.' },
    { sentence: sentence('b'), group: 0, note: 'Allowed.' },
    { sentence: sentence('c'), group: 1, note: 'Idea.' },
    { sentence: sentence('d'), group: 0, note: 'Allowed.' },
  ],
};

test('sort-groups: each card goes to its own group, and the other group explains why not', () => {
  assert.equal(checkSortCard(sort, 0, 1).correct, true);
  assert.equal(checkSortCard(sort, 0, 0).note, 'Idea.');
  assert.deepEqual(validate(sort), []);
  assert.ok(validate({ ...sort, cards: sort.cards.map((card) => ({ ...card, group: 1 as const })) }).some((message) => /group 1 needs at least 2 sentences/.test(message)));
  assert.ok(validate({ ...sort, cards: sort.cards.slice(0, 3) }).some((message) => /sort 4 to 6 sentences/.test(message)));
});

const story: StoryOrderItem = {
  id: 'y', source: 'own', kind: 'story-order', prompt: 'Order.',
  steps: [
    { ...sentence('我下午回家。'), note: 'Latest.' },
    { ...sentence('我早上去學校。'), note: 'Earliest.' },
    { ...sentence('我中午下課。'), note: 'Middle.' },
  ],
  answer: [1, 2, 0],
};

test('story-order: the whole order is checked, and a wrong answer says why the step due first belongs there', () => {
  assert.equal(checkStoryOrder(story, [1, 2, 0]).correct, true);
  assert.equal(checkStoryOrder(story, [0, 1, 2]).note, 'Earliest.');
  assert.equal(checkStoryOrder(story, [1, 0, 2]).note, 'Middle.');
  assert.deepEqual(validate(story), []);
  assert.ok(validate({ ...story, answer: [0, 1, 2] }).some((message) => /shown in the right order/.test(message)));
  assert.ok(validate({ ...story, answer: [1, 1, 0] }).some((message) => /must list every step once/.test(message)));
  assert.ok(validate({ ...story, steps: story.steps.slice(0, 2), answer: [1, 0] }).some((message) => /order 3 to 5 sentences/.test(message)));
});
