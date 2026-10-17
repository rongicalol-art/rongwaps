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
const byId = <T>(id: string) => items.find((item) => item.id === id) as T;

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

test('place the word: only the right gap is correct, and each wrong gap explains itself', () => {
  const item = byId<SlotBuildItem>('l1g3-p1');
  assert.equal(item.gaps, true);
  assert.equal(checkSlotBuild(item, { end: '嗎' }).correct, true);
  assert.match(checkSlotBuild(item, { 'after-verb': '嗎' }).note ?? '', /姓王/);
  assert.deepEqual(validateGrammarPractice({ bookPage: 1, title: 'T', items: [item] }, 'p'), []);
  assert.match(validateGrammarPractice({ bookPage: 1, title: 'T', items: [{ ...item, repairs: [] }] }, 'p')[0].message, /needs a repair/);
});
