import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { InteractiveGrammarPart } from '../../src/types/models';
import { layoutExplanation } from '../../src/utils/grammar/explanationLayout';

test('numbered points, examples and a book "wrong" sentence each get their own block', () => {
  const blocks = layoutExplanation('往往 is restrictive:\n(1) It is for patterns. For example, 只要天氣好，他往往去慢跑。\n(2) No negative before it. For example, it is not correct to say: *他不往往去打球。');
  assert.deepEqual(blocks, [
    { text: '往往 is restrictive:', examples: [] },
    { label: '1', text: 'It is for patterns.', examples: [{ text: '只要天氣好，他往往去慢跑。' }] },
    { label: '2', text: 'No negative before it. For example, it is not correct to say:', examples: [{ text: '他不往往去打球。', wrong: true }] },
  ]);
});

test('inline points, quoted e.g. examples and Chinese 例如 are split; a dangling comma becomes a colon', () => {
  const english = layoutExplanation('Two cases. (1) Same subject. (2) Different subjects, e.g., “我做的菜，不但爸爸喜歡，而且媽媽也喜歡。”');
  assert.equal(english[2].text, 'Different subjects:');
  assert.deepEqual(english[2].examples, [{ text: '我做的菜，不但爸爸喜歡，而且媽媽也喜歡。' }]);
  const chinese = layoutExplanation('用於一般的看法，例如：家庭教育非常重要。(Family education matters.)');
  assert.deepEqual(chinese, [{ text: '用於一般的看法：', examples: [{ text: '家庭教育非常重要。', translation: 'Family education matters.' }] }]);
});

test('an example followed by English prose, or a stray number, stays as written', () => {
  const text = 'For example, 好吃 means delicious. See 例句(3) too.';
  assert.deepEqual(layoutExplanation(text), [{ text, examples: [] }]);
});

test('lines under a numbered heading continue that point', () => {
  const blocks = layoutExplanation('（1） 以前 as a Time Word\n以前 means “previously”.\n（2） 以後\na. 以後 means after.');
  assert.deepEqual(blocks.map((block) => [block.label, block.continues, block.text]), [
    ['1', undefined, '以前 as a Time Word'],
    [undefined, true, '以前 means “previously”.'],
    ['2', undefined, '以後'],
    [undefined, true, 'a. 以後 means after.'],
  ]);
});

test('every grammar explanation keeps all of its words when laid out', () => {
  const strip = (value: string) => value.replace(/For example|For instance|e\.g\.|例如|比如|[\s,，:：*“”「」"().（）。.①-⑩]/gu, '');
  const lost: string[] = [];
  for (const bookId of [1, 2, 3]) {
    const pages = readJson<{ items: InteractiveGrammarPart[] }>(`public/data/grammar/book-${bookId}.json`).items.flatMap((part) => part.grammarPages);
    for (const page of pages) {
      for (const text of [page.explanation, page.explanationEnglish, ...(page.subsections ?? []).map((section) => section.explanation)]) {
        if (!text) continue;
        const shown = layoutExplanation(text).map((block) => (block.label ?? '') + block.text + block.examples.map((example) => example.text + (example.translation ?? '')).join('')).join('');
        if (strip(shown) !== strip(text)) lost.push(page.id);
      }
    }
  }
  assert.deepEqual(lost, []);
});
