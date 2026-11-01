import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrammarPractice } from '../../src/types/models';
import { readJson } from '../acceptance_helpers';

const names = ['Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'];
const items = names.flatMap((name) => Object.values(readJson<Record<string, GrammarPractice>>(`content/grammar-practice/lesson${name}.json`)).flatMap((page) => page.items));

test('word banks contain no malformed chunks from the overnight draft', () => {
  const malformed = new Set(['唱在歌', '做在什麼', '畫在畫', '到下午', '再圖書館', '寄幫我', '跑半個', '休息需要']);
  const bad = items.flatMap((exercise) => 'tiles' in exercise ? exercise.tiles.filter((tile) => malformed.has(tile.traditional)).map((tile) => `${exercise.id}: ${tile.traditional}`) : []);
  assert.deepEqual(bad, []);
});
