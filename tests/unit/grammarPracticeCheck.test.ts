import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { GrammarPractice, SlotBuildItem } from '../../src/types/models';
import {
  checkSlotBuild,
  practiceSlots,
} from '../../src/utils/grammar/grammarPracticeCheck';
import { validateGrammarPractice } from '../../src/utils/grammar/validateGrammarPractice';

const lessonSeven = readJson<Record<string, GrammarPractice>>('content/grammar-practice/lessonSeven.json');
const lessonOne = readJson<Record<string, GrammarPractice>>('content/grammar-practice/lessonOne.json');
const items = [lessonSeven, lessonOne].flatMap((lesson) => Object.values(lesson).flatMap((practice) => practice.items));

test('Lesson 7 practice passes structural validation', () => {
  for (const [pageId, practice] of Object.entries(lessonSeven)) {
    assert.deepEqual(validateGrammarPractice(practice, pageId), []);
  }
});

test('every slot exercise is solved by its answer key, and each slot key is a different tile', () => {
  for (const item of items.filter((candidate): candidate is SlotBuildItem => candidate.kind === 'slot-build')) {
    const answer = Object.fromEntries(practiceSlots(item).map((slot) => [slot.id, slot.answers[0]]));
    assert.equal(checkSlotBuild(item, answer).correct, true, item.id);
  }
});

test('an item needs exactly one right answer and its book source', () => {
  const item: SlotBuildItem = {
    id: 'one',
    source: 'p.1 #1',
    kind: 'slot-build',
    lines: [{ segments: [{ type: 'text', traditional: '新的腳踏車很' }, { type: 'slot', id: 'prefix', answers: ['好'] }, { type: 'slot', id: 'verb', answers: ['騎'] }, { type: 'text', traditional: '。' }] }],
    tiles: [{ traditional: '好', pinyin: 'hǎo' }, { traditional: '騎', pinyin: 'qí' }, { traditional: '看', pinyin: 'kàn' }],
    fallbackRepair: 'Use 好.',
    result: { traditional: '新的腳踏車很好騎。', pinyin: 'Xīn de jiǎotàchē hěn hǎoqí.', english: 'The new bike is easy to ride.' },
  };
  assert.deepEqual(validateGrammarPractice({ bookPage: 1, title: 'T', items: [item] }, 'p'), []);
  const two: SlotBuildItem = { ...item, lines: [{ segments: [{ type: 'text', traditional: '新的腳踏車很' }, { type: 'slot', id: 'prefix', answers: ['好'] }, { type: 'slot', id: 'verb', answers: ['騎', '看'] }, { type: 'text', traditional: '。' }] }] };
  assert.ok(validateGrammarPractice({ bookPage: 1, title: 'T', items: [two] }, 'p').some((issue) => /has 2 right answers/.test(issue.message)));
  assert.match(validateGrammarPractice({ bookPage: 1, title: 'T', items: [{ ...item, source: ' ' }] }, 'p')[0].message, /source missing/);
});

/** A place-the-word item (the engine still supports `gaps`; Book 1 pages no longer use it). */
const placeTheWord: SlotBuildItem = {
  id: 'place-ma',
  source: 'own',
  kind: 'slot-build',
  gaps: true,
  lines: [{ segments: [
    { type: 'text', traditional: '中明姓' },
    { type: 'slot', id: 'after-verb', answers: [] },
    { type: 'text', traditional: '王' },
    { type: 'slot', id: 'end', answers: ['嗎'] },
    { type: 'text', traditional: '？' },
  ] }],
  tiles: [{ traditional: '嗎', pinyin: 'ma' }],
  repairs: [{ slot: { id: 'after-verb', tile: '嗎' }, note: '嗎 closes the whole question, after 姓王.' }],
  fallbackRepair: 'Put 嗎 at the end.',
  result: { traditional: '中明姓王嗎？', pinyin: 'Zhōngmíng xìng Wáng ma?', english: 'Is Zhongming’s surname Wang?' },
};

test('place the word: only the right gap is correct, and each wrong gap explains itself', () => {
  const item = placeTheWord;
  assert.equal(checkSlotBuild(item, { end: '嗎' }).correct, true);
  assert.match(checkSlotBuild(item, { 'after-verb': '嗎' }).note ?? '', /姓王/);
  assert.deepEqual(validateGrammarPractice({ bookPage: 1, title: 'T', items: [item] }, 'p'), []);
  assert.match(validateGrammarPractice({ bookPage: 1, title: 'T', items: [{ ...item, repairs: [] }] }, 'p')[0].message, /needs a repair/);
});

test('an empty placement answer never passes, even when no wrong word was placed', () => {
  const item = placeTheWord;
  assert.equal(checkSlotBuild(item, {}).correct, false);
});

/** The former L4 太…了 item (before the Book 1 page rewrite), kept as an engine fixture. */
const DEGREE_ITEM = {"id": "l04-g3-book2", "source": "p.99 #2", "kind": "slot-build", "lines": [{"segments": [{"type": "text", "traditional": "他現在怎麼樣？", "simplified": "他现在怎么样？"}], "speaker": {"traditional": "A"}, "me": false}, {"segments": [{"type": "slot", "id": "g0", "answers": []}, {"type": "text", "traditional": "他"}, {"type": "slot", "id": "g1", "answers": ["太"]}, {"type": "text", "traditional": "累"}, {"type": "slot", "id": "g2", "answers": ["了"]}, {"type": "text", "traditional": "。"}], "speaker": {"traditional": "B"}, "me": true}], "tiles": [{"traditional": "了", "pinyin": "le"}, {"traditional": "太", "pinyin": "tài"}, {"traditional": "很", "pinyin": "hěn"}], "repairs": [{"placed": ["很"], "mark": ["很"], "note": "他很累 is valid Chinese: “he is very tired”; this task asks for too tired, expressed with 太…了.", "title": "Try the requested meaning"}, {"slot": {"id": "g0", "tile": "了"}, "note": "Put 了 after the adjective in 太…了."}, {"slot": {"id": "g0", "tile": "太"}, "note": "Put 太 directly before the adjective to say it is excessive."}, {"slot": {"id": "g1", "tile": "了"}, "note": "Put 了 after the adjective in 太…了."}, {"slot": {"id": "g2", "tile": "太"}, "note": "Put 太 directly before the adjective to say it is excessive."}], "fallbackRepair": "Wrap the describing word in 太…了: 太累了.", "result": {"traditional": "他太累了。", "pinyin": "Tā tài lèi le.", "english": "He is so tired."}, "prompt": "Complete the dialogue.", "quiet": true, "scene": {"type": "picture", "page": 99, "box": [0.406, 0.35, 0.164, 0.1], "alt": "A person at a computer with piles of work and loose papers."}, "gaps": true} as SlotBuildItem;

test('a valid degree description gets the meaning repair before a missing-frame reminder', () => {
  const item = DEGREE_ITEM;
  const differentMeaning = checkSlotBuild(item, { g1: '很' });
  assert.equal(differentMeaning.correct, false);
  assert.equal(differentMeaning.title, 'Try the requested meaning');
  assert.match(differentMeaning.note ?? '', /他很累 is valid Chinese/);
  assert.match(differentMeaning.note ?? '', /太…了/);
  const incomplete = checkSlotBuild(item, { g1: '太' });
  assert.equal(incomplete.correct, false);
  assert.equal(incomplete.title, 'Keep going');
  assert.match(incomplete.note ?? '', /太累了/);
  assert.equal(checkSlotBuild(item, { g1: '太', g2: '了' }).correct, true);
});
