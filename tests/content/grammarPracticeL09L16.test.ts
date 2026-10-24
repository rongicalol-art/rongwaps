import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrammarPractice, PracticeItem } from '../../src/types/models';
import { checkSlotBuild, practiceSlots, slotBuildResult, slotBuildSolutions } from '../../src/utils/grammar/grammarPracticeCheck';
import { checkOrderBuild } from '../../src/utils/grammar/grammarPracticeSequence';
import { readJson } from '../acceptance_helpers';

const names = ['Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'];
const items = names.flatMap((name) => Object.values(readJson<Record<string, GrammarPractice>>(`content/grammar-practice/lesson${name}.json`)).flatMap((page) => page.items));
function item<K extends PracticeItem['kind']>(id: string, kind: K) {
  const found = items.find((candidate) => candidate.id === id);
  assert.equal(found?.kind, kind, id);
  return found as Extract<PracticeItem, { kind: K }>;
}

test('speech exercises do not offer grammatical 對…說 as a wrong choice', () => {
  for (const id of ['l10g1-p3', 'l10g1-p4']) {
    const exercise = item(id, 'order-build');
    assert.ok(!exercise.tiles.some((tile) => tile.traditional === '對'), id);
    const canonical = exercise.accepted[0].order;
    assert.equal(checkOrderBuild(exercise, canonical).correct, true);
    assert.equal(checkOrderBuild(exercise, canonical.map((word) => word === '跟' ? '從' : word)).correct, false);
  }
});

test('past negation accepts both 沒 and 沒有 in questions and replies, with matching feedback', () => {
  for (const id of ['l11g2-p1', 'l11g2-p3']) {
    const exercise = item(id, 'slot-build');
    assert.equal(slotBuildSolutions(exercise).length, 4);
    for (const g0 of ['沒', '沒有']) {
      for (const g1 of ['沒', '沒有']) {
        const placed = { g0, g1 };
        assert.equal(checkSlotBuild(exercise, placed).correct, true, `${id}: ${g0}/${g1}`);
        const result = slotBuildResult(exercise, placed).traditional;
        assert.ok(result.includes(`了${g0}？`), result);
        assert.ok(result.includes(`${g1}${id.endsWith('p1') ? '來' : '看'}`), result);
      }
    }
    assert.equal(checkSlotBuild(exercise, { g0: '還沒', g1: '沒' }).correct, false);
  }
});

test('natural temporal orders and simultaneous-action orders retain the requested meaning', () => {
  const cases: Array<[string, string[]]> = [
    ['l9g4-p1', ['現在', '他', '不能', '說話']],
    ['l11g4-p1', ['明天', '我們', '再', '洗']],
    ['l12g2-p8', ['我們', '下課', '以後', '去', '騎腳踏車']],
    ['l12g5-p1', ['聽音樂', '的時候', '我', '最開心']],
    ['l12g5-p2', ['發燒', '的時候', '我', '會', '多喝水']],
    ['l12g5-p3', ['不上課', '的時候', '我', '都', '在看書']],
    ['l13g4-p2', ['下星期二', '她', '就要', '回國', '了']],
    ['l15g1-p3', ['姐姐', '跟', '妹妹', '跑得', '一樣快']],
    ['l15g2-p3', ['宜文', '喝著咖啡', '聽著音樂']],
    ['l15g2-p3', ['喝著咖啡', '聽著音樂']],
    ['l16g1-p0a', ['醫院', '離', '學校', '很近']],
  ];
  for (const [id, order] of cases) assert.equal(checkOrderBuild(item(id, 'order-build'), order).correct, true, id);
  assert.equal(checkOrderBuild(item('l12g5-p2', 'order-build'), ['我', '的時候', '發燒', '會', '多喝水']).correct, false);
});

test('when-clause repairs explain 的時候 rather than an unrelated if-then exercise', () => {
  for (const [id, order] of [
    ['l12g5-p2', ['我', '發燒', '以後', '多喝水']],
    ['l12g5-p3', ['我', '不上課', '以前', '在看書']],
  ] as Array<[string, string[]]>) {
    const result = checkOrderBuild(item(id, 'order-build'), order);
    assert.equal(result.correct, false);
    assert.match(result.note ?? '', /的時候/);
    assert.doesNotMatch(result.note ?? '', /phone|如果|要是/);
  }
});

test('language/tool and duration tasks require producing the grammar rather than only a picture label or number', () => {
  for (const id of ['l12g1-p1', 'l12g1-p2', 'l12g1-p3']) {
    const exercise = item(id, 'slot-build');
    const slots = practiceSlots(exercise);
    assert.equal(exercise.gaps, true);
    assert.equal(slots.filter((slot) => slot.answers.includes('用')).length, 2);
    assert.equal(checkSlotBuild(exercise, {}).correct, false);
    assert.equal(checkSlotBuild(exercise, slotBuildSolutions(exercise)[0]).correct, true);
  }
  for (const id of ['l14g1-p4', 'l14g1-p5', 'l14g1-p6', 'l14g1-p7', 'l14g1-p8', 'l14g2-p4', 'l14g2-p5', 'l14g2-p6', 'l14g2-p7', 'l14g2-p8', 'l14g2-p9']) {
    const exercise = item(id, 'slot-build');
    assert.equal(exercise.gaps, true, id);
    assert.equal(practiceSlots(exercise).filter((slot) => slot.answers.includes('了')).length, id.startsWith('l14g2') ? 2 : 1, id);
    assert.equal(checkSlotBuild(exercise, slotBuildSolutions(exercise)[0]).correct, true, id);
  }
});

test('word banks contain no malformed chunks from the overnight draft', () => {
  const malformed = new Set(['唱在歌', '做在什麼', '畫在畫', '到下午', '再圖書館', '寄幫我', '跑半個', '休息需要']);
  const bad = items.flatMap((exercise) => 'tiles' in exercise ? exercise.tiles.filter((tile) => malformed.has(tile.traditional)).map((tile) => `${exercise.id}: ${tile.traditional}`) : []);
  assert.deepEqual(bad, []);
});
