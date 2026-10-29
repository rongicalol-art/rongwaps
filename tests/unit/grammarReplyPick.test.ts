import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReplyPickItem } from '../../src/types/models';
import { checkReplyPick, fillReplyOption, replySlotCompletion } from '../../src/utils/grammar/grammarPracticePicks';
import { validateGrammarPractice } from '../../src/utils/grammar/validateGrammarPractice';

const result = { traditional: '他可以說是好老師。', pinyin: 'Tā kěyǐ shuō shì hǎo lǎoshī.', english: 'He can be called a good teacher.' };
const item: ReplyPickItem = {
  id: 'reply', source: 'own', kind: 'reply-pick', fill: { traditional: '可以說是', pinyin: 'kěyǐ shuō shì' },
  lines: [{ me: true, segments: [{ type: 'slot', id: 'reply', answers: [] }] }],
  options: [{ traditional: '他～好老師。', ok: true, result }, { traditional: '他～去。', note: 'This needs a description.' }],
};
const validate = (value: ReplyPickItem) => validateGrammarPractice({ title: 'Pick.', bookPage: 1, items: [value] }, 'test').map((issue) => issue.message).join('\n');

test('reply-pick checks a single correct answer and returns wrong-choice notes', () => {
  assert.deepEqual(checkReplyPick(item, 0), { correct: true, note: undefined, also: [] });
  assert.deepEqual(checkReplyPick(item, 1), { correct: false, note: 'This needs a description.', also: [] });
  assert.equal(validate(item), '');
});

test('reply-pick accepts either right option and lists every other finished sentence', () => {
  const other = { ...result, traditional: '他可以說是好朋友。' };
  const multiple: ReplyPickItem = { ...item, options: [...item.options, { traditional: '他～好朋友。', ok: true, result: other }] };
  assert.deepEqual(checkReplyPick(multiple, 0), { correct: true, note: `This also works: ${other.traditional}`, also: [other.traditional] });
  assert.deepEqual(checkReplyPick(multiple, 2).also, [result.traditional]);
  assert.equal(validate(multiple), '');
});

test('reply-pick validates option counts, keys, results, notes, context and duplicates', () => {
  assert.match(validate({ ...item, options: item.options.slice(0, 1) }), /2–10 options/);
  assert.match(validate({ ...item, options: Array(11).fill(item.options[0]) }), /2–10 options/);
  assert.match(validate({ ...item, options: item.options.map((option) => ({ ...option, ok: false, note: 'Wrong.' })) }), /at least one ok/);
  assert.match(validate({ ...item, options: [{ ...item.options[0], result: undefined }, item.options[1]] }), /result: sentence missing/);
  assert.match(validate({ ...item, options: [item.options[0], { ...item.options[1], note: '' }] }), /needs a note/);
  assert.match(validate({ ...item, lines: undefined }), /lines or situation/);
  assert.match(validate({ ...item, lines: [] }), /exactly one slot/);
  assert.match(validate({ ...item, lines: [...item.lines!, ...item.lines!] }), /exactly one slot/);
  assert.match(validate({ ...item, options: [item.options[0], item.options[0]] }), /duplicate option/);
  assert.equal(validate({ ...item, lines: undefined, situation: { traditional: '他教得很好。', english: 'He teaches well.' } }), '');
  assert.equal(validate({ ...item, situation: { traditional: '他教得很好。', english: 'He teaches well.' } }), '');
});

test('reply-pick requires the fill marker on every option and the filled pattern in results', () => {
  assert.match(validate({ ...item, options: [item.options[0], { ...item.options[1], traditional: '他去。' }] }), /must contain ～/);
  assert.match(validate({ ...item, options: [{ ...item.options[0], result: { ...result, traditional: '他是好老師。' } }, item.options[1]] }), /result must contain fill 可以說是/);
  assert.match(validate({ ...item, fill: undefined }), /without fill/);
  assert.equal(validate({ ...item, fill: undefined, options: item.options.map((option) => ({ ...option, traditional: option.traditional.replace('～', '可以說是') })) }), '');
});

test('DEV reply fixtures validate the phrase-bank and situation pick → build sequence', async () => {
  const { REPLY_PICK_PREVIEW } = await import('../../src/features/grammar-practice/replyPickPreview');
  assert.deepEqual(validateGrammarPractice(REPLY_PICK_PREVIEW, 'preview'), []);
  const [bank, pick, build] = REPLY_PICK_PREVIEW.items;
  assert.equal(bank.kind, 'reply-pick');
  if (bank.kind === 'reply-pick') assert.equal(checkReplyPick(bank, 0).also.length, 1);
  assert.equal(pick.kind, 'reply-pick');
  assert.equal(build.kind, 'order-build');
  if (pick.kind === 'reply-pick' && build.kind === 'order-build') {
    assert.deepEqual(pick.situation, build.situation);
    assert.equal(pick.options.filter((option) => option.ok).length, 1);
    assert.deepEqual(pick.options.find((option) => option.ok)?.result, build.accepted[0].sentence);
  }
});

test('the grammar pack loader retains English explanation and dialogue-origin fields', async () => {
  const { PACK_CONFIGS } = await import('../../src/services/contentPackConfigs');
  const { readJson } = await import('../acceptance_helpers');
  const { items } = readJson<{ items: import('../../src/types/models').InteractiveGrammarPart[] }>('public/data/grammar/book-3.json');
  const part = structuredClone(items[0]);
  part.grammarPages[0].explanationEnglish = 'The printed English explanation.';
  part.grammarPages[0].examples[0].fromDialogue = true;
  const pack = JSON.parse(JSON.stringify({ schemaVersion: 1, bookId: 3, count: 1, items: [part] }));
  const manifest = { schemaVersion: 1, version: 'fixture', books: [{ bookId: 3, count: 1, path: '/data/grammar/book-3.json' }] };
  const config = PACK_CONFIGS.grammar;
  assert.equal(config.validatePack(pack, config.getParts(manifest)[0], manifest), true);
  const loaded = config.transform!(pack) as typeof items;
  assert.equal(loaded[0].grammarPages[0].explanationEnglish, part.grammarPages[0].explanationEnglish);
  assert.equal(loaded[0].grammarPages[0].examples[0].fromDialogue, true);
});

test('a two-part pattern fills each ～ with its own part', () => {
  assert.equal(fillReplyOption('風景～美麗～！', ['多麼', '啊']), '風景多麼美麗啊！');
  assert.equal(fillReplyOption('他～學校的明星人物', ['可以說是']), '他可以說是學校的明星人物');
  assert.equal(fillReplyOption('～下雪，我～不怕', ['就算', '也']), '就算下雪，我也不怕');
});

test('a right pick shows its finished words in the blank, cut from the result', () => {
  const card: ReplyPickItem = {
    ...item,
    lines: [{ segments: [{ type: 'text', traditional: '是啊，' }, { type: 'slot', id: 's', answers: [] }, { type: 'text', traditional: '。' }] }],
  };
  assert.equal(replySlotCompletion(card, { traditional: '是啊，萬一下雨，就糟了。', pinyin: '', english: '' }, 'traditional'), '萬一下雨，就糟了');
  assert.equal(replySlotCompletion(card, { traditional: '好啊。', pinyin: '', english: '' }, 'traditional'), undefined);
});
