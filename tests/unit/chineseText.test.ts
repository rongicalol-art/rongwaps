import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChineseText, TestWords, splitClosing } from '../../src/screens/lesson-test/components/ChineseText';

const render = (text: string, words?: string[]) => {
  const node = createElement(ChineseText, { text });
  return renderToStaticMarkup(words ? createElement(TestWords, { value: words }, node) : node);
};
const kept = (html: string) => [...html.matchAll(/<span class="whitespace-nowrap">([^<]+)<\/span>/g)].map((match) => match[1]);

test('ChineseText keeps every word on one line and the text unchanged', () => {
  const html = render('中明點一碗牛肉麵，給小姐兩百塊。');
  assert.ok(kept(html).includes('牛肉麵'));
  assert.ok(kept(html).includes('小姐'));
  assert.equal(html.replace(/<[^>]+>/g, ''), '中明點一碗牛肉麵，給小姐兩百塊。');
});

test('ChineseText keeps the lesson names whole', () => {
  assert.deepEqual(kept(render('宜文去看中明', ['宜文', '中明'])).filter((word) => word === '宜文' || word === '中明'), ['宜文', '中明']);
});

test('splitClosing keeps the punctuation after a blank on the blank\'s line', () => {
  assert.deepEqual(splitClosing('，我要一杯果汁。'), ['，', '我要一杯果汁。']);
  assert.deepEqual(splitClosing('。」他說'), ['。」', '他說']);
  assert.deepEqual(splitClosing('大樹，環境很好。'), ['', '大樹，環境很好。']);
});
