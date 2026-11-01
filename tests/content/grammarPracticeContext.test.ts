import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import type { GrammarPractice, PracticeItem, SlotBuildItem } from '../../src/types/models';
import { practiceSlots } from '../../src/utils/grammar/grammarPracticeCheck';

const load = (name: string) => JSON.parse(fs.readFileSync(`content/grammar-practice/lesson${name}.json`, 'utf8')) as Record<string, GrammarPractice>;
const items = (name: string) => Object.values(load(name)).flatMap((practice) => practice.items);
const find = (name: string, id: string) => items(name).find((item) => item.id === id)!;
const context = (item: PracticeItem) => [item.sub ?? '', ...(item.kind === 'slot-build' ? item.lines.flatMap((line) => line.segments.flatMap((segment) => segment.type === 'text' ? segment.traditional : [])) : [])].join('\n');

test('picture sequence tasks retain the Chinese question that determines the reply', () => {
  for (const [id, question] of [
    ['l9g3-p1', '你明天下午要上什麼課？'],
    ['l9g3-p2', '你們週末想去哪裡？'],
    ['l9g3-p3', '你不去吃晚飯嗎？'],
  ]) {
    const item = find('Nine', id);
    assert.ok(context(item).includes(question), id);
    assert.doesNotMatch(item.prompt ?? '', /first.*then|first swim/i, id);
  }
});

test('the L1 question-particle exercise tests 嗎 as well as the reply, not just the adjective', () => {
  const item = find('One', 'l1g3-p3') as SlotBuildItem;
  assert.equal(item.kind, 'slot-build');
  const targets = practiceSlots(item).flatMap((slot) => slot.answers);
  assert.ok(targets.includes('嗎'));
  assert.ok(targets.includes('很'));
});

test('learner feedback and prompts contain no internal slot IDs or authoring labels', () => {
  for (const name of ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen']) {
    for (const item of items(name)) {
      assert.doesNotMatch(`${item.prompt ?? ''} ${item.sub ?? ''}`, /editorial|unverified|authoring/i, item.id);
      if ('repairs' in item) for (const repair of item.repairs ?? []) assert.doesNotMatch(repair.note, /\bg\d+\b/, item.id);
    }
  }
});
