import assert from 'node:assert/strict';
import test from 'node:test';
import { rankExampleSentences } from '../src/features/character-breakdown/utils/rankExampleSentences';
import type { WordExample } from '../src/features/dictionary/hooks/useWordExtras';

function sentence(chinese: string, sourceFront: string): WordExample {
  return {
    chinese,
    pinyin: 'pinyin',
    english: 'english',
    sourceCardId: `card-${sourceFront}`,
    sourceFront,
    sourceBookId: 1,
    sourceLessonId: 1,
  };
}

test('大: greeting-chunk sentence sinks below sentences where 大 does real work', () => {
  // Real candidate pool captured from the live service (2026-08-25).
  const ranked = rankExampleSentences(
    [
      sentence('大家好，我是小林友美。', '大家'),
      sentence('我要買大蛋糕，不要買小蛋糕。', '蛋糕'),
      sentence('我家的廚房很大，我常常在家做飯。', '廚房'),
    ],
    '大',
  );
  assert.equal(ranked[0].chinese, '我要買大蛋糕，不要買小蛋糕。');
  assert.equal(ranked[1].chinese, '我家的廚房很大，我常常在家做飯。');
  assert.equal(ranked[2].chinese, '大家好，我是小林友美。');
});

test('好: a chunky dialogue still leads when sourced from the character itself', () => {
  const ranked = rankExampleSentences(
    [
      sentence('大家好，我是小林友美。', '大家'),
      sentence('好啊，我們一起吃蛋糕。', '啊'),
      sentence('A：你好嗎？ B：我很好。', '好'),
    ],
    '好',
  );
  assert.equal(ranked[0].chinese, 'A：你好嗎？ B：我很好。');
  assert.equal(ranked[1].chinese, '好啊，我們一起吃蛋糕。');
  assert.equal(ranked[2].chinese, '大家好，我是小林友美。');
});

test('不: courtesy formula is demoted below real negation examples', () => {
  const ranked = rankExampleSentences(
    [
      sentence('A：謝謝你。 B：不客氣。', '不客氣'),
      sentence('他今天不來學校嗎？', '來'),
      sentence('媽媽忙不忙？', '忙'),
    ],
    '不',
  );
  assert.deepEqual(
    ranked.map((s) => s.chinese),
    ['他今天不來學校嗎？', '媽媽忙不忙？', 'A：謝謝你。 B：不客氣。'],
  );
});

test('ranking reorders only and never drops candidates', () => {
  const pool = [sentence('不客氣。', '不客氣')];
  assert.deepEqual(rankExampleSentences(pool, '不'), pool);
  const empty: WordExample[] = [];
  assert.deepEqual(rankExampleSentences(empty, '不'), []);
});

test('equal scores keep upstream order as a stable tie-break', () => {
  const ranked = rankExampleSentences(
    [
      sentence('天氣很好。', '天氣'),
      sentence('今天很熱。', '今天'),
    ],
    '很',
  );
  assert.deepEqual(
    ranked.map((s) => s.chinese),
    ['天氣很好。', '今天很熱。'],
  );
});

test('simplified courtesy variants are covered defensively', () => {
  const ranked = rankExampleSentences(
    [
      sentence('你们好！', '你们'),
      sentence('这个很大。', '这个'),
    ],
    '大',
  );
  assert.equal(ranked[0].chinese, '这个很大。');
});
